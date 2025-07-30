"""Data models for Twitter Scanner Backend."""

from typing import List, Optional
from pydantic import BaseModel, Field


class Tweet(BaseModel):
    """Tweet data model."""

    author: str = Field(..., description="Tweet author username")
    content: str = Field(..., description="Tweet content text")
    timestamp: str = Field(..., description="Tweet timestamp")
    url: Optional[str] = Field(None, description="Tweet URL")


class AnalyzeRequest(BaseModel):
    """Request model for tweet analysis."""

    tweets: List[Tweet] = Field(
        ..., min_items=1, max_items=500, description="List of tweets to analyze"
    )
    system_prompt: Optional[str] = Field(
        None, description="Custom system prompt for analysis"
    )


class UsageInfo(BaseModel):
    """Usage information model."""

    current: int = Field(..., description="Current usage count")
    limit: int = Field(..., description="Usage limit")
    remaining: int = Field(..., description="Remaining usage")


class AnalyzeResponse(BaseModel):
    """Response model for tweet analysis."""

    success: bool = Field(..., description="Whether the analysis was successful")
    analysis: str = Field(..., description="Analysis result")
    usage: UsageInfo = Field(..., description="Usage information")
    processingTime: int = Field(..., description="Processing time in milliseconds")


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str = Field(..., description="Error message")
    retry_after: Optional[int] = Field(
        None, description="Retry after seconds for rate limiting"
    )


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str = Field(..., description="Service status")
    timestamp: str = Field(..., description="Current timestamp")
    uptime: float = Field(..., description="Server uptime in seconds")


class UsageResponse(BaseModel):
    """Usage stats response model."""

    usage: int = Field(..., description="Current usage count")
    limit: int = Field(..., description="Usage limit")
    remaining: int = Field(..., description="Remaining usage")
    reset_time: str = Field(..., description="Next reset time")


class UsageStatsRecord(BaseModel):
    """Usage statistics record model."""

    id: Optional[int] = Field(None, description="Record ID")
    client_ip: str = Field(..., description="Client IP address")
    user_agent: Optional[str] = Field(None, description="Browser user agent string")
    success: bool = Field(..., description="Whether the request was successful")
    twitter_count: int = Field(..., description="Number of tweets analyzed")
    content_length: int = Field(..., description="Total content length in characters")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    created_at: Optional[str] = Field(None, description="Record creation timestamp")


class UserStatsResponse(BaseModel):
    """User statistics response model."""

    client_ip: str = Field(..., description="Client IP address")
    total_requests: int = Field(..., description="Total number of requests")
    successful_requests: int = Field(..., description="Number of successful requests")
    failed_requests: int = Field(..., description="Number of failed requests")
    total_tweets_analyzed: int = Field(..., description="Total tweets analyzed")
    avg_processing_time: float = Field(..., description="Average processing time in ms")
    first_access: Optional[str] = Field(None, description="First access timestamp")
    last_access: Optional[str] = Field(None, description="Last access timestamp")


class DailyStatsResponse(BaseModel):
    """Daily statistics response model."""

    date: str = Field(..., description="Date (YYYY-MM-DD)")
    users: List[UserStatsResponse] = Field(..., description="User statistics for the day")
