// Background script for Twitter Scanner
console.log('Twitter Scanner background script loaded');

let currentApiKey = null;

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.type === 'ANALYZE_TWEETS') {
    // Call Claude API to analyze tweets
    analyzeWithClaude(request.tweets)
      .then(result => {
        sendResponse({ success: true, analysis: result });
      })
      .catch(error => {
        console.error('Claude API error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
  
  if (request.type === 'UPDATE_API_KEY') {
    currentApiKey = request.apiKey;
    console.log('API key updated');
  }
});

// Load API key on startup
chrome.storage.sync.get(['claudeApiKey'], function(result) {
  if (result.claudeApiKey) {
    currentApiKey = result.claudeApiKey;
    console.log('API key loaded from storage');
  }
});

// Sleep function for retry delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to call Claude API with retry mechanism
async function analyzeWithClaude(tweets) {
  if (!currentApiKey) {
    // Try to get API key from storage
    const result = await chrome.storage.sync.get(['claudeApiKey']);
    if (result.claudeApiKey) {
      currentApiKey = result.claudeApiKey;
    } else {
      throw new Error('No Claude API key configured. Please set it in the extension popup.');
    }
  }
  
  // Get system prompt from storage
  const systemPromptResult = await chrome.storage.sync.get(['systemPrompt']);
  const systemPrompt = systemPromptResult.systemPrompt || `You are an expert content curator for Twitter. Analyze the following tweets and identify high-quality, insightful content that would be valuable for professionals. Focus on:
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

  const API_KEY = currentApiKey;
  const API_URL = 'https://api.anthropic.com/v1/messages';
  
  console.log('🚀 Attempting to call Claude API with:', {
    url: API_URL,
    hasApiKey: !!API_KEY,
    apiKeyPrefix: API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT_SET',
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
    system: systemPrompt,
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

// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Scanner installed');
});