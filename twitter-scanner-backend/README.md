# Twitter Scanner Backend (Python FastAPI)

这是 Twitter Scanner 浏览器扩展的后端服务，使用 Python FastAPI 重新实现。该服务作为代理，将推文数据发送给 Claude API 进行分析，并返回格式化的摘要。

## ✨ 特性

- 🚀 **高性能**: 基于 FastAPI 和异步编程，性能优异
- 🔒 **安全**: 内置速率限制、使用量跟踪和安全中间件
- 📝 **类型安全**: 完整的 Pydantic 数据验证和类型提示
- 🐳 **容器化**: Docker 支持，易于部署
- 📊 **监控**: 结构化日志和健康检查端点
- 📖 **文档**: 自动生成的 API 文档 (Swagger/OpenAPI)

## 🏗️ 架构

```
twitter-scanner-backend/
├── src/
│   ├── __init__.py           # Python 包初始化
│   ├── main.py              # FastAPI 主应用
│   ├── config.py            # 配置管理
│   ├── models.py            # Pydantic 数据模型
│   ├── claude_client.py     # Claude API 客户端
│   └── rate_limiter.py      # 速率限制和使用量跟踪
├── requirements.txt         # Python 依赖
├── Dockerfile              # Docker 配置
├── docker-compose.yml      # Docker Compose 配置
├── .env.example           # 环境变量示例
└── README.md              # 项目文档
```

## 🚀 快速开始

### 方式一：Docker (推荐)

1. **克隆项目**
   ```bash
   git clone <your-repo>
   cd twitter-scanner-backend
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入你的 Claude API Key
   nano .env
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **验证服务**
   ```bash
   curl http://localhost:3000/health
   ```

### 方式二：本地开发

1. **安装 Python 依赖**
   ```bash
   pip install -r requirements.txt
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件
   ```

3. **启动开发服务器**
   ```bash
   python src/main.py
   # 或者
   uvicorn src.main:app --reload --host 0.0.0.0 --port 3000
   ```

## ⚙️ 配置

### 必需的环境变量

```bash
# Claude API 配置
CLAUDE_API_KEY=your_claude_api_key_here    # 必需
CLAUDE_API_URL=https://api.anthropic.com/v1/messages

# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# 速率限制
MAX_REQUESTS_PER_IP=100                    # 每个 IP 最大请求数
RATE_LIMIT_WINDOW_MS=900000               # 速率限制窗口 (15分钟)

# 使用量限制
MAX_FREE_USAGE_PER_IP=50                  # 免费层每个用户最大使用次数
USAGE_RESET_INTERVAL_HOURS=24            # 使用量重置间隔 (24小时)

# 可选: Redis (用于分布式速率限制)
REDIS_URL=redis://localhost:6379

# 日志级别
LOG_LEVEL=INFO
```

### 获取 Claude API Key

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 创建账户并获取 API Key
3. 将 API Key 填入 `.env` 文件的 `CLAUDE_API_KEY` 字段

## 📡 API 文档

服务启动后，访问以下地址查看 API 文档：

- **Swagger UI**: http://localhost:3000/docs
- **ReDoc**: http://localhost:3000/redoc

### 主要端点

#### `POST /api/analyze`
分析推文数据并返回 Claude 生成的摘要。

**请求体示例**:
```json
{
  "tweets": [
    {
      "author": "username",
      "content": "Tweet content here...",
      "timestamp": "2024-01-01T12:00:00Z",
      "url": "https://twitter.com/username/status/123"
    }
  ],
  "system_prompt": "Custom system prompt (optional)"
}
```

**响应示例**:
```json
{
  "success": true,
  "analysis": "# 分析结果\n\n这是 Claude 生成的分析内容...",
  "usage": {
    "current": 5,
    "limit": 50,
    "remaining": 45
  },
  "processing_time": 2500
}
```

#### `GET /health`
健康检查端点。

#### `GET /usage`
获取当前用户的使用量统计。

## 🚀 部署

### Docker 部署

1. **构建镜像**
   ```bash
   docker build -t twitter-scanner-backend .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name twitter-scanner-backend \
     -p 3000:3000 \
     --env-file .env \
     twitter-scanner-backend
   ```

### 生产环境部署

#### 使用 Gunicorn (推荐)

```bash
# 安装 gunicorn
pip install gunicorn

# 启动服务 (多工作进程)
gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:3000
```

#### 使用 PM2

```bash
npm install -g pm2

# 创建 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'twitter-scanner-backend',
    script: 'python',
    args: '-m uvicorn src.main:app --host 0.0.0.0 --port 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# 启动服务
pm2 start ecosystem.config.js
```

## 🔧 开发

### 代码结构

- **`src/main.py`**: FastAPI 应用主文件，包含路由和中间件
- **`src/config.py`**: 配置管理，使用 Pydantic Settings
- **`src/models.py`**: 数据模型定义，用于请求/响应验证
- **`src/claude_client.py`**: Claude API 客户端，包含重试机制
- **`src/rate_limiter.py`**: 速率限制和使用量跟踪

### 添加新功能

1. 在 `src/models.py` 中定义新的数据模型
2. 在 `src/main.py` 中添加新的路由
3. 如果需要，在 `src/config.py` 中添加新的配置项

### 测试

```bash
# 安装测试依赖
pip install pytest pytest-asyncio httpx

# 运行测试
pytest
```

## 📊 监控和日志

### 结构化日志

服务使用 `structlog` 生成 JSON 格式的结构化日志，便于日志分析和监控。

```json
{
  "event": "Analysis request received",
  "client_ip": "192.168.1.100",
  "tweet_count": 5,
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info"
}
```

### 健康检查

```bash
curl http://localhost:3000/health
```

返回服务状态、时间戳和运行时间。

### 使用量监控

```bash
curl http://localhost:3000/usage
```

返回当前 IP 的使用量统计。

## 🔒 安全特性

- **CORS 配置**: 只允许浏览器扩展域名访问
- **速率限制**: 防止 API 滥用
- **使用量跟踪**: 免费层限制
- **输入验证**: Pydantic 模型验证所有输入
- **错误处理**: 统一的错误响应格式

## 🆚 与 Node.js 版本的区别

| 特性 | Node.js 版本 | Python FastAPI 版本 |
|------|-------------|---------------------|
| 性能 | 高 | 更高 (异步处理) |
| 类型安全 | TypeScript (可选) | Pydantic (内置) |
| API 文档 | 手动维护 | 自动生成 (OpenAPI) |
| 数据验证 | 手动或中间件 | Pydantic 自动验证 |
| 错误处理 | 手动 | FastAPI 统一处理 |
| 依赖注入 | 无 | FastAPI Depends |

## 🐛 故障排除

### 常见问题

1. **Claude API Key 无效**
   ```
   错误: CLAUDE_API_KEY environment variable is not set
   解决: 检查 .env 文件中的 CLAUDE_API_KEY 配置
   ```

2. **端口被占用**
   ```
   错误: [Errno 48] Address already in use
   解决: 修改 PORT 环境变量或停止占用端口的进程
   ```

3. **依赖安装失败**
   ```
   解决: 升级 pip 并使用国内镜像源
   pip install --upgrade pip
   pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```

### 日志查看

```bash
# Docker 日志
docker-compose logs -f twitter-scanner-backend

# 本地运行日志
tail -f /path/to/logfile
```

## 📄 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request 