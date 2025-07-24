"""Usage statistics route."""

from typing import Optional
from fastapi import APIRouter, Request

from core.models import UsageResponse
from utils.rate_limiter import rate_limit_manager

router = APIRouter()


@router.get("/usage/{client_key}", response_model=UsageResponse)
@router.get("/usage", response_model=UsageResponse)
async def get_usage_stats(request: Request, client_key: Optional[str] = None):
    """Get usage statistics for a client."""
    usage_stats = rate_limit_manager.get_usage_stats(request, client_key)

    return UsageResponse(
        usage=usage_stats["usage"],
        limit=usage_stats["limit"],
        remaining=usage_stats["remaining"],
        reset_time=usage_stats["reset_time"],
    )
