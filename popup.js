document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const systemPromptInput = document.getElementById('systemPromptInput');
  const saveSystemPromptBtn = document.getElementById('saveSystemPrompt');
  const statusText = document.getElementById('statusText');
  const proxyMode = document.getElementById('proxyMode');
  const ownMode = document.getElementById('ownMode');
  const apiKeyContainer = document.getElementById('apiKeyContainer');
  
  // Load saved API key, system prompt, and API mode
  chrome.storage.sync.get(['claudeApiKey', 'systemPrompt', 'apiMode'], function(result) {
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
      if (apiMode === 'own') {
        statusText.textContent = 'API Key configured';
      }
    }
    
    // Update status based on mode
    updateStatusByMode(apiMode, !!result.claudeApiKey);
    
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
  });
  
  // Function to update status based on mode
  function updateStatusByMode(mode, hasApiKey) {
    if (mode === 'proxy') {
      // Check proxy usage
      chrome.storage.local.get(['proxyUsage'], function(result) {
        if (result.proxyUsage) {
          const { current, limit, remaining } = result.proxyUsage;
          if (current > limit) {
            statusText.textContent = `Free usage exceeded (${current}/${limit})`;
          } else {
            statusText.textContent = 'Using hosted service';
          }
        } else {
          statusText.textContent = 'Using hosted service';
        }
      });
    } else if (mode === 'own') {
      if (hasApiKey) {
        statusText.textContent = 'API Key configured';
      } else {
        statusText.textContent = 'Please configure API key';
      }
    }
  }
  
  // Handle mode switching
  proxyMode.addEventListener('change', function() {
    if (this.checked) {
      apiKeyContainer.style.display = 'none';
      chrome.storage.sync.set({ apiMode: 'proxy' }, function() {
        updateStatusByMode('proxy', false);
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
      chrome.storage.sync.get(['claudeApiKey'], function(result) {
        chrome.storage.sync.set({ apiMode: 'own' }, function() {
          updateStatusByMode('own', !!result.claudeApiKey);
          // Notify background script about mode change
          chrome.runtime.sendMessage({
            type: 'UPDATE_API_MODE',
            mode: 'own'
          });
        });
      });
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