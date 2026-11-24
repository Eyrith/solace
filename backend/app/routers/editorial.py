from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.core.cache import static_data_cache
from app.core.config import Settings, get_settings
from app.core.deps import get_optional_supabase_user, get_supabase_gateway
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser
from app.db.supabase import SupabaseGateway
from app.schemas.sanctuary import RecordReadingHistoryRequest, ToggleSavedArticleRequest

router = APIRouter(prefix="/api/editorial", tags=["editorial"])


async def _get_cached_sources(gateway: SupabaseGateway) -> list[dict[str, Any]]:
    async def _fetch():
        res = await gateway.select(
            "editorial_sources",
            columns="id,name,slug,description,website_url,accent_color,last_synced",
            filters={"is_active": "eq.true"},
            order="name.asc",
        )
        return res if isinstance(res, list) else []

    return await static_data_cache.get_or_set("editorial_sources_active", _fetch, ttl=600)


@router.get("/sources")
async def list_editorial_sources(
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        return {"configured": False, "sources": []}

    rows = await _get_cached_sources(gateway)
    return {"configured": True, "sources": rows}


@router.get("/articles")
async def list_editorial_articles(
    category: Annotated[str | None, Query()] = None,
    publication: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 40,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        return {"configured": False, "articles": []}

    source_rows = await _get_cached_sources(gateway)
    source_by_id = {s["id"]: s for s in source_rows if isinstance(s, dict) and s.get("id")}
    source_by_slug = {s["slug"]: s for s in source_rows if isinstance(s, dict) and s.get("slug")}

    filters: dict[str, str] = {}
    if category and category != "all":
        filters["category"] = f"eq.{category}"
    if publication and publication != "all":
        src = source_by_slug.get(publication)
        if not src:
            return {"configured": True, "articles": []}
        filters["source_id"] = f"eq.{src['id']}"

    rows = await gateway.select(
        "editorial_articles",
        columns=(
            "id,source_id,external_id,title,author,excerpt,original_url,"
            "og_image_url,category,tags,reading_time_min,published_at,ingested_at"
        ),
        filters=filters or None,
        order="published_at.desc.nullslast,ingested_at.desc",
        limit=limit,
    )
    articles: list[dict[str, Any]] = []
    search_term = (q or "").strip().lower()
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        src = source_by_id.get(row.get("source_id")) or {}
        if search_term:
            haystack = " ".join(
                [
                    str(row.get("title") or ""),
                    str(row.get("author") or ""),
                    str(row.get("excerpt") or ""),
                    " ".join(row.get("tags") or []),
                ]
            ).lower()
            if search_term not in haystack:
                continue

        pub_date = (row.get("published_at") or row.get("ingested_at") or "")[:10]
        articles.append(
            {
                "id": row["id"],
                "title": row["title"],
                "author": row.get("author") or src.get("name") or "Editorial Contributor",
                "publicationSlug": src.get("slug") or "psyche",
                "publicationName": src.get("name") or "Commonplace",
                "publishedDate": pub_date or "2025-01-01",
                "category": row.get("category") or "psychology",
                "readingDurationMinutes": int(row.get("reading_time_min") or 6),
                "description": row.get("excerpt") or "",
                "originalUrl": row["original_url"],
                "tags": row.get("tags") or [],
                "isFeatured": len(articles) < 2,
                "coverPattern": "minimal",
            }
        )

    return {"configured": True, "articles": articles}


@router.get("/saved")
async def list_saved_articles(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured or not user:
        return {"authenticated": False, "savedIds": []}
    rows = await gateway.select(
        "saved_articles",
        columns="article_id,saved_at",
        filters={"user_id": f"eq.{user.id}"},
        order="saved_at.desc",
        access_token=user.access_token,
    )
    return {
        "authenticated": True,
        "savedIds": [r["article_id"] for r in (rows or []) if isinstance(r, dict)],
    }


@router.post("/saved")
async def toggle_saved_article(
    body: ToggleSavedArticleRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    article_id = body.articleId.strip()
    if not article_id:
        raise BackendApiError(400, "MISSING_ARTICLE_ID", "articleId required")
    if not settings.is_supabase_configured or not user:
        return {"authenticated": False, "saved": False}

    existing = await gateway.select(
        "saved_articles",
        columns="article_id",
        filters={"user_id": f"eq.{user.id}", "article_id": f"eq.{article_id}"},
        access_token=user.access_token,
        single=True,
    )
    if isinstance(existing, dict):
        await gateway.delete(
            "saved_articles",
            filters={"user_id": f"eq.{user.id}", "article_id": f"eq.{article_id}"},
            access_token=user.access_token,
        )
        return {"authenticated": True, "saved": False}

    try:
        await gateway.insert(
            "saved_articles",
            {"user_id": user.id, "article_id": article_id},
            access_token=user.access_token,
        )
    except BackendApiError:
        # Static catalog IDs (non-UUID fallback) reside cleanly in client storage
        return {"authenticated": True, "saved": False, "localOnly": True}
    return {"authenticated": True, "saved": True}


@router.get("/history")
async def get_reading_history(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured or not user:
        return {"authenticated": False, "history": []}
    rows = await gateway.select(
        "reading_history",
        columns="article_id,read_at",
        filters={"user_id": f"eq.{user.id}"},
        order="read_at.desc",
        limit=50,
        access_token=user.access_token,
    )
    return {
        "authenticated": True,
        "history": [
            {"articleId": r["article_id"], "readAt": r["read_at"]}
            for r in (rows or [])
            if isinstance(r, dict)
        ],
    }


@router.post("/history")
async def record_reading_history(
    body: RecordReadingHistoryRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    article_id = body.articleId.strip()
    if not article_id or not settings.is_supabase_configured or not user:
        return {"recorded": False}
    try:
        await gateway.upsert(
            "reading_history",
            {"user_id": user.id, "article_id": article_id},
            on_conflict="user_id,article_id",
            access_token=user.access_token,
        )
        return {"recorded": True}
    except BackendApiError:
        return {"recorded": False}


@router.delete("/history")
async def clear_reading_history(
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured or not user:
        return {"cleared": False}
    await gateway.delete(
        "reading_history",
        filters={"user_id": f"eq.{user.id}"},
        access_token=user.access_token,
    )
    return {"cleared": True}

