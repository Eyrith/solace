import httpx
import respx

from tests.conftest import encode_supabase_ssr_cookie


async def test_demo_messages_send_and_view_and_spaces_parity(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "")
    monkeypatch.setenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

    bad_send = await api_client.post(
        "/api/messages/send", json={"spaceId": "", "content": ""}
    )
    assert bad_send.status_code == 400

    send_res = await api_client.post(
        "/api/messages/send",
        json={
            "spaceId": "space-test-1",
            "content": "Confidential love note",
            "expiresMode": "5m",
        },
    )
    assert send_res.status_code == 200
    msg = send_res.json()["message"]
    assert msg["content"] == "Confidential love note"
    assert msg["expires_mode"] == "5m"

    view_res = await api_client.post(
        "/api/messages/view", json={"messageId": "msg-test-123"}
    )
    assert view_res.status_code == 200
    assert view_res.json()["success"] is True
    assert view_res.json()["messageId"] == "msg-test-123"

    create_res = await api_client.post(
        "/api/spaces/create", json={"name": "Our Secret Garden"}
    )
    assert create_res.status_code == 200
    space = create_res.json()["space"]
    assert space["name"] == "Our Secret Garden"

    invite_res = await api_client.post(
        "/api/spaces/invite", json={"spaceId": space["id"]}
    )
    assert invite_res.status_code == 200
    assert "/invite/" in invite_res.json()["inviteUrl"]


async def test_supabase_space_invite_capacity_and_owner_check(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    cookie_val = encode_supabase_ssr_cookie("user-jwt")

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://demo.supabase.co/auth/v1/user").mock(
            return_value=httpx.Response(200, json={"id": "user-1"})
        )
        mock.get("https://demo.supabase.co/rest/v1/private_space_members").mock(
            return_value=httpx.Response(200, json=[{"role": "owner"}])
        )
        mock.head("https://demo.supabase.co/rest/v1/private_space_members").mock(
            return_value=httpx.Response(200, headers={"content-range": "0-1/2"})
        )

        res = await api_client.post(
            "/api/spaces/invite",
            json={"spaceId": "space-full"},
            headers={"Cookie": f"sb-demo-auth-token={cookie_val}"},
        )

    assert res.status_code == 400
    assert res.json()["code"] == "SPACE_AT_CAPACITY"


async def test_supabase_mark_viewed_calls_rpc(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    cookie_val = encode_supabase_ssr_cookie("user-jwt")

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://demo.supabase.co/auth/v1/user").mock(
            return_value=httpx.Response(200, json={"id": "user-1"})
        )
        rpc_route = mock.post(
            "https://demo.supabase.co/rest/v1/rpc/mark_message_viewed"
        ).mock(return_value=httpx.Response(204))

        res = await api_client.post(
            "/api/messages/view",
            json={"messageId": "msg-1"},
            headers={"Cookie": f"sb-demo-auth-token={cookie_val}"},
        )

    assert res.status_code == 200
    assert rpc_route.called


async def test_oauth_callback_sets_session_cookie_and_prevents_open_redirect(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://xyzref.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://xyzref.supabase.co/auth/v1/token?grant_type=pkce").mock(
            return_value=httpx.Response(
                200,
                json={"access_token": "fresh.jwt.token", "expires_in": 3600},
            )
        )
        res = await api_client.get(
            "/api/auth/callback?code=oauth123&next=//evil.example.com",
            follow_redirects=False,
        )

    assert res.status_code == 307
    assert res.headers["location"] == "http://localhost:3000/"
    assert "sb-xyzref-auth-token=base64-" in res.headers["set-cookie"]

