import time
import json
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from app.config import settings


MINUTE_RATE_LIMIT = 60
DAY_RATE_LIMIT = 1000


class RateLimitMiddleware:
    """
    Rate limiting middleware for API key routes.
    Uses Redis for distributed rate limiting with sliding window counters.
    Falls back to in-memory storage if Redis is unavailable.
    """
    
    def __init__(
        self,
        minute_limit: int = MINUTE_RATE_LIMIT,
        day_limit: int = DAY_RATE_LIMIT,
    ):
        self.minute_limit = minute_limit
        self.day_limit = day_limit
        self._redis_client = None
        self._use_redis = False
        self._memory_store: dict[str, dict] = {}
    
    def _get_redis_client(self):
        """Lazy initialization of Redis client."""
        if self._redis_client is None:
            try:
                import redis
                self._redis_client = redis.from_url(settings.redis_url, decode_responses=True)
                self._use_redis = True
            except Exception:
                self._use_redis = False
        return self._redis_client
    
    def _get_key_prefix(self, api_key_prefix: str) -> str:
        """Get Redis key prefix for rate limiting."""
        return f"ratelimit:{api_key_prefix}"
    
    async def __call__(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization", "")
        
        if not auth_header.startswith("Bearer sk_live_"):
            return await call_next(request)
        
        api_key_prefix = auth_header[12:20]
        current_time = time.time()
        
        if self._use_redis:
            return await self._check_rate_limit_redis(
                request, call_next, api_key_prefix, current_time
            )
        else:
            return await self._check_rate_limit_memory(
                request, call_next, api_key_prefix, current_time
            )
    
    async def _check_rate_limit_memory(
        self,
        request: Request,
        call_next,
        api_key_prefix: str,
        current_time: float,
    ):
        """In-memory rate limiting (fallback)."""
        minute_window = 60
        day_window = 86400
        
        if api_key_prefix not in self._memory_store:
            self._memory_store[api_key_prefix] = {
                "minute_requests": [],
                "day_requests": [],
            }
        
        store = self._memory_store[api_key_prefix]
        
        minute_requests = [
            t for t in store["minute_requests"]
            if current_time - t < minute_window
        ]
        day_requests = [
            t for t in store["day_requests"]
            if current_time - t < day_window
        ]
        
        if len(minute_requests) >= self.minute_limit:
            oldest = minute_requests[0]
            retry_after = int(minute_window - (current_time - oldest))
            return self._rate_limit_response(retry_after)
        
        if len(day_requests) >= self.day_limit:
            oldest = day_requests[0]
            retry_after = int(day_window - (current_time - oldest))
            return self._rate_limit_response(retry_after)
        
        minute_requests.append(current_time)
        day_requests.append(current_time)
        
        store["minute_requests"] = minute_requests
        store["day_requests"] = day_requests
        
        response = await call_next(request)
        
        response.headers["X-RateLimit-Limit-Minute"] = str(self.minute_limit)
        response.headers["X-RateLimit-Remaining-Minute"] = str(self.minute_limit - len(minute_requests))
        response.headers["X-RateLimit-Limit-Day"] = str(self.day_limit)
        response.headers["X-RateLimit-Remaining-Day"] = str(self.day_limit - len(day_requests))
        
        return response
    
    async def _check_rate_limit_redis(
        self,
        request: Request,
        call_next,
        api_key_prefix: str,
        current_time: float,
    ):
        """Redis-based rate limiting."""
        redis = self._get_redis_client()
        if not redis:
            return await self._check_rate_limit_memory(
                request, call_next, api_key_prefix, current_time
            )
        
        minute_key = f"{api_key_prefix}:minute"
        day_key = f"{api_key_prefix}:day"
        minute_window = 60
        day_window = 86400
        
        pipe = redis.pipeline()
        pipe.zremrangebyscore(minute_key, 0, current_time - minute_window)
        pipe.zremrangebyscore(day_key, 0, current_time - day_window)
        pipe.zcard(minute_key)
        pipe.zcard(day_key)
        results = pipe.execute()
        
        minute_count = results[2]
        day_count = results[3]
        
        if minute_count >= self.minute_limit:
            oldest_time = redis.zrange(minute_key, 0, 0, withscores=True)
            if oldest_time:
                retry_after = int(minute_window - (current_time - oldest_time[0][1]))
            else:
                retry_after = minute_window
            return self._rate_limit_response(retry_after)
        
        if day_count >= self.day_limit:
            oldest_time = redis.zrange(day_key, 0, 0, withscores=True)
            if oldest_time:
                retry_after = int(day_window - (current_time - oldest_time[0][1]))
            else:
                retry_after = day_window
            return self._rate_limit_response(retry_after)
        
        pipe = redis.pipeline()
        pipe.zadd(minute_key, {str(current_time): current_time})
        pipe.zadd(day_key, {str(current_time): current_time})
        pipe.expire(minute_key, minute_window + 10)
        pipe.expire(day_key, day_window + 10)
        pipe.execute()
        
        response = await call_next(request)
        
        response.headers["X-RateLimit-Limit-Minute"] = str(self.minute_limit)
        response.headers["X-RateLimit-Remaining-Minute"] = str(self.minute_limit - minute_count - 1)
        response.headers["X-RateLimit-Limit-Day"] = str(self.day_limit)
        response.headers["X-RateLimit-Remaining-Day"] = str(self.day_limit - day_count - 1)
        
        return response
    
    def _rate_limit_response(self, retry_after: int) -> JSONResponse:
        """Create a rate limit exceeded response."""
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit-Minute": str(self.minute_limit),
                "X-RateLimit-Remaining-Minute": "0",
                "X-RateLimit-Limit-Day": str(self.day_limit),
                "X-RateLimit-Remaining-Day": "0",
            },
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Rate limit exceeded. Please retry after the specified time.",
                },
                "retry_after": retry_after,
            },
        )


rate_limit_middleware = RateLimitMiddleware()