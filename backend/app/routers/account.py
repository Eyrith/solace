from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.deps import get_optional_supabase_user, get_supabase_gateway
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser
from app.db.supabase import SupabaseGateway
from app.schemas.sanctuary import UpdatePreferencesRequest, UpdateProfileRequest

router = APIRouter(prefix="/api/account", tags=["account"])

PREF_FIELD_MAP = {
    "palette": "palette",
    "colorMode": "color_mode",
    "fontPairing": "font_pairing",
    "fontScale": "font_scale",
    "density": "density",
    "bubbleStyle": "bubble_style",
    "chatBackground": "chat_background",
    "reducedMotion": "reduced_motion",
    "discreetNotifs": "discreet_notifs",
    "soundEnabled": "sound_enabled",
    "callAlerts": "call_alerts",
    "readingHistoryEnabled": "reading_history_enabled",
}


def _require_auth_if_configured(
    user: AuthenticatedSupabaseUser | None, settings: Settings
) -> AuthenticatedSupabaseUser | None:
    if settings.is_supabase_configured and not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Authentication required")
    return user


@router.get("/me")
async def get_account_me(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        return {
            "configured": False,
            "user": None,
            "profile": None,
            "spacesCount": 0,
        }

    authed = _require_auth_if_configured(user, settings)
    assert authed is not None

    profile = await gateway.select(
        "profiles",
        columns="id,display_name,avatar_url,bio,created_at,updated_at",
        filters={"id": f"eq.{authed.id}"},
        access_token=authed.access_token,
        single=True,
    )
    memberships = await gateway.select(
        "private_space_members",
        columns="space_id,role",
        filters={"user_id": f"eq.{authed.id}"},
        access_token=authed.access_token,
    )
    spaces_list = memberships if isinstance(memberships, list) else []

    return {
        "configured": True,
        "user": {"id": authed.id, "email": authed.email},
        "profile": profile
        or {
            "id": authed.id,
            "display_name": authed.user_metadata.get("display_name") or "You",
            "avatar_url": None,
            "bio": None,
        },
        "primaryRole": spaces_list[0].get("role") if spaces_list else None,
        "spacesCount": len(spaces_list),
    }


@router.put("/profile")
async def update_account_profile(
    body: UpdateProfileRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    display_name = body.displayName.strip()
    if not display_name or len(display_name) > 50:
        raise BackendApiError(
            400, "INVALID_DISPLAY_NAME", "Display name must be between 1 and 50 characters"
        )
    bio = body.bio.strip() if body.bio is not None else None
    if bio is not None and len(bio) > 300:
        raise BackendApiError(400, "INVALID_BIO", "Bio must be 300 characters or fewer")

    if not settings.is_supabase_configured:
        return {"configured": False, "profile": {"display_name": display_name, "bio": bio}}

    authed = _require_auth_if_configured(user, settings)
    assert authed is not None
    updated = await gateway.update(
        "profiles",
        {"display_name": display_name, "bio": bio},
        filters={"id": f"eq.{authed.id}"},
        access_token=authed.access_token,
    )
    row = updated[0] if isinstance(updated, list) and updated else None
    return {"configured": True, "profile": row}


@router.get("/preferences")
async def get_preferences(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured or not user:
        return {"configured": settings.is_supabase_configured, "preferences": None}

    prefs = await gateway.select(
        "user_preferences",
        columns="*",
        filters={"user_id": f"eq.{user.id}"},
        access_token=user.access_token,
        single=True,
    )
    return {"configured": True, "preferences": prefs}


@router.put("/preferences")
async def update_preferences(
    body: UpdatePreferencesRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    body_dict = body.model_dump(exclude_none=True)
    for camel_key, db_col in PREF_FIELD_MAP.items():
        if camel_key in body_dict:
            updates[db_col] = body_dict[camel_key]

    if not settings.is_supabase_configured:
        return {"configured": False, "preferences": updates}

    authed = _require_auth_if_configured(user, settings)
    assert authed is not None

    if not updates:
        prefs = await gateway.select(
            "user_preferences",
            columns="*",
            filters={"user_id": f"eq.{authed.id}"},
            access_token=authed.access_token,
            single=True,
        )
        return {"configured": True, "preferences": prefs}

    saved = await gateway.upsert(
        "user_preferences",
        {"user_id": authed.id, **updates},
        on_conflict="user_id",
        access_token=authed.access_token,
    )
    row = saved[0] if isinstance(saved, list) and saved else None
    return {"configured": True, "preferences": row}


@router.post("/revoke")
async def revoke_other_sessions(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        raise BackendApiError(
            503,
            "SUPABASE_NOT_CONFIGURED",
            "Supabase must be configured to revoke active sessions.",
        )

    authed = _require_auth_if_configured(user, settings)
    assert authed is not None
    await gateway.sign_out_other_sessions(authed.access_token)
    return {"revoked": True}


@router.delete("")
async def delete_account_permanently(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        raise BackendApiError(
            503,
            "SUPABASE_NOT_CONFIGURED",
            "Supabase must be configured to delete user accounts.",
        )

    authed = _require_auth_if_configured(user, settings)
    assert authed is not None
    await gateway.admin_delete_user(authed.id)
    return {"deleted": True}

