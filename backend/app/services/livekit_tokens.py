from datetime import timedelta

from livekit import api


def mint_livekit_room_token(
    *,
    api_key: str,
    api_secret: str,
    space_id: str,
    user_id: str,
    identity_name: str,
    ttl_hours: int = 2,
) -> str:
    """Create a signed 2-hour LiveKit WebRTC room grant for an authorized couple member."""
    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity(user_id)
        .with_name(identity_name)
        .with_ttl(timedelta(hours=ttl_hours))
        .with_grants(
            api.VideoGrants(
                room=space_id,
                room_join=True,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
    )
    return token.to_jwt()

