// Twitter Scanner Content Script
console.log('Twitter Scanner content script loaded');

class TwitterScanner {
  constructor() {
    this.isScanning = false;
    this.scanInterval = null;
    this.collectedTweets = [];
    this.processedTweetIds = new Set();
    this.sidebar = null;
    this.vibeButton = null;
    this.stopButton = null;
    
    this.init();
  }
  
  // Generate random interval between 1-5 seconds
  getRandomInterval() {
    return Math.floor(Math.random() * 4000) + 1000; // 1000-5000ms
  }
  
  init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    this.createButtons();
    this.createSidebar();
    this.setupEventListeners();
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
    
    // Create vibe reading button
    this.vibeButton = document.createElement('button');
    this.vibeButton.textContent = 'vibe reading';
    this.vibeButton.style.cssText = `
      background: linear-gradient(45deg, #1da1f2, #0084b4);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(29, 161, 242, 0.3);
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
    
    // Add hover effects
    this.vibeButton.addEventListener('mouseenter', () => {
      this.vibeButton.style.transform = 'translateY(-2px)';
      this.vibeButton.style.boxShadow = '0 6px 20px rgba(29, 161, 242, 0.4)';
    });
    
    this.vibeButton.addEventListener('mouseleave', () => {
      this.vibeButton.style.transform = 'translateY(0)';
      this.vibeButton.style.boxShadow = '0 4px 15px rgba(29, 161, 242, 0.3)';
    });
    
    this.stopButton.addEventListener('mouseenter', () => {
      this.stopButton.style.transform = 'translateY(-2px)';
      this.stopButton.style.boxShadow = '0 6px 20px rgba(231, 76, 60, 0.4)';
    });
    
    this.stopButton.addEventListener('mouseleave', () => {
      this.stopButton.style.transform = 'translateY(0)';
      this.stopButton.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.3)';
    });
    
    buttonContainer.appendChild(this.vibeButton);
    buttonContainer.appendChild(this.stopButton);
    document.body.appendChild(buttonContainer);
  }
  
  createSidebar() {
    // Create sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'twitter-scanner-sidebar';
    this.sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      transition: right 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
    `;
    
    // Create sidebar header
    const sidebarHeader = document.createElement('div');
    sidebarHeader.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #eee;
      background: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Twitter Scanner';
    headerTitle.style.cssText = `
      margin: 0;
      font-size: 18px;
      color: #333;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeButton.addEventListener('click', () => this.closeSidebar());
    
    sidebarHeader.appendChild(headerTitle);
    sidebarHeader.appendChild(closeButton);
    
    // Create sidebar content
    const sidebarContent = document.createElement('div');
    sidebarContent.id = 'sidebar-content';
    sidebarContent.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    `;
    
    // Create initial message
    const initialMessage = document.createElement('div');
    initialMessage.id = 'initial-message';
    initialMessage.style.cssText = `
      text-align: center;
      color: #666;
      padding: 40px 20px;
      font-size: 14px;
    `;
    initialMessage.innerHTML = `
      <p>Click "vibe reading" to start scanning Twitter timeline</p>
      <p>Collected tweets will appear here in real-time</p>
    `;
    
