document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const statusText = document.getElementById('statusText');
  
  // Load saved API key
  chrome.storage.sync.get(['geminiApiKey'], function(result) {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
      statusText.textContent = 'API Key configured';
    }
  });
  
  // Save API key
  saveApiKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
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