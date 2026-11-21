from datetime import UTC, datetime
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, Request

from app.core.config import Settings, get_settings
from app.core.deps import get_http_client, get_supabase_gateway
from app.core.security import require_bearer_secret
from app.db.supabase import SupabaseGateway
from app.services.feed_sync import sync_all_feeds
from app.services.retention import purge_due_ephemeral_media

router = APIRouter(prefix="/api", tags=["feeds", "cron"])


@router.get("/feeds/sync")
async def trigger_feed_sync(
    request: Request,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    require_bearer_secret(
        request.headers.get("authorization"),
        settings.cron_secret,
        "Unauthorized",
    )
    results = await sync_all_feeds(http_client, gateway, settings)
    return {
        "syncedAt": datetime.now(UTC).isoformat(),
        "results": results,
    }


@router.post("/cron/retention")
async def trigger_retention_cleanup(
    request: Request,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    require_bearer_secret(
        request.headers.get("authorization"),
        settings.cron_secret,
        "Unauthorized",
    )
    summary = await purge_due_ephemeral_media(http_client, gateway, settings)
    return {"ranAt": datetime.now(UTC).isoformat(), **summary}

