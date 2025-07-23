/**
 * API Configuration for Twitter Scanner
 * 配置文件：统一管理所有API地址
 */

// API 配置
const API_CONFIG = {
  // 后端代理服务地址
  PROXY: {
    BASE_URL: 'http://localhost:3000',
    ANALYZE_ENDPOINT: '/api/analyze',
    get FULL_URL() {
      return `${this.BASE_URL}${this.ANALYZE_ENDPOINT}`;
    }
  },
  
  // Anthropic Claude API 直接调用地址
  ANTHROPIC: {
    BASE_URL: 'https://api.anthropic.com',
    MESSAGES_ENDPOINT: '/v1/messages',
    get FULL_URL() {
      return `${this.BASE_URL}${this.MESSAGES_ENDPOINT}`;
    }
  },
  
  // 其他配置
  SETTINGS: {
    // 请求超时时间（毫秒）
    REQUEST_TIMEOUT: 60000,
    // 最大重试次数
    MAX_RETRIES: 3
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