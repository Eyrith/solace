from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from livekit import api

from app.core.config import Settings, get_settings
from app.core.deps import get_supabase_gateway
from app.core.errors import BackendApiError
from app.core.security import require_bearer_secret
from app.db.supabase import SupabaseGateway
from app.schemas.webhooks import SupabaseWebhookPayload

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/supabase")
async def handle_supabase_webhook(
    request: Request,
    payload: SupabaseWebhookPayload,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    auth_header = (
        request.headers.get("x-webhook-secret")
        or request.headers.get("authorization")
    )
    require_bearer_secret(
        auth_header, settings.supabase_webhook_secret, "Unauthorized webhook call"
    )

    if (
        payload.type == "DELETE"
        and payload.table == "messages"
        and payload.old_record
        and settings.is_supabase_configured
        and settings.supabase_service_role_key
    ):
        message_id = payload.old_record.get("id")
        if message_id:
            attachments = await gateway.select(
                "message_attachments",
                columns="storage_path",
                filters={"message_id": f"eq.{message_id}"},
                use_service_role=True,
            )
            file_paths = [
                row["storage_path"]
                for row in (attachments or [])
                if isinstance(row, dict) and row.get("storage_path")
            ]
            if file_paths:
                await gateway.remove_storage_objects("sanctuary-media", file_paths)

    return {"received": True, "table": payload.table, "type": payload.type}


@router.post("/livekit")
async def handle_livekit_webhook(
    request: Request,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.livekit_api_key or not settings.livekit_api_secret:
        raise BackendApiError(
            503, "LIVEKIT_NOT_CONFIGURED", "LiveKit credentials are not configured"
        )

    body_text = (await request.body()).decode("utf-8")
    auth_header = request.headers.get("authorization", "")
    receiver = api.WebhookReceiver(
        api.TokenVerifier(settings.livekit_api_key, settings.livekit_api_secret)
    )
    try:
        event = receiver.receive(body_text, auth_header)
    except Exception as exc:
        raise BackendApiError(
            401, "INVALID_WEBHOOK_SIGNATURE", f"Invalid LiveKit signature: {exc}"
        ) from exc

    room_name = event.room.name if event.room else ""
    now_iso = datetime.now(UTC).isoformat()

    if settings.is_supabase_configured and room_name:
        if event.event == "participant_joined":
            await gateway.update(
                "call_sessions",
                {"status": "active", "started_at": now_iso},
                filters={"livekit_room": f"eq.{room_name}", "status": "eq.ringing"},
                use_service_role=True,
            )
        elif event.event == "room_ended":
            await gateway.update(
                "call_sessions",
                {"status": "ended", "ended_at": now_iso},
                filters={"livekit_room": f"eq.{room_name}", "status": "neq.ended"},
                use_service_role=True,
            )

    return {"received": True, "event": event.event, "room": room_name}

