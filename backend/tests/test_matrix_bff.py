import base64
import hashlib
import hmac

import httpx
import respx

from app.services.synapse_admin import (
    derive_opaque_matrix_localpart,
    derive_synapse_service_credential,
)
from tests.conftest import encode_supabase_ssr_cookie


def test_hmac_derivation_matches_nodejs_implementation() -> None:
    secret = "test-hmac-secret-123"
    uid = "550e8400-e29b-41d4-a716-446655440000"

    expected_localpart = (
        "u_" + hmac.new(secret.encode(), uid.encode(), hashlib.sha256).hexdigest()[:24]
    )
    localpart = derive_opaque_matrix_localpart(uid, secret)
    assert localpart == expected_localpart
    assert localpart.startswith("u_")
    assert uid.split("-")[0] not in localpart

    mxid = f"@{expected_localpart}:sanctuary.local"
    assert mxid.endswith(":sanctuary.local")
    assert "example.com" not in mxid
    digest_bytes = hmac.new(
        secret.encode(), f"synapse-device-cred:{mxid}".encode(), hashlib.sha256
    ).digest()
    expected_cred = base64.urlsafe_b64encode(digest_bytes).decode("ascii").rstrip("=")
    assert derive_synapse_service_credential(mxid, secret) == expected_cred


async def test_plaintext_media_upload_returns_410_gone(api_client: httpx.AsyncClient) -> None:
    res = await api_client.post("/api/media/upload")
    assert res.status_code == 410
    assert res.json()["code"] == "PLAINTEXT_MEDIA_FORBIDDEN"


async def test_local_poc_mode_disabled_in_production(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("MATRIX_LOCAL_POC_MODE", "true")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "")
    monkeypatch.setenv("MATRIX_HOMESERVER_INTERNAL_URL", "http://synapse.internal:8008")
    monkeypatch.setenv("SYNAPSE_ADMIN_ACCESS_TOKEN", "syt_admin_secret")

    res = await api_client.post("/api/matrix/session", json={"spaceId": "demo", "pocUser": "alice"})
    assert res.status_code == 401
    assert res.json()["code"] == "UNAUTHORIZED"


async def test_matrix_session_local_poc_creates_locked_e2ee_room(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("NODE_ENV", "development")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "")
    monkeypatch.setenv("MATRIX_LOCAL_POC_MODE", "true")
    monkeypatch.setenv("MATRIX_HOMESERVER_INTERNAL_URL", "http://synapse.local:8008")
    monkeypatch.setenv("NEXT_PUBLIC_MATRIX_HOMESERVER_URL", "http://127.0.0.1:8008")
    monkeypatch.setenv("NEXT_PUBLIC_MATRIX_SERVER_NAME", "sanctuary.local")
    monkeypatch.setenv("SYNAPSE_ADMIN_ACCESS_TOKEN", "syt_admin_secret")
    monkeypatch.setenv("MATRIX_USER_HMAC_SECRET", "test-secret")

    power_levels_payloads: list[dict] = []
    create_room_payloads: list[dict] = []

    with respx.mock(assert_all_called=False) as mock:
        mock.post("http://synapse.local:8008/_matrix/client/v3/login").mock(
            side_effect=[
                # Alice initial login fails -> admin provisions -> login succeeds
                httpx.Response(403, json={"errcode": "M_FORBIDDEN"}),
                httpx.Response(
                    200,
                    json={
                        "user_id": "@sanctuary_alice:sanctuary.local",
                        "access_token": "alice_tok",
                        "device_id": "DEV_ALICE_1",
                    },
                ),
                # Bob initial login fails -> admin provisions -> login succeeds
                httpx.Response(403, json={"errcode": "M_FORBIDDEN"}),
                httpx.Response(
                    200,
                    json={
                        "user_id": "@sanctuary_bob:sanctuary.local",
                        "access_token": "bob_tok",
                        "device_id": "DEV_BOB_1",
                    },
                ),
            ]
        )
        mock.put(
            "http://synapse.local:8008/_synapse/admin/v2/users/%40sanctuary_alice%3Asanctuary.local"
        ).mock(return_value=httpx.Response(200, json={"name": "@sanctuary_alice:sanctuary.local"}))
        mock.put(
            "http://synapse.local:8008/_synapse/admin/v2/users/%40sanctuary_bob%3Asanctuary.local"
        ).mock(return_value=httpx.Response(200, json={"name": "@sanctuary_bob:sanctuary.local"}))
        mock.get(
            "http://synapse.local:8008/_matrix/client/v3/directory/room/%23sanctuary_poc_space-1%3Asanctuary.local"
        ).mock(return_value=httpx.Response(404, json={"errcode": "M_NOT_FOUND"}))

        def _capture_create(request: httpx.Request) -> httpx.Response:
            import json

            create_room_payloads.append(json.loads(request.content))
            return httpx.Response(200, json={"room_id": "!room123:sanctuary.local"})

        mock.post("http://synapse.local:8008/_matrix/client/v3/createRoom").mock(
            side_effect=_capture_create
        )
        mock.post(
            "http://synapse.local:8008/_matrix/client/v3/join/%21room123%3Asanctuary.local"
        ).mock(return_value=httpx.Response(200, json={"room_id": "!room123:sanctuary.local"}))

        def _capture_power(request: httpx.Request) -> httpx.Response:
            import json

            power_levels_payloads.append(json.loads(request.content))
            return httpx.Response(200, json={"event_id": "$pl1"})

        mock.put(
            "http://synapse.local:8008/_matrix/client/v3/rooms/%21room123%3Asanctuary.local/state/m.room.power_levels"
        ).mock(side_effect=_capture_power)

        res = await api_client.post(
            "/api/matrix/session", json={"spaceId": "space-1", "pocUser": "alice"}
        )

    assert res.status_code == 200
    body = res.json()
    assert body == {
        "homeserverUrl": "http://127.0.0.1:8008",
        "serverName": "sanctuary.local",
        "userId": "@sanctuary_alice:sanctuary.local",
        "accessToken": "alice_tok",
        "deviceId": "DEV_ALICE_1",
        "roomId": "!room123:sanctuary.local",
        "peerUserId": "@sanctuary_bob:sanctuary.local",
        "mode": "local_poc",
    }
    assert create_room_payloads[0]["initial_state"][0] == {
        "type": "m.room.encryption",
        "state_key": "",
        "content": {
            "algorithm": "m.megolm.v1.aes-sha2",
            "rotation_period_ms": 604800000,
            "rotation_period_msgs": 100,
        },
    }
    assert power_levels_payloads[0]["invite"] == 200


