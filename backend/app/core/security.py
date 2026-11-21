import base64
import json
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote

from fastapi import Request

from app.core.errors import BackendApiError

CHUNKED_COOKIE_RE = re.compile(r"^(sb-[^.=]+-auth-token)\.(\d+)$")
SINGLE_COOKIE_RE = re.compile(r"^sb-[^.=]+-auth-token$")


@dataclass(slots=True)
class AuthenticatedSupabaseUser:
    """Verified Supabase user identity attached to authenticated FastAPI requests."""

    id: str
    email: str | None
    access_token: str
    user_metadata: dict[str, Any]


def _decode_cookie_payload(raw_value: str) -> str | None:
    """Extract a JWT `access_token` from `@supabase/ssr` cookie encodings."""
    value = unquote(raw_value.strip())
    if not value:
        return None

    if value.startswith("base64-"):
        encoded = value[len("base64-") :]
        padding = "=" * (-len(encoded) % 4)
        try:
            decoded_bytes = base64.urlsafe_b64decode(encoded + padding)
            value = decoded_bytes.decode("utf-8")
        except Exception:
            return None

    if value.startswith("{") or value.startswith("["):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return None
        if isinstance(parsed, dict):
            token = parsed.get("access_token")
            return token if isinstance(token, str) and token else None
        if isinstance(parsed, list) and parsed:
            first = parsed[0]
            if isinstance(first, str) and first:
                return first
            if isinstance(first, dict):
                token = first.get("access_token")
                return token if isinstance(token, str) and token else None
        return None

    if value.count(".") == 2:
        return value
    return None


def extract_supabase_access_token(request: Request) -> str | None:
    """
    Extract Supabase JWT access token from either:
    1. `Authorization: Bearer <jwt>` header
    2. `@supabase/ssr` cookies (`sb-*-auth-token` single or numbered `.0`/`.1` chunks)
    """
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    cookies = request.cookies
    if not cookies:
        return None

    for name, value in cookies.items():
        if SINGLE_COOKIE_RE.match(name):
            token = _decode_cookie_payload(value)
            if token:
                return token

    chunk_groups: dict[str, list[tuple[int, str]]] = {}
    for name, value in cookies.items():
        match = CHUNKED_COOKIE_RE.match(name)
        if match:
            base_name, index_str = match.group(1), match.group(2)
            chunk_groups.setdefault(base_name, []).append((int(index_str), value))

    for parts in chunk_groups.values():
        parts.sort(key=lambda item: item[0])
        combined = "".join(part for _, part in parts)
        token = _decode_cookie_payload(combined)
        if token:
            return token

    return None


def extract_pkce_code_verifier(request: Request) -> str | None:
    """Read the PKCE code verifier cookie written by `@supabase/ssr` during OAuth login."""
    for name, value in request.cookies.items():
        if name.startswith("sb-") and name.endswith("-auth-token-code-verifier"):
            raw = unquote(value.strip())
            if raw.startswith('"') and raw.endswith('"'):
                try:
                    raw = json.loads(raw)
                except json.JSONDecodeError:
                    pass
            if isinstance(raw, str) and raw:
                return raw
    return None


def require_bearer_secret(provided: str | None, expected: str, error_message: str) -> None:
    """Constant-time validation for internal cron or webhook shared secrets."""
    import hmac

    if not expected:
        return
    token = (provided or "").strip()
    candidates = [expected, f"Bearer {expected}"]
    if not any(hmac.compare_digest(token, candidate) for candidate in candidates):
        raise BackendApiError(401, "UNAUTHORIZED", error_message)

