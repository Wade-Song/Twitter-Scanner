"""Main FastAPI application for Twitter Scanner Backend."""

import time
import asyncio
from datetime import datetime
from typing import Optional
import structlog
import uvicorn
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import settings
from src.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    ErrorResponse,
    HealthResponse,
    UsageResponse,
    UsageInfo,
)
from src.claude_client import ClaudeClient, ClaudeAPIError
from src.rate_limiter import rate_limit_manager

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Initialize FastAPI app
app = FastAPI(
    title="Twitter Scanner Backend",
    description="FastAPI backend for Twitter Scanner browser extension",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Startup time for uptime calculation
startup_time = time.time()

# Initialize Claude client
claude_client = ClaudeClient()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "moz-extension://*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Trusted host middleware (optional security)
if settings.environment == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])


# Dependencies for rate limiting
async def check_rate_limit(request: Request):
    """Dependency to check rate limits."""
    is_allowed, retry_after = rate_limit_manager.check_rate_limit(request)
    if not is_allowed:
        client_ip = rate_limit_manager.get_client_ip(request)
        logger.warning(
            "Rate limit exceeded", client_ip=client_ip, retry_after=retry_after
        )
        raise HTTPException(
            status_code=429,
            detail={"error": "Too many requests", "retry_after": retry_after},
        )


async def check_usage_limit(request: Request):
    """Dependency to check usage limits."""
    is_allowed, usage_info = rate_limit_manager.check_usage_limit(request)
    if not is_allowed:
        client_ip = rate_limit_manager.get_client_ip(request)
        logger.warning(
            "Usage limit exceeded", client_ip=client_ip, usage_info=usage_info
        )
        raise HTTPException(
            status_code=429,
            detail={
                "error": f"Free usage limit reached ({usage_info['limit']} requests per {settings.usage_reset_interval_hours} hours)",
                "usage": usage_info["usage"],
                "limit": usage_info["limit"],
                "reset_time": usage_info["reset_time"],
            },
        )

    # Store usage info in request state for later use
    request.state.usage_info = usage_info
    return usage_info


# Middleware for logging requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    start_time = time.time()
    client_ip = rate_limit_manager.get_client_ip(request)

    logger.info(
        "Request received",
        method=request.method,
        url=str(request.url),
        client_ip=client_ip,
        user_agent=request.headers.get("user-agent", ""),
        timestamp=datetime.now().isoformat(),
    )

    response = await call_next(request)

    process_time = time.time() - start_time
    logger.info(
        "Request completed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        process_time=process_time,
        client_ip=client_ip,
    )

    response.headers["X-Process-Time"] = str(process_time)
    return response


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    uptime = time.time() - startup_time
    return HealthResponse(
        status="ok", timestamp=datetime.now().isoformat(), uptime=uptime
    )


# Usage stats endpoint
@app.get("/usage/{client_key}", response_model=UsageResponse)
@app.get("/usage", response_model=UsageResponse)
async def get_usage_stats(request: Request, client_key: Optional[str] = None):
    """Get usage statistics for a client."""
    usage_stats = rate_limit_manager.get_usage_stats(request, client_key)

    return UsageResponse(
        usage=usage_stats["usage"],
        limit=usage_stats["limit"],
        remaining=usage_stats["remaining"],
        reset_time=usage_stats["reset_time"],
    )


# Main analyze endpoint
@app.post(
    "/api/analyze",
    response_model=AnalyzeResponse,
    dependencies=[Depends(check_rate_limit), Depends(check_usage_limit)],
)
async def analyze_tweets(request: Request, analyze_request: AnalyzeRequest):
    """
    Analyze tweets using Claude API.

    This endpoint accepts a list of tweets and returns an analysis
    generated by Claude AI, formatted in markdown.
    """
    start_time = time.time()
    client_ip = rate_limit_manager.get_client_ip(request)

    logger.info(
        "Analysis request received",
        client_ip=client_ip,
        fingerprint=rate_limit_manager.get_browser_fingerprint(request),
        tweet_count=len(analyze_request.tweets),
        has_system_prompt=bool(analyze_request.system_prompt),
        current_usage=request.state.usage_info["usage"],
        timestamp=datetime.now().isoformat(),
    )

    try:
        # Call Claude API
        analysis = await claude_client.analyze_tweets(
            analyze_request.tweets, analyze_request.system_prompt
        )

        # Update usage counter
        updated_usage = rate_limit_manager.increment_usage(request)

        processing_time = int(
            (time.time() - start_time) * 1000
        )  # Convert to milliseconds

        logger.info(
            "Analysis completed successfully",
            client_ip=client_ip,
            new_usage=updated_usage["usage"],
            processing_time_ms=processing_time,
            analysis_length=len(analysis),
            timestamp=datetime.now().isoformat(),
        )

        return AnalyzeResponse(
            success=True,
            analysis=analysis,
            usage=UsageInfo(
                current=updated_usage["usage"],
                limit=updated_usage["limit"],
                remaining=updated_usage["remaining"],
            ),
            processingTime=processing_time,
        )

    except ClaudeAPIError as e:
        processing_time = int((time.time() - start_time) * 1000)

        logger.error(
            "Claude API error",
            client_ip=client_ip,
            error=e.message,
            status_code=e.status_code,
            attempt=e.attempt,
            processing_time_ms=processing_time,
            timestamp=datetime.now().isoformat(),
        )

        # Return appropriate HTTP status based on Claude API error
        status_code = 500
        if e.status_code:
            if e.status_code == 429:
                status_code = 429
            elif 400 <= e.status_code < 500:
                status_code = 400

        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error": e.message,
                "processingTime": processing_time,
            },
        )

    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)

        logger.error(
            "Unexpected error during analysis",
            client_ip=client_ip,
            error=str(e),
            error_type=type(e).__name__,
            processing_time_ms=processing_time,
            timestamp=datetime.now().isoformat(),
        )

        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Internal server error",
                "processingTime": processing_time,
            },
        )


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error format."""
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(
        "Unhandled exception",
        error=str(exc),
        error_type=type(exc).__name__,
        url=str(request.url),
        method=request.method,
        timestamp=datetime.now().isoformat(),
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "timestamp": datetime.now().isoformat(),
        },
    )


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
        "Twitter Scanner Proxy Server starting up",
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
        "Twitter Scanner Proxy Server shutting down",
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
