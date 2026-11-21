import base64
import json
from collections.abc import AsyncIterator

import httpx
import pytest

from app.main import create_app


@pytest.fixture
async def api_client() -> AsyncIterator[httpx.AsyncClient]:
    """Spin up the FastAPI app with lifespan context for in-process ASGI HTTP tests."""
    app = create_app()
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            yield client


def encode_supabase_ssr_cookie(access_token: str) -> str:
    """Encode a token using Supabase SSR base64-json format."""
    payload = json.dumps({"access_token": access_token, "token_type": "bearer"}).encode("utf-8")
    encoded = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    return f"base64-{encoded}"

