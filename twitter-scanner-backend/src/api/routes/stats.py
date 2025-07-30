"""Statistics API routes."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from core.models import UserStatsResponse, DailyStatsResponse, UsageStatsRecord
from core.logging_config import get_logger
from core.database import UsageStatsDB

router = APIRouter()
logger = get_logger("api.stats")


@router.get("/api/stats/user/{client_ip}", response_model=UserStatsResponse)
async def get_user_stats(
    client_ip: str,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)")
):
    """Get usage statistics for a specific user (client IP)."""
    try:
        stats = await UsageStatsDB.get_user_stats(client_ip, date)
        return UserStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Failed to get user stats for {client_ip}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user statistics")


@router.get("/api/stats/daily/{date}", response_model=DailyStatsResponse)
async def get_daily_stats(date: str):
    """Get daily statistics for all users."""
    try:
        # Validate date format
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    try:
        users_stats = await UsageStatsDB.get_daily_stats(date)
        user_responses = [UserStatsResponse(**stats) for stats in users_stats]
        
        return DailyStatsResponse(date=date, users=user_responses)
    except Exception as e:
        logger.error(f"Failed to get daily stats for {date}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve daily statistics")


@router.get("/api/stats/recent", response_model=list[UsageStatsRecord])
async def get_recent_records(
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return")
):
    """Get recent usage records."""
    try:
        records = await UsageStatsDB.get_recent_records(limit)
        return [UsageStatsRecord(**record) for record in records]
    except Exception as e:
        logger.error(f"Failed to get recent records: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve recent records")


@router.get("/api/stats/summary")
async def get_stats_summary():
    """Get overall statistics summary."""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        daily_stats = await UsageStatsDB.get_daily_stats(today)
        
        total_requests_today = sum(user["requests"] for user in daily_stats)
        total_successful_today = sum(user["successful"] for user in daily_stats)
        total_failed_today = sum(user["failed"] for user in daily_stats)
        total_tweets_today = sum(user["tweets_analyzed"] for user in daily_stats)
        active_users_today = len(daily_stats)
        
        return {
            "date": today,
            "total_requests": total_requests_today,
            "successful_requests": total_successful_today,
            "failed_requests": total_failed_today,
            "total_tweets_analyzed": total_tweets_today,
            "active_users": active_users_today,
            "success_rate": round(
                (total_successful_today / total_requests_today * 100) if total_requests_today > 0 else 0,
                2
            )
        }
    except Exception as e:
        logger.error(f"Failed to get stats summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics summary")