"""Request logging middleware."""

import time
from datetime import datetime
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from core.logging_config import get_logger
from utils.rate_limiter import rate_limit_manager

logger = get_logger("middleware.logging")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging all requests."""

    async def dispatch(self, request: Request, call_next):
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
