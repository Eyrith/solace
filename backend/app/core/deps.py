from typing import Annotated

import httpx
from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser, extract_supabase_access_token
from app.db.supabase import SupabaseGateway


def get_http_client(request: Request) -> httpx.AsyncClient:
    """Return the shared pooled AsyncClient initialized in FastAPI lifespan."""
    return request.app.state.http_client


def get_supabase_gateway(
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SupabaseGateway:
    return SupabaseGateway(http_client=http_client, settings=settings)


async def get_optional_supabase_user(
    request: Request,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedSupabaseUser | None:
    """Resolve and validate the caller's Supabase user from Bearer header or SSR cookies."""
    if not settings.is_supabase_configured:
        return None
    token = extract_supabase_access_token(request)
    if not token:
        return None
    return await gateway.get_user(token)


async def require_supabase_user(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
) -> AuthenticatedSupabaseUser:
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Authentication required")
    return user


async def verify_space_membership(
    gateway: SupabaseGateway,
    user: AuthenticatedSupabaseUser,
    space_id: str,
) -> dict[str, object]:
    """Enforce that the authenticated caller belongs to the target 2-person private space."""
    membership = await gateway.select(
        "private_space_members",
        columns="role,joined_at",
        filters={"space_id": f"eq.{space_id}", "user_id": f"eq.{user.id}"},
        access_token=user.access_token,
        single=True,
    )
    if not isinstance(membership, dict):
        raise BackendApiError(403, "FORBIDDEN", "Forbidden: Not a member of this space")
    return membership
