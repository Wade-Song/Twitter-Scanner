const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { RateLimiterMemory } = require('rate-limiter-flexible');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://*', 'moz-extension://*'],
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'proxy_rate_limit',
  points: parseInt(process.env.MAX_REQUESTS_PER_IP) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
});

// Usage tracking for free tier
const usageTracker = new Map();
const MAX_FREE_USAGE = parseInt(process.env.MAX_FREE_USAGE_PER_IP) || 50;
const USAGE_RESET_INTERVAL = parseInt(process.env.USAGE_RESET_INTERVAL_HOURS) || 24;

// Reset usage counter periodically
setInterval(() => {
  usageTracker.clear();
  console.log('🔄 Usage counters reset');
}, USAGE_RESET_INTERVAL * 60 * 60 * 1000);

// Get client IP address
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
}

// Generate browser fingerprint from headers
function getBrowserFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Create a simple fingerprint
  const fingerprint = Buffer.from(userAgent + acceptLanguage + acceptEncoding)
    .toString('base64')
    .substring(0, 16);
    
  return fingerprint;
}

// Middleware to check rate limits
async function checkRateLimit(req, res, next) {
  try {
    const clientIP = getClientIP(req);
    await rateLimiter.consume(clientIP);
    next();
  } catch (rejRes) {
    const timeRemaining = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: timeRemaining
    });
  }
}

// Middleware to check usage limits
function checkUsageLimit(req, res, next) {
  const clientIP = getClientIP(req);
  const fingerprint = getBrowserFingerprint(req);
  const clientKey = `${clientIP}_${fingerprint}`;
  
  const usage = usageTracker.get(clientKey) || 0;
  
  if (usage >= MAX_FREE_USAGE) {
    return res.status(429).json({
      error: `Free usage limit reached (${MAX_FREE_USAGE} requests per ${USAGE_RESET_INTERVAL} hours)`,
      usage: usage,
      limit: MAX_FREE_USAGE,
      resetTime: new Date(Date.now() + USAGE_RESET_INTERVAL * 60 * 60 * 1000).toISOString()
    });
  }
  
  req.clientKey = clientKey;
  req.currentUsage = usage;
  next();
}

// Default system prompt
function getDefaultSystemPrompt() {
  return `You are an expert content curator for Twitter. Analyze the following tweets and identify high-quality, insightful content that would be valuable for professionals. Focus on:
- Industry insights and trends
- Thoughtful analysis and commentary
- Educational content
- Professional networking and career advice
- Innovation and technology updates

Filter out:
- Personal life updates
- Casual conversations
- Promotional content
- Low-quality or spam content

OUTPUT FORMAT REQUIREMENTS:
Please format your response using markdown with the following structure:

1. **Links**: Use [@username](twitter_profile_url) for authors and [查看原推文](tweet_url) for original tweets
2. **Headers**: Use # ## ### #### for different levels (# for main topics, ## for subtopics, etc.)
3. **Content**: Use **bold** for important points, *italic* for emphasis, \`code\` for keywords
4. **Lists**: Use - for bullet points, 1. 2. 3. for numbered lists
5. **Quotes**: Use > for important quotes or tweet content
6. **Sections**: Use --- for visual separation between major sections

Example format:
# 🔥 热门话题
## AI技术发展
[@username](https://twitter.com/username) 分享了关于AI的重要观点：
> "这是一段重要的引用"
**关键洞察**：这表明了...
[查看原推文](https://twitter.com/xxx/status/123)

Provide a comprehensive analysis with proper markdown formatting, including clickable links to authors and original tweets.`;
}

