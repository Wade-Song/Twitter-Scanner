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
        console.error('Gemini API error:', error);
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

Provide a summary of the most valuable tweets with key insights extracted.`;

  const API_KEY = currentApiKey;
  const API_URL = 'https://api.anthropic.com/v1/messages';
  
  console.log('Attempting to call Claude API with:', {
    url: API_URL,
    hasApiKey: !!API_KEY,
    tweetCount: tweets.length
  });
  
  const tweetTexts = tweets.map(tweet => 
    `Author: ${tweet.author}\nContent: ${tweet.content}\nTime: ${tweet.timestamp}\n---`
  ).join('\n');

  const userPrompt = `Please analyze the following tweets and provide a curated summary of the most valuable insights:\n\n${tweetTexts}`;

  const requestBody = {
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ]
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  // Retry mechanism: maximum 2 retries, minimum 2 seconds between attempts
  const maxRetries = 2;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`Claude API attempt ${attempt}/${maxRetries + 1}`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API Error Details:', {
          attempt: attempt,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: errorText
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
          console.log(`Retryable error (${response.status}). Waiting ${retryDelay}ms before retry ${attempt}...`);
          await sleep(retryDelay);
          continue; // Try again
        } else {
          throw error; // Don't retry for client errors (4xx except 429) or after max retries
        }
      }

      const data = await response.json();
      console.log('Claude API response received successfully on attempt', attempt);
      
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      } else {
        throw new Error('Invalid response format from Claude API');
      }
      
    } catch (error) {
      console.error(`Claude API error on attempt ${attempt}:`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries + 1) {
        throw error;
      }
      
      // For network errors or other non-HTTP errors, wait before retry
      if (!error.status) {
        console.log(`Network error. Waiting ${retryDelay}ms before retry ${attempt}...`);
        await sleep(retryDelay);
      }
    }
  }
}

// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Scanner installed');
});