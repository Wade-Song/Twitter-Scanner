"""Rate limiting and usage tracking for Twitter Scanner Backend."""

import time
import hashlib
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import structlog
from fastapi import Request
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import settings

logger = structlog.get_logger()


class MemoryRateLimiter:
    """In-memory rate limiter for API requests."""

    def __init__(self, max_requests: int = 100, window_ms: int = 900000):
        self.max_requests = max_requests
        self.window_ms = window_ms
        self.requests: Dict[str, list] = {}

    def is_allowed(self, key: str) -> Tuple[bool, Optional[int]]:
        """
        Check if request is allowed for the given key.

        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        now = time.time() * 1000  # Convert to milliseconds
        window_start = now - self.window_ms

        # Clean old requests
        if key in self.requests:
            self.requests[key] = [
                req_time for req_time in self.requests[key] if req_time > window_start
            ]
        else:
            self.requests[key] = []

        # Check if under limit
        if len(self.requests[key]) < self.max_requests:
            self.requests[key].append(now)
            return True, None
        else:
            # Calculate retry after time
            oldest_request = min(self.requests[key])
            retry_after_ms = oldest_request + self.window_ms - now
            retry_after_seconds = max(1, int(retry_after_ms / 1000))
            return False, retry_after_seconds


class UsageTracker:
    """Track usage for free tier limits."""

    def __init__(self, max_usage: int = 50, reset_interval_hours: int = 24):
        self.max_usage = max_usage
        self.reset_interval_hours = reset_interval_hours
        self.usage: Dict[str, Dict[str, any]] = {}
        self.last_reset = datetime.now()
        logger.info(
            "Usage tracker initialized",
            max_usage=max_usage,
            reset_interval_hours=reset_interval_hours,
        )

    def _reset_if_needed(self):
        """Reset usage counters if reset interval has passed."""
        now = datetime.now()
        if now - self.last_reset >= timedelta(hours=self.reset_interval_hours):
            self.usage.clear()
            self.last_reset = now
            logger.info("Usage counters reset", timestamp=now.isoformat())

    def get_usage(self, client_key: str) -> Dict[str, any]:
        """Get current usage for client."""
        self._reset_if_needed()

        if client_key not in self.usage:
            self.usage[client_key] = {"count": 0, "first_request": datetime.now()}

        usage_count = self.usage[client_key]["count"]
        return {
            "usage": usage_count,
            "limit": self.max_usage,
            "remaining": max(0, self.max_usage - usage_count),
            "reset_time": (
                self.last_reset + timedelta(hours=self.reset_interval_hours)
            ).isoformat(),
        }

    def is_usage_allowed(self, client_key: str) -> bool:
        """Check if client is under usage limit."""
        usage_info = self.get_usage(client_key)
        return usage_info["remaining"] > 0

    def increment_usage(self, client_key: str) -> Dict[str, any]:
        """Increment usage count for client."""
        self._reset_if_needed()

        if client_key not in self.usage:
            self.usage[client_key] = {"count": 0, "first_request": datetime.now()}

        self.usage[client_key]["count"] += 1
        return self.get_usage(client_key)


class RateLimitManager:
    """Manages rate limiting and usage tracking."""

    def __init__(self):
        self.rate_limiter = MemoryRateLimiter(
            max_requests=settings.max_requests_per_ip,
            window_ms=settings.rate_limit_window_ms,
        )
        self.usage_tracker = UsageTracker(
            max_usage=settings.max_free_usage_per_ip,
            reset_interval_hours=settings.usage_reset_interval_hours,
        )

    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded IP (behind proxy/load balancer)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in case of multiple proxies
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fallback to direct connection IP
        return request.client.host if request.client else "unknown"

    def get_browser_fingerprint(self, request: Request) -> str:
        """Generate browser fingerprint from headers."""
        user_agent = request.headers.get("user-agent", "")
        accept_language = request.headers.get("accept-language", "")
        accept_encoding = request.headers.get("accept-encoding", "")

        # Create a simple fingerprint
        fingerprint_data = user_agent + accept_language + accept_encoding
        fingerprint_hash = hashlib.md5(fingerprint_data.encode()).hexdigest()
        return fingerprint_hash[:16]

    def get_client_key(self, request: Request) -> str:
        """Generate unique client key from IP and browser fingerprint."""
        client_ip = self.get_client_ip(request)
        fingerprint = self.get_browser_fingerprint(request)
        return f"{client_ip}_{fingerprint}"

    def check_rate_limit(self, request: Request) -> Tuple[bool, Optional[int]]:
        """Check if request is within rate limits."""
        client_ip = self.get_client_ip(request)
        return self.rate_limiter.is_allowed(client_ip)

    def check_usage_limit(self, request: Request) -> Tuple[bool, Dict[str, any]]:
        """Check if request is within usage limits."""
        client_key = self.get_client_key(request)
        is_allowed = self.usage_tracker.is_usage_allowed(client_key)
        usage_info = self.usage_tracker.get_usage(client_key)
        return is_allowed, usage_info

    def increment_usage(self, request: Request) -> Dict[str, any]:
        """Increment usage for the client."""
        client_key = self.get_client_key(request)
        return self.usage_tracker.increment_usage(client_key)

    def get_usage_stats(
        self, request: Request, client_key: Optional[str] = None
    ) -> Dict[str, any]:
        """Get usage statistics for client."""
        if client_key is None:
            client_key = self.get_client_key(request)
        return self.usage_tracker.get_usage(client_key)


# Global rate limit manager instance
rate_limit_manager = RateLimitManager()
