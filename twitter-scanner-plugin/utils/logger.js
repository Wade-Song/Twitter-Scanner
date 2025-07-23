// Enhanced logging utility for Twitter Scanner

class Logger {
  constructor(prefix = 'TwitterScanner') {
    this.prefix = prefix;
    this.logLevel = 'info'; // debug, info, warn, error
    this.maxLogEntries = 100;
    this.logEntries = [];
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
    
    return {
      timestamp,
      level,
      message,
      data,
      formattedMessage
    };
  }

  addToHistory(logEntry) {
    this.logEntries.push(logEntry);
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries.shift();
    }
    
    // Store in chrome storage for persistence
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        logEntries: this.logEntries.slice(-50) // Keep last 50 entries
      });
    }
  }

  debug(message, data = null) {
    const logEntry = this.formatMessage('debug', message, data);
    this.addToHistory(logEntry);
    
    if (this.shouldLog('debug')) {
      if (data) {
        console.log(logEntry.formattedMessage, data);
      } else {
        console.log(logEntry.formattedMessage);
      }
    }
  }

  info(message, data = null) {
    const logEntry = this.formatMessage('info', message, data);
    this.addToHistory(logEntry);
    
    if (this.shouldLog('info')) {
      if (data) {
        console.info(logEntry.formattedMessage, data);
      } else {
        console.info(logEntry.formattedMessage);
      }
    }
  }

  warn(message, data = null) {
    const logEntry = this.formatMessage('warn', message, data);
    this.addToHistory(logEntry);
    
    if (this.shouldLog('warn')) {
      if (data) {
        console.warn(logEntry.formattedMessage, data);
      } else {
        console.warn(logEntry.formattedMessage);
      }
    }
  }

  error(message, data = null) {
    const logEntry = this.formatMessage('error', message, data);
    this.addToHistory(logEntry);
    
    if (this.shouldLog('error')) {
      if (data) {
        console.error(logEntry.formattedMessage, data);
      } else {
        console.error(logEntry.formattedMessage);
      }
    }
  }

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  // API call specific logging
  logApiCall(type, url, method, data = null) {
    this.info(`API Call: ${type}`, {
      url,
      method,
      timestamp: new Date().toISOString(),
      dataSize: data ? JSON.stringify(data).length : 0
    });
  }

  logApiResponse(type, status, responseData = null) {
    const level = status >= 400 ? 'error' : 'info';
    this[level](`API Response: ${type}`, {
      status,
      timestamp: new Date().toISOString(),
      responseSize: responseData ? JSON.stringify(responseData).length : 0,
      success: status < 400
    });
  }

  // Usage tracking logging
  logUsage(mode, usage = null) {
    this.info(`Usage: ${mode}`, {
      mode,
      usage,
      timestamp: new Date().toISOString()
    });
  }

  // Tweet extraction logging
  logTweetExtraction(tweetsFound, newTweets, duplicates, errors) {
    this.info('Tweet Extraction', {
      tweetsFound,
      newTweets,
      duplicates,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  logPerformance(operation, startTime, endTime = Date.now()) {
    const duration = endTime - startTime;
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });
  }

  // Get log history
  getLogHistory() {
    return this.logEntries;
  }

  // Export logs for debugging
  exportLogs() {
    const logs = this.getLogHistory();
    const exportData = {
      timestamp: new Date().toISOString(),
      totalEntries: logs.length,
      logs
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Clear log history
  clearLogs() {
    this.logEntries = [];
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove('logEntries');
    }
    this.info('Log history cleared');
  }
}

// Create global logger instances
const backgroundLogger = new Logger('Background');
const contentLogger = new Logger('Content');
const popupLogger = new Logger('Popup');

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Logger, backgroundLogger, contentLogger, popupLogger };
} else if (typeof window !== 'undefined') {
  window.TwitterScannerLogger = { Logger, backgroundLogger, contentLogger, popupLogger };
}