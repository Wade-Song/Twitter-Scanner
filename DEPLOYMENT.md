# Twitter Scanner - 部署和测试指南

## 🚀 项目概述

这个双版本架构的 Twitter Scanner 插件支持两种使用模式：
1. **代理模式**：使用你提供的代理服务器，用户免费使用10次
2. **自定义API模式**：用户使用自己的Claude API key

## 📁 项目结构

```
Twitter-scanner/
├── manifest.json          # 插件配置文件
├── popup.html             # 弹窗界面
├── popup.js               # 弹窗逻辑（包含模式切换）
├── content.js             # 内容脚本（推文扫描）
├── background.js          # 后台脚本（双模式API调用）
├── utils/
│   └── logger.js          # 日志记录工具
├── server/                # 代理服务器
│   ├── package.json
│   ├── server.js          # Express服务器
│   ├── Dockerfile         # Docker部署
│   ├── .env.example       # 环境变量模板
│   └── README.md          # 服务器文档
└── DEPLOYMENT.md          # 本文件
```

## 🔧 本地测试

### 1. 测试插件功能

1. **加载插件到Chrome**：
   ```bash
   # 在Chrome中：
   # 1. 打开 chrome://extensions/
   # 2. 开启"开发者模式"
   # 3. 点击"加载已解压的扩展程序"
   # 4. 选择项目根目录
   ```

2. **测试双模式切换**：
   - 打开插件弹窗
   - 测试"使用托管服务"和"使用自己的API key"切换
   - 检查UI是否正确显示/隐藏API key输入框

3. **测试推文扫描**：
   - 访问 twitter.com 或 x.com
   - 点击"vibe reading"开始扫描
   - 观察控制台日志输出

### 2. 测试代理服务器

1. **安装依赖**：
   ```bash
   cd server
   npm install
   ```

2. **配置环境**：
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，添加你的 Claude API key
   ```

3. **启动服务器**：
   ```bash
   npm run dev
   ```

4. **测试API端点**：
   ```bash
   # 健康检查
   curl http://localhost:3000/health
   
   # 测试分析端点
   curl -X POST http://localhost:3000/api/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "tweets": [
         {
           "author": "@testuser",
           "content": "This is a test tweet",
           "timestamp": "2024-01-01T00:00:00Z",
           "url": "https://twitter.com/testuser/status/123"
         }
       ]
     }'
   ```

## 🌐 生产环境部署

### 1. 部署代理服务器

#### 选项A: Railway (推荐)
```bash
# 1. 注册Railway账户
# 2. 连接GitHub仓库
# 3. 设置环境变量：
#    CLAUDE_API_KEY=your_claude_api_key
#    NODE_ENV=production
# 4. 部署
```

#### 选项B: Vercel
```bash
npm i -g vercel
cd server
vercel --env CLAUDE_API_KEY=your_claude_api_key
```

#### 选项C: Docker
```bash
cd server
docker build -t twitter-scanner-proxy .
docker run -p 3000:3000 \
  -e CLAUDE_API_KEY=your_claude_api_key \
  -e NODE_ENV=production \
  twitter-scanner-proxy
```

### 2. 更新插件配置

1. **修改代理URL**：
   ```javascript
   // 在 background.js 中更新：
   const PROXY_URL = 'https://your-deployed-server.com/api/analyze';
   ```

2. **更新manifest.json权限**：
   ```json
   {
     "host_permissions": [
       "https://twitter.com/*",
       "https://x.com/*",
       "https://api.anthropic.com/*",
       "https://your-deployed-server.com/*"
     ]
   }
   ```

3. **打包插件**：
   ```bash
   # 创建插件压缩包，排除不必要的文件
   zip -r twitter-scanner-extension.zip . \
     -x "server/*" "node_modules/*" ".*" "*.md"
   ```

## 🧪 功能测试清单

### ✅ 插件基础功能
- [ ] 插件正确加载到Chrome
- [ ] 在Twitter/X页面显示按钮
- [ ] 侧边栏正确打开/关闭
- [ ] 推文扫描和提取工作正常

### ✅ 双模式功能
- [ ] 模式切换UI正确工作
- [ ] 代理模式：无需API key即可使用
- [ ] 自定义模式：需要配置API key
- [ ] 使用次数统计正确显示
- [ ] 错误处理正确显示

### ✅ 代理服务器
- [ ] 服务器正常启动
- [ ] 健康检查端点工作
- [ ] 分析端点正确处理请求
- [ ] 使用限制正确执行
- [ ] 错误处理和日志记录

### ✅ 安全性
- [ ] API key安全存储
- [ ] CORS设置正确
- [ ] 率限制正常工作
- [ ] 输入验证有效

## 📊 监控和维护

### 日志查看
```bash
# 服务器日志
npm start 2>&1 | tee logs/server.log

# 插件日志
# 在Chrome开发者工具中查看Console
```

### 性能监控
- 监控服务器响应时间
- 监控API调用成功率
- 监控内存使用情况
- 监控使用次数统计

### 定期维护
- 更新依赖包
- 检查Twitter DOM结构变化
- 更新Claude API版本
- 清理日志文件

## 🔧 故障排除

### 常见问题

1. **插件无法加载**
   - 检查manifest.json语法
   - 确认所有文件路径正确

2. **代理服务器连接失败**
   - 检查CORS设置
   - 确认URL配置正确
   - 验证SSL证书

3. **API调用失败**
   - 验证Claude API key
   - 检查网络连接
   - 查看错误日志

4. **推文提取异常**
   - Twitter DOM结构可能已变化
   - 更新CSS选择器
   - 检查页面加载状态

## 📝 更新日志

### v1.0.0 (当前版本)
- ✅ 双模式架构实现
- ✅ 代理服务器部署
- ✅ 使用限制和统计
- ✅ 详细日志记录
- ✅ 安全性增强

### 计划中的功能
- 数据库存储支持
- 用户认证系统
- 更多分析选项
- 数据导出功能

---

**注意**：请确保在生产环境中正确配置所有环境变量和安全设置。