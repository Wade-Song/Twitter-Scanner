document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const systemPromptInput = document.getElementById('systemPromptInput');
  const saveSystemPromptBtn = document.getElementById('saveSystemPrompt');
  const statusText = document.getElementById('statusText');
  
  // Load saved API key and system prompt
  chrome.storage.sync.get(['claudeApiKey', 'systemPrompt'], function(result) {
    if (result.claudeApiKey) {
      apiKeyInput.value = result.claudeApiKey;
      statusText.textContent = 'API Key configured';
    }
    
    if (result.systemPrompt) {
      systemPromptInput.value = result.systemPrompt;
    } else {
      // Set default system prompt
      systemPromptInput.value = `You are an expert content curator for Twitter. Analyze the following tweets and identify high-quality, insightful content that would be valuable for professionals. Focus on:
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
    }
  });
  
  // Save API key
  saveApiKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ claudeApiKey: apiKey }, function() {
        statusText.textContent = 'API Key saved successfully';
        
        // Send message to background script to update API key
        chrome.runtime.sendMessage({
          type: 'UPDATE_API_KEY',
          apiKey: apiKey
        });
        
        setTimeout(() => {
          statusText.textContent = 'Ready to use';
        }, 2000);
      });
    } else {
      statusText.textContent = 'Please enter a valid API key';
      setTimeout(() => {
        statusText.textContent = 'Ready to use';
      }, 2000);
    }
  });
  
  // Save system prompt
  saveSystemPromptBtn.addEventListener('click', function() {
    const systemPrompt = systemPromptInput.value.trim();
    if (systemPrompt) {
      chrome.storage.sync.set({ systemPrompt: systemPrompt }, function() {
        statusText.textContent = 'System prompt saved successfully';
        
        setTimeout(() => {
          statusText.textContent = 'Ready to use';
        }, 2000);
      });
    } else {
      statusText.textContent = 'Please enter a valid system prompt';
      setTimeout(() => {
        statusText.textContent = 'Ready to use';
      }, 2000);
    }
  });
  
  // Check if we're on Twitter/X page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab.url.includes('twitter.com') || currentTab.url.includes('x.com')) {
      statusText.textContent = 'Ready to scan Twitter timeline';
    } else {
      statusText.textContent = 'Please navigate to Twitter/X to use scanner';
    }
  });
});