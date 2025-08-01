# Twitter Scanner

一个智能的Twitter内容筛选浏览器扩展，帮助您从关注的KOL时间线中快速发现高价值内容，过滤掉日常生活和无关信息。

## 项目简介

Twitter Scanner 是一个Chrome浏览器扩展，旨在帮助用户更高效地筛选Twitter内容：

- 🎯 **智能内容筛选**：从关注的KOL推文中提取高质量、有洞察力的内容
- 🤖 **AI驱动分析**：使用Claude AI进行内容分析和分类
- 🔍 **专业领域聚焦**：重点关注互联网产品和AI技术相关内容
- 🚫 **噪音过滤**：自动过滤日常生活、广告推广等无关信息
- 📋 **结构化输出**：以Markdown格式提供清晰的内容摘要

## 主要特性

- **双模式支持**：支持托管服务模式和自有API密钥模式
- **中文输出**：自动将英文内容翻译为中文
- **主题聚合**：相同主题的内容会被智能归类
- **可定制提示词**：支持自定义系统提示词以满足个性化需求
- **智能重试**：内置重试机制确保服务稳定性

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/Twitter-scanner.git
cd Twitter-scanner
```

### 2. 安装扩展

1. 打开Chrome浏览器
2. 进入扩展管理页面：
   - 地址栏输入 `chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹 `Twitter-scanner`

### 3. 配置扩展

扩展安装完成后，您会看到Chrome工具栏中的Twitter Scanner图标。

#### 模式选择

扩展支持两种使用模式：

**🔹 托管服务模式（推荐，默认）**
- 无需配置，开箱即用
- 提供免费使用额度
- 适合一般用户

**🔹 自有API密钥模式**
- 需要配置您的Claude API密钥
- 无使用次数限制
- 适合重度用户

#### 配置步骤

1. 点击扩展图标打开设置面板
2. **选择使用模式**：
   - 默认使用"代理服务器模式"（推荐）
   - 如需切换到自有API，选择"使用自己的API Key"
3. **配置API密钥**（仅自有API模式需要）：
   - 在[Anthropic官网](https://console.anthropic.com/)获取Claude API密钥
   - 将API密钥粘贴到输入框中
   - 点击"保存API Key"
4. **自定义系统提示词**（可选）：
   - 默认提示词已经过优化，适合大多数场景
   - 如需个性化定制，可修改系统提示词
   - 点击"保存系统提示词"

### 4. 开始使用

1. **访问Twitter/X**：
   - 打开 [Twitter](https://twitter.com) 或 [X](https://x.com)
   - 登录您的账户

2. **扫描时间线**：
   - 浏览您的Twitter主页时间线
   - 点击扩展图标
   - 点击"开始扫描Twitter时间线"按钮

3. **查看分析结果**：
   - 扩展会自动收集当前可见的推文
   - AI会对内容进行分析和筛选
   - 在弹出窗口中查看结构化的分析结果

## 使用技巧

### 最佳实践

1. **优化扫描效果**：
   - 在扫描前先滚动浏览时间线，加载更多内容
   - 确保页面完全加载后再进行扫描

2. **个性化定制**：
   - 根据您的兴趣领域调整系统提示词
   - 可以指定特别关注的博主或话题

3. **高效使用**：
   - 托管服务模式下，合理使用免费额度
   - 超出免费额度后可切换到自有API模式

### 故障排除

**扩展无法加载**
- 确保已开启开发者模式
- 检查文件夹路径是否正确
- 尝试重新加载扩展

**扫描失败**
- 确保已正确访问Twitter/X网站
- 检查网络连接
- 查看控制台错误信息

**API调用失败**
- 验证API密钥是否正确
- 检查API余额是否充足
- 确认网络能访问Anthropic服务

## 技术架构

### 核心组件

- **Content Script**：负责页面内容抓取
- **Background Script**：处理API调用和数据分析
- **Popup Interface**：用户界面和配置管理
- **Proxy Server**：托管服务后端（可选）

### API支持

- **Claude API**：使用Anthropic的Claude模型进行内容分析
- **代理服务**：提供托管的API调用服务
- **存储管理**：Chrome存储API管理配置和缓存

## 开发相关

### 项目结构

```
Twitter-scanner/
├── manifest.json          # 扩展清单文件
├── popup.html             # 弹出窗口界面
├── popup.js               # 弹出窗口逻辑
├── background.js          # 后台脚本
├── content.js             # 内容脚本
├── styles.css             # 样式文件
└── README.md             # 项目文档
```

### 本地开发

1. 修改代码后，在扩展管理页面点击"重新加载"
2. 可以通过开发者工具查看控制台日志
3. 使用Chrome扩展调试工具进行调试

### 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建功能分支
3. 提交变更
4. 发起Pull Request

## 隐私和安全

- 扩展仅在用户主动操作时收集推文内容
- 不会存储或传输个人敏感信息
- API密钥仅在本地存储，不会上传到服务器
- 托管服务模式下的数据传输采用HTTPS加密

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 更新日志

### 最新版本

- ✅ 默认启用代理服务器模式
- ✅ 优化用量提示逻辑
- ✅ 智能内容筛选和中文输出
- ✅ 双模式架构支持
- ✅ 可定制系统提示词

---

如有问题或建议，请提交Issue或联系开发团队。