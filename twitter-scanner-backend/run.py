#!/usr/bin/env python3
"""
Twitter Scanner Backend 启动文件
解决模块导入路径问题
"""

import sys
import os

# 添加项目根目录到 Python 路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# 导入并运行主应用
if __name__ == "__main__":
    import uvicorn
    from src.config import settings

    print("🚀 启动 Twitter Scanner Backend...")
    print(f"📊 访问 API 文档: http://{settings.host}:{settings.port}/docs")
    print(f"🏥 健康检查: http://{settings.host}:{settings.port}/health")
    print()

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
