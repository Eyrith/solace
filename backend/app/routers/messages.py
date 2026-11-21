import time
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.core.deps import (
    get_optional_supabase_user,
    get_supabase_gateway,
    verify_space_membership,
)
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser
from app.db.supabase import SupabaseGateway
from app.schemas.spaces import (
    MarkMessageViewedRequest,
    PinMessageRequest,
    ReactMessageRequest,
    SendMessageRequest,
)

router = APIRouter(prefix="/api/messages", tags=["messages"])

EXPIRES_MODE_MAP = {
    "1s": "1_second",
    "5m": "5_minutes",
    "1h": "1_hour",
    "24h": "24_hours",
}

ALLOWED_EXPIRES_MODES = {
    "never",
    "just_seen",
    "1_second",
    "5_minutes",
    "1_hour",
    "24_hours",
    "custom",
}


def _normalize_expires_mode(raw: str) -> str:
    mapped = EXPIRES_MODE_MAP.get(raw, raw)
    return mapped if mapped in ALLOWED_EXPIRES_MODES else "never"


@router.get("")
async def list_messages(
    spaceId: Annotated[str, Query()] = "",
    limit: Annotated[int, Query(ge=1, le=200)] = 80,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)] = None,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    space_id = spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId query param is required")

    if not settings.is_supabase_configured:
        return {"configured": False, "messages": [], "currentUserId": None}

    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    now_iso = datetime.now(UTC).isoformat()
    rows = await gateway.select(
        "messages",
        columns=(
            "id,space_id,sender_id,content,message_type,reply_to_id,"
            "is_edited,is_deleted,is_pinned,expires_mode,expires_at,created_at"
        ),
        filters={
            "space_id": f"eq.{space_id}",
            "is_deleted": "eq.false",
            "or": f"(expires_at.is.null,expires_at.gt.{now_iso})",
        },
        order="created_at.asc",
        limit=limit,
        access_token=user.access_token,
    )
    messages = rows if isinstance(rows, list) else []
    msg_ids = [m["id"] for m in messages if m.get("id")]

    reactions_rows = (
        await gateway.select(
            "message_reactions",
            columns="id,message_id,user_id,emoji",
            filters={"message_id": f"in.({','.join(msg_ids)})"},
            access_token=user.access_token,
        )
        if msg_ids
        else []
    )
    receipts_rows = (
        await gateway.select(
            "message_receipts",
            columns="message_id,user_id,viewed_at",
            filters={"message_id": f"in.({','.join(msg_ids)})"},
            access_token=user.access_token,
        )
        if msg_ids
        else []
    )

    by_id = {m["id"]: m for m in messages if m.get("id")}
    reactions_by_msg: dict[str, list[dict[str, Any]]] = {}
    for rx in reactions_rows or []:
        mid = rx.get("message_id")
        if mid:
            reactions_by_msg.setdefault(mid, []).append(rx)

    viewed_by_partner: set[str] = {
        rc["message_id"]
        for rc in (receipts_rows or [])
        if rc.get("message_id") and rc.get("user_id") != user.id and rc.get("viewed_at")
    }

    enriched: list[dict[str, Any]] = []
    for m in messages:
        mid = m["id"]
        reply_id = m.get("reply_to_id")
        reply_preview = (by_id.get(reply_id) or {}).get("content") if reply_id else None

        grouped: dict[str, dict[str, Any]] = {}
        for rx in reactions_by_msg.get(mid, []):
            emoji = rx["emoji"]
            bucket = grouped.setdefault(
                emoji, {"emoji": emoji, "count": 0, "reactedByMe": False}
            )
            bucket["count"] += 1
            if rx.get("user_id") == user.id:
                bucket["reactedByMe"] = True

        enriched.append(
            {
                **m,
                "isOwn": m.get("sender_id") == user.id,
                "replyPreview": reply_preview[:60] if isinstance(reply_preview, str) else None,
                "reactions": list(grouped.values()),
                "readReceipt": "read" if mid in viewed_by_partner else "delivered",
            }
        )

    return {"configured": True, "messages": enriched, "currentUserId": user.id}