    sidebarContent.appendChild(initialMessage);
    this.sidebar.appendChild(sidebarHeader);
    this.sidebar.appendChild(sidebarContent);
    document.body.appendChild(this.sidebar);
  }
  
  setupEventListeners() {
    this.vibeButton.addEventListener('click', () => this.startScanning());
    this.stopButton.addEventListener('click', () => this.stopScanning());
  }
  
  startScanning() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.collectedTweets = [];
    this.processedTweetIds.clear();
    
    // Update UI
    this.vibeButton.style.display = 'none';
    this.stopButton.style.display = 'block';
    this.openSidebar();
    
    // Clear previous content
    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">Scanning Timeline...</h3>
        <div style="background: #e3f2fd; padding: 10px; border-radius: 8px; font-size: 14px; color: #1976d2;">
          <div id="scan-status">Starting scan...</div>
        </div>
      </div>
      <div id="tweet-list"></div>
    `;
    
    // Start scanning with first scroll
    this.scrollAndExtract();
    this.scheduleNextScroll();
    
    this.updateScanStatus('Scrolling and extracting tweets...');
  }
  
  scheduleNextScroll() {
    if (!this.isScanning) return;
    
    const randomInterval = this.getRandomInterval();
    this.scanInterval = setTimeout(() => {
      this.scrollAndExtract();
      this.scheduleNextScroll(); // Schedule next scroll
    }, randomInterval);
    
    console.log(`Next scroll scheduled in ${randomInterval}ms`);
    
    // Update status with countdown
    this.updateScanStatus(`Collected ${this.collectedTweets.length} tweets • Next scroll in ${Math.ceil(randomInterval/1000)}s`);
  }
  
  stopScanning() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    clearTimeout(this.scanInterval);
    
    // Update UI
    this.vibeButton.style.display = 'block';
    this.stopButton.style.display = 'none';
    
    this.updateScanStatus('Analyzing tweets with Claude...');
    
    // Send tweets to background script for analysis
    if (this.collectedTweets.length > 0) {
      chrome.runtime.sendMessage({
        type: 'ANALYZE_TWEETS',
        tweets: this.collectedTweets
      }, (response) => {
        if (response && response.success) {
          this.displayAnalysis(response.analysis);
        } else {
          this.displayError(response ? response.error : 'Analysis failed');
        }
      });
    } else {
      this.displayError('No tweets collected. Try scrolling more on the timeline.');
    }
  }
  
  scrollAndExtract() {
    // Scroll page
    window.scrollBy(0, 600);
    
    // Extract new tweets
    this.extractTweets();
    
    // Update scan status will be handled by scheduleNextScroll
  }
  
  extractTweets() {
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
      if (tweets.length > 0) break;
    }
    
    tweets.forEach(tweet => {
      try {
        const tweetId = this.getTweetId(tweet);
        if (tweetId && !this.processedTweetIds.has(tweetId)) {
          const tweetData = this.extractTweetData(tweet);
          if (tweetData) {
            this.collectedTweets.push(tweetData);
            this.processedTweetIds.add(tweetId);
            this.displayTweetInSidebar(tweetData);
          }
        }
      } catch (error) {
        console.error('Error extracting tweet:', error);
      }
    });
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
      // Extract text content
      const textElements = tweetElement.querySelectorAll('[data-testid="tweetText"]');
      let content = '';
      textElements.forEach(el => {
        content += el.innerText + ' ';
      });
      
      // Extract author
      const authorElement = tweetElement.querySelector('[data-testid="User-Name"]') || 
                           tweetElement.querySelector('[data-testid="User-Names"]');
      const author = authorElement ? authorElement.innerText : 'Unknown';
      
      // Extract timestamp
      const timeElement = tweetElement.querySelector('time');
      const timestamp = timeElement ? timeElement.getAttribute('datetime') || timeElement.innerText : 'Unknown';
      
      if (content.trim()) {
        return {
          content: content.trim(),
          author: author,
          timestamp: timestamp,
          id: this.getTweetId(tweetElement)
        };
      }
    } catch (error) {
      console.error('Error extracting tweet data:', error);
    }
    
    return null;
  }
  
  displayTweetInSidebar(tweetData) {
    const tweetList = document.getElementById('tweet-list');
    if (!tweetList) return;
    
    const tweetElement = document.createElement('div');
    tweetElement.style.cssText = `
      background: #f8f9fa;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 8px;
      border-left: 4px solid #1da1f2;
      font-size: 14px;
    `;
    
    tweetElement.innerHTML = `
      <div style="font-weight: 600; color: #1da1f2; margin-bottom: 8px;">
        ${this.escapeHtml(tweetData.author)}
      </div>
      <div style="color: #333; line-height: 1.4; margin-bottom: 8px;">
        ${this.escapeHtml(tweetData.content)}
      </div>
      <div style="color: #666; font-size: 12px;">
        ${this.escapeHtml(tweetData.timestamp)}
      </div>
    `;
    
    tweetList.appendChild(tweetElement);
    
    // Auto-scroll to bottom
    tweetList.scrollTop = tweetList.scrollHeight;
  }
  
  updateScanStatus(message) {
    const statusElement = document.getElementById('scan-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }
  
  displayAnalysis(analysis) {
    const sidebarContent = document.getElementById('sidebar-content');
    if (!sidebarContent) return;
    
    sidebarContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">Analysis Complete</h3>
        <div style="background: #e8f5e8; padding: 10px; border-radius: 8px; font-size: 14px; color: #2e7d32;">
          Found ${this.collectedTweets.length} tweets • Analysis ready
        </div>
      </div>
      
      <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #f5f5f5; padding: 15px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
          <h4 style="margin: 0; color: #333;">Curated Insights</h4>
          <button id="copy-analysis" style="background: #1da1f2; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 12px; cursor: pointer;">
            Copy All
          </button>
        </div>
        <div id="analysis-content" style="padding: 20px; max-height: 400px; overflow-y: auto; line-height: 1.6; color: #333;">
          ${this.formatAnalysis(analysis)}
        </div>
      </div>
    `;
    
    // Add copy functionality
    document.getElementById('copy-analysis').addEventListener('click', () => {
      navigator.clipboard.writeText(analysis).then(() => {
        const button = document.getElementById('copy-analysis');
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = 'Copy All';
        }, 2000);
      });
    });
  }
  
  displayError(errorMessage) {
    const sidebarContent = document.getElementById('sidebar-content');
    if (!sidebarContent) return;
    
    sidebarContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #d32f2f;">Error</h3>
        <div style="background: #ffebee; padding: 15px; border-radius: 8px; font-size: 14px; color: #d32f2f;">
          ${this.escapeHtml(errorMessage)}
        </div>
      </div>
      
      <div style="background: #fff3e0; padding: 15px; border-radius: 8px; font-size: 14px; color: #ef6c00;">
        <strong>Troubleshooting:</strong><br>
        • Make sure you have configured your Claude API key in the extension popup<br>
        • Ensure you have a stable internet connection<br>
        • Try collecting more tweets before stopping the scan<br>
        • Check if your system prompt is properly configured<br>
        • Open browser console (F12) to see detailed error information
      </div>
    `;
  }
  
  formatAnalysis(analysis) {
    // Convert markdown-like formatting to HTML
    return analysis
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/#{1,3}\s+(.*?)(?=<br>|$)/g, '<h4 style="color: #1da1f2; margin: 15px 0 10px 0;">$1</h4>');
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  openSidebar() {
    this.sidebar.style.right = '0';
  }
  
  closeSidebar() {
    this.sidebar.style.right = '-400px';
  }
}

// Initialize scanner when page loads
if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
  new TwitterScanner();
}