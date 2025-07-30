/**
 * API Service - 处理所有外部API请求
 */

// 简单的日志工具
const apiLogger = {
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [API] [INFO] ${message}`, data || '');
  },
  error: (message, data) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [API] [ERROR] ${message}`, data || '');
  },
  warn: (message, data) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [API] [WARN] ${message}`, data || '');
  }
};

// 工具函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 生成UUID的函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 获取cookie中的用户ID (兼容不同环境)
async function getUserIdFromCookie() {
  try {
    // 在background script中使用chrome.cookies API
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      return new Promise((resolve) => {
        chrome.cookies.get({
          url: API_CONFIG.PROXY.BASE_URL,
          name: 'twitter_scanner_user_id'
        }, (cookie) => {
          if (cookie && cookie.value) {
            resolve(decodeURIComponent(cookie.value));
          } else {
            resolve(null);
          }
        });
      });
    }
    
    // 在content script中使用document.cookie
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'twitter_scanner_user_id') {
          return decodeURIComponent(value);
        }
      }
    }
  } catch (error) {
    apiLogger.error('Error reading cookie', error);
  }
  
  return null;
}

// 调试函数 - 检查存储状态
async function debugUserIdStorage() {
  try {
    const allStorage = await chrome.storage.local.get(null);
    apiLogger.info('Current chrome.storage.local contents:', allStorage);
    
    const cookieUserId = await getUserIdFromCookie();
    apiLogger.info('Cookie user ID:', { cookieUserId });
    
    return { storage: allStorage, cookie: cookieUserId };
  } catch (error) {
    apiLogger.error('Debug storage error:', error);
    return { error: error.message };
  }
}

// 获取或创建用户ID
async function getUserId() {
  try {
    // 调试信息
    apiLogger.info('getUserId called, checking storage...');
    
    // 优先从chrome.storage读取（先sync后local）
    let result = await chrome.storage.sync.get(['userId']);
    if (!result.userId) {
      result = await chrome.storage.local.get(['userId']);
    }
    apiLogger.info('Storage check result:', result);
    
    if (result.userId && result.userId !== 'null' && result.userId !== 'undefined') {
      apiLogger.info('Found existing user ID in storage', { userId: result.userId });
      return result.userId;
    }
    
    // 如果storage中没有，尝试从cookie获取
    const cookieUserId = await getUserIdFromCookie();
    if (cookieUserId && cookieUserId !== 'null' && cookieUserId !== 'undefined') {
      apiLogger.info('Found user ID in cookie, syncing to storage', { userId: cookieUserId });
      // 同步到chrome.storage (使用sync而不是local以获得更好的持久化)
      try {
        await chrome.storage.sync.set({ userId: cookieUserId });
        apiLogger.info('Stored user ID in chrome.storage.sync');
      } catch (e) {
        apiLogger.warn('Failed to store in sync, trying local', e);
        await chrome.storage.local.set({ userId: cookieUserId });
      }
      
      // 验证存储成功
      const verifyResult = await chrome.storage.local.get(['userId']) || await chrome.storage.sync.get(['userId']);
      apiLogger.info('Storage verification after sync:', verifyResult);
      return cookieUserId;
    }
    
    // 如果都没有，生成新的UUID并存储
    const newUserId = generateUUID();
    apiLogger.info('No existing user ID found, generating new one', { userId: newUserId });
    
    // 尝试存储到sync，失败则存储到local
    try {
      await chrome.storage.sync.set({ userId: newUserId });
      apiLogger.info('Stored new user ID in chrome.storage.sync');
    } catch (e) {
      apiLogger.warn('Failed to store in sync, trying local', e);
      await chrome.storage.local.set({ userId: newUserId });
    }
    
    // 验证存储成功
    let verifyResult = await chrome.storage.sync.get(['userId']);
    if (!verifyResult.userId) {
      verifyResult = await chrome.storage.local.get(['userId']);
    }
    apiLogger.info('Storage verification after generation:', verifyResult);
    
    if (verifyResult.userId === newUserId) {
      apiLogger.info('Successfully generated and stored new user ID', { userId: newUserId });
    } else {
      apiLogger.error('Storage verification failed!', { expected: newUserId, actual: verifyResult.userId });
    }
    
    return newUserId;
    
  } catch (error) {
    apiLogger.error('Error managing user ID', error);
    // 降级方案：生成临时UUID（不存储）
    const tempUserId = generateUUID();
    apiLogger.warn('Using temporary user ID (not stored)', { userId: tempUserId });
    return tempUserId;
  }
}

// 默认系统提示词
function getDefaultSystemPrompt() {
  return `帮我从Twitter List中，找到大家都在讨论的一些话题，给到我一些洞见和启发。内容用中文输出

