import httpx
import respx

from tests.conftest import encode_supabase_ssr_cookie


def _mock_user_and_membership(mock: respx.MockRouter, user_id: str = "user-1") -> dict[str, str]:
    mock.get("https://demo.supabase.co/auth/v1/user").mock(
        return_value=httpx.Response(
            200,
            json={"id": user_id, "email": f"{user_id}@example.com"},
        )
    )
    mock.get("https://demo.supabase.co/rest/v1/private_space_members").mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "space_id": "space-1",
                    "user_id": "user-1",
                    "role": "owner",
                    "joined_at": "2026-01-01",
                },
                {
                    "space_id": "space-1",
                    "user_id": "user-2",
                    "role": "member",
                    "joined_at": "2026-01-02",
                },
            ],
        )
    )
    cookie_val = encode_supabase_ssr_cookie("jwt-token")
    return {"Cookie": f"sb-demo-auth-token={cookie_val}"}


def _set_supabase_env(monkeypatch) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")


async def test_games_blind_reveal_hides_partner_until_both_answer(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    _set_supabase_env(monkeypatch)
    with respx.mock(assert_all_called=False) as mock:
        headers = _mock_user_and_membership(mock, "user-1")
        mock.get("https://demo.supabase.co/rest/v1/game_sessions").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "gs-1",
                        "space_id": "space-1",
                        "game_type": "couple_trivia",
                        "status": "active",
                        "question_ids": ["00000000-0000-4000-8000-000000000201"],
                        "current_q_idx": 0,
                        "scores": {},
                    }
                ],
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/question_library").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "00000000-0000-4000-8000-000000000201",
                        "slug": "q1",
                        "category": "couple_trivia",
                        "content": "First meal?",
                        "options": None,
                        "game_template_id": "game-trivia-01",
                    }
                ],
            )
        )
        # Only partner (user-2) answered so far -> partner text MUST remain hidden!
        mock.get("https://demo.supabase.co/rest/v1/game_answers").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "ans-2",
                        "session_id": "gs-1",
                        "question_id": "00000000-0000-4000-8000-000000000201",
                        "user_id": "user-2",
                        "answer": "Secret partner answer",
                        "submitted_at": "2026-01-01T00:00:00Z",
                    }
                ],
            )
        )
        res_before = await api_client.get("/api/games/sessions/gs-1", headers=headers)

    assert res_before.status_code == 200
    payload = res_before.json()
    assert payload["hasPartnerAnswered"] is True
    assert payload["revealed"] is False
    assert payload["partnerAnswer"] is None


async def test_games_answer_submission_reveals_when_both_submit(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    _set_supabase_env(monkeypatch)
    with respx.mock(assert_all_called=False) as mock:
        headers = _mock_user_and_membership(mock, "user-1")
        mock.get("https://demo.supabase.co/rest/v1/game_sessions").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "gs-1",
                        "space_id": "space-1",
                        "game_type": "couple_trivia",
                        "status": "active",
                        "question_ids": ["00000000-0000-4000-8000-000000000201"],
                        "current_q_idx": 0,
                        "scores": {},
                    }
                ],
            )
        )
        mock.post("https://demo.supabase.co/rest/v1/game_answers").mock(
            return_value=httpx.Response(201, json=[{"id": "ans-1"}])
        )
        mock.get("https://demo.supabase.co/rest/v1/game_answers").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "ans-1",
                        "question_id": "00000000-0000-4000-8000-000000000201",
                        "user_id": "user-1",
                        "answer": "Matcha latte",
                    },
                    {
                        "id": "ans-2",
                        "question_id": "00000000-0000-4000-8000-000000000201",
                        "user_id": "user-2",
                        "answer": "Espresso tonic",
                    },
                ],
            )
        )
        patch_session = mock.patch("https://demo.supabase.co/rest/v1/game_sessions").mock(
            return_value=httpx.Response(200, json=[{"id": "gs-1", "status": "revealing"}])
        )
        mock.get("https://demo.supabase.co/rest/v1/question_library").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "00000000-0000-4000-8000-000000000201",
                        "slug": "q1",
                        "category": "couple_trivia",
                        "content": "First meal?",
                        "options": None,
                        "game_template_id": "game-trivia-01",
                    }
                ],
            )
        )

        res = await api_client.post(
            "/api/games/sessions/gs-1/answer",
            json={
                "questionId": "00000000-0000-4000-8000-000000000201",
                "answer": "Matcha latte",
            },
            headers=headers,
        )

    assert res.status_code == 200
    assert patch_session.called
    data = res.json()
    assert data["revealed"] is True
    assert data["myAnswer"] == "Matcha latte"
    assert data["partnerAnswer"] == "Espresso tonic"


