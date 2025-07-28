/**
 * Twitter Scanner 配置
 * 直接修改下面的配置项来自定义您的设置
 */

const API_CONFIG = {
  // 代理服务器配置
  PROXY: {
    BASE_URL: 'https://twitter.talker.cc'
  },

  // Claude API 配置
  ANTHROPIC: {
    BASE_URL: 'https://api.anthropic.com'
  },

  // 请求设置
  SETTINGS: {
    REQUEST_TIMEOUT: 60000,
    MAX_RETRIES: 3,
    DEBUG_MODE: false,
    LOG_LEVEL: 'info'
  }
};

// 导出配置（用于浏览器扩展环境）
if (typeof globalThis !== 'undefined') {
  globalThis.API_CONFIG = API_CONFIG;
}

// 兼容 CommonJS 和 ES6 模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
} 