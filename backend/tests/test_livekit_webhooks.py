import base64
import hashlib
import json
from datetime import timedelta

import httpx
import respx
from livekit import api

from tests.conftest import encode_supabase_ssr_cookie


async def test_livekit_token_mints_verifiable_jwt_for_space_member(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("LIVEKIT_API_KEY", "devkey_1234567890")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "devsecret_abcdefghijklmnopqrstuvwxyz_123456")
    monkeypatch.setenv("NEXT_PUBLIC_LIVEKIT_URL", "wss://livekit.sanctuary.example")

    cookie_val = encode_supabase_ssr_cookie("user-jwt")

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://demo.supabase.co/auth/v1/user").mock(
            return_value=httpx.Response(200, json={"id": "user-uuid-42"})
        )
        mock.get("https://demo.supabase.co/rest/v1/private_space_members").mock(
            return_value=httpx.Response(200, json=[{"role": "owner"}])
        )
        mock.get("https://demo.supabase.co/rest/v1/profiles").mock(
            return_value=httpx.Response(200, json=[{"display_name": "Avery"}])
        )

        res = await api_client.post(
            "/api/livekit/token",
            json={"spaceId": "space-99"},
            headers={"Cookie": f"sb-demo-auth-token={cookie_val}"},
        )

    assert res.status_code == 200
    body = res.json()
    assert body["room"] == "space-99"
    assert body["identity"] == "user-uuid-42"
    assert body["serverUrl"] == "wss://livekit.sanctuary.example"

    claims = api.TokenVerifier(
        "devkey_1234567890", "devsecret_abcdefghijklmnopqrstuvwxyz_123456"
    ).verify(body["token"])
    assert claims.identity == "user-uuid-42"
    assert claims.name == "Avery"
    assert claims.video.room == "space-99"
    assert claims.video.room_join is True


async def test_livekit_token_blocks_non_member_and_supports_demo_fallback(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "")
    monkeypatch.setenv("LIVEKIT_API_KEY", "")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "")
    monkeypatch.setenv("NEXT_PUBLIC_LIVEKIT_URL", "")

    demo_res = await api_client.post(
        "/api/livekit/token", json={"spaceId": "space-demo", "participantName": "Jordan"}
    )
    assert demo_res.status_code == 200
    assert demo_res.json()["isDemo"] is True

    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    cookie_val = encode_supabase_ssr_cookie("outsider-jwt")

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://demo.supabase.co/auth/v1/user").mock(
            return_value=httpx.Response(200, json={"id": "intruder"})
        )
        mock.get("https://demo.supabase.co/rest/v1/private_space_members").mock(
            return_value=httpx.Response(200, json=[])
        )
        res = await api_client.post(
            "/api/livekit/token",
            json={"spaceId": "space-99"},
            headers={"Cookie": f"sb-demo-auth-token={cookie_val}"},
        )

    assert res.status_code == 403


async def test_supabase_and_livekit_webhooks(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("SUPABASE_WEBHOOK_SECRET", "whsec_test_123")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")

    unauth = await api_client.post(
        "/api/webhooks/supabase",
        json={"type": "DELETE", "table": "messages", "old_record": {"id": "msg-1"}},
        headers={"x-webhook-secret": "wrong"},
    )
    assert unauth.status_code == 401

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://demo.supabase.co/rest/v1/message_attachments").mock(
            return_value=httpx.Response(200, json=[{"storage_path": "space/cipher.bin"}])
        )
        storage_del = mock.delete(
            "https://demo.supabase.co/storage/v1/object/sanctuary-media"
        ).mock(return_value=httpx.Response(200, json=[]))

        ok = await api_client.post(
            "/api/webhooks/supabase",
            json={"type": "DELETE", "table": "messages", "old_record": {"id": "msg-1"}},
            headers={"x-webhook-secret": "whsec_test_123"},
        )

    assert ok.status_code == 200
    assert storage_del.called

    # Signed LiveKit webhook event
    api_key = "devkey_1234567890"
    api_secret = "devsecret_abcdefghijklmnopqrstuvwxyz_123456"
    monkeypatch.setenv("LIVEKIT_API_KEY", api_key)
    monkeypatch.setenv("LIVEKIT_API_SECRET", api_secret)

    raw_event = json.dumps(
        {"event": "participant_joined", "room": {"name": "space-99"}}
    )
    sha = base64.b64encode(hashlib.sha256(raw_event.encode("utf-8")).digest()).decode("ascii")
    sig = (
        api.AccessToken(api_key, api_secret)
        .with_sha256(sha)
        .with_ttl(timedelta(minutes=5))
        .to_jwt()
    )

    with respx.mock(assert_all_called=False) as mock:
        patch_calls = mock.patch("https://demo.supabase.co/rest/v1/call_sessions").mock(
            return_value=httpx.Response(200, json=[])
        )
        lk_res = await api_client.post(
            "/api/webhooks/livekit",
            content=raw_event,
            headers={
                "Authorization": sig,
                "Content-Type": "application/json",
            },
        )

    assert lk_res.status_code == 200
    assert lk_res.json() == {
        "received": True,
        "event": "participant_joined",
        "room": "space-99",
    }
    assert patch_calls.called
