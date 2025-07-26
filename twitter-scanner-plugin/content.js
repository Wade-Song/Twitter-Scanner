// Twitter Scanner Content Script
console.log('Twitter Scanner content script loaded');

// Prompt templates for different analysis modes
const PROMPT_TEMPLATES = {
  directory: {
    id: 'directory',
    title: '目录式概览',
    description: '从Twitter中找到大家讨论的热点话题，按话题分类聚合相关讨论',
    prompt: `帮我从Twitter List中，找到大家都在讨论的一些话题。按话题分类聚合相关讨论，生成一个目录式的概览。

要求：
1. 识别热门讨论话题
2. 按主题分类整理
3. 每个话题下列出相关讨论
4. 突出核心观点和见解`,
    preview: `阿里新发布的Qwen3模型
张三：对新模型的多模态能力表示惊讶
李四：认为在代码生成方面有显著提升

开源AI工具推荐
王五：分享了几个实用的AI写作工具
赵六：推荐了新的图像生成模型`
  },
  viewpoint: {
    id: 'viewpoint',
    title: '观点梳理',
    description: '整理不同用户对同一话题的观点，呈现多元化的讨论视角',
    prompt: `请帮我梳理Twitter List中大家对各个话题的不同观点和看法。

要求：
1. 提取关键观点和立场
2. 整理不同用户的见解
3. 突出有价值的思考角度
4. 展现讨论的多样性`,
    preview: `关于AI替代工作的讨论：

支持观点：
• AI能提高效率，创造新机会
• 技术进步是历史必然趋势

担忧观点：  
• 可能导致大规模失业
• 需要政策保护劳动者权益`
  },
  product: {
    id: 'product',
    title: '新产品发现',
    description: '发现和整理最新的产品发布、工具推荐和技术创新',
    prompt: `帮我从Twitter List中发现和整理最新的产品、工具和技术创新。

要求：
1. 识别新产品发布信息
2. 整理工具推荐和使用心得
3. 突出创新特点和价值
4. 提供相关链接和资源`,
    preview: `新发布产品：

Claude Desktop App
• 官方桌面应用正式发布
• 支持文件拖拽和本地处理
• 用户反馈界面简洁好用

Figma AI设计助手
• 智能生成设计稿
• 支持自然语言描述需求`
  },
  meme: {
    id: 'meme',
    title: 'meme分析',
    description: '分析网络热梗、流行文化和社交媒体趋势',
    prompt: `请帮我分析Twitter List中的网络热梗、流行文化现象和社交媒体趋势。

要求：
1. 识别正在流行的meme和梗
2. 分析其传播背景和含义
3. 整理相关的文化现象
4. 解读社交媒体趋势`,
    preview: `最新热梗分析：

"AI社畜"
• 起源：程序员用AI写代码被调侃
• 传播：各行业都有类似现象
• 含义：对AI时代工作方式的思考

"数字游民"话题
• 远程工作成为讨论热点
• 分享海外工作生活经验`
  }
};

// Initialize logger
const logger = window.TwitterScannerLogger ? window.TwitterScannerLogger.contentLogger : {
  info: (msg, data) => console.log(`[Content] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[Content] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[Content] ${msg}`, data || '')
};

class TwitterScanner {
  constructor() {
    this.isScanning = false;
    this.isAnalyzing = false; // Add analyzing state tracking
    this.scanInterval = null;
    this.collectedTweets = [];
    this.sidebar = null;
    this.vibeButton = null;
    this.stopButton = null;
    this.sidebarOpen = false;
    this.countdownInterval = null;
    this.currentScrollPosition = 0;
    this.scrollStep = window.innerHeight; // One viewport height per scroll
    this.isProgressiveScrolling = false;
    
    // Template management
    this.currentTemplate = 'directory'; // Default template
    this.isTemplateMode = false; // Whether we're in template selection mode
    this.tempSelectedTemplate = null; // Temporary selection before confirmation
    
    // Vibe mode settings - default to count mode with 100 tweets
    this.vibeMode = 'count'; // 'manual', 'count', 'time' - default to count
    this.targetTweetCount = 100;
    this.targetTimePeriod = 24; // hours
    this.scanStartTime = null;
    this.lastBatchTweets = []; // Track tweets from latest extraction batch
    
    // Sidebar resizing properties
    this.minWidth = 300; // Minimum width in pixels
    this.maxWidth = window.innerWidth * 0.8; // Maximum 80% of screen width
    this.sidebarWidth = this.loadSidebarWidth(); // Load saved width or default
    this.isDragging = false;
    this.dragHandle = null;
    this.widthTooltip = null;
    
    this.init();
  }
  
  // Generate random interval between 0.3-1 seconds for progressive scrolling
  getRandomScrollInterval() {
    return Math.floor(Math.random() * 700) + 300; // 300-1000ms (0.3-1s)
  }
  
  // Generate random interval between 1-5 seconds for tweet collection cycles
  getRandomInterval() {
    return Math.floor(Math.random() * 4000) + 1000; // 1000-5000ms
  }
  
  // Load sidebar width from localStorage
  loadSidebarWidth() {
    try {
      const savedWidth = localStorage.getItem('twitter-scanner-sidebar-width');
      if (savedWidth && !isNaN(parseInt(savedWidth))) {
        const width = parseInt(savedWidth);
        const minWidth = this.minWidth || 300;
        const maxWidth = this.maxWidth || (window.innerWidth * 0.8);
        return Math.max(minWidth, Math.min(width, maxWidth));
      }
    } catch (error) {
      console.log('Failed to load sidebar width:', error);
    }
    // Default to 50% of viewport width, but constrained
    const defaultWidth = Math.min(window.innerWidth * 0.5, 600);
    return Math.max(300, defaultWidth);
  }
  
  // Save sidebar width to localStorage
  saveSidebarWidth(width) {
    try {
      localStorage.setItem('twitter-scanner-sidebar-width', width.toString());
    } catch (error) {
      console.log('Failed to save sidebar width:', error);
    }
  }
  
