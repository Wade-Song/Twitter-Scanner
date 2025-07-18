#!/bin/bash

# Twitter Scanner Proxy Server 部署脚本
# 适用于 Digital Ocean Ubuntu 服务器

set -e

echo "🚀 开始部署 Twitter Scanner Proxy Server..."

# 检查是否以 root 用户运行
if [[ $EUID -eq 0 ]]; then
   echo "❌ 请不要以 root 用户运行此脚本"
   echo "请先创建应用用户："
   echo "sudo adduser twitter-scanner"
   echo "sudo usermod -aG sudo twitter-scanner"
   echo "su - twitter-scanner"
   exit 1
fi

# 创建应用目录
APP_DIR="/home/twitter-scanner/app"
mkdir -p $APP_DIR
cd $APP_DIR

echo "📁 应用目录: $APP_DIR"

# 复制文件（假设文件在当前目录）
echo "📋 复制应用文件..."
cp package.json $APP_DIR/
cp server.js $APP_DIR/
cp .env.example $APP_DIR/

# 安装依赖
echo "📦 安装 Node.js 依赖..."
npm install --production

# 创建环境变量文件
echo "⚙️  创建环境变量文件..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp .env.example .env
    echo "请编辑 .env 文件并填入你的 Claude API Key:"
    echo "nano .env"
    echo ""
    echo "必须设置以下变量:"
    echo "CLAUDE_API_KEY=your_claude_api_key_here"
    echo ""
    read -p "按 Enter 键继续..."
fi

# 创建日志目录
mkdir -p $APP_DIR/logs

# 创建 PM2 配置文件
echo "🔧 创建 PM2 配置文件..."
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'twitter-scanner-proxy',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

echo "✅ 部署完成！"
echo ""
echo "下一步操作:"
echo "1. 编辑环境变量: nano .env"
echo "2. 安装 PM2: npm install -g pm2"
echo "3. 启动服务: pm2 start ecosystem.config.js"
echo "4. 设置防火墙: sudo ufw allow 3000"
echo "5. 配置 Nginx 反向代理（可选）"
echo ""
echo "测试服务: curl http://localhost:3000/health"