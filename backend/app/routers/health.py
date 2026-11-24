from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, object]:
    """Return non-sensitive FastAPI service health & integration readiness booleans."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": "sanctuary-fastapi-backend",
        "environment": "production" if settings.is_production else "development",
        "engine": "direct-lightweight",
        "stealth": True,
        "integrations": {
            "supabase": settings.is_supabase_configured,
            "livekit": False,
            "localPocMode": False,
        },
    }
