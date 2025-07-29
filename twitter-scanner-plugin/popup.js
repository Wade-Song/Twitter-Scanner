document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const toast = document.getElementById('toast');
  const proxyMode = document.getElementById('proxyMode');
  const ownMode = document.getElementById('ownMode');
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  
  // Vibe mode elements
  const manualMode = document.getElementById('manualMode');
  const countMode = document.getElementById('countMode');
  const timeMode = document.getElementById('timeMode');
  const countSettings = document.getElementById('countSettings');
  const timeSettings = document.getElementById('timeSettings');
  const tweetCountInput = document.getElementById('tweetCount');
  const timePeriodInput = document.getElementById('timePeriod');
  const saveVibeModeBtn = document.getElementById('saveVibeMode');
  
  // Toast notification functions
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
  
  // Load saved API key, API mode, and vibe mode settings
  chrome.storage.sync.get(['claudeApiKey', 'apiMode', 'vibeMode', 'tweetCount', 'timePeriod'], function(result) {
    // Set API mode
    const apiMode = result.apiMode || 'proxy'; // 默认使用服务器代理模式
    if (apiMode === 'own') {
      ownMode.checked = true;
      apiKeyContainer.style.display = 'block';
    } else {
      proxyMode.checked = true;
      apiKeyContainer.style.display = 'none';
    }
    
    if (result.claudeApiKey) {
      apiKeyInput.value = result.claudeApiKey;
    }
    
    // Set vibe mode - default to count mode for new users
    const vibeMode = result.vibeMode || 'count';
    const tweetCount = result.tweetCount || 100;
    const timePeriod = result.timePeriod || 24;
    
    // Set vibe mode radio buttons
    if (vibeMode === 'count') {
      countMode.checked = true;
      countSettings.classList.add('show');
    } else if (vibeMode === 'time') {
      timeMode.checked = true;
      timeSettings.classList.add('show');
    } else {
      manualMode.checked = true;
    }
    
    // Set input values
    tweetCountInput.value = tweetCount;
    timePeriodInput.value = timePeriod;
  });
  
  
  // Handle mode switching
  proxyMode.addEventListener('change', function() {
    if (this.checked) {
      apiKeyContainer.style.display = 'none';
      chrome.storage.sync.set({ apiMode: 'proxy' }, function() {
        showToast('Switched to hosted service mode');
        // Notify background script about mode change
        chrome.runtime.sendMessage({
          type: 'UPDATE_API_MODE',
          mode: 'proxy'
        });
      });
    }
  });
  
  ownMode.addEventListener('change', function() {
    if (this.checked) {
      apiKeyContainer.style.display = 'block';
      chrome.storage.sync.set({ apiMode: 'own' }, function() {
        showToast('Switched to custom API mode', 'warning');
        // Notify background script about mode change
        chrome.runtime.sendMessage({
          type: 'UPDATE_API_MODE',
          mode: 'own'
        });
      });
    }
  });
  
  // Save API key
  saveApiKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ claudeApiKey: apiKey }, function() {
        showToast('API key saved successfully');
        
        // Send message to background script to update API key
        chrome.runtime.sendMessage({
          type: 'UPDATE_API_KEY',
          apiKey: apiKey
        });
      });
    } else {
      showToast('Please enter a valid API key', 'error');
    }
  });
  
  
  // Handle vibe mode switching
  manualMode.addEventListener('change', function() {
    if (this.checked) {
      countSettings.classList.remove('show');
      timeSettings.classList.remove('show');
    }
  });
  
  countMode.addEventListener('change', function() {
    if (this.checked) {
      countSettings.classList.add('show');
      timeSettings.classList.remove('show');
    }
  });
  
  timeMode.addEventListener('change', function() {
    if (this.checked) {
      countSettings.classList.remove('show');
      timeSettings.classList.add('show');
    }
  });
  
  // Save vibe mode settings
  saveVibeModeBtn.addEventListener('click', function() {
    let vibeMode = 'manual';
    if (countMode.checked) {
      vibeMode = 'count';
    } else if (timeMode.checked) {
      vibeMode = 'time';
    }
    
    const tweetCount = parseInt(tweetCountInput.value) || 100;
    const timePeriod = parseInt(timePeriodInput.value) || 24;
    
    // Validate inputs
    if (tweetCount < 10 || tweetCount > 1000) {
      showToast('Tweet count must be between 10 and 1000', 'error');
      return;
    }
    
    if (timePeriod < 1 || timePeriod > 168) {
      showToast('Time period must be between 1 and 168 hours', 'error');
      return;
    }
    
    chrome.storage.sync.set({ 
      vibeMode: vibeMode,
      tweetCount: tweetCount,
      timePeriod: timePeriod
    }, function() {
      showToast('Vibe mode settings saved successfully');
      
      // Notify background script about vibe mode change
      chrome.runtime.sendMessage({
        type: 'UPDATE_VIBE_MODE',
        vibeMode: vibeMode,
        tweetCount: tweetCount,
        timePeriod: timePeriod
      });
    });
  });
  
});