@router.post("/send")
async def send_message(
    body: SendMessageRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    if not space_id or (not body.content and body.messageType == "text"):
        raise BackendApiError(
            400, "INVALID_MESSAGE", "Missing spaceId or message content"
        )

    if settings.is_supabase_configured:
        if not user:
            raise BackendApiError(
                401, "UNAUTHORIZED", "Unauthorized: User not authenticated"
            )

        await verify_space_membership(gateway, user, space_id)

        conv = await gateway.select(
            "conversations",
            columns="id",
            filters={"space_id": f"eq.{space_id}"},
            access_token=user.access_token,
            single=True,
        )
        if not conv:
            conv = await gateway.insert(
                "conversations",
                {"space_id": space_id},
                use_service_role=True,
                single=True,
            )

        if not isinstance(conv, dict) or not conv.get("id"):
            raise BackendApiError(
                500, "CONVERSATION_ERROR", "Failed to resolve conversation"
            )

        new_msg = await gateway.insert(
            "messages",
            {
                "conversation_id": conv["id"],
                "space_id": space_id,
                "sender_id": user.id,
                "content": body.content,
                "message_type": body.messageType,
                "reply_to_id": body.replyToId or None,
                "expires_mode": _normalize_expires_mode(body.expiresMode),
            },
            access_token=user.access_token,
            single=True,
        )
        return {"message": new_msg}

    return {
        "message": {
            "id": f"msg-{int(time.time() * 1000)}",
            "space_id": space_id,
            "sender_id": "demo-user-1",
            "content": body.content,
            "message_type": body.messageType,
            "expires_mode": body.expiresMode,
            "created_at": datetime.now(UTC).isoformat(),
        }
    }


@router.post("/view")
async def mark_message_viewed(
    body: MarkMessageViewedRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    message_id = body.messageId.strip()
    if not message_id:
        raise BackendApiError(400, "MISSING_MESSAGE_ID", "Missing messageId")

    if settings.is_supabase_configured:
        if not user:
            raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

        await gateway.rpc(
            "mark_message_viewed",
            {"p_message_id": message_id, "p_user_id": user.id},
            access_token=user.access_token,
        )
        return {"success": True, "messageId": message_id}

    return {"success": True, "messageId": message_id, "demo": True}


@router.post("/react")
async def toggle_message_reaction(
    body: ReactMessageRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    message_id = body.messageId.strip()
    emoji = body.emoji.strip()
    if not message_id or not emoji or len(emoji) > 8:
        raise BackendApiError(400, "INVALID_REACTION", "Valid messageId and emoji required")

    if not settings.is_supabase_configured:
        return {"configured": False, "toggled": True}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    existing = await gateway.select(
        "message_reactions",
        columns="id",
        filters={
            "message_id": f"eq.{message_id}",
            "user_id": f"eq.{user.id}",
            "emoji": f"eq.{emoji}",
        },
        access_token=user.access_token,
        single=True,
    )
    if isinstance(existing, dict) and existing.get("id"):
        await gateway.delete(
            "message_reactions",
            filters={"id": f"eq.{existing['id']}", "user_id": f"eq.{user.id}"},
            access_token=user.access_token,
        )
        return {"configured": True, "added": False}

    await gateway.insert(
        "message_reactions",
        {"message_id": message_id, "user_id": user.id, "emoji": emoji},
        access_token=user.access_token,
    )
    return {"configured": True, "added": True}


@router.post("/pin")
async def pin_message(
    body: PinMessageRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    message_id = body.messageId.strip()
    if not message_id:
        raise BackendApiError(400, "MISSING_MESSAGE_ID", "messageId required")

    if not settings.is_supabase_configured:
        return {"configured": False, "pinned": body.pinned}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    msg = await gateway.select(
        "messages",
        columns="id,space_id",
        filters={"id": f"eq.{message_id}"},
        access_token=user.access_token,
        single=True,
    )
    if not isinstance(msg, dict):
        raise BackendApiError(404, "MESSAGE_NOT_FOUND", "Message not found")

    await verify_space_membership(gateway, user, msg["space_id"])
    await gateway.update(
        "messages",
        {
            "is_pinned": body.pinned,
            "pinned_at": datetime.now(UTC).isoformat() if body.pinned else None,
            "pinned_by": user.id if body.pinned else None,
        },
        filters={"id": f"eq.{message_id}"},
        use_service_role=True,
    )
    return {"configured": True, "pinned": body.pinned}
