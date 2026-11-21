import time
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends

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
    AcceptInviteRequest,
    CreateInviteRequest,
    CreateSpaceRequest,
    SetMoodRequest,
)

router = APIRouter(prefix="/api/spaces", tags=["spaces"])


@router.get("")
async def list_spaces(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        return {"configured": False, "spaces": [], "currentUserId": None}

    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    own_memberships = await gateway.select(
        "private_space_members",
        columns="space_id,role,joined_at",
        filters={"user_id": f"eq.{user.id}"},
        order="joined_at.asc",
        access_token=user.access_token,
    )
    own_list = own_memberships if isinstance(own_memberships, list) else []
    if not own_list:
        return {"configured": True, "spaces": [], "currentUserId": user.id}

    space_ids = [row["space_id"] for row in own_list if row.get("space_id")]
    in_filter = f"in.({','.join(space_ids)})"

    spaces_rows = await gateway.select(
        "private_spaces",
        columns="id,name,created_by,cover_url,created_at",
        filters={"id": in_filter},
        order="created_at.asc",
        access_token=user.access_token,
    )
    all_members = await gateway.select(
        "private_space_members",
        columns="space_id,user_id,role,joined_at",
        filters={"space_id": in_filter},
        access_token=user.access_token,
    )
    member_user_ids = sorted(
        {m["user_id"] for m in (all_members or []) if isinstance(m, dict) and m.get("user_id")}
    )
    profiles_rows = (
        await gateway.select(
            "profiles",
            columns="id,display_name,avatar_url",
            filters={"id": f"in.({','.join(member_user_ids)})"},
            access_token=user.access_token,
        )
        if member_user_ids
        else []
    )
    moods_rows = await gateway.select(
        "space_moods",
        columns="space_id,user_id,mood,updated_at",
        filters={"space_id": in_filter},
        access_token=user.access_token,
    )
    matrix_rows = await gateway.select(
        "space_matrix_rooms",
        columns="space_id,matrix_room_id,is_invite_locked",
        filters={"space_id": in_filter},
        access_token=user.access_token,
    )
    invites_rows = await gateway.select(
        "invitations",
        columns="space_id,token,expires_at",
        filters={"created_by": f"eq.{user.id}", "used_at": "is.null"},
        order="created_at.desc",
        access_token=user.access_token,
    )

    profiles_by_id = {p["id"]: p for p in (profiles_rows or []) if isinstance(p, dict)}
    matrix_by_space = {r["space_id"]: r for r in (matrix_rows or []) if isinstance(r, dict)}
    app_base = (settings.next_public_app_url or "http://localhost:3000").rstrip("/")
    role_by_space = {row["space_id"]: row["role"] for row in own_list}

    now_iso = datetime.now(UTC).isoformat()
    invite_by_space: dict[str, str] = {}
    for inv in invites_rows or []:
        sid = inv.get("space_id")
        exp = inv.get("expires_at")
        tok = inv.get("token")
        if sid and tok and sid not in invite_by_space and (not exp or exp > now_iso):
            invite_by_space[sid] = f"{app_base}/invite/{tok}"

    result_spaces: list[dict[str, Any]] = []
    for sp in spaces_rows or []:
        sid = sp["id"]
        sp_members = [
            {
                "userId": m["user_id"],
                "role": m["role"],
                "displayName": (profiles_by_id.get(m["user_id"]) or {}).get("display_name")
                or "Member",
                "avatarUrl": (profiles_by_id.get(m["user_id"]) or {}).get("avatar_url"),
            }
            for m in (all_members or [])
            if m.get("space_id") == sid
        ]
        partner = next((m for m in sp_members if m["userId"] != user.id), None)
        sp_moods = [m for m in (moods_rows or []) if m.get("space_id") == sid]
        my_mood = next((m.get("mood") for m in sp_moods if m.get("user_id") == user.id), None)
        partner_mood = next((m.get("mood") for m in sp_moods if m.get("user_id") != user.id), None)
        matrix_info = matrix_by_space.get(sid) or {}

        result_spaces.append(
            {
                "id": sid,
                "name": sp["name"],
                "myRole": role_by_space.get(sid, "member"),
                "members": sp_members,
                "partner": partner,
                "myMood": my_mood,
                "partnerMood": partner_mood,
                "matrixRoomId": matrix_info.get("matrix_room_id"),
                "pendingInviteUrl": invite_by_space.get(sid) if len(sp_members) < 2 else None,
            }
        )

    return {"configured": True, "spaces": result_spaces, "currentUserId": user.id}


@router.post("/create")
async def create_space(
    body: CreateSpaceRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    name = body.name.strip()
    if not name:
        raise BackendApiError(400, "MISSING_SPACE_NAME", "Space name is required")

    if settings.is_supabase_configured:
        if not user:
            raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

        space = await gateway.insert(
            "private_spaces",
            {"name": name, "created_by": user.id},
            use_service_role=True,
            single=True,
        )
        if not space or not isinstance(space, dict):
            raise BackendApiError(500, "CREATE_SPACE_FAILED", "Failed to create space")

        await gateway.insert(
            "private_space_members",
            {"space_id": space["id"], "user_id": user.id, "role": "owner"},
            use_service_role=True,
        )
        await gateway.insert(
            "conversations",
            {"space_id": space["id"]},
            use_service_role=True,
        )
        return {"space": space}

    return {
        "space": {
            "id": f"space-{int(time.time() * 1000)}",
            "name": name,
            "created_at": datetime.now(UTC).isoformat(),
        }
    }


@router.post("/invite")
async def create_space_invitation(
    body: CreateInviteRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId is required")

    app_base = (settings.next_public_app_url or "http://localhost:3000").rstrip("/")

    if settings.is_supabase_configured:
        if not user:
            raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

        member = await verify_space_membership(gateway, user, space_id)
        if member.get("role") != "owner":
            raise BackendApiError(
                403,
                "FORBIDDEN",
                "Forbidden: Only space owners can generate invitations",
            )

        member_count = await gateway.count(
            "private_space_members",
            filters={"space_id": f"eq.{space_id}"},
            access_token=user.access_token,
        )
        if member_count >= 2:
            raise BackendApiError(
                400,
                "SPACE_AT_CAPACITY",
                "Space is already at maximum capacity (2 members)",
            )

        invite = await gateway.insert(
            "invitations",
            {"space_id": space_id, "created_by": user.id},
            use_service_role=True,
            single=True,
        )
        if not isinstance(invite, dict) or not invite.get("token"):
            raise BackendApiError(
                500, "INVITE_FAILED", "Failed to generate invitation"
            )

        return {
            "invite": invite,
            "inviteUrl": f"{app_base}/invite/{invite['token']}",
        }

    demo_token = f"tok_{uuid.uuid4().hex[:12]}"
    return {
        "invite": {
            "id": f"inv-{int(time.time() * 1000)}",
            "space_id": space_id,
            "token": demo_token,
        },
        "inviteUrl": f"{app_base}/invite/{demo_token}",
    }


@router.get("/invite/{token}")
async def inspect_invitation(
    token: str,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    clean_token = token.strip()
    if not clean_token:
        raise BackendApiError(400, "INVALID_TOKEN", "Invitation token is required")

    if not settings.is_supabase_configured:
        return {
            "configured": False,
            "valid": False,
            "reason": "Supabase is not configured.",
        }

    invite = await gateway.select(
        "invitations",
        columns="id,space_id,expires_at,used_at",
        filters={"token": f"eq.{clean_token}"},
        use_service_role=True,
        single=True,
    )
    if not isinstance(invite, dict):
        raise BackendApiError(404, "INVITE_NOT_FOUND", "Invitation link not found")

    now_iso = datetime.now(UTC).isoformat()
    is_used = invite.get("used_at") is not None
    is_expired = bool(invite.get("expires_at") and invite["expires_at"] <= now_iso)
    space = await gateway.select(
        "private_spaces",
        columns="id,name",
        filters={"id": f"eq.{invite['space_id']}"},
        use_service_role=True,
        single=True,
    )
    member_count = await gateway.count(
        "private_space_members",
        filters={"space_id": f"eq.{invite['space_id']}"},
        use_service_role=True,
    )
    return {
        "configured": True,
        "valid": not is_used and not is_expired and member_count < 2,
        "isUsed": is_used,
        "isExpired": is_expired,
        "isFull": member_count >= 2,
        "expiresAt": invite.get("expires_at"),
        "spaceName": (space or {}).get("name") or "Private Sanctuary",
    }


@router.post("/invite/accept")
async def accept_invitation(
    body: AcceptInviteRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    token = body.token.strip()
    if not token:
        raise BackendApiError(400, "INVALID_TOKEN", "Invitation token is required")

    if not settings.is_supabase_configured:
        raise BackendApiError(
            503, "SUPABASE_NOT_CONFIGURED", "Supabase must be configured to accept invitations."
        )
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Sign in before accepting this invitation")

    space_id = await gateway.rpc(
        "consume_invitation",
        {"p_token": token},
        access_token=user.access_token,
    )
    return {"spaceId": space_id}


@router.post("/mood")
async def set_space_mood(
    body: SetMoodRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId is required")

    mood = body.mood.strip() if body.mood else None
    if mood is not None and len(mood) > 80:
        raise BackendApiError(400, "INVALID_MOOD", "Mood label too long")

    if not settings.is_supabase_configured:
        return {"configured": False, "mood": mood}

    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    if not mood:
        await gateway.delete(
            "space_moods",
            filters={"space_id": f"eq.{space_id}", "user_id": f"eq.{user.id}"},
            access_token=user.access_token,
        )
        return {"configured": True, "mood": None}

    saved = await gateway.upsert(
        "space_moods",
        {
            "space_id": space_id,
            "user_id": user.id,
            "mood": mood,
            "updated_at": datetime.now(UTC).isoformat(),
        },
        on_conflict="space_id,user_id",
        access_token=user.access_token,
    )
    row = saved[0] if isinstance(saved, list) and saved else None
    return {"configured": True, "mood": (row or {}).get("mood") or mood}
