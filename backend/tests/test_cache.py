import asyncio

import pytest

from app.core.cache import AsyncLRUCache


@pytest.mark.asyncio
async def test_async_lru_cache_basic_ops() -> None:
    cache = AsyncLRUCache(maxsize=3, default_ttl=60)
    await cache.set("k1", {"title": "Article 1"})
    await cache.set("k2", {"title": "Article 2"})

    assert await cache.get("k1") == {"title": "Article 1"}
    assert await cache.get("k2") == {"title": "Article 2"}
    assert await cache.get("k3") is None

    stats = cache.stats
    assert stats["size"] == 2
    assert stats["hits"] == 2
    assert stats["misses"] == 1


@pytest.mark.asyncio
async def test_async_lru_cache_eviction() -> None:
    cache = AsyncLRUCache(maxsize=3, default_ttl=60)
    await cache.set("a", 1)
    await cache.set("b", 2)
    await cache.set("c", 3)

    # Access 'a' to make it most recently used; 'b' becomes oldest
    assert await cache.get("a") == 1

    # Insert 'd'; 'b' should be evicted
    await cache.set("d", 4)

    assert await cache.get("a") == 1
    assert await cache.get("b") is None
    assert await cache.get("c") == 3
    assert await cache.get("d") == 4


@pytest.mark.asyncio
async def test_async_lru_cache_ttl_expiration() -> None:
    cache = AsyncLRUCache(maxsize=10, default_ttl=1)
    await cache.set("quick", "secret", ttl=1)
    assert await cache.get("quick") == "secret"

    await asyncio.sleep(1.05)
    assert await cache.get("quick") is None


@pytest.mark.asyncio
async def test_async_lru_cache_get_or_set() -> None:
    cache = AsyncLRUCache(maxsize=10)
    calls = 0

    async def fetch_db_item() -> dict:
        nonlocal calls
        calls += 1
        return {"id": "src-1", "name": "Aeon"}

    val1 = await cache.get_or_set("sources", fetch_db_item, ttl=60)
    val2 = await cache.get_or_set("sources", fetch_db_item, ttl=60)

    assert val1 == {"id": "src-1", "name": "Aeon"}
    assert val2 == {"id": "src-1", "name": "Aeon"}
    assert calls == 1  # Producer called only once!
