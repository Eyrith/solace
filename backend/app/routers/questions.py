import hashlib
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
    CreateCustomQuestionRequest,
    SubmitDailyAnswerRequest,
    ToggleQuestionSaveRequest,
)
from app.services.game_catalog import DEFAULT_QUESTION_IDS

router = APIRouter(prefix="/api/questions", tags=["questions"])

GAME_CATEGORIES = ("couple_trivia", "compatibility", "would_you_rather", "truth_or_dare")


@router.get("")
async def list_questions(
    spaceId: Annotated[str | None, Query()] = None,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)] = None,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        return {"configured": False, "questions": [], "savedIds": []}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    if spaceId:
        await verify_space_membership(gateway, user, spaceId.strip())

    rows = await gateway.select(
        "question_library",
        columns="id,slug,category,content,is_custom,space_id,created_at",
        filters={"game_template_id": "is.null"},
        order="created_at.asc",
        access_token=user.access_token,
    )
    saves = await gateway.select(
        "question_saves",
        columns="question_id",
        filters={"user_id": f"eq.{user.id}"},
        access_token=user.access_token,
    )
    saved_ids = [s["question_id"] for s in (saves or []) if isinstance(s, dict)]
    questions = [
        q
        for q in (rows or [])
        if isinstance(q, dict) and q.get("category") not in GAME_CATEGORIES
    ]
    return {"configured": True, "questions": questions, "savedIds": saved_ids}


@router.post("/save")
async def toggle_question_save(
    body: ToggleQuestionSaveRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    qid = body.questionId.strip()
    if not qid:
        raise BackendApiError(400, "MISSING_QUESTION_ID", "questionId required")
    if not settings.is_supabase_configured:
        return {"configured": False, "saved": True}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    existing = await gateway.select(
        "question_saves",
        columns="question_id",
        filters={"user_id": f"eq.{user.id}", "question_id": f"eq.{qid}"},
        access_token=user.access_token,
        single=True,
    )
    if isinstance(existing, dict):
        await gateway.delete(
            "question_saves",
            filters={"user_id": f"eq.{user.id}", "question_id": f"eq.{qid}"},
            access_token=user.access_token,
        )
        return {"configured": True, "saved": False}

    await gateway.insert(
        "question_saves",
        {"user_id": user.id, "question_id": qid},
        access_token=user.access_token,
    )
    return {"configured": True, "saved": True}


@router.post("/custom")
async def create_custom_question(
    body: CreateCustomQuestionRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    content = body.content.strip()
    if not space_id or len(content) < 5:
        raise BackendApiError(
            400, "INVALID_QUESTION", "spaceId and question text (min 5 chars) required"
        )
    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    created = await gateway.insert(
        "question_library",
        {
            "category": body.category,
            "content": content,
            "is_custom": True,
            "created_by": user.id,
            "space_id": space_id,
        },
        access_token=user.access_token,
        single=True,
    )
    return {"configured": True, "question": created}


@router.get("/daily")
async def get_daily_question(
    spaceId: Annotated[str, Query()] = "",
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)] = None,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    space_id = spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId query param is required")

    if not settings.is_supabase_configured:
        return {"configured": False, "daily": None}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)
    today = datetime.now(UTC).date().isoformat()

    daily = await gateway.select(
        "daily_questions",
        columns="id,space_id,question_id,date,created_at",
        filters={"space_id": f"eq.{space_id}", "date": f"eq.{today}"},
        access_token=user.access_token,
        single=True,
    )
    if not isinstance(daily, dict):
        digest = int(hashlib.sha256(f"{space_id}:{today}".encode()).hexdigest(), 16)
        chosen_qid = DEFAULT_QUESTION_IDS[digest % len(DEFAULT_QUESTION_IDS)]
        await gateway.upsert(
            "daily_questions",
            {"space_id": space_id, "question_id": chosen_qid, "date": today},
            on_conflict="space_id,date",
            use_service_role=True,
        )
        daily = await gateway.select(
            "daily_questions",
            columns="id,space_id,question_id,date,created_at",
            filters={"space_id": f"eq.{space_id}", "date": f"eq.{today}"},
            access_token=user.access_token,
            single=True,
        )

    if not isinstance(daily, dict):
        return {"configured": True, "daily": None}

    question = await gateway.select(
        "question_library",
        columns="id,category,content",
        filters={"id": f"eq.{daily['question_id']}"},
        access_token=user.access_token,
        single=True,
    )
    answers = await gateway.select(
        "daily_question_answers",
        columns="user_id,answer,submitted_at",
        filters={"daily_question_id": f"eq.{daily['id']}"},
        use_service_role=True,
    )
    ans_list = answers if isinstance(answers, list) else []
    distinct_users = {a["user_id"] for a in ans_list if isinstance(a, dict)}
    revealed = len(distinct_users) >= 2
    my_row = next((a for a in ans_list if a.get("user_id") == user.id), None)
    partner_row = next((a for a in ans_list if a.get("user_id") != user.id), None)

    return {
        "configured": True,
        "daily": {
            "id": daily["id"],
            "date": daily["date"],
            "questionId": daily["question_id"],
            "category": (question or {}).get("category") or "romantic",
            "prompt": (question or {}).get("content") or "",
            "myAnswer": my_row.get("answer") if my_row else None,
            "hasPartnerAnswered": partner_row is not None,
            "partnerAnswer": partner_row.get("answer") if revealed and partner_row else None,
            "revealed": revealed,
        },
    }


@router.post("/daily/answer")
async def submit_daily_question_answer(
    body: SubmitDailyAnswerRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    daily_id = body.dailyQuestionId.strip()
    answer = body.answer.strip()
    if not space_id or not daily_id or not answer:
        raise BackendApiError(
            400, "INVALID_DAILY_ANSWER", "spaceId, dailyQuestionId, and answer required"
        )
    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    await gateway.upsert(
        "daily_question_answers",
        {
            "daily_question_id": daily_id,
            "space_id": space_id,
            "user_id": user.id,
            "answer": answer,
        },
        on_conflict="daily_question_id,user_id",
        access_token=user.access_token,
    )
    return await get_daily_question(spaceId=space_id, user=user, gateway=gateway, settings=settings)

