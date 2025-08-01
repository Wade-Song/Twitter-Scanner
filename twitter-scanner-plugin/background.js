// Background script for Twitter Scanner
console.log('Twitter Scanner background script loaded');

// 导入配置文件和API服务
importScripts('config.js', 'api-service.js');

// Simple logger for background script
const logger = {
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Background] [INFO] ${message}`, data || '');
  },
  error: (message, data) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [Background] [ERROR] ${message}`, data || '');
  },
  warn: (message, data) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [Background] [WARN] ${message}`, data || '');
  }
};

let currentApiKey = null;
let currentApiMode = 'proxy'; // 'proxy' or 'own' - 默认使用服务器代理模式
let usageCount = 0;
const MAX_FREE_USAGE = 50;

// Vibe mode settings - default to count mode with 100 tweets
let currentVibeMode = 'count'; // 'manual', 'count', 'time' - default to count
let currentTweetCount = 100;
let currentTimePeriod = 24; // hours

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.info('Message received', { type: request.type, tweetCount: request.tweets?.length });
  
  if (request.type === 'ANALYZE_TWEETS') {
    // Only check and show warning when actually exceeded
    if (currentApiMode === 'proxy' && usageCount > MAX_FREE_USAGE) {
      logger.warn('Usage limit exceeded', { mode: currentApiMode, usageCount, limit: MAX_FREE_USAGE });
      sendResponse({ 
        success: false, 
        error: `Free usage limit exceeded (${usageCount}/${MAX_FREE_USAGE}). Please configure your own API key.` 
      });
      return true;
    }
    
    // Call Claude API to analyze tweets with template prompt
    analyzeWithClaude(request.tweets, request.templatePrompt)
      .then(result => {
        // Increment usage count for proxy mode
        if (currentApiMode === 'proxy') {
          usageCount++;
          logger.info('Proxy usage updated', { usage: usageCount, limit: MAX_FREE_USAGE });
        }
        logger.info('Analysis completed successfully', { mode: currentApiMode, resultLength: result.length });
        sendResponse({ success: true, analysis: result });
      })
      .catch(error => {
        logger.error('Analysis failed', { mode: currentApiMode, error: error.message });
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
  
  if (request.type === 'UPDATE_API_KEY') {
    currentApiKey = request.apiKey;
    logger.info('API key updated', { hasKey: !!currentApiKey });
  }
  
  if (request.type === 'UPDATE_API_MODE') {
    currentApiMode = request.mode;
    logger.info('API mode updated', { mode: currentApiMode });
  }
  
  if (request.type === 'UPDATE_VIBE_MODE') {
    currentVibeMode = request.vibeMode;
    currentTweetCount = request.tweetCount;
    currentTimePeriod = request.timePeriod;
    logger.info('Vibe mode updated', { 
      mode: currentVibeMode, 
      tweetCount: currentTweetCount, 
      timePeriod: currentTimePeriod 
    });
  }
});

// Load API key, mode, and vibe mode settings on startup
chrome.storage.sync.get(['claudeApiKey', 'apiMode', 'vibeMode', 'tweetCount', 'timePeriod'], function(result) {
  if (result.claudeApiKey) {
    currentApiKey = result.claudeApiKey;
    logger.info('API key loaded from storage', { hasKey: !!currentApiKey });
  }
  
  if (result.apiMode) {
    currentApiMode = result.apiMode;
    logger.info('API mode loaded from storage', { mode: currentApiMode });
  }
  
  if (result.vibeMode) {
    currentVibeMode = result.vibeMode;
    logger.info('Vibe mode loaded from storage', { mode: currentVibeMode });
  } else {
    // Set default vibe mode for new users
    currentVibeMode = 'count';
    logger.info('Using default vibe mode for new user', { mode: currentVibeMode });
  }
  
  if (result.tweetCount) {
    currentTweetCount = result.tweetCount;
    logger.info('Tweet count loaded from storage', { count: currentTweetCount });
  }
  
  if (result.timePeriod) {
    currentTimePeriod = result.timePeriod;
    logger.info('Time period loaded from storage', { hours: currentTimePeriod });
  }
  
  logger.info('Background script initialized', { 
    hasApiKey: !!currentApiKey, 
    mode: currentApiMode,
    vibeMode: currentVibeMode,
    tweetCount: currentTweetCount,
    timePeriod: currentTimePeriod,
    maxFreeUsage: MAX_FREE_USAGE
  });
});



// Function to call Claude API with retry mechanism
async function analyzeWithClaude(tweets, templatePrompt = null) {
  const startTime = Date.now();
  logger.info('Starting tweet analysis', {
    mode: currentApiMode, 
    tweetCount: tweets.length
  });
  
  try {
    let result;
    if (currentApiMode === 'proxy') {
      // Use proxy server
      logger.info('🌐 Using PROXY mode - calling server:', { url: API_CONFIG.PROXY.FULL_URL });
      result = await analyzeWithProxy(tweets, templatePrompt);
    } else {
      // Use own API key
      logger.info('🔑 Using OWN API KEY mode - calling Claude directly');
      result = await analyzeWithOwnKey(tweets, templatePrompt);
    }
    
    logger.info('分析完成', {
      mode: currentApiMode,
      resultLength: result.length
    });
    
    return result;
  } catch (error) {
    logger.error('分析失败', {
      mode: currentApiMode,
      error: error.message
    });
    
    // 如果代理模式失败，尝试使用用户API密钥作为备份
    if (currentApiMode === 'proxy' && currentApiKey) {
      try {
        logger.warn('代理失败，尝试使用用户API密钥');
        const fallbackResult = await analyzeWithOwnKey(tweets, templatePrompt);
        logger.info('备用方案成功');
        return fallbackResult;
      } catch (fallbackError) {
        logger.error('备用方案也失败', { error: fallbackError.message });
        throw new Error(`${error.message}\n\n🔑 API密钥备用方案也失败了：\n${fallbackError.message}`);
      }
    }
    
    throw error;
  }
}

// Function to analyze with proxy server
async function analyzeWithProxy(tweets, templatePrompt = null) {
  // You can set this URL in manifest.json permissions or make it configurable
  const PROXY_URL = API_CONFIG.PROXY.FULL_URL; // 本地 Python FastAPI 后端
  
  try {
    // Use template prompt - this should always be provided now
    let systemPrompt = templatePrompt;
    if (!systemPrompt) {
      // Fallback to default prompt if no template provided
      systemPrompt = getDefaultSystemPrompt();
    }
    
    logger.info('Attempting proxy server analysis', { 
      url: PROXY_URL, 
      tweetCount: tweets.length,
      requestSize: JSON.stringify({ tweets, systemPrompt }).length 
    });
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
    
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        tweets,
        system_prompt: systemPrompt 
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        logger.error('Failed to parse proxy error response', e);
      }
      
      // Log usage information if available
      if (errorData.usage) {
        logger.info('Proxy usage info from error', errorData.usage);
      }
      
      throw new Error(`Proxy server error: ${response.status} - ${errorData.error || errorText}`);
    }
    
    const data = await response.json();
    
    // Log usage information
    if (data.usage) {
      logger.info('Proxy usage after request', {
        current: data.usage.current,
        limit: data.usage.limit,
        remaining: data.usage.remaining
      });
      
      // Store usage info for display
      chrome.storage.local.set({ 
        proxyUsage: data.usage,
        lastUsageUpdate: Date.now()
      });
    }
    
    return data.analysis;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('Proxy server request timeout', { timeout: '2 minutes' });
      throw new Error('⏰ 分析超时\n\n推文数量过多导致处理时间过长。\n\n💡 解决方法：\n• 减少收集的推文数量\n• 检查网络连接稳定性\n• 稍后重试');
    }
    
    logger.error('Proxy server connection failed', { error: error.message });
    
    // Detailed error analysis and user-friendly messages
    let userFriendlyError = '';
    const originalError = error.message;
    
    if (originalError.includes('Failed to fetch') || originalError.includes('NetworkError')) {
      userFriendlyError = `🌐 网络连接问题\n\n可能原因：\n• 网络不稳定或断开\n• 防火墙或代理阻止连接\n• 服务器暂时不可用\n\n💡 解决方法：\n• 检查网络连接\n• 刷新页面后重试\n• 切换网络环境\n• 配置自己的API密钥作为备用`;
    } else if (originalError.includes('CORS') || originalError.includes('cross-origin')) {
      userFriendlyError = `🔒 浏览器安全限制\n\n浏览器阻止了跨域请求。\n\n💡 解决方法：\n• 刷新页面后重试\n• 检查扩展权限设置\n• 配置自己的API密钥`;
    } else if (originalError.includes('DNS') || originalError.includes('resolve')) {
      userFriendlyError = `🌍 域名解析失败\n\n无法访问代理服务器。\n\n💡 解决方法：\n• 检查DNS设置\n• 更换网络环境\n• 配置自己的API密钥`;
    } else {
      userFriendlyError = `⚠️ 代理服务连接失败\n\n服务器可能暂时不可用。\n\n💡 解决方法：\n• 等待1-2分钟后重试\n• 检查网络连接\n• 配置自己的API密钥作为备用方案`;
    }
    
    // Check if user has API key configured for fallback
    const result = await chrome.storage.sync.get(['claudeApiKey']);
    if (result.claudeApiKey) {
      logger.warn('Falling back to user API key due to proxy failure');
      // Temporarily switch to own key mode for this request
      const originalMode = currentApiMode;
      currentApiMode = 'own';
      try {
        const fallbackResult = await analyzeWithOwnKey(tweets, templatePrompt);
        currentApiMode = originalMode; // Restore original mode
        logger.info('Successfully used fallback API key');
        return fallbackResult;
      } catch (fallbackError) {
        currentApiMode = originalMode; // Restore original mode
        throw new Error(`${userFriendlyError}\n\n🔑 API密钥备用方案也失败了：\n${fallbackError.message}\n\n建议：检查API密钥是否正确配置`);
      }
    } else {
      throw new Error(`${userFriendlyError}\n\n🔧 快速解决：\n1. 点击扩展图标\n2. 选择"使用自己的API Key"\n3. 输入Claude API密钥\n\n或者等待代理服务恢复后重试。`);
    }
  }
}

// Function to analyze with own API key
async function analyzeWithOwnKey(tweets, templatePrompt = null) {
  if (!currentApiKey) {
    // Try to get API key from storage
    const result = await chrome.storage.sync.get(['claudeApiKey']);
    if (result.claudeApiKey) {
      currentApiKey = result.claudeApiKey;
    } else {
      throw new Error('No Claude API key configured. Please set it in the extension popup.');
    }
  }
  
  // Use template prompt - this should always be provided now
  let systemPrompt = templatePrompt;
  if (!systemPrompt) {
    // Fallback to default prompt if no template provided
    systemPrompt = getDefaultSystemPrompt();
  }

  const API_KEY = currentApiKey;
  const API_URL = API_CONFIG.ANTHROPIC.FULL_URL;
  
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

// Helper function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Default system prompt function
function getDefaultSystemPrompt() {
  return `✅请帮我筛选有价值的内容来呈现。请用中文，markdown格式输出：

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

// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Scanner installed');
});