  init() {
    // Load vibe mode settings first
    this.loadVibeSettings(() => {
      // Wait for page to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    });
  }
  
  loadVibeSettings(callback) {
    chrome.storage.sync.get(['vibeMode', 'tweetCount', 'timePeriod'], (result) => {
      this.vibeMode = result.vibeMode || 'count'; // Default to count mode
      this.targetTweetCount = result.tweetCount || 100;
      this.targetTimePeriod = result.timePeriod || 24;
      
      console.log('Vibe mode settings loaded:', {
        mode: this.vibeMode,
        tweetCount: this.targetTweetCount,
        timePeriod: this.targetTimePeriod
      });
      
      if (callback) callback();
    });
  }
  
  setup() {
    this.createButtons();
    this.createSidebar();
    this.setupEventListeners();
    this.setupMessageListener();
  }
  
  setupMessageListener() {
    // Listen for vibe mode updates from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'UPDATE_VIBE_MODE') {
        this.vibeMode = request.vibeMode;
        this.targetTweetCount = request.tweetCount;
        this.targetTimePeriod = request.timePeriod;
        
        console.log('Vibe mode updated from popup:', {
          mode: this.vibeMode,
          tweetCount: this.targetTweetCount,
          timePeriod: this.targetTimePeriod
        });
      }
    });
  }
  
  createButtons() {
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'twitter-scanner-buttons';
    buttonContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create adaptive action button (vibe reading / stop)
    this.vibeButton = document.createElement('button');
    this.vibeButton.textContent = 'vibe reading';
    this.vibeButton.style.cssText = `
      background: linear-gradient(45deg, #4A99E9, #1D9BF0);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(74, 153, 233, 0.3);
    `;
    
    // Create stop button
    this.stopButton = document.createElement('button');
    this.stopButton.textContent = 'stop';
    this.stopButton.style.cssText = `
      background: linear-gradient(45deg, #e74c3c, #c0392b);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
      display: none;
    `;
    
    // Create panel button (initially shown) - Circular theme color design
    this.expandButton = document.createElement('button');
    this.expandButton.innerHTML = `
      <svg viewBox="0 0 1088 1024" width="20" height="20" style="fill: white; display: block;">
        <path d="M960 0a128 128 0 0 1 128 128v768a128 128 0 0 1-128 128H128a128 128 0 0 1-128-128V128a128 128 0 0 1 128-128h832z m-314.112 89.6H128a38.4 38.4 0 0 0-38.4 38.4v768a38.4 38.4 0 0 0 38.4 38.4h517.888A127.936 127.936 0 0 1 640 896V128c0-13.376 2.048-26.24 5.888-38.4zM915.2 640h-102.4a44.8 44.8 0 1 0 0 89.6h102.4a44.8 44.8 0 1 0 0-89.6z m0-192h-102.4a44.8 44.8 0 1 0 0 89.6h102.4a44.8 44.8 0 1 0 0-89.6z m0-192h-102.4a44.8 44.8 0 1 0 0 89.6h102.4a44.8 44.8 0 1 0 0-89.6z"/>
      </svg>
    `;
    this.expandButton.style.cssText = `
      width: 48px;
      height: 48px;
      min-width: 48px;
      min-height: 48px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(45deg, #4A99E9, #1D9BF0);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 32px rgba(74, 153, 233, 0.4), 
                  0 2px 8px rgba(74, 153, 233, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 0;
      margin: 0;
      text-align: center;
      vertical-align: middle;
    `;
    
    // Create close button (hidden initially)
    this.closeButton = document.createElement('button');
    this.closeButton.textContent = 'close';
    this.closeButton.style.cssText = `
      background: linear-gradient(45deg, #666, #555);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 102, 102, 0.3);
      display: none;
    `;
    
    // Add hover effects for external buttons
    this.vibeButton.addEventListener('mouseenter', () => {
      this.vibeButton.style.transform = 'translateY(-2px)';
      const currentShadow = this.vibeButton.style.boxShadow;
      this.vibeButton.style.boxShadow = currentShadow.replace('0.3)', '0.4)');
    });
    this.vibeButton.addEventListener('mouseleave', () => {
      this.vibeButton.style.transform = 'translateY(0)';
      const currentShadow = this.vibeButton.style.boxShadow;
      this.vibeButton.style.boxShadow = currentShadow.replace('0.4)', '0.3)');
    });
    
    // Add hover effects for stop and close buttons
    [this.stopButton, this.closeButton].forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        const currentShadow = button.style.boxShadow;
        button.style.boxShadow = currentShadow.replace('0.3)', '0.4)');
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        const currentShadow = button.style.boxShadow;
        button.style.boxShadow = currentShadow.replace('0.4)', '0.3)');
      });
    });
    
    // Special hover effect for circular panel button
    this.expandButton.addEventListener('mouseenter', () => {
      this.expandButton.style.transform = 'scale(1.08)';
      this.expandButton.style.background = 'linear-gradient(45deg, #1D9BF0, #0078d4)';
      this.expandButton.style.boxShadow = `
        0 12px 40px rgba(74, 153, 233, 0.5), 
        0 4px 12px rgba(74, 153, 233, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3)
      `;
    });
    
    this.expandButton.addEventListener('mouseleave', () => {
      this.expandButton.style.transform = 'scale(1)';
      this.expandButton.style.background = 'linear-gradient(45deg, #4A99E9, #1D9BF0)';
      this.expandButton.style.boxShadow = `
        0 8px 32px rgba(74, 153, 233, 0.4), 
        0 2px 8px rgba(74, 153, 233, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.2)
      `;
    });
    
    buttonContainer.appendChild(this.vibeButton);
    buttonContainer.appendChild(this.stopButton);
    buttonContainer.appendChild(this.expandButton);
    buttonContainer.appendChild(this.closeButton);
    document.body.appendChild(buttonContainer);
  }
  
  createSidebar() {
    // Ensure width is valid before creating sidebar
    if (!this.sidebarWidth || isNaN(this.sidebarWidth) || this.sidebarWidth < this.minWidth) {
      console.warn('Invalid sidebar width detected, resetting to default');
      this.sidebarWidth = Math.max(300, Math.min(window.innerWidth * 0.5, 600));
      this.saveSidebarWidth(this.sidebarWidth);
    }
    
    console.log('Creating sidebar with width:', this.sidebarWidth);
    
    // Create sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'twitter-scanner-sidebar';
    this.sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: -${this.sidebarWidth}px;
      width: ${this.sidebarWidth}px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      transition: right 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
    `;
    
    // Create drag handle
    this.dragHandle = document.createElement('div');
    this.dragHandle.id = 'sidebar-drag-handle';
    this.dragHandle.style.cssText = `
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 60px;
      background: #4A99E9;
      cursor: ew-resize;
      border-radius: 0 3px 3px 0;
      opacity: 0.7;
      transition: all 0.2s ease;
      z-index: 10001;
    `;
    
    // Create width tooltip
    this.widthTooltip = document.createElement('div');
    this.widthTooltip.id = 'sidebar-width-tooltip';
    this.widthTooltip.style.cssText = `
      position: absolute;
      left: -60px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 10002;
    `;
    this.updateTooltipText();
    this.dragHandle.appendChild(this.widthTooltip);
    
    // Add hover effect to drag handle
    this.dragHandle.addEventListener('mouseenter', () => {
      this.dragHandle.style.opacity = '1';
      this.dragHandle.style.width = '6px';
      this.dragHandle.style.background = '#1D9BF0';
      this.widthTooltip.style.opacity = '1';
    });
    
    this.dragHandle.addEventListener('mouseleave', () => {
      if (!this.isDragging) {
        this.dragHandle.style.opacity = '0.7';
        this.dragHandle.style.width = '4px';
        this.dragHandle.style.background = '#4A99E9';
        this.widthTooltip.style.opacity = '0';
      }
    });
    
    // Setup drag functionality
    this.setupDragHandlers();
    
    this.sidebar.appendChild(this.dragHandle);
    
    // Create compact header with Twitter theme
    const sidebarHeader = document.createElement('div');
    sidebarHeader.style.cssText = `
      background: #4A99E9;
      color: white;
      padding: 16px 20px;
      border-radius: 8px 8px 0 0;
    `;
    
    // Header with title and internal action buttons
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    `;
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Twitter-Scanner';
    headerTitle.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: white;
    `;
    
    // Internal button container - matches external button positions
    const internalButtonContainer = document.createElement('div');
    internalButtonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      align-items: center;
    `;
    
    // Internal vibe reading button (matches external position)
    this.internalVibeButton = document.createElement('button');
    this.internalVibeButton.textContent = 'vibe reading';
    this.internalVibeButton.style.cssText = `
      background: linear-gradient(45deg, #4A99E9, #1D9BF0);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(74, 153, 233, 0.3);
    `;
    
    // Internal close button (matches external expand position)
    this.internalCloseButton = document.createElement('button');
    this.internalCloseButton.textContent = '×';
    this.internalCloseButton.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      color: white;
      padding: 4px 8px;
      transition: all 0.2s ease;
    `;
    
    // Add hover effects to internal buttons
    this.internalVibeButton.addEventListener('mouseenter', () => {
      if (!this.internalVibeButton.disabled) {
        this.internalVibeButton.style.transform = 'translateY(-2px)';
        this.internalVibeButton.style.boxShadow = '0 6px 20px rgba(74, 153, 233, 0.4)';
        this.internalVibeButton.style.border = '2px solid rgba(255, 255, 255, 0.6)';
      }
    });
    this.internalVibeButton.addEventListener('mouseleave', () => {
      if (!this.internalVibeButton.disabled) {
        this.internalVibeButton.style.transform = 'translateY(0)';
        this.internalVibeButton.style.boxShadow = '0 4px 15px rgba(74, 153, 233, 0.3)';
        this.internalVibeButton.style.border = '2px solid rgba(255, 255, 255, 0.3)';
      }
    });
    
    this.internalCloseButton.addEventListener('mouseenter', () => {
      this.internalCloseButton.style.background = 'rgba(255,255,255,0.3)';
    });
    this.internalCloseButton.addEventListener('mouseleave', () => {
      this.internalCloseButton.style.background = 'rgba(255,255,255,0.2)';
    });
    
    // Add click listeners
    this.internalVibeButton.addEventListener('click', () => {
      // Don't allow clicks during analyzing
      if (this.isAnalyzing) {
        console.log('🚫 Button disabled during analysis');
        return;
      }
      
      if (this.isScanning) {
        this.stopScanning();
      } else {
        this.startScanning();
      }
    });
    this.internalCloseButton.addEventListener('click', () => this.closeSidebar());
    
    internalButtonContainer.appendChild(this.internalVibeButton);
    internalButtonContainer.appendChild(this.internalCloseButton);
    
    headerRow.appendChild(headerTitle);
    headerRow.appendChild(internalButtonContainer);
    
    // Status and tabs row
    const statusTabRow = document.createElement('div');
    statusTabRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    `;
    
    // Compact status
    const statusArea = document.createElement('div');
    statusArea.id = 'status-area';
    statusArea.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    `;
    
    const statusContent = document.createElement('div');
    statusContent.id = 'status-content';
    statusContent.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    `;
    statusContent.innerHTML = `
      <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; flex-shrink: 0;"></div>
      <span style="font-size: 13px; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Ready</span>
    `;
    
    // Add CSS animations for pulse, stop button effects, and analyzing state
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes stopGlow {
        0%, 100% { 
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4), 0 0 0 0 rgba(239, 68, 68, 0.6);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.6), 0 0 0 4px rgba(239, 68, 68, 0.3);
          transform: scale(1.05);
        }
      }
      @keyframes analyzingPulse {
        0%, 100% { 
          opacity: 0.8;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        }
        50% { 
          opacity: 0.6;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.2);
        }
      }
    `;
    document.head.appendChild(style);
    
    statusArea.appendChild(statusContent);
    
    // Compact tab container
    const tabContainer = document.createElement('div');
    tabContainer.style.cssText = `
      display: flex;
      background: rgba(255,255,255,0.15);
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    `;
    
    // Twitter content tab
    const rawTab = document.createElement('button');
    rawTab.id = 'raw-tab';
    rawTab.textContent = 'Twitter';
    rawTab.style.cssText = `
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: rgba(255,255,255,0.9);
      color: #1e40af;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      position: relative;
    `;
    
    // Analysis tab
    const analysisTab = document.createElement('button');
    analysisTab.id = 'analysis-tab';
    analysisTab.textContent = 'Analysis';
    analysisTab.style.cssText = `
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    `;
    
    // Template tab
    const templateTab = document.createElement('button');
    templateTab.id = 'template-tab';
    templateTab.textContent = 'Template';
    templateTab.style.cssText = `
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    `;
    
    // Add tab event listeners
    rawTab.addEventListener('click', () => this.switchTab('raw'));
    analysisTab.addEventListener('click', () => this.switchTab('analysis'));
    templateTab.addEventListener('click', () => this.switchTab('template'));
    
    
    tabContainer.appendChild(rawTab);
    tabContainer.appendChild(analysisTab);
    tabContainer.appendChild(templateTab);
    
    statusTabRow.appendChild(statusArea);
    statusTabRow.appendChild(tabContainer);
    
    sidebarHeader.appendChild(headerRow);
    sidebarHeader.appendChild(statusTabRow);
    
    // Create sidebar content with tab areas
    const sidebarContent = document.createElement('div');
    sidebarContent.id = 'sidebar-content';
    sidebarContent.style.cssText = `
      flex: 1;
      overflow: hidden;
      background: #ffffff;
      position: relative;
    `;
    
    // Raw content tab content
    const rawContent = document.createElement('div');
    rawContent.id = 'raw-content';
    rawContent.style.cssText = `
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      display: block;
    `;
    
    // Analysis content tab content
    const analysisContent = document.createElement('div');
    analysisContent.id = 'analysis-content-tab';
    analysisContent.style.cssText = `
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      display: none;
    `;
    
    // Template content tab content
    const templateContent = document.createElement('div');
    templateContent.id = 'template-content-tab';
    templateContent.style.cssText = `
      height: 100%;
      overflow-y: auto;
      padding: 20px;
      display: none;
    `;
    
    // Create initial message for raw content
    const initialMessage = document.createElement('div');
    initialMessage.id = 'initial-message';
    initialMessage.style.cssText = `
      text-align: center;
      color: #64748b;
      padding: 60px 20px;
      font-size: 15px;
      line-height: 1.6;
    `;
    initialMessage.innerHTML = `
      <div style="margin-bottom: 20px; font-size: 48px; opacity: 0.3;">📊</div>
      <div style="font-weight: 600; margin-bottom: 12px; color: #334155;">Waiting</div>
      <div>Click "vibe reading" to start scanning</div>
      <div>Collected tweets will appear here</div>
    `;
    
    // Create initial message for analysis content
    const analysisInitialMessage = document.createElement('div');
    analysisInitialMessage.id = 'analysis-initial-message';
    analysisInitialMessage.style.cssText = `
      text-align: center;
      color: #64748b;
      padding: 60px 20px;
      font-size: 15px;
      line-height: 1.6;
    `;
    analysisInitialMessage.innerHTML = `
      <div style="margin-bottom: 20px; font-size: 48px; opacity: 0.3;">🤖</div>
      <div style="font-weight: 600; margin-bottom: 12px; color: #334155;">Waiting</div>
      <div>Analysis results will appear here</div>
    `;
    
    // Create template selection UI
    this.createTemplateSelectionUI(templateContent);
    
    rawContent.appendChild(initialMessage);
    analysisContent.appendChild(analysisInitialMessage);
    sidebarContent.appendChild(rawContent);
    sidebarContent.appendChild(analysisContent);
    sidebarContent.appendChild(templateContent);
    
    // Initialize current tab
    this.currentTab = 'raw';
    this.sidebar.appendChild(sidebarHeader);
    this.sidebar.appendChild(sidebarContent);
    document.body.appendChild(this.sidebar);
    
  }
  
  // Setup drag handlers for sidebar resizing
  setupDragHandlers() {
    let startX, startWidth;
    
    const onMouseDown = (e) => {
      this.isDragging = true;
      startX = e.clientX;
      startWidth = this.sidebarWidth;
      
      // Update drag handle appearance
      this.dragHandle.style.opacity = '1';
      this.dragHandle.style.width = '6px';
      this.dragHandle.style.background = '#1D9BF0';
      
      // Show tooltip during drag
      this.widthTooltip.style.opacity = '1';
      
      // Disable sidebar transition during drag
      this.sidebar.style.transition = 'none';
      
      // Add cursor and selection prevention
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      
      // Prevent text selection during drag
      e.preventDefault();
    };
    
    const onMouseMove = (e) => {
      if (!this.isDragging) return;
      
      // Calculate width change: moving left (negative) should increase width, moving right (positive) should decrease width
      const deltaX = startX - e.clientX; // Positive when moving left, negative when moving right
      const newWidth = Math.max(this.minWidth, Math.min(startWidth + deltaX, this.maxWidth));
      
      this.updateSidebarWidth(newWidth);
    };
    
    const onMouseUp = () => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      
      // Restore drag handle appearance
      this.dragHandle.style.opacity = '0.7';
      this.dragHandle.style.width = '4px';
      this.dragHandle.style.background = '#4A99E9';
      
      // Hide tooltip after drag
      this.widthTooltip.style.opacity = '0';
      
      // Re-enable sidebar transition
      this.sidebar.style.transition = 'right 0.3s ease';
      
      // Restore cursor and selection
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Save the new width
      this.saveSidebarWidth(this.sidebarWidth);
      
      console.log('Sidebar width saved:', this.sidebarWidth);
    };
    
    // Attach event listeners
    this.dragHandle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.maxWidth = window.innerWidth * 0.8;
      const constrainedWidth = Math.min(this.sidebarWidth, this.maxWidth);
      if (constrainedWidth !== this.sidebarWidth) {
        this.updateSidebarWidth(constrainedWidth);
        this.saveSidebarWidth(constrainedWidth);
      }
    });
  }
  
  // Update sidebar width
  updateSidebarWidth(width) {
    this.sidebarWidth = width;
    this.sidebar.style.width = width + 'px';
    
    // Update position when closed
    if (!this.sidebarOpen) {
      this.sidebar.style.right = -width + 'px';
    }
    
    // Update tooltip text
    this.updateTooltipText();
  }
  
  // Update tooltip text with current width
  updateTooltipText() {
    if (this.widthTooltip && this.sidebarWidth && !isNaN(this.sidebarWidth)) {
      const percentage = Math.round((this.sidebarWidth / window.innerWidth) * 100);
      this.widthTooltip.textContent = `${this.sidebarWidth}px (${percentage}%)`;
    }
  }
  
  setupEventListeners() {
    this.vibeButton.addEventListener('click', () => {
      // Don't allow clicks during analyzing
      if (this.isAnalyzing) {
        console.log('🚫 Button disabled during analysis');
        return;
      }
      
      if (this.isScanning) {
        this.stopScanning();
      } else {
        this.startScanning();
      }
    });
    this.stopButton.addEventListener('click', () => this.stopScanning());
    this.expandButton.addEventListener('click', () => this.openSidebar());
    this.closeButton.addEventListener('click', () => this.closeSidebar());
  }
  
  // Unified method to update button states based on current status
  updateButtonStates() {
    console.log('📊 Updating button states:', { 
      isScanning: this.isScanning, 
      isAnalyzing: this.isAnalyzing,
      sidebarOpen: this.sidebarOpen 
    });
    
    if (this.isAnalyzing) {
      // Analyzing state - buttons disabled and show analyzing
      this.transformToAnalyzingButton();
      this.transformInternalToAnalyzingButton();
    } else if (this.isScanning) {
      // Scanning state - show stop buttons
      this.transformToStopButton();
      this.transformInternalToStopButton();
    } else {
      // Idle state - show vibe reading buttons
      this.transformToVibeButton();
      this.transformInternalToVibeButton();
    }
  }
  
  // Method to transform vibe button to stop button
  transformToStopButton() {
    this.vibeButton.textContent = 'stop';
    this.vibeButton.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
    this.vibeButton.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
    this.vibeButton.style.animation = 'stopGlow 2s ease-in-out infinite';
    this.vibeButton.disabled = false;
    this.vibeButton.style.cursor = 'pointer';
    this.vibeButton.style.opacity = '1';
  }
  
  // Method to transform stop button back to vibe button
  transformToVibeButton() {
    this.vibeButton.textContent = 'vibe reading';
    this.vibeButton.style.background = 'linear-gradient(45deg, #4A99E9, #1D9BF0)';
    this.vibeButton.style.boxShadow = '0 4px 15px rgba(74, 153, 233, 0.3)';
    this.vibeButton.style.animation = 'none';
    this.vibeButton.disabled = false;
    this.vibeButton.style.cursor = 'pointer';
    this.vibeButton.style.opacity = '1';
  }
  
  // Method to transform internal vibe button to stop button
  transformInternalToStopButton() {
    this.internalVibeButton.textContent = 'stop';
    this.internalVibeButton.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
    this.internalVibeButton.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
    this.internalVibeButton.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    this.internalVibeButton.style.animation = 'stopGlow 2s ease-in-out infinite';
    this.internalVibeButton.disabled = false;
    this.internalVibeButton.style.cursor = 'pointer';
    this.internalVibeButton.style.opacity = '1';
  }
  
  // Method to transform internal stop button back to vibe button
  transformInternalToVibeButton() {
    this.internalVibeButton.textContent = 'vibe reading';
    this.internalVibeButton.style.background = 'linear-gradient(45deg, #4A99E9, #1D9BF0)';
    this.internalVibeButton.style.boxShadow = '0 4px 15px rgba(74, 153, 233, 0.3)';
    this.internalVibeButton.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    this.internalVibeButton.style.animation = 'none';
    this.internalVibeButton.disabled = false;
    this.internalVibeButton.style.cursor = 'pointer';
    this.internalVibeButton.style.opacity = '1';
  }
  
  // Method to transform vibe button to analyzing state
  transformToAnalyzingButton() {
    this.vibeButton.textContent = 'analyzing';
    this.vibeButton.style.background = 'linear-gradient(45deg, #f59e0b, #d97706)';
    this.vibeButton.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)';
    this.vibeButton.style.animation = 'analyzingPulse 2s ease-in-out infinite';
    this.vibeButton.disabled = true;
    this.vibeButton.style.cursor = 'not-allowed';
    this.vibeButton.style.opacity = '0.8';
  }
  
  // Method to transform internal vibe button to analyzing state
  transformInternalToAnalyzingButton() {
    this.internalVibeButton.textContent = 'analyzing';
    this.internalVibeButton.style.background = 'linear-gradient(45deg, #f59e0b, #d97706)';
    this.internalVibeButton.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)';
    this.internalVibeButton.style.border = '2px solid rgba(255, 255, 255, 0.2)';
    this.internalVibeButton.style.animation = 'analyzingPulse 2s ease-in-out infinite';
    this.internalVibeButton.disabled = true;
    this.internalVibeButton.style.cursor = 'not-allowed';
    this.internalVibeButton.style.opacity = '0.8';
  }
  
  createTemplateSelectionUI(container) {
    container.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">选择分析模板</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280; line-height: 1.5;">选择适合的分析模板来定制AI的分析方式</p>
      </div>
      
      <div id="template-list" style="display: flex; flex-direction: column; gap: 16px;">
        ${Object.values(PROMPT_TEMPLATES).map(template => `
          <div class="template-card" data-template-id="${template.id}" style="
            border: 2px solid ${this.currentTemplate === template.id ? '#4A99E9' : '#e5e7eb'};
            border-radius: 12px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: ${this.currentTemplate === template.id ? '#f0f8ff' : '#ffffff'};
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${template.title}</h4>
              ${this.currentTemplate === template.id ? '<div style="width: 20px; height: 20px; border-radius: 50%; background: #4A99E9; display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div></div>' : ''}
            </div>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${template.description}</p>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 3px solid #4A99E9;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 500;">输出效果预览：</div>
              <div style="font-size: 13px; color: #374151; line-height: 1.5; white-space: pre-line;">${template.preview}</div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <button id="apply-template" style="
          width: 100%;
          background: #4A99E9;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#1D9BF0'" onmouseout="this.style.background='#4A99E9'">
          应用选中的模板
        </button>
      </div>
    `;
    
    // Add event listeners for template cards
    const templateCards = container.querySelectorAll('.template-card');
    templateCards.forEach(card => {
      card.addEventListener('click', () => {
        const templateId = card.getAttribute('data-template-id');
        this.selectTemplate(templateId);
      });
    });
    
    // Add event listener for apply button
    const applyButton = container.querySelector('#apply-template');
    applyButton.addEventListener('click', () => {
      this.applySelectedTemplate();
    });
  }
  
  selectTemplate(templateId) {
    this.tempSelectedTemplate = templateId;
    
    // Update visual selection
    const templateList = document.getElementById('template-list');
    if (templateList) {
      const cards = templateList.querySelectorAll('.template-card');
      cards.forEach(card => {
        const cardTemplateId = card.getAttribute('data-template-id');
        const isSelected = cardTemplateId === templateId;
        
        card.style.border = `2px solid ${isSelected ? '#4A99E9' : '#e5e7eb'}`;
        card.style.background = isSelected ? '#f0f8ff' : '#ffffff';
        
        // Update selection indicator
        const existingIndicator = card.querySelector('div[style*="border-radius: 50%"]');
        if (existingIndicator) {
          existingIndicator.remove();
        }
        
        if (isSelected) {
          const headerDiv = card.querySelector('div[style*="justify-content: space-between"]');
          headerDiv.innerHTML += '<div style="width: 20px; height: 20px; border-radius: 50%; background: #4A99E9; display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div></div>';
        }
      });
    }
  }
  
  applySelectedTemplate() {
    if (this.tempSelectedTemplate) {
      this.currentTemplate = this.tempSelectedTemplate;
      
      // Save to storage
      chrome.storage.sync.set({ selectedTemplate: this.currentTemplate });
      
      // Show success message
      this.showTemplateAppliedMessage();
      
      // Switch back to Twitter tab
      setTimeout(() => {
        this.switchTab('raw');
      }, 1500);
    }
  }
  
  showTemplateAppliedMessage() {
    const templateContent = document.getElementById('template-content-tab');
    if (templateContent) {
      const template = PROMPT_TEMPLATES[this.currentTemplate];
      templateContent.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
          <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #10b981;">模板已应用</h3>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">已选择「${template.title}」模板</p>
          <p style="margin: 0; font-size: 13px; color: #9ca3af;">AI分析将使用此模板进行处理</p>
        </div>
      `;
    }
  }
  
  switchTab(tabName) {
    const rawTab = document.getElementById('raw-tab');
    const analysisTab = document.getElementById('analysis-tab');
    const templateTab = document.getElementById('template-tab');
    const rawContent = document.getElementById('raw-content');
    const analysisContentTab = document.getElementById('analysis-content-tab');
    const templateContentTab = document.getElementById('template-content-tab');
    
    if (tabName === 'raw') {
      // Switch to Twitter content tab - Clean active state
      rawTab.style.background = 'rgba(255,255,255,0.9)';
      rawTab.style.color = '#1e40af';
      rawTab.style.fontWeight = '600';
      rawTab.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      rawTab.style.transform = 'none';
      
      // Reset analysis tab
      analysisTab.style.background = 'transparent';
      analysisTab.style.color = 'rgba(255,255,255,0.7)';
      analysisTab.style.fontWeight = '500';
      analysisTab.style.boxShadow = 'none';
      analysisTab.style.transform = 'none';
      
      // Reset template tab
      templateTab.style.background = 'transparent';
      templateTab.style.color = 'rgba(255,255,255,0.7)';
      templateTab.style.fontWeight = '500';
      templateTab.style.boxShadow = 'none';
      templateTab.style.transform = 'none';
      
      rawContent.style.display = 'block';
      analysisContentTab.style.display = 'none';
      templateContentTab.style.display = 'none';
      
      this.currentTab = 'raw';
    } else if (tabName === 'analysis') {
      // Switch to analysis tab - Clean active state
      analysisTab.style.background = 'rgba(255,255,255,0.9)';
      analysisTab.style.color = '#1e40af';
      analysisTab.style.fontWeight = '600';
      analysisTab.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      analysisTab.style.transform = 'none';
      
      // Reset Twitter tab
      rawTab.style.background = 'transparent';
      rawTab.style.color = 'rgba(255,255,255,0.7)';
      rawTab.style.fontWeight = '500';
      rawTab.style.boxShadow = 'none';
      rawTab.style.transform = 'none';
      
      // Reset template tab
      templateTab.style.background = 'transparent';
      templateTab.style.color = 'rgba(255,255,255,0.7)';
      templateTab.style.fontWeight = '500';
      templateTab.style.boxShadow = 'none';
      templateTab.style.transform = 'none';
      
      rawContent.style.display = 'none';
      analysisContentTab.style.display = 'block';
      templateContentTab.style.display = 'none';
      
      this.currentTab = 'analysis';
    } else if (tabName === 'template') {
      // Switch to template tab - Clean active state
      templateTab.style.background = 'rgba(255,255,255,0.9)';
      templateTab.style.color = '#1e40af';
      templateTab.style.fontWeight = '600';
      templateTab.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      templateTab.style.transform = 'none';
      
      // Reset Twitter tab
      rawTab.style.background = 'transparent';
      rawTab.style.color = 'rgba(255,255,255,0.7)';
      rawTab.style.fontWeight = '500';
      rawTab.style.boxShadow = 'none';
      rawTab.style.transform = 'none';
      
      // Reset analysis tab
      analysisTab.style.background = 'transparent';
      analysisTab.style.color = 'rgba(255,255,255,0.7)';
      analysisTab.style.fontWeight = '500';
      analysisTab.style.boxShadow = 'none';
      analysisTab.style.transform = 'none';
      
      rawContent.style.display = 'none';
      analysisContentTab.style.display = 'none';
      templateContentTab.style.display = 'block';
      
      this.currentTab = 'template';
    }
  }
  
  updateStatus(statusType, data = '', type = 'info') {
    const statusContent = document.getElementById('status-content');
    if (!statusContent) return;
    
    let color, animation, statusText;
    switch (type) {
      case 'scanning':
        color = '#f59e0b';
        animation = 'pulse 1s infinite';
        statusText = 'Collecting';
        break;
      case 'analyzing':
        color = '#3b82f6';
        animation = 'pulse 1.5s infinite';
        statusText = 'Analyzing';
        break;
      case 'success':
        color = '#10b981';
        animation = 'none';
        statusText = 'Complete';
        break;
      case 'error':
        color = '#ef4444';
        animation = 'none';
        statusText = 'Error';
        break;
      default:
        color = '#4ade80';
        animation = 'pulse 2s infinite';
        statusText = 'Ready';
    }
    
    const displayText = data ? `${statusText} • ${data}` : statusText;
    
    statusContent.innerHTML = `
      <div style="width: 8px; height: 8px; background: ${color}; border-radius: 50%; animation: ${animation}; flex-shrink: 0;"></div>
      <span style="font-size: 13px; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayText}</span>
    `;
  }
  
  startScanning() {
    if (this.isScanning) return;
    
    logger.info('Starting tweet scanning', { timestamp: new Date().toISOString() });
    
    this.isScanning = true;
    this.collectedTweets = [];
    this.scanStartTime = new Date();
    
    // Load latest vibe settings
    this.loadVibeSettings(() => {
      console.log('Scanning started with vibe mode:', this.vibeMode);
    });
    
    // Clear all cached data to ensure fresh extraction
    this.clearCache();
    
    // Update UI - transform buttons to stop mode
    this.transformToStopButton(); // External button
    this.transformInternalToStopButton(); // Internal button
    
    // Update other buttons - panel button should always be available for opening sidebar
    this.stopButton.style.display = 'none';
    this.expandButton.style.display = 'block'; // Keep panel button for opening sidebar
    this.closeButton.style.display = 'none';
    
    this.openSidebar();
    
    // Clear previous content and prepare for scanning
    const rawContent = document.getElementById('raw-content');
    rawContent.innerHTML = '<div id="tweet-list"></div>';
    
    // Clear previous analysis results
    const analysisContentTab = document.getElementById('analysis-content-tab');
    if (analysisContentTab) {
      analysisContentTab.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #64748b; font-size: 16px; line-height: 1.6;">
          <div>Click "vibe reading" to start scanning</div>
        </div>
      `;
    }
    
    // Update status
    this.updateStatus('', '', 'scanning');
    
    // Initialize scroll position and start progressive scanning
    this.currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    this.extractTweets();
    this.startProgressiveScrolling();
  }
  
  clearCache() {
    // Clear all cached tweet data
    this.collectedTweets = [];
    
    // Clear browser cache related to the extension
    if (chrome && chrome.storage) {
      chrome.storage.local.clear(() => {
        console.log('Extension local storage cleared');
      });
    }
    
    // Clear any DOM-based caching
    const tweetList = document.getElementById('tweet-list');
    if (tweetList) {
      tweetList.innerHTML = '';
    }
    
    console.log('Cache cleared, ready for fresh extraction');
  }
  
  startProgressiveScrolling() {
    if (!this.isScanning) return;
    
    this.isProgressiveScrolling = true;
    this.performProgressiveScroll();
  }
  
  performProgressiveScroll() {
    if (!this.isScanning || !this.isProgressiveScrolling) return;
    
    const randomInterval = this.getRandomScrollInterval();
    
    // Show current status with vibe mode info
    const vibeInfo = this.getVibeStatusText();
    this.updateStatus('', `${this.collectedTweets.length} tweets${vibeInfo}`, 'scanning');
    
    this.scanInterval = setTimeout(() => {
      this.scrollOneStep();
      this.performProgressiveScroll(); // Continue progressive scrolling
    }, randomInterval);
    
    console.log(`Next scroll step scheduled in ${randomInterval}ms`);
  }
  
  scrollOneStep() {
    if (!this.isScanning) return;
    
    // Get current page height before scrolling
    const maxScroll = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    // Check if we're near the bottom
    const nearBottom = this.currentScrollPosition >= maxScroll - window.innerHeight - 200; // 200px buffer
    
    if (nearBottom) {
      // Instead of jumping to top, stay at bottom and wait for new content to load
      console.log('Near bottom, staying here to allow new content loading...');
      
      // Scroll to absolute bottom to trigger Twitter's infinite scroll
      window.scrollTo({
        top: maxScroll,
        behavior: 'smooth'
      });
      
      // Wait longer for Twitter to load new content, then check if page height increased
      setTimeout(() => {
        const newMaxScroll = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
        
        if (newMaxScroll > maxScroll + 100) {
          // New content loaded, continue from current position
          console.log('New content detected, continuing scroll...');
          this.currentScrollPosition = maxScroll;
        } else {
          // No new content, reset to top after waiting
          console.log('No new content loaded, cycling back to top...');
          this.currentScrollPosition = 0;
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
        
        // Extract tweets after content check
        setTimeout(() => {
          this.extractTweets();
        }, 500);
        
      }, 2000); // Wait 2 seconds for Twitter to load new content
      
    } else {
      // Normal scroll down
      this.currentScrollPosition += this.scrollStep;
      
      // Smooth scroll to next position
      window.scrollTo({
        top: this.currentScrollPosition,
        behavior: 'smooth'
      });
      
      console.log(`Scrolled to position: ${this.currentScrollPosition}, max: ${maxScroll}`);
      
      // Wait a bit for content to load, then extract tweets
      setTimeout(() => {
        this.extractTweets();
      }, 600); // Reduced wait time for normal scrolling
    }
  }
  
  stopScanning() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    this.isProgressiveScrolling = false;
    clearTimeout(this.scanInterval);
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    // Update UI - transform buttons back to vibe mode
    this.transformToVibeButton(); // External button
    this.transformInternalToVibeButton(); // Internal button
    
    // Keep other buttons as they are
    this.stopButton.style.display = 'none';
    
    // Send tweets to background script for analysis
    if (this.collectedTweets.length > 0) {
      this.updateStatus('', `${this.collectedTweets.length} tweets`, 'analyzing');
      
      // Set analyzing state and update buttons
      this.isAnalyzing = true;
      this.updateButtonStates();
      
      // Show analyzing state in analysis tab
      const analysisContentTab = document.getElementById('analysis-content-tab');
      if (analysisContentTab) {
        analysisContentTab.innerHTML = `
          <div style="padding: 24px; text-align: center; color: #f59e0b; font-size: 16px; line-height: 1.6;">
            <div style="margin-bottom: 12px;">🔄 Analyzing ${this.collectedTweets.length} tweets...</div>
            <div style="font-size: 14px; color: #64748b;">This may take a few moments</div>
          </div>
        `;
      }
      
      // Get the current template prompt
      const template = PROMPT_TEMPLATES[this.currentTemplate];
      const systemPrompt = template ? template.prompt : null;
      
      chrome.runtime.sendMessage({
        type: 'ANALYZE_TWEETS',
        tweets: this.collectedTweets,
        templatePrompt: systemPrompt
      }, (response) => {
        // Clear analyzing state and update buttons
        this.isAnalyzing = false;
        this.updateButtonStates();
        
        if (response && response.success) {
          this.displayAnalysis(response.analysis);
        } else {
          const errorMessage = response ? response.error : 'Analysis failed';
          console.error('Analysis failed:', errorMessage);
          
          // Update analysis tab with error
          const analysisContentTab = document.getElementById('analysis-content-tab');
          if (analysisContentTab) {
            if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
              analysisContentTab.innerHTML = `
                <div style="padding: 24px; text-align: center; color: #dc2626; font-size: 16px; line-height: 1.6;">
                  <div style="margin-bottom: 12px;">⏰ Analysis timed out</div>
                  <div style="font-size: 14px; color: #64748b; margin-bottom: 16px;">The analysis took too long, likely due to the large number of tweets (${this.collectedTweets.length}).</div>
                  <div style="font-size: 14px; color: #64748b;">Please try again with fewer tweets or check your connection.</div>
                </div>
              `;
            } else {
              this.displayError(errorMessage);
            }
          } else {
            this.displayError(errorMessage);
          }
        }
      });
    } else {
      this.updateStatus('', 'No tweets collected', 'error');
    }
  }
  
  // Legacy method - now replaced by progressive scrolling
  scrollAndExtract() {
    console.log('Legacy scrollAndExtract called - should use progressive scrolling instead');
    this.scrollOneStep();
  }
  
  extractTweets() {
    const startTime = Date.now();
    logger.info('Starting tweet extraction');
    
    // Get all current page content and add new tweets
    // Twitter/X tweet selectors (may need updates as Twitter changes)
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      '[data-testid="tweet"]',
      'div[data-testid="tweet"]'
    ];
    
    let tweets = [];
    
    // Try different selectors
    for (const selector of tweetSelectors) {
      tweets = document.querySelectorAll(selector);
      logger.info(`Selector attempt: ${selector}`, { tweetsFound: tweets.length });
      if (tweets.length > 0) break;
    }
    
    logger.info('DOM query completed', { totalTweets: tweets.length });
    
    // Create a more lenient duplicate check - only check first 100 characters for similarity
    const existingContents = new Set(this.collectedTweets.map(t => t.content.substring(0, 100)));
    
    let newTweetsAdded = 0;
    let skippedDuplicates = 0;
    let extractionErrors = 0;
    
    // Track new tweets from this batch for time-based stopping
    this.lastBatchTweets = [];
    
    tweets.forEach((tweet, index) => {
      try {
        const tweetData = this.extractTweetData(tweet);
        if (tweetData) {
          const contentPreview = tweetData.content.substring(0, 100);
          if (!existingContents.has(contentPreview)) {
            this.collectedTweets.push(tweetData);
            this.lastBatchTweets.push(tweetData); // Add to current batch
            this.displayTweetInSidebar(tweetData);
            existingContents.add(contentPreview); // Add to set for future checks
            newTweetsAdded++;
            console.log(`Added tweet ${newTweetsAdded}: ${tweetData.content.substring(0, 50)}...`);
          } else {
            skippedDuplicates++;
            console.log(`Skipped similar tweet: ${tweetData.content.substring(0, 50)}...`);
          }
        } else {
          extractionErrors++;
          console.log(`Failed to extract data from tweet element ${index}`);
        }
      } catch (error) {
        extractionErrors++;
        console.error(`Error extracting tweet ${index}:`, error);
      }
    });
    
    const endTime = Date.now();
    const extractionSummary = {
      newTweetsAdded,
      skippedDuplicates,
      extractionErrors,
      totalCollected: this.collectedTweets.length,
      currentBatchSize: this.lastBatchTweets.length,
      processingTime: endTime - startTime
    };
    
    logger.info('Tweet extraction completed', extractionSummary);
    
    // Check if we should auto-stop based on vibe mode
    this.checkAutoStopConditions();
  }
  
  checkAutoStopConditions() {
    if (!this.isScanning || this.vibeMode === 'manual') {
      return false;
    }
    
    let shouldStop = false;
    let stopReason = '';
    
    if (this.vibeMode === 'count') {
      if (this.collectedTweets.length >= this.targetTweetCount) {
        shouldStop = true;
        stopReason = `Reached target tweet count: ${this.collectedTweets.length}/${this.targetTweetCount}`;
      }
    } else if (this.vibeMode === 'time') {
      // Check if all new tweets in this batch are outside the time range
      if (this.lastBatchTweets.length > 0) {
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - this.targetTimePeriod);
        
        let tweetsInRange = 0;
        let tweetsOutOfRange = 0;
        let unparsableTimestamps = 0;
        
        this.lastBatchTweets.forEach(tweet => {
          if (!tweet.timestamp || tweet.timestamp === 'Unknown') {
            unparsableTimestamps++;
            return;
          }
          
          try {
            const tweetTime = new Date(tweet.timestamp);
            if (tweetTime >= cutoffTime) {
              tweetsInRange++;
            } else {
              tweetsOutOfRange++;
            }
          } catch (error) {
            console.warn('Failed to parse tweet timestamp:', tweet.timestamp);
            unparsableTimestamps++;
          }
        });
        
        console.log(`Time check - In range: ${tweetsInRange}, Out of range: ${tweetsOutOfRange}, Unparsable: ${unparsableTimestamps}`);
        
        // Only stop if ALL parseable tweets in this batch are outside the time range
        if (tweetsInRange === 0 && tweetsOutOfRange > 0) {
          shouldStop = true;
          stopReason = `All new tweets (${tweetsOutOfRange}) are outside ${this.targetTimePeriod}h time range`;
        }
      }
    }
    
    if (shouldStop) {
      console.log('Auto-stopping scanning:', stopReason);
      this.updateStatus('', stopReason, 'success');
      setTimeout(() => {
        this.stopScanning();
      }, 1000); // Small delay to show the stop reason
      return true;
    }
    
    return false;
  }
  
  getVibeStatusText() {
    if (this.vibeMode === 'count') {
      return ` (target: ${this.targetTweetCount})`;
    } else if (this.vibeMode === 'time') {
      return ` (${this.targetTimePeriod}h)`;
    }
    return '';
  }
  
  getTweetId(tweetElement) {
    // Try to find unique identifier for the tweet
    const link = tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    
    // Fallback: use element's position or content hash
    return tweetElement.innerText.substring(0, 50);
  }
  
  extractTweetData(tweetElement) {
    try {
      // Extract main tweet content
      const textElements = tweetElement.querySelectorAll('[data-testid="tweetText"]');
      let content = '';
      textElements.forEach(el => {
        // Clean up each element's content thoroughly
        const cleanText = el.innerText
          .replace(/^\s+/gm, '')  // Remove leading whitespace from each line
          .replace(/\s+$/gm, '')  // Remove trailing whitespace from each line
          .replace(/\t/g, '')     // Remove all tabs
          .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
          .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
          .trim();
        
        if (cleanText) {
          content += cleanText + ' ';
        }
      });
      
      // Debug: Check if content is found
      if (!content.trim()) {
        console.log('No tweet text found, checking element structure:', tweetElement);
        // Try alternative selectors for content
        const altSelectors = [
          'div[lang]',
          'span[dir="auto"]',
          '.css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-qvutc0'
        ];
        
        for (const selector of altSelectors) {
          const altElements = tweetElement.querySelectorAll(selector);
          if (altElements.length > 0) {
            console.log(`Found alternative content with selector: ${selector}`);
            altElements.forEach(el => {
              if (el.innerText && el.innerText.trim().length > 10) {
                content += el.innerText + ' ';
              }
            });
            break;
          }
        }
      }
      
      // Extract author
      const authorElement = tweetElement.querySelector('[data-testid="User-Name"]') || 
                           tweetElement.querySelector('[data-testid="User-Names"]');
      const author = authorElement ? authorElement.innerText : 'Unknown';
      
      // Debug: Check if author is found
      if (author === 'Unknown') {
        console.log('No author found, checking element structure:', tweetElement);
        // Try alternative selectors for author
        const altAuthorSelectors = [
          'div[data-testid="User-Name"] span',
          'a[role="link"] span',
          '.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0'
        ];
        
        for (const selector of altAuthorSelectors) {
          const altAuthorElement = tweetElement.querySelector(selector);
          if (altAuthorElement && altAuthorElement.innerText) {
            console.log(`Found alternative author with selector: ${selector}`);
            break;
          }
        }
      }
      
      // Extract timestamp
      const timeElement = tweetElement.querySelector('time');
      const timestamp = timeElement ? timeElement.getAttribute('datetime') || timeElement.innerText : 'Unknown';
      
      // Check if it's an advertisement (no timestamp usually means ad)
      const isAd = timestamp === 'Unknown' || 
                   tweetElement.querySelector('[data-testid="promoted"]') ||
                   tweetElement.querySelector('[data-testid="ad"]') ||
                   tweetElement.innerText.includes('广告') ||
                   tweetElement.innerText.includes('Promoted');
      
      // Extract tweet URL
      const link = tweetElement.querySelector('a[href*="/status/"]');
      const tweetUrl = link ? link.href : null;
      
      // Check for quoted/referenced tweet
      const quotedTweet = this.extractQuotedTweet(tweetElement);
      
      // Check for reply context
      const replyContext = this.extractReplyContext(tweetElement);
      
      // Combine content with context and clean up spacing
      let fullContent = content.trim();
      
      if (replyContext) {
        fullContent = `回复 ${replyContext.author}: "${replyContext.content}"\n\n${fullContent}`;
      }
      
      if (quotedTweet) {
        fullContent = `${fullContent}\n\n引用推文 - ${quotedTweet.author}: "${quotedTweet.content}"`;
      }
      
      // Clean up spacing and alignment issues
      fullContent = fullContent
        .replace(/^\s+/gm, '')  // Remove leading spaces from all lines
        .replace(/\s+$/gm, '')  // Remove trailing spaces from all lines
        .replace(/\n\s*\n/g, '\n\n')  // Normalize multiple line breaks
        .trim();
      
      if (fullContent) {
        return {
          content: fullContent,
          author: author,
          timestamp: timestamp,
          id: this.getTweetId(tweetElement),
          url: tweetUrl,
          hasQuoted: !!quotedTweet,
          hasReply: !!replyContext,
          isAd: isAd
        };
      } else {
        console.log('No content extracted from tweet element:', tweetElement);
      }
    } catch (error) {
      console.error('Error extracting tweet data:', error);
    }
    
    return null;
  }
  
  extractQuotedTweet(tweetElement) {
    try {
      // Look for quoted tweet container
      const quotedTweetSelectors = [
        '[data-testid="card.wrapper"]',
        '[data-testid="tweet"] [data-testid="tweet"]',
        '.css-1dbjc4n[role="link"]'
      ];
      
      for (const selector of quotedTweetSelectors) {
        const quotedElement = tweetElement.querySelector(selector);
        if (quotedElement) {
          // Extract quoted tweet content
          const quotedTextElements = quotedElement.querySelectorAll('[data-testid="tweetText"]');
          let quotedContent = '';
          quotedTextElements.forEach(el => {
            quotedContent += el.innerText + ' ';
          });
          
          // Extract quoted tweet author
          const quotedAuthorElement = quotedElement.querySelector('[data-testid="User-Name"]') || 
                                     quotedElement.querySelector('[data-testid="User-Names"]');
          const quotedAuthor = quotedAuthorElement ? quotedAuthorElement.innerText : 'Unknown';
          
          if (quotedContent.trim()) {
            return {
              content: quotedContent.trim(),
              author: quotedAuthor
            };
          }
        }
      }
    } catch (error) {
      console.error('Error extracting quoted tweet:', error);
    }
    
    return null;
  }
  
  extractReplyContext(tweetElement) {
    try {
      // Look for reply context indicators
      const replyIndicators = [
        '[data-testid="reply"]',
        '.css-1dbjc4n[dir="ltr"] span[dir="ltr"]',
        'span[dir="ltr"]'
      ];
      
      for (const selector of replyIndicators) {
        const replyElement = tweetElement.querySelector(selector);
        if (replyElement && (replyElement.innerText.includes('回复') || replyElement.innerText.includes('Replying to'))) {
          // Try to find the original tweet being replied to
          const replyToElement = replyElement.closest('[data-testid="tweet"]');
          if (replyToElement) {
            const originalTweetElement = replyToElement.previousElementSibling || 
                                       replyToElement.parentElement.previousElementSibling;
            
            if (originalTweetElement) {
              const originalTextElements = originalTweetElement.querySelectorAll('[data-testid="tweetText"]');
              let originalContent = '';
              originalTextElements.forEach(el => {
                originalContent += el.innerText + ' ';
              });
              
              const originalAuthorElement = originalTweetElement.querySelector('[data-testid="User-Name"]') || 
                                           originalTweetElement.querySelector('[data-testid="User-Names"]');
              const originalAuthor = originalAuthorElement ? originalAuthorElement.innerText : 'Unknown';
              
              if (originalContent.trim()) {
                return {
                  content: originalContent.trim(),
                  author: originalAuthor
                };
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting reply context:', error);
    }
    
    return null;
  }
  
  displayTweetInSidebar(tweetData) {
    const tweetList = document.getElementById('tweet-list');
    if (!tweetList) return;
    
    // Check if this is from the same author as the previous tweet
    const previousTweets = tweetList.querySelectorAll('div[data-author]');
    const lastTweet = previousTweets[previousTweets.length - 1];
    const isSameAuthor = lastTweet && lastTweet.getAttribute('data-author') === tweetData.author;
    
    const tweetElement = document.createElement('div');
    tweetElement.setAttribute('data-author', tweetData.author);
    tweetElement.style.cssText = `
      background: #f8f9fa;
      padding: 16px;
      margin-bottom: ${isSameAuthor ? '8px' : '20px'};
      border-radius: 8px;
      border-left: 4px solid #4A99E9;
      font-size: 14px;
      line-height: 1.5;
      ${isSameAuthor ? 'border-top: 2px dashed #e5e7eb;' : ''}
    `;
    
    // Detect media content
    const hasImages = tweetData.content.includes('pic.twitter.com') || tweetData.content.includes('t.co/') && tweetData.content.match(/\b\w+\.(jpg|jpeg|png|gif|webp)\b/i);
    const hasVideo = tweetData.content.includes('video') || tweetData.content.includes('watch');
    const hasLinks = tweetData.content.includes('http') || tweetData.content.includes('t.co/');
    
    // Add indicators for reply/quote/ad and media
    let indicators = '';
    if (tweetData.isAd) {
      indicators += '<span style="background: #fff3e0; color: #f57c00; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px;">Ad</span>';
    }
    if (tweetData.hasReply) {
      indicators += '<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px;">Reply</span>';
    }
    if (tweetData.hasQuoted) {
      indicators += '<span style="background: #f3e5f5; color: #7b1fa2; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px;">Quote</span>';
    }
    
    // Extract main content and repost content
    let mainContent = tweetData.content;
    let repostContent = '';
    
    // Check for repost pattern
    const repostMatch = tweetData.content.match(/^(.+?)\n\n引用推文 - ([^:]+): "([^"]+)"/s);
    if (repostMatch) {
      mainContent = repostMatch[1].trim();
      repostContent = `[Repost] ${repostMatch[2]}: "${repostMatch[3]}"`;
    }
    
    // Extract author URL for Twitter profile
    const authorUrl = `https://twitter.com/${tweetData.author.replace('@', '')}`;
    
    tweetElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
          <a href="${authorUrl}" target="_blank" style="font-weight: 600; color: #4A99E9; text-decoration: none; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${this.escapeHtml(tweetData.author)}</a>
          <span style="color: #64748b; font-size: 12px;">${this.escapeHtml(tweetData.timestamp)}</span>
          <div>${indicators}</div>
        </div>
      </div>
      <div style="color: #1f2937; line-height: 1.5; margin-bottom: ${repostContent ? '12px' : '8px'};">
        ${this.escapeHtml(mainContent)}
      </div>
      ${repostContent ? `<div style="background: #f1f5f9; padding: 10px; border-radius: 6px; border-left: 3px solid #64748b; color: #475569; font-size: 13px; margin-bottom: 8px;">${this.escapeHtml(repostContent)}</div>` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <div style="display: flex; gap: 8px; font-size: 11px;">
          ${hasImages ? '<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px;">📷 Image</span>' : ''}
          ${hasVideo ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px;">🎥 Video</span>' : ''}
          ${hasLinks ? '<span style="background: #f3e8ff; color: #7c3aed; padding: 2px 6px; border-radius: 3px;">🔗 Link</span>' : ''}
        </div>
        ${tweetData.url ? `<a href="${tweetData.url}" target="_blank" style="color: #4A99E9; text-decoration: none; font-size: 12px; font-weight: 500;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">View Original</a>` : ''}
      </div>
    `;
    
    tweetList.appendChild(tweetElement);
    
    // Auto-scroll to bottom
    tweetList.scrollTop = tweetList.scrollHeight;
  }
  
  
  
  displayAnalysis(analysis) {
    // Update status
    this.updateStatus('', `${this.collectedTweets.length} tweets`, 'success');
    
    // Switch to analysis tab and populate content
    this.switchTab('analysis');
    
    const analysisContentTab = document.getElementById('analysis-content-tab');
    if (!analysisContentTab) return;
    
    analysisContentTab.innerHTML = `
      <div id="analysis-content-scroll" style="padding: 24px; line-height: 1.7; color: #1f2937; font-size: 16px; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #ffffff; height: calc(100vh - 140px); overflow-y: auto;">
        ${this.formatAnalysis(analysis)}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <button id="reanalyze-btn" style="
            background: #f9fafb;
            color: #6b7280;
            border: 1px solid #d1d5db;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          " onmouseover="this.style.background='#f3f4f6'; this.style.color='#374151'" 
             onmouseout="this.style.background='#f9fafb'; this.style.color='#6b7280'">
            🔄 重新分析
          </button>
        </div>
      </div>
    `;
    
    // Add click event listener for reanalyze button
    const reanalyzeBtn = document.getElementById('reanalyze-btn');
    if (reanalyzeBtn) {
      reanalyzeBtn.addEventListener('click', () => {
        this.reanalyzeWithCurrentTweets();
      });
    }
  }
  
  displayError(errorMessage) {
    // Update status
    this.updateStatus('', 'Analysis failed', 'error');
    
    // Switch to analysis tab and show error
    this.switchTab('analysis');
    
    const analysisContentTab = document.getElementById('analysis-content-tab');
    if (!analysisContentTab) return;
    
    // Detect if it's a network error for auto-retry suggestion
    const isNetworkError = errorMessage.includes('网络连接') || 
                          errorMessage.includes('Failed to fetch') ||
                          errorMessage.includes('代理服务连接失败');
    
    analysisContentTab.innerHTML = `
      <div style="padding: 24px;">
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
          <div style="color: #dc2626; font-weight: 600; margin-bottom: 12px; font-size: 16px;">分析失败</div>
          <div style="color: #991b1b; font-size: 14px; line-height: 1.6; white-space: pre-line;">${this.escapeHtml(errorMessage)}</div>
        </div>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #0ea5e9;">
          <div style="color: #0c4a6e; font-weight: 600; margin-bottom: 12px;">🔄 重试分析</div>
          <div style="margin-bottom: 16px;">
            <button id="retry-analysis-btn" style="
              background: linear-gradient(45deg, #0ea5e9, #0284c7);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(14, 165, 233, 0.4)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(14, 165, 233, 0.3)'">
              重新分析已收集的推文 (${this.collectedTweets.length}条)
            </button>
          </div>
          <div style="color: #0c4a6e; font-size: 13px;">
            ${isNetworkError ? '• 网络问题通常可以通过重试解决' : '• 重试前请检查配置是否正确'}
          </div>
        </div>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <div style="color: #92400e; font-weight: 600; margin-bottom: 12px;">💡 其他解决方法</div>
          <div style="color: #92400e; font-size: 14px; line-height: 1.6;">
            <div style="margin-bottom: 8px;">• <strong>配置API密钥</strong>：点击扩展图标配置Claude API密钥</div>
            <div style="margin-bottom: 8px;">• <strong>减少推文数量</strong>：重新扫描并收集更少推文</div>
            <div style="margin-bottom: 8px;">• <strong>检查网络</strong>：确认网络连接稳定</div>
            <div style="margin-bottom: 8px;">• <strong>稍后重试</strong>：服务器问题通常会自动恢复</div>
          </div>
        </div>
      </div>
    `;
    
    // Add retry button event listener
    const retryBtn = document.getElementById('retry-analysis-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.retryAnalysis();
      });
    }
  }
  
  retryAnalysis() {
    if (this.collectedTweets.length === 0) {
      this.updateStatus('', 'No tweets to analyze', 'error');
      return;
    }
    
    // Show analyzing state
    this.updateStatus('', `${this.collectedTweets.length} tweets`, 'analyzing');
    
    // Update analysis tab to show retry in progress
    const analysisContentTab = document.getElementById('analysis-content-tab');
    if (analysisContentTab) {
      analysisContentTab.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #f59e0b; font-size: 16px; line-height: 1.6;">
          <div style="margin-bottom: 12px;">🔄 正在重新分析 ${this.collectedTweets.length} 条推文...</div>
          <div style="font-size: 14px; color: #64748b;">请稍候，正在重试连接...</div>
        </div>
      `;
    }
    
    // Set analyzing state and update buttons
    this.isAnalyzing = true;
    this.updateButtonStates();
    
    // Get the current template prompt
    const template = PROMPT_TEMPLATES[this.currentTemplate];
    const systemPrompt = template ? template.prompt : null;
    
    // Send tweets for analysis again
    chrome.runtime.sendMessage({
      type: 'ANALYZE_TWEETS',
      tweets: this.collectedTweets,
      templatePrompt: systemPrompt
    }, (response) => {
      // Clear analyzing state and update buttons
      this.isAnalyzing = false;
      this.updateButtonStates();
      
      if (response && response.success) {
        this.displayAnalysis(response.analysis);
      } else {
        const errorMessage = response ? response.error : 'Retry failed';
        console.error('Retry analysis failed:', errorMessage);
        this.displayError(errorMessage);
      }
    });
  }
  
  reanalyzeWithCurrentTweets() {
    if (this.collectedTweets.length === 0) {
      this.updateStatus('', 'No tweets to reanalyze', 'error');
      return;
    }
    
    console.log('Starting reanalysis with', this.collectedTweets.length, 'cached tweets');
    
    // Show analyzing state
    this.updateStatus('', `${this.collectedTweets.length} tweets`, 'analyzing');
    
    // Update analysis tab to show reanalysis in progress
    const analysisContentTab = document.getElementById('analysis-content-tab');
    if (analysisContentTab) {
      analysisContentTab.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #f59e0b; font-size: 16px; line-height: 1.6;">
          <div style="margin-bottom: 12px;">🔄 正在重新分析 ${this.collectedTweets.length} 条推文...</div>
          <div style="font-size: 14px; color: #64748b;">使用最新的提示词重新处理已收集的推文</div>
        </div>
      `;
    }
    
    // Set analyzing state and update buttons
    this.isAnalyzing = true;
    this.updateButtonStates();
    
    // Get the current template prompt
    const template = PROMPT_TEMPLATES[this.currentTemplate];
    const systemPrompt = template ? template.prompt : null;
    
    // Send tweets for analysis again with latest prompt
    chrome.runtime.sendMessage({
      type: 'ANALYZE_TWEETS',
      tweets: this.collectedTweets,
      templatePrompt: systemPrompt
    }, (response) => {
      // Clear analyzing state and update buttons
      this.isAnalyzing = false;
      this.updateButtonStates();
      
      if (response && response.success) {
        console.log('Reanalysis completed successfully');
        this.displayAnalysis(response.analysis);
      } else {
        const errorMessage = response ? response.error : 'Reanalysis failed';
        console.error('Reanalysis failed:', errorMessage);
        this.displayError(errorMessage);
      }
    });
  }
  
  formatAnalysis(analysis) {
    // Clean, WeChat-style article formatting - simple and elegant
    return analysis
      // Clean up input
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/[ \t]+$/gm, '')
      
      // Simple headers - only H1, clean and minimal
      .replace(/^#### (.*$)/gm, '<h1 style="color: #1f2937; margin: 32px 0 20px 0; font-size: 20px; font-weight: 600; line-height: 1.4;">$1</h1>')
      .replace(/^### (.*$)/gm, '<h1 style="color: #1f2937; margin: 32px 0 20px 0; font-size: 20px; font-weight: 600; line-height: 1.4;">$1</h1>')
      .replace(/^## (.*$)/gm, '<h1 style="color: #1f2937; margin: 32px 0 20px 0; font-size: 20px; font-weight: 600; line-height: 1.4;">$1</h1>')
      .replace(/^# (.*$)/gm, '<h1 style="color: #1f2937; margin: 32px 0 20px 0; font-size: 20px; font-weight: 600; line-height: 1.4;">$1</h1>')
      
      // Clean links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4A99E9; text-decoration: none; font-weight: 500;" onmouseover="this.style.textDecoration=\'underline\'" onmouseout="this.style.textDecoration=\'none\'">$1</a>')
      
      // Simple text formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: inherit;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: inherit;">$1</em>')
      
      // Remove code formatting - keep it simple
      .replace(/`([^`]+)`/g, '$1')
      
      // Remove blockquotes - keep it simple
      .replace(/^> (.*$)/gm, '$1')
      
      // Remove horizontal rules - too cluttered
      .replace(/^---$/gm, '')
      
      // Simple list formatting
      .replace(/^- (.*$)/gm, '<div style="margin: 12px 0; color: #374151; line-height: 1.7;">• $1</div>')
      .replace(/^\d+\. (.*$)/gm, '<div style="margin: 12px 0; color: #374151; line-height: 1.7;">$1</div>')
      
      // Convert line breaks to paragraphs
      .replace(/\n\n/g, '<<<PARAGRAPH_BREAK>>>')
      .replace(/\n/g, ' ')
      .replace(/<<<PARAGRAPH_BREAK>>>/g, '</p><p style="margin: 16px 0; color: #374151; line-height: 1.7; text-align: justify;">')
      
      // Wrap in paragraph tags
      .replace(/^/, '<p style="margin: 16px 0; color: #374151; line-height: 1.7; text-align: justify;">')
      .replace(/$/, '</p>')
      
      // Clean up empty paragraphs and excessive spacing
      .replace(/<p[^>]*><\/p>/g, '')
      .replace(/(<\/p>\s*<p[^>]*>){2,}/g, '</p><p style="margin: 16px 0; color: #374151; line-height: 1.7; text-align: justify;">')
      
      // Final cleanup
      .replace(/^\s+|\s+$/g, '');
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  openSidebar() {
    this.sidebar.style.right = '0';
    this.sidebarOpen = true;
    
    // Hide external buttons when panel is open
    this.vibeButton.style.display = 'none';
    this.stopButton.style.display = 'none';
    this.expandButton.style.display = 'none';
    this.closeButton.style.display = 'none';
    
    // Update internal button states using unified method
    this.updateButtonStates();
  }
  
  closeSidebar() {
    // Ensure sidebar width is valid before closing
    if (!this.sidebarWidth || isNaN(this.sidebarWidth)) {
      console.warn('Invalid sidebar width during close, resetting');
      this.sidebarWidth = Math.max(300, Math.min(window.innerWidth * 0.5, 600));
    }
    
    this.sidebar.style.right = `-${this.sidebarWidth}px`;
    this.sidebarOpen = false;
    
    // Show external buttons when panel is closed
    // Panel button (expandButton) should always be visible for opening sidebar
    this.vibeButton.style.display = 'block';
    this.stopButton.style.display = 'none';
    this.expandButton.style.display = 'flex'; // Reset to flex for proper centering
    this.closeButton.style.display = 'none';
    
    // Reset expandButton styles to ensure proper positioning
    this.expandButton.style.alignItems = 'center';
    this.expandButton.style.justifyContent = 'center';
    
    // Update external button states using unified method
    this.updateButtonStates();
  }
  
  toggleSidebar() {
    if (this.sidebarOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }
}

// Initialize scanner when page loads
if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
  // Prevent multiple instances
  if (!window.twitterScannerInstance) {
    window.twitterScannerInstance = new TwitterScanner();
  }
}