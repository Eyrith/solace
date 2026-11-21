import re
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse

from app.core.config import Settings, get_settings
from app.core.deps import (
    get_http_client,
    get_optional_supabase_user,
    get_supabase_gateway,
    verify_space_membership,
)
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser
from app.db.supabase import SupabaseGateway
from app.schemas.matrix import (
    AdminMediaItem,
    AdminMediaQuarantineRequest,
    AdminStorageResponse,
    MatrixSessionRequest,
    MatrixSessionResponse,
)
from app.schemas.sanctuary import EphemeralMediaTimerRequest
from app.services.matrix_auth import resolve_matrix_actor
from app.services.synapse_admin import (
    create_locked_couple_room,
    delete_encrypted_media_for_admin,
    ensure_synapse_user_and_mint_session,
    join_partner_into_couple_room,
    list_room_encrypted_media_for_admin,
    list_user_encrypted_media_for_admin,
    quarantine_encrypted_media_for_admin,
    resolve_room_alias,
)

router = APIRouter(prefix="/api", tags=["matrix"])


def _sanctuary_alias(raw: str) -> str:
    return raw[:48]


async def _ensure_caller_owns_media(
    http_client: httpx.AsyncClient,
    config: Any,
    mxid: str,
    media_id: str,
) -> None:
    owned = await list_user_encrypted_media_for_admin(
        http_client, config, mxid, limit=200, from_offset=0
    )
    media_items = owned.get("media") or []
    if not any(item.get("media_id") == media_id for item in media_items):
        raise BackendApiError(
            403,
            "FORBIDDEN",
            "Forbidden: Media item is not owned by authenticated caller",
        )


@router.post("/media/upload")
async def block_plaintext_media_upload() -> JSONResponse:
    """Fail-closed block on unencrypted server-side media uploads."""
    return JSONResponse(
        status_code=410,
        content={
            "error": (
                "Plaintext media uploads are disabled. Media must be encrypted "
                "client-side via Matrix E2EE before upload."
            ),
            "code": "PLAINTEXT_MEDIA_FORBIDDEN",
        },
    )


@router.post("/matrix/session", response_model=MatrixSessionResponse)
async def create_matrix_session(
    request: Request,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
    body: Annotated[MatrixSessionRequest | None, Body()] = None,
) -> MatrixSessionResponse:
    raw_space = (body.spaceId or "").strip() if body and body.spaceId else ""
    space_id = raw_space or None
    poc_user = body.pocUser if body else None

    actor = await resolve_matrix_actor(
        request,
        http_client=http_client,
        gateway=gateway,
        settings=settings,
        space_id=space_id,
        poc_user=poc_user,
    )

    session = await ensure_synapse_user_and_mint_session(
        http_client,
        actor.config,
        mxid=actor.mxid,
        display_name=actor.display_name,
        is_production=settings.is_production,
    )

    room_id: str | None = None
    if space_id:
        partner_session = None
        if actor.partner_mxid:
            partner_session = await ensure_synapse_user_and_mint_session(
                http_client,
                actor.config,
                mxid=actor.partner_mxid,
                display_name=actor.partner_display_name or "Partner",
                is_production=settings.is_production,
            )

        if actor.mode == "supabase":
            existing_room = await gateway.select(
                "space_matrix_rooms",
                columns="matrix_room_id",
                filters={"space_id": f"eq.{space_id}"},
                use_service_role=True,
                single=True,
            )
            existing_room_id = (existing_room or {}).get("matrix_room_id")
            if isinstance(existing_room_id, str) and existing_room_id:
                room_id = existing_room_id
                try:
                    await join_partner_into_couple_room(
                        http_client,
                        actor.config,
                        room_id=room_id,
                        partner_access_token=session.access_token,
                    )
                except BackendApiError:
                    pass
            else:
                space_row = await gateway.select(
                    "private_spaces",
                    columns="name",
                    filters={"id": f"eq.{space_id}"},
                    use_service_role=True,
                    single=True,
                )
                room_id = await create_locked_couple_room(
                    http_client,
                    actor.config,
                    creator_access_token=session.access_token,
                    creator_mxid=actor.mxid,
                    partner_mxid=actor.partner_mxid,
                    partner_access_token=(
                        partner_session.access_token if partner_session else None
                    ),
                    room_name=(space_row or {}).get("name") or "Our Sanctuary",
                )
                await gateway.upsert(
                    "space_matrix_rooms",
                    {"space_id": space_id, "matrix_room_id": room_id},
                    use_service_role=True,
                )
        else:
            sanitized_local = f"sanctuary_poc_{re.sub(r'[^a-z0-9_-]', '_', space_id.lower())}"
            alias_local = _sanctuary_alias(sanitized_local)
            full_alias = f"#{alias_local}:{actor.config.server_name}"
            resolved = await resolve_room_alias(
                http_client, actor.config, full_alias, session.access_token
            )
            if resolved:
                room_id = resolved
                try:
                    await join_partner_into_couple_room(
                        http_client,
                        actor.config,
                        room_id=room_id,
                        partner_access_token=session.access_token,
                    )
                except BackendApiError:
                    pass
            else:
                room_id = await create_locked_couple_room(
                    http_client,
                    actor.config,
                    creator_access_token=session.access_token,
                    creator_mxid=actor.mxid,
                    partner_mxid=actor.partner_mxid,
                    partner_access_token=(
                        partner_session.access_token if partner_session else None
                    ),
                    room_name="Sanctuary PoC Room",
                    room_alias_name=alias_local,
                )

    return MatrixSessionResponse(
        homeserverUrl=session.homeserver_url,
        serverName=session.server_name,
        userId=session.user_id,
        accessToken=session.access_token,
        deviceId=session.device_id,
        roomId=room_id,
        peerUserId=actor.partner_mxid,
        mode=actor.mode,
    )


