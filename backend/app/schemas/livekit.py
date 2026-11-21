from typing import Literal

from pydantic import BaseModel


class LiveKitTokenRequest(BaseModel):
    spaceId: str = ""
    participantName: str | None = None


class StartCallRequest(BaseModel):
    spaceId: str = ""
    callType: Literal["voice", "video"] = "video"
    roomName: str | None = None


class EndCallRequest(BaseModel):
    durationSec: int | None = None
