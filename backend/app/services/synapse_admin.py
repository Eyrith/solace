import base64
import hashlib
import hmac
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import Settings
from app.core.errors import BackendApiError

DEV_ONLY_FALLBACK_HMAC_SECRET = "dev-only-sanctuary-matrix-hmac-secret"


@dataclass(slots=True)
class SynapseAdminConfig:
    internal_homeserver_url: str
    public_homeserver_url: str
    server_name: str
    admin_access_token: str
    user_hmac_secret: str


@dataclass(slots=True)
class MintedMatrixDeviceSession:
    user_id: str
    access_token: str
    device_id: str
    homeserver_url: str
    server_name: str


def get_synapse_admin_config(settings: Settings) -> SynapseAdminConfig:
    if not settings.matrix_internal_url:
        raise BackendApiError(
            503,
            "MATRIX_NOT_CONFIGURED",
            "MATRIX_HOMESERVER_INTERNAL_URL is not configured",
        )
    if not settings.synapse_admin_access_token:
        raise BackendApiError(
            503,
            "MATRIX_NOT_CONFIGURED",
            "SYNAPSE_ADMIN_ACCESS_TOKEN is not configured",
        )
    return SynapseAdminConfig(
        internal_homeserver_url=settings.matrix_internal_url,
        public_homeserver_url=settings.matrix_public_url,
        server_name=settings.next_public_matrix_server_name or "matrix.localhost",
        admin_access_token=settings.synapse_admin_access_token,
        user_hmac_secret=settings.matrix_user_hmac_secret,
    )


def _resolve_hmac_secret(hmac_secret: str | None, is_production: bool) -> str:
    secret = hmac_secret or ("" if is_production else DEV_ONLY_FALLBACK_HMAC_SECRET)
    if not secret:
        raise BackendApiError(
            500,
            "MATRIX_SECRET_MISSING",
            "MATRIX_USER_HMAC_SECRET must be set in production",
        )
    return secret


def derive_opaque_matrix_localpart(
    supabase_user_id: str,
    hmac_secret: str | None = None,
    *,
    is_production: bool = False,
) -> str:
    """Derive a deterministic, PII-free Matrix localpart from a Supabase user UUID."""
    secret = _resolve_hmac_secret(hmac_secret, is_production)
    digest = hmac.new(
        secret.encode("utf-8"),
        supabase_user_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:24]
    return f"u_{digest}"


def format_matrix_user_id(localpart: str, server_name: str) -> str:
    sanitized = re.sub(r"[^a-z0-9._=-]", "", localpart.lower())
    if not sanitized:
        raise BackendApiError(400, "INVALID_LOCALPART", "Invalid Matrix localpart")
    return f"@{sanitized}:{server_name}"


