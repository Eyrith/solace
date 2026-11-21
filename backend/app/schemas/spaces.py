from pydantic import BaseModel


class CreateSpaceRequest(BaseModel):
    name: str = ""


class CreateInviteRequest(BaseModel):
    spaceId: str = ""


class AcceptInviteRequest(BaseModel):
    token: str = ""


class SetMoodRequest(BaseModel):
    spaceId: str = ""
    mood: str | None = None


class SendMessageRequest(BaseModel):
    spaceId: str = ""
    content: str | None = None
    messageType: str = "text"
    expiresMode: str = "never"
    replyToId: str | None = None


class MarkMessageViewedRequest(BaseModel):
    messageId: str = ""


class ReactMessageRequest(BaseModel):
    messageId: str = ""
    emoji: str = ""


class PinMessageRequest(BaseModel):
    messageId: str = ""
    pinned: bool = True
