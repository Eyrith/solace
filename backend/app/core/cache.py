"""High-Performance In-Memory LRU & Redis Caching Layer.

Provides thread-safe, asynchronous LRU caching with TTL expiration for static data,
editorial publications, academic curricula, question libraries, and frequent Supabase queries.
Seamlessly integrates with Redis when REDIS_URL is configured, falling back to in-memory LRU.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import OrderedDict
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class _CacheEntry:
    value: Any
    expires_at: float | None


class AsyncLRUCache:
    """Asynchronous LRU Cache with TTL and optional Redis delegation."""

    def __init__(
        self,
        maxsize: int = 500,
        default_ttl: int | None = 300,
        redis_url: str | None = None,
    ) -> None:
        self.maxsize = max(1, maxsize)
        self.default_ttl = default_ttl
        self.redis_url = redis_url
        self._cache: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._lock = asyncio.Lock()
        self._redis_client: Any = None
        self._redis_connected = False
        self._hits = 0
        self._misses = 0

    async def _init_redis_if_available(self) -> None:
        if self._redis_client is not None or not self.redis_url:
            return

        try:
            import redis.asyncio as aioredis  # type: ignore[import-untyped]

            client = aioredis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=2.0,
            )
            await client.ping()
            self._redis_client = client
            self._redis_connected = True
            logger.info("Successfully connected to Redis cache: %s", self.redis_url)
        except Exception as err:
            logger.warning("Redis unavailable (%s), falling back to in-memory LRU cache", err)
            self._redis_client = None
            self._redis_connected = False

    async def get(self, key: str) -> Any | None:
        """Retrieve value from cache. Checks Redis first if configured, then in-memory LRU."""
        # 1. Try Redis if connected
        if self.redis_url:
            await self._init_redis_if_available()
            if self._redis_connected and self._redis_client:
                try:
                    val = await self._redis_client.get(key)
                    if val is not None:
                        self._hits += 1
                        return json.loads(val)
                except Exception as err:
                    logger.debug("Redis get error (%s), using local cache", err)

        # 2. In-memory LRU lookup
        async with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self._misses += 1
                return None

            now = time.monotonic()
            if entry.expires_at is not None and now > entry.expires_at:
                del self._cache[key]
                self._misses += 1
                return None

            # Move to end (most recently used)
            self._cache.move_to_end(key)
            self._hits += 1
            return entry.value

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int | None = None,
    ) -> None:
        """Store value in cache with optional TTL in seconds."""
        effective_ttl = ttl if ttl is not None else self.default_ttl

        # 1. Set in Redis if connected
        if self.redis_url:
            await self._init_redis_if_available()
            if self._redis_connected and self._redis_client:
                try:
                    serialized = json.dumps(value, default=str)
                    if effective_ttl:
                        await self._redis_client.setex(key, effective_ttl, serialized)
                    else:
                        await self._redis_client.set(key, serialized)
                except Exception as err:
                    logger.debug("Redis set error (%s), using local cache", err)

        # 2. Set in in-memory LRU
        async with self._lock:
            now = time.monotonic()
            expires_at = (now + effective_ttl) if effective_ttl is not None else None

            if key in self._cache:
                self._cache.move_to_end(key)
            elif len(self._cache) >= self.maxsize:
                # Evict oldest (least recently used)
                self._cache.popitem(last=False)

            self._cache[key] = _CacheEntry(value=value, expires_at=expires_at)

    async def delete(self, key: str) -> bool:
        """Remove key from both Redis and in-memory cache."""
        deleted = False
        if self._redis_connected and self._redis_client:
            try:
                await self._redis_client.delete(key)
                deleted = True
            except Exception:
                pass

        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                deleted = True

        return deleted

    async def clear(self) -> None:
        """Clear all entries in in-memory cache and matching keys in Redis."""
        async with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    async def get_or_set(
        self,
        key: str,
        producer: Callable[[], Awaitable[T]],
        ttl: int | None = None,
    ) -> T:
        """Fetch from cache or execute producer coroutine on miss."""
        cached = await self.get(key)
        if cached is not None:
            return cached

        fresh = await producer()
        if fresh is not None:
            await self.set(key, fresh, ttl=ttl)
        return fresh

    @property
    def stats(self) -> dict[str, Any]:
        """Return cache hit/miss and sizing statistics."""
        total = self._hits + self._misses
        hit_ratio = round(self._hits / total, 3) if total > 0 else 0.0
        return {
            "size": len(self._cache),
            "maxsize": self.maxsize,
            "hits": self._hits,
            "misses": self._misses,
            "hit_ratio": hit_ratio,
            "redis_connected": self._redis_connected,
        }


# Global shared instances
# Static data (editorial sources, curricula, game templates, categories): TTL 30 minutes
static_data_cache = AsyncLRUCache(maxsize=1000, default_ttl=1800)

# Frequent query cache: TTL 60 seconds
query_cache = AsyncLRUCache(maxsize=500, default_ttl=60)