def derive_synapse_service_credential(
    mxid: str,
    hmac_secret: str | None = None,
    *,
    is_production: bool = False,
) -> str:
    """
    Derive per-user Synapse login secret matching Node's base64url HMAC digest
    so existing accounts remain compatible without password resets.
    """
    secret = _resolve_hmac_secret(hmac_secret, is_production)
    raw = hmac.new(
        secret.encode("utf-8"),
        f"synapse-device-cred:{mxid}".encode(),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


async def _synapse_request(
    http_client: httpx.AsyncClient,
    method: str,
    base_url: str,
    path: str,
    token: str,
    json_body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    response = await http_client.request(
        method,
        f"{base_url}{path}",
        headers=headers,
        json=json_body,
    )
    if response.status_code >= 400:
        raise BackendApiError(
            502,
            "SYNAPSE_REQUEST_FAILED",
            f"Synapse request failed ({response.status_code} {path}): {response.text[:300]}",
        )
    return response.json() if response.content else {}


async def _login_with_password(
    http_client: httpx.AsyncClient,
    internal_homeserver_url: str,
    mxid: str,
    password: str,
    device_display_name: str | None = None,
) -> tuple[bool, int, dict[str, Any] | None, str]:
    response = await http_client.post(
        f"{internal_homeserver_url}/_matrix/client/v3/login",
        json={
            "type": "m.login.password",
            "identifier": {"type": "m.id.user", "user": mxid},
            "password": password,
            "initial_device_display_name": device_display_name or "Sanctuary Encrypted Browser",
        },
    )
    if response.status_code >= 400:
        return False, response.status_code, None, response.text
    return True, response.status_code, response.json(), ""


async def ensure_synapse_user_and_mint_session(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    *,
    mxid: str,
    display_name: str | None = None,
    device_display_name: str | None = None,
    is_production: bool = False,
) -> MintedMatrixDeviceSession:
    """
    Idempotently provision a non-admin Synapse account and mint a real device_id session
    via `/_matrix/client/v3/login` without touching or returning device/E2EE keys.
    """
    encoded_mxid = quote(mxid, safe="")
    credential = derive_synapse_service_credential(
        mxid, config.user_hmac_secret, is_production=is_production
    )

    ok, _status, session, _err = await _login_with_password(
        http_client,
        config.internal_homeserver_url,
        mxid,
        credential,
        device_display_name,
    )
    if ok and session and session.get("device_id"):
        return MintedMatrixDeviceSession(
            user_id=session.get("user_id") or mxid,
            access_token=session["access_token"],
            device_id=session["device_id"],
            homeserver_url=config.public_homeserver_url,
            server_name=config.server_name,
        )

    await _synapse_request(
        http_client,
        "PUT",
        config.internal_homeserver_url,
        f"/_synapse/admin/v2/users/{encoded_mxid}",
        config.admin_access_token,
        json_body={
            "password": credential,
            "displayname": display_name or "Sanctuary Member",
            "admin": False,
            "deactivated": False,
        },
    )

    ok, status, session, err_text = await _login_with_password(
        http_client,
        config.internal_homeserver_url,
        mxid,
        credential,
        device_display_name,
    )
    if not ok or not session or not session.get("device_id"):
        raise BackendApiError(
            502,
            "SYNAPSE_LOGIN_FAILED",
            f"Synapse device login failed ({status}): {err_text[:300]}",
        )

    return MintedMatrixDeviceSession(
        user_id=session.get("user_id") or mxid,
        access_token=session["access_token"],
        device_id=session["device_id"],
        homeserver_url=config.public_homeserver_url,
        server_name=config.server_name,
    )


async def resolve_room_alias(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    room_alias: str,
    access_token: str,
) -> str | None:
    encoded = quote(room_alias, safe="")
    response = await http_client.get(
        f"{config.internal_homeserver_url}/_matrix/client/v3/directory/room/{encoded}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if response.status_code >= 400:
        return None
    return response.json().get("room_id")


async def create_locked_couple_room(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    *,
    creator_access_token: str,
    creator_mxid: str,
    partner_mxid: str | None = None,
    partner_access_token: str | None = None,
    room_name: str | None = None,
    room_alias_name: str | None = None,
    retention_max_lifetime_ms: int | None = None,
) -> str:
    """
    Create an invite-only Megolm E2EE Matrix room with invite power level locked at 200
    once couple membership is established.
    """
    initial_state: list[dict[str, Any]] = [
        {
            "type": "m.room.encryption",
            "state_key": "",
            "content": {
                "algorithm": "m.megolm.v1.aes-sha2",
                "rotation_period_ms": 604800000,
                "rotation_period_msgs": 100,
            },
        },
        {
            "type": "m.room.history_visibility",
            "state_key": "",
            "content": {"history_visibility": "invited"},
        },
        {
            "type": "m.room.guest_access",
            "state_key": "",
            "content": {"guest_access": "forbidden"},
        },
    ]
    if retention_max_lifetime_ms and retention_max_lifetime_ms > 0:
        initial_state.append(
            {
                "type": "m.room.retention",
                "state_key": "",
                "content": {"max_lifetime": retention_max_lifetime_ms},
            }
        )

    create_payload: dict[str, Any] = {
        "preset": "trusted_private_chat",
        "visibility": "private",
        "is_direct": True,
        "name": room_name or "Our Sanctuary",
        "invite": [partner_mxid] if partner_mxid else [],
        "initial_state": initial_state,
    }
    if room_alias_name:
        create_payload["room_alias_name"] = room_alias_name

    created = await _synapse_request(
        http_client,
        "POST",
        config.internal_homeserver_url,
        "/_matrix/client/v3/createRoom",
        creator_access_token,
        json_body=create_payload,
    )
    room_id = created["room_id"]

    if partner_mxid and partner_access_token:
        await _synapse_request(
            http_client,
            "POST",
            config.internal_homeserver_url,
            f"/_matrix/client/v3/join/{quote(room_id, safe='')}",
            partner_access_token,
            json_body={},
        )

    users_power: dict[str, int] = {creator_mxid: 100}
    if partner_mxid:
        users_power[partner_mxid] = 50

    await _synapse_request(
        http_client,
        "PUT",
        config.internal_homeserver_url,
        f"/_matrix/client/v3/rooms/{quote(room_id, safe='')}/state/m.room.power_levels",
        creator_access_token,
        json_body={
            "users": users_power,
            "users_default": 0,
            "events_default": 0,
            "state_default": 50,
            "invite": 200 if partner_mxid else 100,
            "kick": 100,
            "ban": 100,
            "redact": 50,
            "events": {
                "m.room.encryption": 200,
                "m.room.history_visibility": 100,
                "m.room.power_levels": 100,
                "m.room.retention": 50,
            },
        },
    )
    return room_id


async def join_partner_into_couple_room(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    *,
    room_id: str,
    partner_access_token: str,
    inviter_access_token: str | None = None,
    partner_mxid: str | None = None,
) -> None:
    if inviter_access_token and partner_mxid:
        try:
            await _synapse_request(
                http_client,
                "POST",
                config.internal_homeserver_url,
                f"/_matrix/client/v3/rooms/{quote(room_id, safe='')}/invite",
                inviter_access_token,
                json_body={"user_id": partner_mxid},
            )
        except BackendApiError:
            pass

    await _synapse_request(
        http_client,
        "POST",
        config.internal_homeserver_url,
        f"/_matrix/client/v3/join/{quote(room_id, safe='')}",
        partner_access_token,
        json_body={},
    )


async def list_user_encrypted_media_for_admin(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    mxid: str,
    limit: int = 100,
    from_offset: int = 0,
) -> dict[str, Any]:
    return await _synapse_request(
        http_client,
        "GET",
        config.internal_homeserver_url,
        f"/_synapse/admin/v1/users/{quote(mxid, safe='')}/media?limit={limit}&from={from_offset}",
        config.admin_access_token,
    )


async def list_room_encrypted_media_for_admin(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    room_id: str,
) -> dict[str, Any]:
    return await _synapse_request(
        http_client,
        "GET",
        config.internal_homeserver_url,
        f"/_synapse/admin/v1/room/{quote(room_id, safe='')}/media",
        config.admin_access_token,
    )


async def quarantine_encrypted_media_for_admin(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    media_id: str,
    server_name: str | None = None,
) -> dict[str, Any]:
    target_server = quote(server_name or config.server_name, safe="")
    encoded_media = quote(media_id, safe="")
    return await _synapse_request(
        http_client,
        "POST",
        config.internal_homeserver_url,
        f"/_synapse/admin/v1/media/quarantine/{target_server}/{encoded_media}",
        config.admin_access_token,
        json_body={},
    )


async def delete_encrypted_media_for_admin(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    media_id: str,
    server_name: str | None = None,
) -> dict[str, Any]:
    target_server = server_name or config.server_name
    return await _synapse_request(
        http_client,
        "DELETE",
        config.internal_homeserver_url,
        f"/_synapse/admin/v1/media/{quote(target_server, safe='')}/{quote(media_id, safe='')}",
        config.admin_access_token,
    )


async def purge_old_encrypted_media_for_admin(
    http_client: httpx.AsyncClient,
    config: SynapseAdminConfig,
    before_ts_ms: int,
    server_name: str | None = None,
) -> dict[str, Any]:
    target_server = quote(server_name or config.server_name, safe="")
    return await _synapse_request(
        http_client,
        "POST",
        config.internal_homeserver_url,
        f"/_synapse/admin/v1/media/{target_server}/delete?before_ts={int(before_ts_ms)}",
        config.admin_access_token,
        json_body={},
    )
