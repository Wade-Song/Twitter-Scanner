"""Claude API client for tweet analysis."""

import asyncio
import time
from typing import List, Optional
import httpx
import structlog
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import settings
from src.models import Tweet

logger = structlog.get_logger()


class ClaudeAPIError(Exception):
    """Claude API specific error."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        attempt: Optional[int] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.attempt = attempt
        super().__init__(self.message)


class ClaudeClient:
    """Claude API client with retry mechanism."""

    def __init__(self):
        self.api_key = settings.claude_api_key
        self.api_url = settings.claude_api_url
        self.max_retries = 2
        self.retry_delay = 2.0  # seconds

        if not self.api_key:
            raise ValueError("CLAUDE_API_KEY environment variable is not set")

    def get_default_system_prompt(self) -> str:
        """Get the default system prompt for tweet analysis."""
        return """You are an expert content curator for Twitter. Analyze the following tweets and identify high-quality, insightful content that would be valuable for professionals. Focus on:
- Industry insights and trends
- Thoughtful analysis and commentary
- Educational content
- Professional networking and career advice
- Innovation and technology updates

Filter out:
- Personal life updates
- Casual conversations
- Promotional content
- Low-quality or spam content

OUTPUT FORMAT REQUIREMENTS:
Please format your response using markdown with the following structure:

1. **Links**: Use [@username](twitter_profile_url) for authors and [查看原推文](tweet_url) for original tweets
2. **Headers**: Use # ## ### #### for different levels (# for main topics, ## for subtopics, etc.)
3. **Content**: Use **bold** for important points, *italic* for emphasis, `code` for keywords
4. **Lists**: Use - for bullet points, 1. 2. 3. for numbered lists
5. **Quotes**: Use > for important quotes or tweet content
6. **Sections**: Use --- for visual separation between major sections

Example format:
# 🔥 热门话题
## AI技术发展
[@username](https://twitter.com/username) 分享了关于AI的重要观点：
> "这是一段重要的引用"
**关键洞察**：这表明了...
[查看原推文](https://twitter.com/xxx/status/123)

Provide a comprehensive analysis with proper markdown formatting, including clickable links to authors and original tweets."""

    async def analyze_tweets(
        self, tweets: List[Tweet], system_prompt: Optional[str] = None
    ) -> str:
        """
        Analyze tweets using Claude API with retry mechanism.

        Args:
            tweets: List of tweets to analyze
            system_prompt: Custom system prompt (optional)

        Returns:
            Analysis result from Claude

        Raises:
            ClaudeAPIError: If API call fails after retries
        """
        final_system_prompt = system_prompt or self.get_default_system_prompt()

        logger.info(
            "Attempting to call Claude API",
            url=self.api_url,
            has_api_key=bool(self.api_key),
            api_key_prefix=self.api_key[:10] + "..." if self.api_key else None,
            tweet_count=len(tweets),
            timestamp=time.time(),
        )

        # Format tweets for analysis
        tweet_texts = []
        for tweet in tweets:
            tweet_text = f"Author: {tweet.author}\nContent: {tweet.content}\nTime: {tweet.timestamp}\nURL: {tweet.url or 'N/A'}\n---"
            tweet_texts.append(tweet_text)

        user_prompt = f"Please analyze the following tweets and provide a curated summary of the most valuable insights:\n\n{chr(10).join(tweet_texts)}"

        request_body = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 4000,
            "system": final_system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }

        logger.info(
            "Request body prepared",
            model=request_body["model"],
            max_tokens=request_body["max_tokens"],
            system_prompt_length=len(request_body["system"]),
            user_prompt_length=len(request_body["messages"][0]["content"]),
            tweet_count=len(tweets),
        )

        # Retry mechanism
        for attempt in range(1, self.max_retries + 2):
            try:
                logger.info(
                    "Claude API attempt",
                    attempt=attempt,
                    max_attempts=self.max_retries + 1,
                    timestamp=time.time(),
                    url=self.api_url,
                    method="POST",
                )

                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.api_url,
                        headers={
                            "Content-Type": "application/json",
                            "x-api-key": self.api_key,
                            "anthropic-version": "2023-06-01",
                            "anthropic-dangerous-direct-browser-access": "true",
                        },
                        json=request_body,
                    )

                logger.info(
                    "Response received",
                    status=response.status_code,
                    ok=response.is_success,
                    headers=dict(response.headers),
                )

                if not response.is_success:
                    error_text = response.text
                    logger.error(
                        "Claude API Error Details",
                        attempt=attempt,
                        status=response.status_code,
                        headers=dict(response.headers),
                        body=error_text,
                        timestamp=time.time(),
                    )

                    error_data = {}
                    try:
                        error_data = response.json()
                    except Exception as e:
                        logger.error("Failed to parse error response", error=str(e))

                    error_message = f"API request failed: {response.status_code} - {error_data.get('error', {}).get('message', error_text or 'Unknown error')}"

                    # Check if this is a retryable error (429 or 5xx)
                    is_retryable_error = (
                        response.status_code == 429 or response.status_code >= 500
                    )

                    if is_retryable_error and attempt <= self.max_retries:
                        logger.info(
                            "Retryable error, waiting before retry",
                            status=response.status_code,
                            retry_delay=self.retry_delay,
                            attempt=attempt,
                        )
                        await asyncio.sleep(self.retry_delay)
                        continue  # Try again
                    else:
                        logger.error(
                            "Not retrying error",
                            status=response.status_code,
                            attempt=attempt,
                            max_attempts=self.max_retries + 1,
                        )
                        raise ClaudeAPIError(
                            error_message, response.status_code, attempt
                        )

                data = response.json()
                logger.info(
                    "Claude API response received successfully",
                    attempt=attempt,
                    has_content=bool(
                        data.get("content") and data["content"][0]
                        if isinstance(data.get("content"), list)
                        else False
                    ),
                    text_length=(
                        len(data.get("content", [{}])[0].get("text", ""))
                        if data.get("content")
                        else 0
                    ),
                    timestamp=time.time(),
                )

                if (
                    data.get("content")
                    and data["content"][0]
                    and data["content"][0].get("text")
                ):
                    return data["content"][0]["text"]
                else:
                    logger.error("Invalid response format", data=data)
                    raise ClaudeAPIError("Invalid response format from Claude API")

            except httpx.TimeoutException as e:
                logger.error(
                    "Claude API timeout",
                    attempt=attempt,
                    error=str(e),
                    timestamp=time.time(),
                )
                if attempt == self.max_retries + 1:
                    raise ClaudeAPIError(
                        f"API request timeout after {self.max_retries + 1} attempts"
                    )
                await asyncio.sleep(self.retry_delay)

            except httpx.RequestError as e:
                logger.error(
                    "Claude API network error",
                    attempt=attempt,
                    error=str(e),
                    timestamp=time.time(),
                )
                if attempt == self.max_retries + 1:
                    raise ClaudeAPIError(
                        f"Network error after {self.max_retries + 1} attempts: {str(e)}"
                    )
                await asyncio.sleep(self.retry_delay)

            except Exception as e:
                logger.error(
                    "Claude API unexpected error",
                    attempt=attempt,
                    error=str(e),
                    error_type=type(e).__name__,
                    timestamp=time.time(),
                )
                if attempt == self.max_retries + 1:
                    logger.error("Max retries exceeded, throwing error")
                    raise ClaudeAPIError(f"Unexpected error: {str(e)}")

        # This should never be reached, but just in case
        raise ClaudeAPIError("Maximum retries exceeded")
