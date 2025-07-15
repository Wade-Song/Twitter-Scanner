// Background script for Twitter Scanner
console.log('Twitter Scanner background script loaded');

let currentApiKey = null;

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.type === 'ANALYZE_TWEETS') {
    // Call Gemini API to analyze tweets
    analyzeWithGemini(request.tweets)
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
chrome.storage.sync.get(['geminiApiKey'], function(result) {
  if (result.geminiApiKey) {
    currentApiKey = result.geminiApiKey;
    console.log('API key loaded from storage');
  }
});

// Function to call Gemini API
async function analyzeWithGemini(tweets) {
  if (!currentApiKey) {
    // Try to get API key from storage
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      currentApiKey = result.geminiApiKey;
    } else {
      throw new Error('No Gemini API key configured. Please set it in the extension popup.');
    }
  }
  
  const API_KEY = currentApiKey;
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
  const systemPrompt = `You are an expert content curator for Twitter. Analyze the following tweets and identify high-quality, insightful content that would be valuable for professionals. Focus on:
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

  const tweetTexts = tweets.map(tweet => 
    `Author: ${tweet.author}\nContent: ${tweet.content}\nTime: ${tweet.timestamp}\n---`
  ).join('\n');

  const prompt = `${systemPrompt}\n\nTweets to analyze:\n${tweetTexts}\n\nPlease provide a curated summary of the most valuable insights:`;

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Scanner installed');
});