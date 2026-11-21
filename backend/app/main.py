from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import BackendApiError, backend_api_error_handler
from app.routers import (
    account,
    auth,
    editorial,
    feeds,
    games,
    health,
    livekit,
    matrix,
    messages,
    questions,
    sanctuary,
    spaces,
    webhooks,
)
from app.workers.scheduler import build_background_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage pooled HTTP transport and optional scheduled workers across lifespan."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as http_client:
        app.state.http_client = http_client
        scheduler = None
        if settings.enable_background_worker:
            scheduler = build_background_scheduler(http_client)
            scheduler.start()
        try:
            yield
        finally:
            if scheduler is not None:
                scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Project00 Sanctuary Backend",
        version="0.1.0",
        docs_url=None if settings.is_production else "/api/docs",
        openapi_url=None if settings.is_production else "/api/openapi.json",
        lifespan=lifespan,
    )

    allowed_origins = {
        settings.next_public_app_url.rstrip("/"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    if not settings.is_production:
        allowed_origins.update({"http://localhost:3002", "http://127.0.0.1:3002"})
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin for origin in allowed_origins if origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Webhook-Secret"],
    )

    @app.get("/", include_in_schema=False)
    async def backend_root() -> dict[str, object]:
        return {
            "status": "ok",
            "service": "sanctuary-fastapi-backend",
            "health": "/api/health",
            "docs": None if settings.is_production else "/api/docs",
        }

    app.add_exception_handler(BackendApiError, backend_api_error_handler)  # type: ignore[arg-type]
    app.include_router(health.router)
    app.include_router(account.router)
    app.include_router(matrix.router)
    app.include_router(spaces.router)
    app.include_router(messages.router)
    app.include_router(games.router)
    app.include_router(questions.router)
    app.include_router(sanctuary.router)
    app.include_router(editorial.router)
    app.include_router(auth.router)
    app.include_router(livekit.router)
    app.include_router(webhooks.router)
    app.include_router(feeds.router)
    return app


app = create_app()
