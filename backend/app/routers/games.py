from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.core.cache import static_data_cache
from app.core.config import Settings, get_settings
from app.core.deps import (
    get_optional_supabase_user,
    get_supabase_gateway,
    verify_space_membership,
)
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser
from app.db.supabase import SupabaseGateway
from app.schemas.sanctuary import StartGameRequest, SubmitGameAnswerRequest
from app.services.game_catalog import GAME_TEMPLATE_CATALOG

router = APIRouter(prefix="/api/games", tags=["games"])


def _build_session_payload(
    session: dict[str, Any],
    questions: list[dict[str, Any]],
    answers: list[dict[str, Any]],
    caller_id: str,
) -> dict[str, Any]:
    q_ids: list[str] = list(session.get("question_ids") or [])
    idx = int(session.get("current_q_idx") or 0)
    current_q_id = q_ids[idx] if 0 <= idx < len(q_ids) else None

    q_by_id = {q["id"]: q for q in questions if q.get("id")}
    ordered_questions = [q_by_id[qid] for qid in q_ids if qid in q_by_id]

    current_answers = [a for a in answers if a.get("question_id") == current_q_id]
    my_answer_row = next((a for a in current_answers if a.get("user_id") == caller_id), None)
    partner_answer_row = next((a for a in current_answers if a.get("user_id") != caller_id), None)

    is_revealed = session.get("status") in {"revealing", "complete"} or (
        len({a.get("user_id") for a in current_answers}) >= 2
    )

    return {
        "session": session,
        "questions": ordered_questions,
        "currentQuestionId": current_q_id,
        "myAnswer": my_answer_row.get("answer") if my_answer_row else None,
        "hasPartnerAnswered": partner_answer_row is not None,
        "partnerAnswer": partner_answer_row.get("answer")
        if is_revealed and partner_answer_row
        else None,
        "revealed": is_revealed,
    }


@router.get("/sessions")
async def list_game_sessions(
    spaceId: Annotated[str, Query()] = "",
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)] = None,
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    space_id = spaceId.strip()
    if not space_id:
        raise BackendApiError(400, "MISSING_SPACE_ID", "spaceId query param is required")

    if not settings.is_supabase_configured:
        return {"configured": False, "sessions": []}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    sessions = await gateway.select(
        "game_sessions",
        columns="id,space_id,game_type,status,question_ids,current_q_idx,scores,started_at,completed_at,created_at",
        filters={"space_id": f"eq.{space_id}"},
        order="created_at.desc",
        limit=15,
        access_token=user.access_token,
    )
    return {"configured": True, "sessions": sessions if isinstance(sessions, list) else []}