// Sleep function for retry delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to call Claude API with retry mechanism
async function callClaudeAPI(tweets, systemPrompt = null) {
  const API_KEY = process.env.CLAUDE_API_KEY;
  const API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages';
  
  if (!API_KEY) {
    throw new Error('CLAUDE_API_KEY environment variable is not set');
  }
  
  const finalSystemPrompt = systemPrompt || getDefaultSystemPrompt();
  
  console.log('🚀 Attempting to call Claude API with:', {
    url: API_URL,
    hasApiKey: !!API_KEY,
    apiKeyPrefix: API_KEY.substring(0, 10) + '...',
    tweetCount: tweets.length,
    timestamp: new Date().toISOString()
  });
  
  const tweetTexts = tweets.map(tweet => 
    `Author: ${tweet.author}\nContent: ${tweet.content}\nTime: ${tweet.timestamp}\nURL: ${tweet.url || 'N/A'}\n---`
  ).join('\n');

  const userPrompt = `Please analyze the following tweets and provide a curated summary of the most valuable insights:\n\n${tweetTexts}`;

  const requestBody = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: finalSystemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ]
  };
  
  console.log('📤 Request body:', {
    model: requestBody.model,
    max_tokens: requestBody.max_tokens,
    system_prompt_length: requestBody.system.length,
    user_prompt_length: requestBody.messages[0].content.length,
    tweet_count: tweets.length
  });
  
  // Retry mechanism: maximum 2 retries, minimum 2 seconds between attempts
  const maxRetries = 2;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🔄 Claude API attempt ${attempt}/${maxRetries + 1}`, {
        timestamp: new Date().toISOString(),
        url: API_URL,
        method: 'POST'
      });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Claude API Error Details:', {
          attempt: attempt,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText,
          timestamp: new Date().toISOString()
        });
        
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        
        const error = new Error(`API request failed: ${response.status} - ${errorData.error?.message || errorText || 'Unknown error'}`);
        error.status = response.status;
        error.attempt = attempt;
        
        // Check if this is a rate limit error (429) or server error (5xx)
        const isRetryableError = response.status === 429 || response.status >= 500;
        
        if (isRetryableError && attempt <= maxRetries) {
          console.log(`🔄 Retryable error (${response.status}). Waiting ${retryDelay}ms before retry ${attempt}...`);
          await sleep(retryDelay);
          continue; // Try again
        } else {
          console.error(`🚫 Not retrying error ${response.status} on attempt ${attempt}/${maxRetries + 1}`);
          throw error; // Don't retry for client errors (4xx except 429) or after max retries
        }
      }

      const data = await response.json();
      console.log('✅ Claude API response received successfully on attempt', attempt, {
        hasContent: !!(data.content && data.content[0]),
        textLength: data.content?.[0]?.text?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      } else {
        console.error('❌ Invalid response format:', data);
        throw new Error('Invalid response format from Claude API');
      }
      
    } catch (error) {
      console.error(`❌ Claude API error on attempt ${attempt}:`, {
        error: error.message,
        name: error.name,
        status: error.status,
        attempt: attempt,
        timestamp: new Date().toISOString()
      });
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries + 1) {
        console.error('🚫 Max retries exceeded, throwing error');
        throw error;
      }
      
      // For network errors or other non-HTTP errors, wait before retry
      if (!error.status) {
        console.log(`🌐 Network error. Waiting ${retryDelay}ms before retry ${attempt}...`);
        await sleep(retryDelay);
      }
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Usage stats endpoint
app.get('/usage/:clientKey?', (req, res) => {
  const clientIP = getClientIP(req);
  const fingerprint = getBrowserFingerprint(req);
  const clientKey = req.params.clientKey || `${clientIP}_${fingerprint}`;
  
  const usage = usageTracker.get(clientKey) || 0;
  
  res.json({
    usage: usage,
    limit: MAX_FREE_USAGE,
    remaining: Math.max(0, MAX_FREE_USAGE - usage),
    resetTime: new Date(Date.now() + USAGE_RESET_INTERVAL * 60 * 60 * 1000).toISOString()
  });
});

// Main analyze endpoint
app.post('/api/analyze', checkRateLimit, checkUsageLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const { tweets, systemPrompt } = req.body;
  
  console.log('📊 Analysis request received:', {
    clientIP: clientIP,
    fingerprint: getBrowserFingerprint(req),
    tweetCount: tweets?.length || 0,
    hasSystemPrompt: !!systemPrompt,
    currentUsage: req.currentUsage,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Validate input
    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return res.status(400).json({
        error: 'Invalid input: tweets array is required and must not be empty'
      });
    }
    
    if (tweets.length > 100) {
      return res.status(400).json({
        error: 'Too many tweets: maximum 100 tweets per request'
      });
    }
    
    // Call Claude API
    const analysis = await callClaudeAPI(tweets, systemPrompt);
    
    // Update usage counter
    usageTracker.set(req.clientKey, req.currentUsage + 1);
    
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Analysis completed successfully:', {
      clientIP: clientIP,
      newUsage: req.currentUsage + 1,
      processingTimeMs: processingTime,
      analysisLength: analysis.length,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      analysis: analysis,
      usage: {
        current: req.currentUsage + 1,
        limit: MAX_FREE_USAGE,
        remaining: Math.max(0, MAX_FREE_USAGE - req.currentUsage - 1)
      },
      processingTime: processingTime
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Analysis failed:', {
      clientIP: clientIP,
      error: error.message,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime: processingTime
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Twitter Scanner Proxy Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Rate limit: ${process.env.MAX_REQUESTS_PER_IP || 100} requests per ${(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 60000} minutes`);
  console.log(`📈 Usage limit: ${MAX_FREE_USAGE} requests per ${USAGE_RESET_INTERVAL} hours`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  process.exit(0);
});