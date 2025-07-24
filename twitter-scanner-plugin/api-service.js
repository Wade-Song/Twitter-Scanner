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

// 默认系统提示词
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

/**
 * 使用代理服务器分析推文
 */
async function analyzeWithProxy(tweets) {
  const PROXY_URL = `${API_CONFIG.PROXY.BASE_URL}/api/analyze`;
  
  try {
    // 获取系统提示词
    const systemPromptResult = await chrome.storage.sync.get(['systemPrompt']);
    const systemPrompt = systemPromptResult.systemPrompt || null;
    
    apiLogger.info('发送代理请求', { 
      url: PROXY_URL, 
      tweetCount: tweets.length,
      requestSize: JSON.stringify({ tweets, systemPrompt }).length 
    });
    
    // 超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟
    
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
      apiLogger.error('请求超时', { timeout: '2分钟' });
      throw new Error('⏰ 分析超时\n\n推文数量过多导致处理时间过长。\n\n💡 解决方法：\n• 减少收集的推文数量\n• 检查网络连接稳定性\n• 稍后重试');
    }
    
    apiLogger.error('代理服务器连接失败', { error: error.message });
    
    // 详细错误分析
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
    
    throw new Error(`${userFriendlyError}\n\n🔧 快速解决：\n1. 点击扩展图标\n2. 选择"使用自己的API Key"\n3. 输入Claude API密钥\n\n或者等待代理服务恢复后重试。`);
  }
}

/**
 * 使用自己的API密钥分析推文
 */
async function analyzeWithOwnKey(tweets, apiKey) {
  // 获取系统提示词
  const systemPromptResult = await chrome.storage.sync.get(['systemPrompt']);
  const systemPrompt = systemPromptResult.systemPrompt || getDefaultSystemPrompt();

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
  
  // 重试机制：最多重试2次
  const maxRetries = 2;
  const retryDelay = 2000; // 2秒
  
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
        
        // 检查是否是可重试的错误（429限流或5xx服务器错误）
        const isRetryableError = response.status === 429 || response.status >= 500;
        
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
async function analyzeTweets(tweets, mode, apiKey = null) {
  const startTime = Date.now();
  apiLogger.info('开始分析推文', { 
    mode, 
    tweetCount: tweets.length,
    startTime: new Date(startTime).toISOString()
  });
  
  try {
    let result;
    if (mode === 'proxy') {
      result = await analyzeWithProxy(tweets);
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
      result = await analyzeWithOwnKey(tweets, apiKey);
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