流程：
1、请先浏览我给你的全部Twitter
2、帮我筛选出大家在讨论的热点话题，这个话题需要是一个具体的事件，而不是笼统抽象的概述。例如应该是"阿里新发布的Qwen3模型"，而不是"AI模型发展"。
3、按照话题来分类，每个话题聚合相关的讨论
4、每个讨论中，列举参与讨论的人的核心观点
5、话题的呈现按照讨论的人数倒序排列，优先呈现讨论人数更多的话题

输出格式：
1、markdown格式输出
2、用中文输出
3、链接需要是可点击形式，在“作者”和“原文”这两部分分别加上作者主页的地址链接，和原推文的链接

"""
### 话题
[作者昵称](作者链接) [20字以内核心观点] [查看推文](推文链接)

[作者昵称](作者链接) [20字以内核心观点] [查看推文](推文链接)

### 话题
[作者昵称](作者链接) [20字以内核心观点] [查看推文](推文链接)
"""

❌ 内容筛选有如下要求：
1、个人生活、日常琐事、情感表达
2、广告推广、纯营销内容
3、政治观点、争议话题
4、很短没有意义的`;
}

/**
 * 使用代理服务器分析推文
 */
async function analyzeWithProxy(tweets, templatePrompt = null) {
  const PROXY_URL = `${API_CONFIG.PROXY.BASE_URL}/api/analyze`;
  const maxRetries = 2;
  const retryDelay = 3000; // 3秒
  
  // 获取用户ID
  const userId = await getUserId();
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 使用传入的模板提示词或从存储获取系统提示词
      let systemPrompt = templatePrompt;
      if (!systemPrompt) {
        const systemPromptResult = await chrome.storage.sync.get(['systemPrompt']);
        systemPrompt = systemPromptResult.systemPrompt || getDefaultSystemPrompt();
      }
      
      apiLogger.info('发送代理请求', { 
        url: PROXY_URL, 
        userId: userId,
        tweetCount: tweets.length,
        requestSize: JSON.stringify({ tweets, systemPrompt, userId }).length,
        attempt: attempt + 1
      });
      
      // 超时控制 - 增加到3分钟以匹配后端处理时间
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3分钟
      
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({ 
          tweets,
          system_prompt: systemPrompt,
          user_id: userId
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
          apiLogger.error('解析错误响应失败', e);
        }
        
        if (errorData.usage) {
          apiLogger.info('使用量信息', errorData.usage);
        }
        
        throw new Error(`代理服务器错误: ${response.status} - ${errorData.error || errorText}`);
      }
      
      const data = await response.json();
      
      // 记录使用量信息
      if (data.usage) {
        apiLogger.info('请求后使用量', {
          current: data.usage.current,
          limit: data.usage.limit,
          remaining: data.usage.remaining
        });
        
        // 存储使用量信息
        chrome.storage.local.set({ 
          proxyUsage: data.usage,
          lastUsageUpdate: Date.now()
        });
      }
      
      return data.analysis;
    
    } catch (error) {
      if (error.name === 'AbortError') {
        apiLogger.error('请求超时', { timeout: '3分钟', attempt: attempt + 1 });
        if (attempt < maxRetries) {
          apiLogger.info(`请求超时，等待 ${retryDelay}ms 后重试 ${attempt + 1}...`);
          await sleep(retryDelay);
          continue;
        }
        throw new Error('⏰ 分析超时\n\n推文数量过多导致处理时间过长。\n\n💡 解决方法：\n• 减少收集的推文数量\n• 检查网络连接稳定性\n• 稍后重试');
      }
      
      apiLogger.error('代理服务器连接失败', { error: error.message, attempt: attempt + 1 });
      
      // 检查是否是可重试的错误
      const isRetryableError = (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('DNS') ||
        error.message.includes('timeout') ||
        error.message.includes('代理服务器错误: 429') ||
        error.message.includes('代理服务器错误: 5')
      );
      
      if (isRetryableError && attempt < maxRetries) {
        apiLogger.info(`网络错误或服务器错误，等待 ${retryDelay}ms 后重试 ${attempt + 1}...`);
        await sleep(retryDelay);
        continue;
      }
      
      // 详细错误分析
      let userFriendlyError = '';
      const originalError = error.message;
      
      if (originalError.includes('Failed to fetch') || originalError.includes('NetworkError')) {
        userFriendlyError = `🌐 网络连接问题\n\n可能原因：\n• 网络不稳定或断开\n• 防火墙或代理阻止连接\n• 服务器暂时不可用\n\n💡 解决方法：\n• 检查网络连接\n• 刷新页面后重试\n• 切换网络环境\n• 配置自己的API密钥作为备用`;
      } else if (originalError.includes('CORS') || originalError.includes('cross-origin')) {
        userFriendlyError = `🔒 浏览器安全限制\n\n浏览器阻止了跨域请求。\n\n💡 解决方法：\n• 刷新页面后重试\n• 检查扩展权限设置\n• 配置自己的API密钥`;
      } else if (originalError.includes('DNS') || originalError.includes('resolve')) {
        userFriendlyError = `🌍 域名解析失败\n\n无法访问代理服务器。\n\n💡 解决方法:\n• 检查DNS设置\n• 更换网络环境\n• 配置自己的API密钥`;
      } else {
        userFriendlyError = `⚠️ 代理服务连接失败\n\n服务器可能暂时不可用。\n\n💡 解决方法：\n• 等待1-2分钟后重试\n• 检查网络连接\n• 配置自己的API密钥作为备用方案`;
      }
      
      throw new Error(`${userFriendlyError}\n\n🔧 快速解决：\n1. 点击扩展图标\n2. 选择"使用自己的API Key"\n3. 输入Claude API密钥\n\n或者等待代理服务恢复后重试。\n\n📊 重试统计：已尝试 ${attempt + 1}/${maxRetries + 1} 次`);
    }
  }
}

/**
 * 使用自己的API密钥分析推文
 */
async function analyzeWithOwnKey(tweets, apiKey, templatePrompt = null) {
  // 使用传入的模板提示词或从存储获取系统提示词
  let systemPrompt = templatePrompt;
  if (!systemPrompt) {
    const systemPromptResult = await chrome.storage.sync.get(['systemPrompt']);
    systemPrompt = systemPromptResult.systemPrompt || getDefaultSystemPrompt();
  }

  const API_URL = `${API_CONFIG.ANTHROPIC.BASE_URL}/v1/messages`;
  
  apiLogger.info('调用Claude API', {
    url: API_URL,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT_SET',
    tweetCount: tweets.length
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
  
  // 重试机制：最多重试2次（与代理请求保持一致）
  const maxRetries = 2;
  const retryDelay = 3000; // 3秒（与代理请求保持一致）
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      apiLogger.info(`Claude API 尝试 ${attempt}/${maxRetries + 1}`, {
        url: API_URL,
        method: 'POST'
      });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      apiLogger.info('收到响应', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          apiLogger.error('解析错误响应失败', e);
        }
        
        const error = new Error(`API请求失败: ${response.status} - ${errorData.error?.message || errorText || '未知错误'}`);
        error.status = response.status;
        error.attempt = attempt;
        
        // 检查是否是可重试的错误（429限流、529或5xx服务器错误）
        const isRetryableError = response.status === 429 || response.status === 529 || response.status >= 500;
        
        if (isRetryableError && attempt <= maxRetries) {
          apiLogger.info(`可重试错误 (${response.status})，等待 ${retryDelay}ms 后重试 ${attempt}...`);
          await sleep(retryDelay);
          continue;
        } else {
          throw error;
        }
      }

      const data = await response.json();
      apiLogger.info(`Claude API 响应成功，尝试 ${attempt}`, {
        hasContent: !!(data.content && data.content[0]),
        textLength: data.content?.[0]?.text?.length || 0
      });
      
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      } else {
        throw new Error('Claude API 响应格式无效');
      }
      
    } catch (error) {
      apiLogger.error(`Claude API 错误，尝试 ${attempt}`, {
        error: error.message,
        name: error.name,
        status: error.status,
        attempt: attempt
      });
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries + 1) {
        throw error;
      }
      
      // 对于网络错误，等待后重试
      if (!error.status) {
        apiLogger.info(`网络错误，等待 ${retryDelay}ms 后重试 ${attempt}...`);
        await sleep(retryDelay);
      }
    }
  }
}

/**
 * 分析推文的主入口函数
 */
async function analyzeTweets(tweets, mode, apiKey = null, templatePrompt = null) {
  const startTime = Date.now();
  apiLogger.info('开始分析推文', { 
    mode, 
    tweetCount: tweets.length,
    startTime: new Date(startTime).toISOString()
  });
  
  try {
    let result;
    if (mode === 'proxy') {
      result = await analyzeWithProxy(tweets, templatePrompt);
    } else {
      if (!apiKey) {
        // 尝试从存储获取API密钥
        const storageResult = await chrome.storage.sync.get(['claudeApiKey']);
        if (storageResult.claudeApiKey) {
          apiKey = storageResult.claudeApiKey;
        } else {
          throw new Error('未配置Claude API密钥，请在扩展弹窗中设置。');
        }
      }
      result = await analyzeWithOwnKey(tweets, apiKey, templatePrompt);
    }
    
    const endTime = Date.now();
    apiLogger.info('分析完成', {
      mode,
      duration: endTime - startTime,
      resultLength: result.length
    });
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    apiLogger.error('分析失败', {
      mode,
      duration: endTime - startTime,
      error: error.message
    });
    throw error;
  }
}

// 导出API服务
if (typeof globalThis !== 'undefined') {
  globalThis.ApiService = {
    analyzeTweets,
    analyzeWithProxy,
    analyzeWithOwnKey
  };
} 