import base64
import uuid
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
from app.schemas.livekit import EndCallRequest, LiveKitTokenRequest, StartCallRequest
from app.services.livekit_tokens import mint_livekit_room_token

router = APIRouter(prefix="/api/livekit", tags=["livekit"])


@router.post("/token")
async def create_livekit_token(
    body: LiveKitTokenRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "Missing spaceId")

    user_id = f"demo-user-{uuid.uuid4().hex[:6]}"
    identity_name = body.participantName or "Partner"

    if settings.is_supabase_configured:
        if not user:
            raise BackendApiError(
                401, "UNAUTHORIZED", "Unauthorized: No active session"
            )
        user_id = user.id
        await verify_space_membership(gateway, user, space_id)

        profile = await gateway.select(
            "profiles",
            columns="display_name",
            filters={"id": f"eq.{user.id}"},
            access_token=user.access_token,
            single=True,
        )
        if isinstance(profile, dict) and profile.get("display_name"):
            identity_name = str(profile["display_name"])

    api_key = settings.livekit_api_key
    api_secret = settings.livekit_api_secret
    ws_url = settings.next_public_livekit_url

    if not api_key or not api_secret or not ws_url:
        demo_sig = (
            base64.urlsafe_b64encode(f"{space_id}:{user_id}".encode())
            .decode("ascii")
            .rstrip("=")
        )
        return {
            "token": f"demo-livekit-token-{demo_sig}",
            "room": space_id,
            "identity": user_id,
            "serverUrl": ws_url or "wss://demo.livekit.cloud",
            "isDemo": True,
        }

    jwt_token = mint_livekit_room_token(
        api_key=api_key,
        api_secret=api_secret,
        space_id=space_id,
        user_id=user_id,
        identity_name=identity_name,
    )
    return {
        "token": jwt_token,
        "room": space_id,
        "identity": user_id,
        "serverUrl": ws_url,
    }


@router.get("/calls")
async def list_call_sessions(
    spaceId: Annotated[str, Query()] = "",
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)] = None,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    space_id = spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId query param is required")

    if not settings.is_supabase_configured:
        return {"configured": False, "calls": []}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    rows = await gateway.select(
        "call_sessions",
        columns="id,space_id,initiator_id,call_type,status,livekit_room,started_at,ended_at,duration_sec,created_at",
        filters={"space_id": f"eq.{space_id}"},
        order="created_at.desc",
        limit=20,
        access_token=user.access_token,
    )
    return {"configured": True, "calls": rows if isinstance(rows, list) else []}


@router.post("/calls/start")
async def start_call_session(
    body: StartCallRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId is required")

    if not settings.is_supabase_configured:
        return {
            "configured": False,
            "call": {
                "id": f"demo-call-{uuid.uuid4().hex[:8]}",
                "space_id": space_id,
                "call_type": body.callType,
                "status": "active",
                "livekit_room": body.roomName or space_id,
            },
        }
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    created = await gateway.insert(
        "call_sessions",
        {
            "space_id": space_id,
            "initiator_id": user.id,
            "call_type": body.callType,
            "status": "active",
            "livekit_room": body.roomName or space_id,
            "started_at": datetime.now(UTC).isoformat(),
        },
        use_service_role=True,
        single=True,
    )
    return {"configured": True, "call": created}


@router.post("/calls/{call_id}/end")
async def end_call_session(
    call_id: str,
    body: EndCallRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        return {"configured": False, "ended": True}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    call_row = await gateway.select(
        "call_sessions",
        columns="id,space_id,started_at,status",
        filters={"id": f"eq.{call_id}"},
        access_token=user.access_token,
        single=True,
    )
    if not isinstance(call_row, dict):
        raise BackendApiError(404, "CALL_NOT_FOUND", "Call session not found")

    await verify_space_membership(gateway, user, call_row["space_id"])

    duration_sec = body.durationSec
    if duration_sec is None and call_row.get("started_at"):
        try:
            started = datetime.fromisoformat(str(call_row["started_at"]).replace("Z", "+00:00"))
            duration_sec = max(0, int((datetime.now(UTC) - started).total_seconds()))
        except ValueError:
            duration_sec = None

    updated = await gateway.update(
        "call_sessions",
        {
            "status": "ended",
            "ended_at": datetime.now(UTC).isoformat(),
            "duration_sec": duration_sec,
        },
        filters={"id": f"eq.{call_id}"},
        use_service_role=True,
    )
    row = updated[0] if isinstance(updated, list) and updated else None
    return {"configured": True, "call": row}
