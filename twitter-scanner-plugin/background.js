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
    
    // Call Claude API to analyze tweets
    analyzeWithClaude(request.tweets)
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



// 分析推文的主函数
async function analyzeWithClaude(tweets) {
  logger.info('开始分析推文', { 
    mode: currentApiMode, 
    tweetCount: tweets.length
  });
  
  try {
    // 使用新的 API 服务
    const result = await ApiService.analyzeTweets(tweets, currentApiMode, currentApiKey);
    
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
        const fallbackResult = await ApiService.analyzeTweets(tweets, 'own', currentApiKey);
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



// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Scanner installed');
});