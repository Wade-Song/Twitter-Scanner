#!/bin/bash

# Twitter Scanner Backend - 停止脚本

echo "🛑 停止 Twitter Scanner Backend..."

# 检查PID文件是否存在
if [ ! -f "logs/app.pid" ]; then
    echo "❌ 未找到PID文件，服务可能未运行"
    exit 1
fi

# 读取PID
PID=$(cat logs/app.pid)

# 检查进程是否存在
if ! ps -p $PID > /dev/null; then
    echo "❌ 进程 $PID 不存在，可能已经停止"
    rm -f logs/app.pid
    exit 1
fi

# 优雅关闭进程
echo "📝 正在停止进程 $PID..."
kill $PID

# 等待进程停止
sleep 2

# 检查进程是否已停止
if ps -p $PID > /dev/null; then
    echo "⚠️  进程未正常停止，强制关闭..."
    kill -9 $PID
    sleep 1
fi

# 清理PID文件
rm -f logs/app.pid

echo "✅ 服务已停止" 