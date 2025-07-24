#!/bin/bash

# Twitter Scanner Backend - 后台启动脚本

set -e

# 检查是否存在虚拟环境
if [ ! -d "venv" ]; then
    echo "❌ 错误: 虚拟环境不存在，请先运行 ./start.sh 进行初始化"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在，请先运行 ./start.sh 进行初始化"
    exit 1
fi

# 验证关键环境变量
source .env
if [ -z "$CLAUDE_API_KEY" ] || [ "$CLAUDE_API_KEY" = "your_claude_api_key_here" ]; then
    echo "❌ 错误: CLAUDE_API_KEY 未设置或仍为默认值"
    exit 1
fi

# 激活虚拟环境
source venv/bin/activate

# 创建日志目录
mkdir -p logs

# 检查是否已经在运行
if [ -f "logs/app.pid" ]; then
    OLD_PID=$(cat logs/app.pid)
    if ps -p $OLD_PID > /dev/null; then
        echo "⚠️  服务已在运行 (PID: $OLD_PID)"
        echo "如需重启，请先运行: ./stop.sh"
        exit 1
    else
        # 清理无效的PID文件
        rm -f logs/app.pid
    fi
fi

echo "🚀 后台启动 Twitter Scanner Backend..."

# 后台启动并保存PID
nohup python run.py > /dev/null 2>&1 &
PID=$!

# 保存PID到文件
echo $PID > logs/app.pid

echo "✅ 服务已启动 (PID: $PID)"
echo "📊 API 地址: http://localhost:${PORT:-3000}"
echo "📝 查看日志: tail -f logs/twitter-scanner.log"
echo "�� 停止服务: ./stop.sh" 