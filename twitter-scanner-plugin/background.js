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
    // Use template prompt if provided, otherwise get system prompt from storage
    let systemPrompt = templatePrompt;
    if (!systemPrompt) {
      const systemPromptResult = await chrome.storage.sync.get(['systemPrompt']);
      systemPrompt = systemPromptResult.systemPrompt || null;
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
        const fallbackResult = await analyzeWithOwnKey(tweets);
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


// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Scanner installed');
});