@router.post("/sessions")
async def start_game_session(
    body: StartGameRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    space_id = body.spaceId.strip()
    template_id = body.templateId.strip()
    template = GAME_TEMPLATE_CATALOG.get(template_id)
    if not space_id or not template:
        raise BackendApiError(400, "INVALID_GAME_REQUEST", "Valid spaceId and templateId required")

    if not settings.is_supabase_configured:
        return {
            "configured": False,
            "session": {
                "id": template_id,
                "space_id": space_id,
                "game_type": template["game_type"],
                "status": "active",
                "current_q_idx": 0,
            },
        }
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    await verify_space_membership(gateway, user, space_id)

    async def _fetch_template_qids():
        db_q = await gateway.select(
            "question_library",
            columns="id",
            filters={"game_template_id": f"eq.{template_id}"},
            order="slug.asc",
            access_token=user.access_token,
        )
        return [q["id"] for q in (db_q or []) if isinstance(q, dict) and q.get("id")]

    fetched_qids = await static_data_cache.get_or_set(
        f"game_template_qids:{template_id}", _fetch_template_qids, ttl=600
    )
    question_ids = fetched_qids or list(template["question_ids"])

    created = await gateway.insert(
        "game_sessions",
        {
            "space_id": space_id,
            "game_type": template["game_type"],
            "status": "active",
            "question_ids": question_ids,
            "current_q_idx": 0,
            "scores": {user.id: 0},
            "started_at": datetime.now(UTC).isoformat(),
            "created_by": user.id,
        },
        access_token=user.access_token,
        single=True,
    )
    return {"configured": True, "session": created}


@router.get("/sessions/{session_id}")
async def get_game_session(
    session_id: str,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        return {"configured": False, "session": None}
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    session = await gateway.select(
        "game_sessions",
        columns="*",
        filters={"id": f"eq.{session_id}"},
        access_token=user.access_token,
        single=True,
    )
    if not isinstance(session, dict):
        raise BackendApiError(404, "SESSION_NOT_FOUND", "Game session not found")

    await verify_space_membership(gateway, user, session["space_id"])

    q_ids = list(session.get("question_ids") or [])
    questions = (
        await gateway.select(
            "question_library",
            columns="id,slug,category,content,options,game_template_id",
            filters={"id": f"in.({','.join(q_ids)})"},
            access_token=user.access_token,
        )
        if q_ids
        else []
    )
    # Read answers via service_role AFTER space membership verification,
    # strictly redacting partner's text below until blind-reveal conditions hold.
    answers = await gateway.select(
        "game_answers",
        columns="id,session_id,question_id,user_id,answer,submitted_at",
        filters={"session_id": f"eq.{session_id}"},
        use_service_role=True,
    )
    return {
        "configured": True,
        **_build_session_payload(
            session,
            questions if isinstance(questions, list) else [],
            answers if isinstance(answers, list) else [],
            user.id,
        ),
    }


@router.post("/sessions/{session_id}/answer")
async def submit_game_answer(
    session_id: str,
    body: SubmitGameAnswerRequest,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    answer_text = body.answer.strip()
    question_id = body.questionId.strip()
    if not answer_text or not question_id:
        raise BackendApiError(400, "INVALID_ANSWER", "questionId and answer are required")

    if not settings.is_supabase_configured:
        raise BackendApiError(
            503, "SUPABASE_NOT_CONFIGURED", "Supabase must be configured to submit game answers"
        )
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    session = await gateway.select(
        "game_sessions",
        columns="*",
        filters={"id": f"eq.{session_id}"},
        access_token=user.access_token,
        single=True,
    )
    if not isinstance(session, dict):
        raise BackendApiError(404, "SESSION_NOT_FOUND", "Game session not found")

    await verify_space_membership(gateway, user, session["space_id"])

    await gateway.upsert(
        "game_answers",
        {
            "session_id": session_id,
            "question_id": question_id,
            "user_id": user.id,
            "answer": answer_text,
        },
        on_conflict="session_id,question_id,user_id",
        access_token=user.access_token,
    )

    q_answers = await gateway.select(
        "game_answers",
        columns="user_id,answer",
        filters={"session_id": f"eq.{session_id}", "question_id": f"eq.{question_id}"},
        use_service_role=True,
    )
    distinct_users = {a["user_id"] for a in (q_answers or []) if isinstance(a, dict)}

    scores = dict(session.get("scores") or {})
    next_status = session.get("status", "active")
    if len(distinct_users) >= 2 and next_status != "complete":
        next_status = "revealing"
        for uid in distinct_users:
            scores[uid] = int(scores.get(uid, 0)) + 10
        updated = await gateway.update(
            "game_sessions",
            {"status": next_status, "scores": scores},
            filters={"id": f"eq.{session_id}"},
            access_token=user.access_token,
        )
        if isinstance(updated, list) and updated:
            session = updated[0]

    return await get_game_session(session_id, user, gateway, settings)


@router.post("/sessions/{session_id}/advance")
async def advance_game_session(
    session_id: str,
    user: Annotated[AuthenticatedSupabaseUser | None, Depends(get_optional_supabase_user)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.is_supabase_configured:
        raise BackendApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase not configured")
    if not user:
        raise BackendApiError(401, "UNAUTHORIZED", "Unauthorized")

    session = await gateway.select(
        "game_sessions",
        columns="*",
        filters={"id": f"eq.{session_id}"},
        access_token=user.access_token,
        single=True,
    )
    if not isinstance(session, dict):
        raise BackendApiError(404, "SESSION_NOT_FOUND", "Game session not found")

    await verify_space_membership(gateway, user, session["space_id"])

    q_ids = list(session.get("question_ids") or [])
    current_idx = int(session.get("current_q_idx") or 0)
    if current_idx + 1 >= len(q_ids):
        await gateway.update(
            "game_sessions",
            {"status": "complete", "completed_at": datetime.now(UTC).isoformat()},
            filters={"id": f"eq.{session_id}"},
            access_token=user.access_token,
        )
    else:
        await gateway.update(
            "game_sessions",
            {"current_q_idx": current_idx + 1, "status": "active"},
            filters={"id": f"eq.{session_id}"},
            access_token=user.access_token,
        )

    return await get_game_session(session_id, user, gateway, settings)