@router.get("/matrix/media/admin", response_model=AdminStorageResponse)
async def get_admin_media_inventory(
    request: Request,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
    spaceId: Annotated[str | None, Query()] = None,
    roomId: Annotated[str | None, Query()] = None,
    pocUser: Annotated[str | None, Query()] = None,
) -> AdminStorageResponse:
    actor = await resolve_matrix_actor(
        request,
        http_client=http_client,
        gateway=gateway,
        settings=settings,
        space_id=spaceId,
        poc_user=pocUser,
    )
    user_media = await list_user_encrypted_media_for_admin(
        http_client, actor.config, actor.mxid, limit=100, from_offset=0
    )

    room_media: dict[str, list[str]] | None = None
    if roomId:
        if actor.mode == "supabase":
            if not spaceId:
                raise BackendApiError(
                    400, "MISSING_SPACE_ID", "spaceId required when querying roomId"
                )
            room_map = await gateway.select(
                "space_matrix_rooms",
                columns="matrix_room_id",
                filters={"space_id": f"eq.{spaceId}"},
                use_service_role=True,
                single=True,
            )
            if not room_map or room_map.get("matrix_room_id") != roomId:
                raise BackendApiError(
                    403, "FORBIDDEN", "Forbidden: roomId does not match spaceId"
                )
        room_media = await list_room_encrypted_media_for_admin(
            http_client, actor.config, roomId
        )

    raw_items = user_media.get("media") or []
    total_bytes = sum(int(item.get("media_length") or 0) for item in raw_items)
    items = [
        AdminMediaItem(
            mediaId=str(item.get("media_id", "")),
            bytes=int(item.get("media_length") or 0),
            mimeType=item.get("media_type") or "application/octet-stream",
            createdAt=int(item.get("created_ts") or 0),
            lastAccessedAt=item.get("last_access_ts"),
            quarantinedBy=item.get("quarantined_by"),
            uploadName=item.get("upload_name"),
        )
        for item in raw_items
    ]

    return AdminStorageResponse(
        mxid=actor.mxid,
        totalFiles=int(user_media.get("total") or 0),
        totalBytes=total_bytes,
        media=items,
        roomMedia=room_media,
        privacyGuarantee=(
            "Metadata only. Encrypted blobs cannot be decrypted by server administrators."
        ),
    )


@router.post("/matrix/media/admin")
async def quarantine_admin_media(
    request: Request,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
    body: AdminMediaQuarantineRequest,
) -> dict[str, Any]:
    if body.action != "quarantine" or not body.mediaId:
        raise BackendApiError(
            400, "BAD_REQUEST", 'mediaId and action="quarantine" required'
        )

    actor = await resolve_matrix_actor(
        request,
        http_client=http_client,
        gateway=gateway,
        settings=settings,
        space_id=body.spaceId,
        poc_user=body.pocUser,
    )
    await _ensure_caller_owns_media(http_client, actor.config, actor.mxid, body.mediaId)
    await quarantine_encrypted_media_for_admin(
        http_client, actor.config, body.mediaId, actor.config.server_name
    )
    return {"quarantined": True, "mediaId": body.mediaId}


@router.delete("/matrix/media/admin")
async def delete_admin_media(
    request: Request,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
    mediaId: Annotated[str | None, Query()] = None,
    spaceId: Annotated[str | None, Query()] = None,
    pocUser: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    if not mediaId:
        raise BackendApiError(400, "MISSING_MEDIA_ID", "Missing mediaId")

    actor = await resolve_matrix_actor(
        request,
        http_client=http_client,
        gateway=gateway,
        settings=settings,
        space_id=spaceId,
        poc_user=pocUser,
    )
    await _ensure_caller_owns_media(http_client, actor.config, actor.mxid, mediaId)
    deleted = await delete_encrypted_media_for_admin(
        http_client, actor.config, mediaId, actor.config.server_name
    )
    return {
        "deleted": deleted.get("deleted_media", []),
        "total": deleted.get("total", 0),
    }


@router.post("/matrix/ephemeral-timer")
async def register_ephemeral_media_timer(
    body: EphemeralMediaTimerRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    """Schedule server-side Synapse ciphertext purge (zero keys stored)."""
    space_id = body.spaceId.strip()
    if not space_id or not body.matrixRoomId.strip() or not body.matrixEventId.strip():
        raise BackendApiError(
            400, "INVALID_TIMER", "spaceId, matrixRoomId, and matrixEventId are required"
        )
    if not settings.is_supabase_configured:
        return {"configured": False, "scheduled": False}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    row = await gateway.upsert(
        "ephemeral_media_timers",
        {
            "space_id": space_id,
            "matrix_room_id": body.matrixRoomId.strip(),
            "matrix_event_id": body.matrixEventId.strip(),
            "matrix_server_name": body.matrixServerName,
            "matrix_media_id": body.matrixMediaId,
            "expires_at": body.expiresAt,
        },
        on_conflict="matrix_room_id,matrix_event_id",
        access_token=user.access_token,
    )
    return {"configured": True, "scheduled": True, "timer": row}

