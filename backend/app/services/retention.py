from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import Settings
from app.core.errors import BackendApiError
from app.db.supabase import SupabaseGateway
from app.services.synapse_admin import (
    delete_encrypted_media_for_admin,
    get_synapse_admin_config,
)


async def purge_due_ephemeral_media(
    http_client: httpx.AsyncClient,
    gateway: SupabaseGateway,
    settings: Settings,
) -> dict[str, Any]:
    """
    Execute scheduled server-side retention for expired E2EE encrypted blobs.

    Deletes opaque ciphertext blobs via Synapse Admin API and stamps `purged_at`
    without ever accessing plaintext bytes or decryption keys.
    """
    if not (
        settings.is_supabase_configured
        and settings.supabase_service_role_key
        and settings.is_matrix_server_configured
    ):
        return {"skipped": True, "purgedTimers": 0, "deletedMessages": 0}

    now_iso = datetime.now(UTC).isoformat()
    due_timers = await gateway.select(
        "ephemeral_media_timers",
        columns="id,matrix_media_id,matrix_server_name",
        filters={"purged_at": "is.null", "expires_at": f"lte.{now_iso}"},
        use_service_role=True,
        limit=100,
    )

    config = get_synapse_admin_config(settings)
    purged_count = 0

    for timer in due_timers or []:
        if not isinstance(timer, dict):
            continue
        timer_id = timer.get("id")
        media_id = timer.get("matrix_media_id")
        server_name = timer.get("matrix_server_name") or config.server_name
        if media_id:
            try:
                await delete_encrypted_media_for_admin(
                    http_client, config, str(media_id), str(server_name)
                )
            except BackendApiError as exc:
                if "404" not in exc.message:
                    continue
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

