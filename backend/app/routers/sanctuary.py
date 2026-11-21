from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings
from app.core.deps import (
    get_optional_supabase_user,
    get_supabase_gateway,
    verify_space_membership,
)
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser
from app.db.supabase import SupabaseGateway
from app.schemas.sanctuary import (
    CreateCalendarEventRequest,
    CreateMemoryEntryRequest,
    UpdateMemoryEntryRequest,
)

router = APIRouter(prefix="/api", tags=["sanctuary-archive"])


@router.get("/memories")
async def list_archive_entries(
    spaceId: Annotated[str, Query()] = "",
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)] = None,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    space_id = spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId query param required")

    if not settings.is_supabase_configured:
        return {"configured": False, "entries": []}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    memories = await gateway.select(
        "memories",
        columns="id,space_id,created_by,title,content,memory_date,tags,created_at",
        filters={"space_id": f"eq.{space_id}"},
        order="created_at.desc",
        access_token=user.access_token,
    )
    letters = await gateway.select(
        "letters",
        columns="id,space_id,author_id,subject,body,status,sent_at,created_at",
        filters={"space_id": f"eq.{space_id}"},
        order="created_at.desc",
        access_token=user.access_token,
    )
    notes = await gateway.select(
        "shared_notes",
        columns="id,space_id,created_by,title,content,is_shared,created_at",
        filters={"space_id": f"eq.{space_id}"},
        order="created_at.desc",
        access_token=user.access_token,
    )

    entries: list[dict[str, Any]] = []
    for row in memories or []:
        entries.append(
            {
                "id": row["id"],
                "kind": "memory",
                "title": row["title"],
                "description": row.get("content") or "",
                "date": row.get("memory_date") or row["created_at"],
                "tag": (row.get("tags") or ["Shared Moments"])[0],
                "isOwn": row.get("created_by") == user.id,
                "createdAt": row["created_at"],
            }
        )
    for row in letters or []:
        entries.append(
            {
                "id": row["id"],
                "kind": "letter",
                "title": row["subject"],
                "description": row.get("body") or "",
                "date": row.get("sent_at") or row["created_at"],
                "tag": "Love Letters",
                "isLetter": True,
                "isOwn": row.get("author_id") == user.id,
                "createdAt": row["created_at"],
            }
        )
    for row in notes or []:
        is_shared = bool(row.get("is_shared"))
        entries.append(
            {
                "id": row["id"],
                "kind": "shared_note" if is_shared else "journal",
                "title": row["title"],
                "description": row.get("content") or "",
                "date": row["created_at"],
                "tag": "Shared Notes" if is_shared else "Private Notes",
                "isPrivateJournal": not is_shared,
                "isOwn": row.get("created_by") == user.id,
                "createdAt": row["created_at"],
            }
        )

    entries.sort(key=lambda item: item.get("createdAt") or "", reverse=True)
    return {"configured": True, "entries": entries}


@router.post("/memories")
async def create_archive_entry(
    body: CreateMemoryEntryRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    title = body.title.strip()
    content = body.content.strip()
    if not space_id or not title:
        raise BackendApiError(400, "INVALID_ENTRY", "spaceId and title are required")

    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    if body.kind == "letter":
        row = await gateway.insert(
            "letters",
            {
                "space_id": space_id,
                "author_id": user.id,
                "subject": title,
                "body": content,
                "status": "sent",
                "sent_at": datetime.now(UTC).isoformat(),
            },
            access_token=user.access_token,
            single=True,
        )
        return {"configured": True, "entry": row}

    if body.kind in {"journal", "shared_note"}:
        row = await gateway.insert(
            "shared_notes",
            {
                "space_id": space_id,
                "created_by": user.id,
                "title": title,
                "content": content,
                "is_shared": body.kind == "shared_note",
            },
            access_token=user.access_token,
            single=True,
        )
        return {"configured": True, "entry": row}

    row = await gateway.insert(
        "memories",
        {
            "space_id": space_id,
            "created_by": user.id,
            "title": title,
            "content": content,
            "memory_date": body.eventDate or datetime.now(UTC).date().isoformat(),
            "tags": body.tags or ["Shared Moments"],
        },
        access_token=user.access_token,
        single=True,
    )
    return {"configured": True, "entry": row}


@router.patch("/memories/{kind}/{item_id}")
async def update_archive_entry(
    kind: str,
    item_id: str,
    body: UpdateMemoryEntryRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    if kind not in {"journal", "shared_note"}:
        raise BackendApiError(400, "UNSUPPORTED_KIND", "Only notes support inline updates")

    payload: dict[str, Any] = {}
    if body.title is not None:
        payload["title"] = body.title.strip()
    if body.content is not None:
        payload["content"] = body.content.strip()
    if body.isShared is not None:
        payload["is_shared"] = body.isShared

    updated = await gateway.update(
        "shared_notes",
        payload,
        filters={"id": f"eq.{item_id}"},
        access_token=user.access_token,
    )
    return {"configured": True, "entry": updated[0] if updated else None}


@router.delete("/memories/{kind}/{item_id}")
async def delete_archive_entry(
    kind: str,
    item_id: str,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    table_map = {
        "memory": "memories",
        "letter": "letters",
        "journal": "shared_notes",
        "shared_note": "shared_notes",
    }
    table = table_map.get(kind)
    if not table:
        raise BackendApiError(400, "INVALID_KIND", "Unknown archive item kind")

    await gateway.delete(
        table,
        filters={"id": f"eq.{item_id}"},
        access_token=user.access_token,
    )
    return {"configured": True, "deleted": True}


@router.get("/calendar")
async def list_calendar_events(
    spaceId: Annotated[str, Query()] = "",
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)] = None,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    space_id = spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId query param required")
    if not settings.is_supabase_configured:
        return {"configured": False, "events": []}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    events = await gateway.select(
        "calendar_events",
        columns="id,space_id,created_by,title,description,event_date,event_time,is_anniversary,created_at",
        filters={"space_id": f"eq.{space_id}"},
        order="event_date.asc",
        access_token=user.access_token,
    )
    return {"configured": True, "events": events if isinstance(events, list) else []}


@router.post("/calendar")
async def create_calendar_event(
    body: CreateCalendarEventRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    title = body.title.strip()
    event_date = body.eventDate.strip()
    if not space_id or not title or not event_date:
        raise BackendApiError(400, "INVALID_EVENT", "spaceId, title, and eventDate required")
    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    created = await gateway.insert(
        "calendar_events",
        {
            "space_id": space_id,
            "created_by": user.id,
            "title": title,
            "description": body.description.strip() if body.description else None,
            "event_date": event_date,
            "event_time": body.eventTime or None,
            "is_recurring": body.isAnniversary,
            "is_anniversary": body.isAnniversary,
        },
        access_token=user.access_token,
        single=True,
    )
    return {"configured": True, "event": created}


@router.delete("/calendar/{event_id}")
async def delete_calendar_event(
    event_id: str,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await gateway.delete(
        "calendar_events",
        filters={"id": f"eq.{event_id}"},
        access_token=user.access_token,
    )
    return {"configured": True, "deleted": True}

