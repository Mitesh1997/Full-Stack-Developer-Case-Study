"""Redis caching helpers."""
import json
import hashlib
import redis.asyncio as aioredis
from app.config import settings

_redis_client: aioredis.Redis = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = await aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


def make_cache_key(params: dict) -> str:
    """Create a deterministic SHA-256 cache key from request params."""
    serialized = json.dumps(params, sort_keys=True)
    return "climate:" + hashlib.sha256(serialized.encode()).hexdigest()


async def get_cached(key: str):
    try:
        r = await get_redis()
        val = await r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None  # Cache miss on error — degrade gracefully


async def set_cached(key: str, value: dict, ttl: int = None):
    try:
        r = await get_redis()
        ttl = ttl or settings.cache_ttl
        await r.setex(key, ttl, json.dumps(value))
    except Exception:
        pass  # Non-fatal — continue without caching


async def invalidate_cache(key: str):
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception:
        pass
