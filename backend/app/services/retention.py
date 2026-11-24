from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import Settings
from app.db.supabase import SupabaseGateway


async def purge_due_ephemeral_media(
    http_client: httpx.AsyncClient,
    gateway: SupabaseGateway,
    settings: Settings,
) -> dict[str, Any]:
    """
    Execute scheduled server-side retention for expired ephemeral messages and media.

    Purges expired database rows without accessing plaintext content.
    """
    if not (settings.is_supabase_configured and settings.supabase_service_role_key):
        return {"skipped": True, "purgedTimers": 0, "deletedMessages": 0}

    now_iso = datetime.now(UTC).isoformat()

    due_timers = await gateway.select(
        "ephemeral_media_timers",
        columns="id",
        filters={"purged_at": "is.null", "expires_at": f"lte.{now_iso}"},
        use_service_role=True,
        limit=100,
    )

    purged_count = 0
    for timer in due_timers or []:
        if not isinstance(timer, dict):
            continue
        timer_id = timer.get("id")
        if timer_id:
            await gateway.update(
                "ephemeral_media_timers",
                {"purged_at": now_iso},
                filters={"id": f"eq.{timer_id}"},
                use_service_role=True,
            )
            purged_count += 1

    deleted_msgs = await gateway.delete(
        "messages",
        filters={"expires_at": f"lt.{now_iso}"},
        use_service_role=True,
    )
    deleted_count = len(deleted_msgs) if isinstance(deleted_msgs, list) else 0

    return {
        "skipped": False,
        "purgedTimers": purged_count,
        "deletedMessages": deleted_count,
    }

