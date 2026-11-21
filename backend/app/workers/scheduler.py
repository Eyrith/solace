import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.db.supabase import SupabaseGateway
from app.services.feed_sync import sync_all_feeds
from app.services.retention import purge_due_ephemeral_media


def build_background_scheduler(http_client: httpx.AsyncClient) -> AsyncIOScheduler:
    """Create non-blocking asyncio scheduler for editorial RSS sync and retention cleanup."""
    scheduler = AsyncIOScheduler()

    async def _run_feed_sync() -> None:
        settings = get_settings()
        gateway = SupabaseGateway(http_client=http_client, settings=settings)
        await sync_all_feeds(http_client, gateway, settings)

    async def _run_retention() -> None:
        settings = get_settings()
        gateway = SupabaseGateway(http_client=http_client, settings=settings)
        await purge_due_ephemeral_media(http_client, gateway, settings)

    scheduler.add_job(_run_feed_sync, "interval", hours=2, id="sync-feeds", replace_existing=True)
    scheduler.add_job(
        _run_retention, "interval", seconds=60, id="purge-retention", replace_existing=True
    )
    return scheduler