async def test_messages_normalizes_short_expiry_mode_for_supabase_constraint(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    _set_supabase_env(monkeypatch)
    captured_payload: dict[str, object] = {}

    with respx.mock(assert_all_called=False) as mock:
        headers = _mock_user_and_membership(mock, "user-1")
        mock.get("https://demo.supabase.co/rest/v1/conversations").mock(
            return_value=httpx.Response(200, json=[{"id": "conv-1"}])
        )

        def capture_insert(request: httpx.Request) -> httpx.Response:
            import json

            captured_payload.update(json.loads(request.content.decode()))
            return httpx.Response(201, json=[{"id": "m-1", **captured_payload}])

        mock.post("https://demo.supabase.co/rest/v1/messages").mock(
            side_effect=capture_insert
        )

        res = await api_client.post(
            "/api/messages/send",
            json={"spaceId": "space-1", "content": "Hello", "expiresMode": "5m"},
            headers=headers,
        )

    assert res.status_code == 200
    assert captured_payload["expires_mode"] == "5_minutes"


async def test_livekit_calls_account_mood_memories_and_editorial(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    _set_supabase_env(monkeypatch)
    with respx.mock(assert_all_called=False) as mock:
        headers = _mock_user_and_membership(mock, "user-1")
        mock.post("https://demo.supabase.co/rest/v1/call_sessions").mock(
            return_value=httpx.Response(
                201, json=[{"id": "call-1", "space_id": "space-1", "status": "active"}]
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/call_sessions").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "call-1",
                        "space_id": "space-1",
                        "status": "active",
                        "started_at": "2026-01-01T00:00:00+00:00",
                    }
                ],
            )
        )
        mock.patch("https://demo.supabase.co/rest/v1/call_sessions").mock(
            return_value=httpx.Response(200, json=[{"id": "call-1", "status": "ended"}])
        )
        mock.post("https://demo.supabase.co/rest/v1/space_moods").mock(
            return_value=httpx.Response(201, json=[{"mood": "Playful & Chatty"}])
        )
        mock.post("https://demo.supabase.co/rest/v1/calendar_events").mock(
            return_value=httpx.Response(
                201, json=[{"id": "ev-1", "title": "Anniversary", "event_date": "2027-03-14"}]
            )
        )
        mock.post("https://demo.supabase.co/auth/v1/logout?scope=others").mock(
            return_value=httpx.Response(204)
        )
        mock.get("https://demo.supabase.co/rest/v1/editorial_sources").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "src-1",
                        "name": "Psyche",
                        "slug": "psyche",
                        "accent_color": "#6B73A8",
                    }
                ],
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/editorial_articles").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "art-1",
                        "source_id": "src-1",
                        "external_id": "ext-1",
                        "title": "On Quiet Attention",
                        "author": "A. Writer",
                        "excerpt": "Brief excerpt",
                        "original_url": "https://psyche.co/essay",
                        "category": "psychology",
                        "tags": ["Attention"],
                        "reading_time_min": 5,
                        "published_at": "2026-05-01T12:00:00Z",
                    }
                ],
            )
        )

        start_call = await api_client.post(
            "/api/livekit/calls/start",
            json={"spaceId": "space-1", "callType": "video"},
            headers=headers,
        )
        end_call = await api_client.post(
            "/api/livekit/calls/call-1/end", json={"durationSec": 45}, headers=headers
        )
        mood_res = await api_client.post(
            "/api/spaces/mood",
            json={"spaceId": "space-1", "mood": "Playful & Chatty"},
            headers=headers,
        )
        cal_res = await api_client.post(
            "/api/calendar",
            json={"spaceId": "space-1", "title": "Anniversary", "eventDate": "2027-03-14"},
            headers=headers,
        )
        revoke_res = await api_client.post("/api/account/revoke", headers=headers)
        ed_res = await api_client.get("/api/editorial/articles?category=psychology")

    assert start_call.status_code == 200
    assert end_call.status_code == 200
    assert end_call.json()["call"]["status"] == "ended"
    assert mood_res.status_code == 200
    assert mood_res.json()["mood"] == "Playful & Chatty"
    assert cal_res.status_code == 200
    assert revoke_res.status_code == 200
    assert revoke_res.json()["revoked"] is True
    assert ed_res.status_code == 200
    assert ed_res.json()["articles"][0]["publicationSlug"] == "psyche"


async def test_daily_question_blind_reveal_and_memories_archive(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    _set_supabase_env(monkeypatch)
    with respx.mock(assert_all_called=False) as mock:
        headers = _mock_user_and_membership(mock, "user-1")
        mock.get("https://demo.supabase.co/rest/v1/daily_questions").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "dq-1",
                        "space_id": "space-1",
                        "question_id": "00000000-0000-4000-8000-000000000105",
                        "date": "2026-11-11",
                    }
                ],
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/question_library").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "00000000-0000-4000-8000-000000000105",
                        "category": "romantic",
                        "content": "What moment made you fall for me?",
                    }
                ],
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/daily_question_answers").mock(
            return_value=httpx.Response(
                200,
                json=[{"user_id": "user-2", "answer": "Partner hidden secret"}],
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/memories").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "mem-1",
                        "space_id": "space-1",
                        "created_by": "user-1",
                        "title": "Evening walk",
                        "content": "Quiet rain",
                        "memory_date": "2026-11-01",
                        "tags": ["Quiet Moments"],
                        "created_at": "2026-11-01T10:00:00Z",
                    }
                ],
            )
        )
        mock.get("https://demo.supabase.co/rest/v1/letters").mock(
            return_value=httpx.Response(200, json=[])
        )
        mock.get("https://demo.supabase.co/rest/v1/shared_notes").mock(
            return_value=httpx.Response(200, json=[])
        )

        daily_res = await api_client.get(
            "/api/questions/daily?spaceId=space-1", headers=headers
        )
        mem_res = await api_client.get("/api/memories?spaceId=space-1", headers=headers)

    assert daily_res.status_code == 200
    assert daily_res.json()["daily"]["hasPartnerAnswered"] is True
    assert daily_res.json()["daily"]["revealed"] is False
    assert daily_res.json()["daily"]["partnerAnswer"] is None
    assert mem_res.status_code == 200
    assert mem_res.json()["entries"][0]["title"] == "Evening walk"

