#!/bin/bash

# Twitter Scanner Backend - 启动脚本

set -e

echo "🚀 启动 Twitter Scanner Backend..."

# 检查 Python 版本
python_version=$(python3 --version 2>/dev/null || echo "Python not found")
echo "📋 Python 版本: $python_version"

# 检查是否存在虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📦 安装依赖..."
pip install --upgrade pip
pip install -r requirements.txt

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，从示例文件复制..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件并填入你的 Claude API Key:"
    echo "   nano .env"
    echo ""
    echo "🔑 必须设置的变量:"
    echo "   CLAUDE_API_KEY=your_claude_api_key_here"
    echo ""
    read -p "按 Enter 键继续..." -r
fi

# 验证关键环境变量
source .env
if [ -z "$CLAUDE_API_KEY" ] || [ "$CLAUDE_API_KEY" = "your_claude_api_key_here" ]; then
    echo "❌ 错误: CLAUDE_API_KEY 未设置或仍为默认值"
    echo "请编辑 .env 文件并设置正确的 Claude API Key"
    exit 1
fi

# 创建日志目录
mkdir -p logs

echo "✅ 环境准备完成"
echo ""
echo "🌟 启动服务..."
echo "📊 访问 API 文档: http://localhost:${PORT:-5000}/docs"
echo "🏥 健康检查: http://localhost:${PORT:-5000}/health"
echo ""

# 启动服务
python run.py 