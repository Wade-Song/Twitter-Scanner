"""Health check route."""

import time
from datetime import datetime
from fastapi import APIRouter

from core.models import HealthResponse

router = APIRouter()

# Startup time for uptime calculation
startup_time = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    uptime = time.time() - startup_time
    return HealthResponse(
        status="ok", timestamp=datetime.now().isoformat(), uptime=uptime
    )
