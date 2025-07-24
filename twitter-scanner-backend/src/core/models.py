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
