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

// Function to call Claude API
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
  
  const tweetTexts = tweets.map(tweet => 
    `Author: ${tweet.author}\nContent: ${tweet.content}\nTime: ${tweet.timestamp}\n---`
  ).join('\n');

  const userPrompt = `Please analyze the following tweets and provide a curated summary of the most valuable insights:\n\n${tweetTexts}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Scanner installed');
});