async def test_matrix_session_supabase_rejects_non_member(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    monkeypatch.setenv("MATRIX_HOMESERVER_INTERNAL_URL", "http://synapse.local:8008")
    monkeypatch.setenv("SYNAPSE_ADMIN_ACCESS_TOKEN", "syt_admin_secret")
    monkeypatch.setenv("MATRIX_USER_HMAC_SECRET", "test-secret")

    cookie_val = encode_supabase_ssr_cookie("user-jwt-123")
    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://demo.supabase.co/auth/v1/user").mock(
            return_value=httpx.Response(
                200,
                json={"id": "user-uuid-1", "email": "alice@example.com"},
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/matrix_user_links").mock(
            return_value=httpx.Response(200, json=[{"matrix_user_id": "@u_abc:matrix.localhost"}])
        )
        mock.get("https://demo.supabase.co/rest/v1/profiles").mock(
            return_value=httpx.Response(200, json=[{"display_name": "Alice"}])
        )
        mock.get("https://demo.supabase.co/rest/v1/private_space_members").mock(
            return_value=httpx.Response(200, json=[])
        )

        res = await api_client.post(
            "/api/matrix/session",
            json={"spaceId": "space-secret"},
            headers={"Cookie": f"sb-demo-auth-token={cookie_val}"},
        )

    assert res.status_code == 403
    assert res.json()["code"] == "FORBIDDEN"


async def test_admin_media_inventory_and_ownership_enforcement(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("NODE_ENV", "development")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "")
    monkeypatch.setenv("MATRIX_LOCAL_POC_MODE", "true")
    monkeypatch.setenv("MATRIX_HOMESERVER_INTERNAL_URL", "http://synapse.local:8008")
    monkeypatch.setenv("NEXT_PUBLIC_MATRIX_SERVER_NAME", "sanctuary.local")
    monkeypatch.setenv("SYNAPSE_ADMIN_ACCESS_TOKEN", "syt_admin_secret")

    media_list = {
        "media": [
            {
                "media_id": "owned_cipher_1",
                "media_length": 4096,
                "media_type": "application/octet-stream",
                "created_ts": 1700000000,
                "last_access_ts": None,
                "quarantined_by": None,
                "upload_name": None,
            }
        ],
        "total": 1,
    }

    with respx.mock(assert_all_called=False) as mock:
        mock.get(
            "http://synapse.local:8008/_synapse/admin/v1/users/%40sanctuary_alice%3Asanctuary.local/media?limit=100&from=0"
        ).mock(return_value=httpx.Response(200, json=media_list))
        mock.get(
            "http://synapse.local:8008/_synapse/admin/v1/users/%40sanctuary_alice%3Asanctuary.local/media?limit=200&from=0"
        ).mock(return_value=httpx.Response(200, json=media_list))
        mock.delete(
            "http://synapse.local:8008/_synapse/admin/v1/media/sanctuary.local/owned_cipher_1"
        ).mock(
            return_value=httpx.Response(
                200, json={"deleted_media": ["owned_cipher_1"], "total": 1}
            )
        )

        list_res = await api_client.get("/api/matrix/media/admin?pocUser=alice")
        assert list_res.status_code == 200
        assert list_res.json()["totalFiles"] == 1
        assert list_res.json()["media"][0]["uploadName"] is None

        forbid_res = await api_client.delete(
            "/api/matrix/media/admin?mediaId=stranger_blob&pocUser=alice"
        )
        assert forbid_res.status_code == 403

        del_res = await api_client.delete(
            "/api/matrix/media/admin?mediaId=owned_cipher_1&pocUser=alice"
        )
        assert del_res.status_code == 200
        assert del_res.json() == {"deleted": ["owned_cipher_1"], "total": 1}
