document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const systemPromptInput = document.getElementById('systemPromptInput');
  const saveSystemPromptBtn = document.getElementById('saveSystemPrompt');
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
  
  // Load saved API key, system prompt, API mode, and vibe mode settings
  chrome.storage.sync.get(['claudeApiKey', 'systemPrompt', 'apiMode', 'vibeMode', 'tweetCount', 'timePeriod'], function(result) {
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
    
    if (result.systemPrompt) {
      systemPromptInput.value = result.systemPrompt;
    } else {
      // Set default system prompt
      systemPromptInput.value = `✅请帮我筛选有价值的内容来呈现。请用中文，markdown格式输出：

"""
### 讨论主题
[作者昵称](作者链接) [【10个字核心观点】]：[推文原文（英文需要翻译成中文）] [查看推文](推文链接)

[作者昵称](作者链接) [【10个字核心观点】]：[推文原文（英文需要翻译成中文）] [查看推文](推文链接)

### 讨论主题
[作者昵称](作者链接) [【10个字核心观点】]：[推文原文（英文需要翻译成中文）] [查看推文](推文链接)
"""

展示排列有如下要求：
1、互联网产品和新的ai技术相关
2、相同主题的内容，放在一起
3、英文的内容，用中文重写之后呈现
4、同一个人的相同内容，综合合并输出

❌ 内容筛选有如下要求：
1、个人生活、日常琐事、情感表达
2、广告推广、纯营销内容
3、政治观点、争议话题
4、很短没有意义的

我关注的一些博主：elon musk , sam altman`;
    }
    
    // Set vibe mode
    const vibeMode = result.vibeMode || 'manual';
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
  
  // Save system prompt
  saveSystemPromptBtn.addEventListener('click', function() {
    const systemPrompt = systemPromptInput.value.trim();
    if (systemPrompt) {
      chrome.storage.sync.set({ systemPrompt: systemPrompt }, function() {
        showToast('System prompt saved successfully');
      });
    } else {
      showToast('Please enter a valid system prompt', 'error');
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