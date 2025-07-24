"""Exception handling middleware."""

from datetime import datetime
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core.logging_config import get_logger

logger = get_logger("middleware.exceptions")


class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for handling exceptions."""

    async def dispatch(self, request: Request, call_next):
        """Handle exceptions."""
        try:
            response = await call_next(request)
            return response
        except HTTPException:
            # Re-raise HTTP exceptions to be handled by FastAPI
            raise
        except Exception as exc:
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
