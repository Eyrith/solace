import httpx
from fastapi import Request

from app.core.security import extract_supabase_access_token
from tests.conftest import encode_supabase_ssr_cookie


def _make_request(headers: dict[str, str] | None = None, cookie_header: str = "") -> Request:
    raw_headers: list[tuple[bytes, bytes]] = []
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode(), v.encode()))
    if cookie_header:
        raw_headers.append((b"cookie", cookie_header.encode()))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/health",
        "headers": raw_headers,
    }
    return Request(scope)


async def test_health_endpoint_reports_non_sensitive_status(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "")
    res = await api_client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "sanctuary-fastapi-backend"
    assert body["integrations"] == {
        "supabase": False,
        "livekit": False,
        "localPocMode": False,
    }


def test_extracts_bearer_jwt_with_priority() -> None:
    req = _make_request(
        headers={"Authorization": "Bearer header.jwt.token"},
        cookie_header="sb-proj-auth-token=" + encode_supabase_ssr_cookie("cookie.jwt.token"),
    )
    assert extract_supabase_access_token(req) == "header.jwt.token"


def test_extracts_base64_and_chunked_supabase_ssr_cookies() -> None:
    cookie_val = encode_supabase_ssr_cookie("eyJaaa.eyJbbb.sig")
    mid = len(cookie_val) // 2
    part0, part1 = cookie_val[:mid], cookie_val[mid:]

    req_single = _make_request(cookie_header=f"sb-testref-auth-token={cookie_val}")
    assert extract_supabase_access_token(req_single) == "eyJaaa.eyJbbb.sig"

    req_chunked = _make_request(
        cookie_header=f"sb-testref-auth-token.1={part1}; sb-testref-auth-token.0={part0}"
    )
    assert extract_supabase_access_token(req_chunked) == "eyJaaa.eyJbbb.sig"


def test_supabase_gateway_headers_support_sb_and_jwt_keys() -> None:
    from app.core.config import Settings
    from app.db.supabase import SupabaseGateway

    async_client = httpx.AsyncClient()
    try:
        sb_settings = Settings(
            NEXT_PUBLIC_SUPABASE_URL="https://demo.supabase.co",
            NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_demo",
            SUPABASE_SERVICE_ROLE_KEY="sb_secret_demo",
        )
        sb_gw = SupabaseGateway(async_client, sb_settings)
        assert sb_gw._headers(use_service_role=False) == {
            "apikey": "sb_publishable_demo",
            "Content-Type": "application/json",
        }
        assert sb_gw._headers(access_token="user.jwt.token", use_service_role=False) == {
            "apikey": "sb_publishable_demo",
            "Authorization": "Bearer user.jwt.token",
            "Content-Type": "application/json",
        }
        assert sb_gw._headers(use_service_role=True) == {
            "apikey": "sb_secret_demo",
            "Content-Type": "application/json",
        }

        jwt_settings = Settings(
            NEXT_PUBLIC_SUPABASE_URL="https://demo.supabase.co",
            NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ.anon.jwt",
            SUPABASE_SERVICE_ROLE_KEY="eyJ.service.jwt",
        )
        jwt_gw = SupabaseGateway(async_client, jwt_settings)
        assert jwt_gw._headers(use_service_role=True)["Authorization"] == "Bearer eyJ.service.jwt"
        assert jwt_gw._headers(use_service_role=False)["Authorization"] == "Bearer eyJ.anon.jwt"
    finally:
        import asyncio

        asyncio.run(async_client.aclose())

