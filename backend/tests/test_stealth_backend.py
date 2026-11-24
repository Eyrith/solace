import httpx
import pytest


@pytest.mark.asyncio
async def test_stealth_auth_accepts_valid_pin_and_sets_cookie(
    api_client: httpx.AsyncClient,
) -> None:
    res = await api_client.post("/api/stealth/auth", json={"pin": "1984", "alias": "Owner"})
    assert res.status_code == 200
    data = res.json()
    assert data["authenticated"] is True
    assert data["role"] == "owner"
    assert "stealth_session_token" in res.cookies


@pytest.mark.asyncio
async def test_stealth_auth_rejects_invalid_pin(api_client: httpx.AsyncClient) -> None:
    res = await api_client.post("/api/stealth/auth", json={"pin": "wrong-pin", "alias": "Stranger"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_stealth_messages_send_and_list(api_client: httpx.AsyncClient) -> None:
    # Send a message
    res_send = await api_client.post(
        "/api/stealth/messages",
        json={"text": "Hello partner from stealth chat", "sender": "me", "burnAfterSeconds": 300},
    )
    assert res_send.status_code == 200
    msg = res_send.json()["message"]
    assert msg["text"] == "Hello partner from stealth chat"
    assert msg["sender"] == "me"

    # List messages
    res_list = await api_client.get("/api/stealth/messages")
    assert res_list.status_code == 200
    messages = res_list.json()["messages"]
    assert any(m["id"] == msg["id"] for m in messages)


@pytest.mark.asyncio
async def test_stealth_webrtc_signal_exchange(api_client: httpx.AsyncClient) -> None:
    # Check LiveKit data channel configuration
    res_cfg = await api_client.get("/api/stealth/signal/config")
    assert res_cfg.status_code == 200
    cfg = res_cfg.json()
    assert cfg["transport"] == "livekit_data_channel"
    assert cfg["topic"] == "webrtc_signal"
    assert cfg["latency_target_ms"] <= 15

    # Reset signals
    await api_client.post("/api/stealth/signal/reset")

    # Send SDP offer from 'me'
    res_send = await api_client.post(
        "/api/stealth/signal/send",
        json={"sender": "me", "type": "offer", "payload": {"sdp": "v=0..."}},
    )
    assert res_send.status_code == 200
    assert res_send.json()["delivered"] is True
    assert res_send.headers.get("x-signaling-transport") == "livekit-data-channel"

    # Poll signals as 'partner'
    res_poll = await api_client.get("/api/stealth/signal/poll?recipient=partner")
    assert res_poll.status_code == 200
    signals = res_poll.json()["signals"]
    assert len(signals) == 1
    assert signals[0]["sender"] == "me"
    assert signals[0]["type"] == "offer"
    assert res_poll.json()["recommended_transport"] == "livekit_data_channel"


@pytest.mark.asyncio
async def test_stealth_burn_wipes_all_messages(api_client: httpx.AsyncClient) -> None:
    # Send a test message
    await api_client.post(
        "/api/stealth/messages",
        json={"text": "Secret note to be burned", "sender": "me"},
    )
    # Trigger burn
    res_burn = await api_client.post("/api/stealth/burn")
    assert res_burn.status_code == 200
    assert res_burn.json()["wiped"] is True

    # List messages should now be empty
    res_list = await api_client.get("/api/stealth/messages")
    assert res_list.json()["count"] == 0
