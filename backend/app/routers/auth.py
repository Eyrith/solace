import base64
import json
from typing import Annotated
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse

from app.core.config import Settings, get_settings
from app.core.deps import get_supabase_gateway
from app.core.security import extract_pkce_code_verifier
from app.db.supabase import SupabaseGateway

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _safe_next_path(raw_next: str | None) -> str:
    """Prevent open redirects by allowing only local relative paths."""
    if not raw_next or not raw_next.startswith("/") or raw_next.startswith("//"):
        return "/"
    return raw_next


def _supabase_project_ref(supabase_url: str) -> str:
    parsed = urlparse(supabase_url)
    host = parsed.hostname or ""
    return host.split(".")[0] if host else "supabase"


@router.get("/callback")
async def oauth_callback(
    request: Request,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
    code: Annotated[str | None, Query()] = None,
    next: Annotated[str, Query()] = "/",
) -> RedirectResponse:
    safe_next = _safe_next_path(next)
    origin = str(request.base_url).rstrip("/")
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_host and settings.is_production:
        target_base = f"https://{forwarded_host}"
    elif settings.next_public_app_url:
        target_base = settings.next_public_app_url.rstrip("/")
    else:
        target_base = origin

    if code and settings.is_supabase_configured:
        code_verifier = extract_pkce_code_verifier(request)
        session = await gateway.exchange_code_for_session(code, code_verifier=code_verifier)
        if session and session.get("access_token"):
            response = RedirectResponse(url=f"{target_base}{safe_next}", status_code=307)
            ref = _supabase_project_ref(settings.supabase_url)
            encoded = (
                "base64-"
                + base64.urlsafe_b64encode(json.dumps(session).encode("utf-8"))
                .decode("ascii")
                .rstrip("=")
            )
            response.set_cookie(
                key=f"sb-{ref}-auth-token",
                value=encoded,
                httponly=False,
                samesite="lax",
                secure=settings.is_production,
                path="/",
                max_age=int(session.get("expires_in") or 3600),
            )
            return response

    return RedirectResponse(
        url=f"{target_base}/auth/login?error=auth_callback_failed",
        status_code=307,
    )

