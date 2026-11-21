from dataclasses import dataclass
from typing import Literal

import httpx
from fastapi import Request

from app.core.config import Settings
from app.core.errors import BackendApiError
from app.core.security import extract_supabase_access_token
from app.db.supabase import SupabaseGateway
from app.services.synapse_admin import (
    SynapseAdminConfig,
    derive_opaque_matrix_localpart,
    format_matrix_user_id,
    get_synapse_admin_config,
)


@dataclass(slots=True)
class ResolvedMatrixActor:
    mode: Literal["supabase", "local_poc"]
    supabase_user_id: str
    mxid: str
    display_name: str
    partner_mxid: str | None
    partner_display_name: str | None
    config: SynapseAdminConfig


async def _ensure_matrix_link(
    gateway: SupabaseGateway,
    *,
    user_id: str,
    server_name: str,
    hmac_secret: str,
    is_production: bool,
) -> str:
    existing = await gateway.select(
        "matrix_user_links",
        columns="matrix_user_id",
        filters={"user_id": f"eq.{user_id}"},
        use_service_role=True,
        single=True,
    )
    if isinstance(existing, dict) and existing.get("matrix_user_id"):
        return str(existing["matrix_user_id"])

    localpart = derive_opaque_matrix_localpart(
        user_id, hmac_secret, is_production=is_production
    )
    mxid = format_matrix_user_id(localpart, server_name)
    await gateway.upsert(
        "matrix_user_links",
        {"user_id": user_id, "matrix_user_id": mxid},
        use_service_role=True,
    )
    return mxid


async def resolve_matrix_actor(
    request: Request,
    *,
    http_client: httpx.AsyncClient,
    gateway: SupabaseGateway,
    settings: Settings,
    space_id: str | None = None,
    poc_user: str | None = None,
) -> ResolvedMatrixActor:
    """
    Authenticate caller via Supabase (or dev-only local PoC mode), enforce
    `private_space_members` access on `space_id`, and return opaque MXIDs without
    ever touching E2EE decryption or recovery keys.
    """
    if not settings.is_matrix_server_configured:
        raise BackendApiError(
            503,
            "MATRIX_NOT_CONFIGURED",
            "Matrix Synapse server environment variables are not configured",
        )

    config = get_synapse_admin_config(settings)

    if settings.is_supabase_configured:
        access_token = extract_supabase_access_token(request)
        user = await gateway.get_user(access_token) if access_token else None
        if not user:
            raise BackendApiError(401, "UNAUTHORIZED", "Authentication required")

        caller_mxid = await _ensure_matrix_link(
            gateway,
            user_id=user.id,
            server_name=config.server_name,
            hmac_secret=config.user_hmac_secret,
            is_production=settings.is_production,
        )

        caller_profile = await gateway.select(
            "profiles",
            columns="display_name",
            filters={"id": f"eq.{user.id}"},
            use_service_role=True,
            single=True,
        )

        partner_mxid: str | None = None
        partner_display_name: str | None = None

        if space_id:
            membership = await gateway.select(
                "private_space_members",
                columns="role",
                filters={"space_id": f"eq.{space_id}", "user_id": f"eq.{user.id}"},
                access_token=user.access_token,
                single=True,
            )
            if not membership:
                raise BackendApiError(
                    403, "FORBIDDEN", "Caller is not a member of this space"
                )

            partner_rows = await gateway.select(
                "private_space_members",
                columns="user_id",
                filters={"space_id": f"eq.{space_id}", "user_id": f"neq.{user.id}"},
                use_service_role=True,
            )
            first_partner_id = (
                partner_rows[0]["user_id"]
                if isinstance(partner_rows, list) and partner_rows
                else None
            )
            if first_partner_id:
                partner_mxid = await _ensure_matrix_link(
                    gateway,
                    user_id=first_partner_id,
                    server_name=config.server_name,
                    hmac_secret=config.user_hmac_secret,
                    is_production=settings.is_production,
                )
                partner_profile = await gateway.select(
                    "profiles",
                    columns="display_name",
                    filters={"id": f"eq.{first_partner_id}"},
                    use_service_role=True,
                    single=True,
                )
                partner_display_name = (
                    (partner_profile or {}).get("display_name") or "Partner"
                )

        return ResolvedMatrixActor(
            mode="supabase",
            supabase_user_id=user.id,
            mxid=caller_mxid,
            display_name=(caller_profile or {}).get("display_name") or "Sanctuary Member",
            partner_mxid=partner_mxid,
            partner_display_name=partner_display_name,
            config=config,
        )

    if settings.is_local_poc_mode_enabled:
        is_bob = poc_user == "bob"
        caller_local = "sanctuary_bob" if is_bob else "sanctuary_alice"
        partner_local = "sanctuary_alice" if is_bob else "sanctuary_bob"
        return ResolvedMatrixActor(
            mode="local_poc",
            supabase_user_id="poc-bob" if is_bob else "poc-alice",
            mxid=format_matrix_user_id(caller_local, config.server_name),
            display_name="Partner B (PoC)" if is_bob else "Partner A (PoC)",
            partner_mxid=format_matrix_user_id(partner_local, config.server_name),
            partner_display_name="Partner A (PoC)" if is_bob else "Partner B (PoC)",
            config=config,
        )

    raise BackendApiError(
        401,
        "UNAUTHORIZED",
        "Supabase authentication is required to obtain a Matrix session",
    )

