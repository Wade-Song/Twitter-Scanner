"""Main FastAPI application for Twitter Scanner Backend."""

import sys
import os
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from core.logging_config import setup_logging, get_logger
from api.routes import health, usage, analyze
from api.middleware.logging import LoggingMiddleware
from api.middleware.exceptions import ExceptionHandlerMiddleware

# Initialize logging system
logger = setup_logging(log_level=settings.log_level, environment=settings.environment)

# Initialize FastAPI app
# 根据环境和配置决定是否启用文档路由
docs_url = (
    "/docs" if (settings.environment != "production" and settings.enable_docs) else None
)
redoc_url = (
    "/redoc"
    if (settings.environment != "production" and settings.enable_docs)
    else None
)

app = FastAPI(
    title="Twitter Scanner Backend",
    description="FastAPI backend for Twitter Scanner browser extension",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
)

# Add middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(ExceptionHandlerMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "moz-extension://*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Trusted host middleware (生产环境安全设置)
if settings.environment == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(usage.router, tags=["usage"])
app.include_router(analyze.router, tags=["analysis"])


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error format."""
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


# 404 handler
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(request: Request, path: str):
    """Catch all undefined routes."""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "path": f"/{path}",
            "method": request.method,
        },
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info(
        "Twitter Scanner Backend starting up",
        port=settings.port,
        environment=settings.environment,
        rate_limit=f"{settings.max_requests_per_ip} requests per {settings.rate_limit_window_ms / 60000} minutes",
        usage_limit=f"{settings.max_free_usage_per_ip} requests per {settings.usage_reset_interval_hours} hours",
        timestamp=datetime.now().isoformat(),
    )


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info(
        "Twitter Scanner Backend shutting down",
        timestamp=datetime.now().isoformat(),
    )


if __name__ == "__main__":
    # Run with uvicorn when executed directly
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
