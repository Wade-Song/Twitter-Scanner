#!/usr/bin/env python3
"""
Twitter Scanner Backend startup file
Handles module import path issues
"""

import sys
import os
import uvicorn

# Add src directory to Python path first
project_root = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(project_root, "src")
sys.path.insert(0, src_path)
from src.core.config import settings

# Import and run main application
if __name__ == "__main__":

    print("🚀 Starting Twitter Scanner Backend...")
    print(f"📊 API docs available at: http://{settings.host}:{settings.port}/docs")
    print(f"🏥 Health check at: http://{settings.host}:{settings.port}/health")
    print()

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
