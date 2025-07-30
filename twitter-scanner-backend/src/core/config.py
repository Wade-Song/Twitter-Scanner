"""Configuration management for Twitter Scanner Backend."""

import os
from typing import Optional, List
from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Claude API Configuration
    claude_api_key: str = Field(alias="CLAUDE_API_KEY")
    claude_api_url: str = Field(
        default="https://api.anthropic.com/v1/messages", alias="CLAUDE_API_URL"
    )

    # Server Configuration
    port: int = Field(default=3000, alias="PORT")
    host: str = Field(default="0.0.0.0", alias="HOST")
    environment: str = Field(default="development", alias="NODE_ENV")

    # Rate Limiting
    max_requests_per_ip: int = Field(default=100, alias="MAX_REQUESTS_PER_IP")
    rate_limit_window_ms: int = Field(
        default=900000, alias="RATE_LIMIT_WINDOW_MS"
    )  # 15 minutes

    # Usage Tracking
    max_free_usage_per_ip: int = Field(default=50, alias="MAX_FREE_USAGE_PER_IP")
    usage_reset_interval_hours: int = Field(
        default=24, alias="USAGE_RESET_INTERVAL_HOURS"
    )

    # Redis Configuration (optional)
    redis_url: Optional[str] = Field(default=None, alias="REDIS_URL")

    # MySQL Database Configuration
    mysql_host: str = Field(default="localhost", alias="MYSQL_HOST")
    mysql_port: int = Field(default=3306, alias="MYSQL_PORT")
    mysql_user: str = Field(default="root", alias="MYSQL_USER")
    mysql_password: str = Field(default="", alias="MYSQL_PASSWORD")
    mysql_database: str = Field(default="twitter_scanner", alias="MYSQL_DATABASE")

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # Security Settings
    enable_docs: bool = Field(default=True, alias="ENABLE_DOCS")
    allowed_hosts: List[str] = Field(default=["*"], alias="ALLOWED_HOSTS")

    @validator("allowed_hosts", pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse comma-separated hosts into a list."""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",") if host.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # 允许额外字段，忽略未定义的环境变量


# Global settings instance
settings = Settings()
