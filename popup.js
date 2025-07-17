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