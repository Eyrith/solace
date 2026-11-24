from typing import Literal

from pydantic import BaseModel


class UpdateProfileRequest(BaseModel):
    displayName: str = ""
    bio: str | None = None


class UpdatePreferencesRequest(BaseModel):
    palette: str | None = None
    colorMode: Literal["light", "dark", "system"] | None = None
    fontPairing: str | None = None
    fontScale: str | None = None
    density: str | None = None
    bubbleStyle: str | None = None
    chatBackground: str | None = None
    reducedMotion: bool | None = None
    discreetNotifs: bool | None = None
    soundEnabled: bool | None = None
    callAlerts: bool | None = None
    readingHistoryEnabled: bool | None = None


class StartGameRequest(BaseModel):
    spaceId: str = ""
    templateId: str = ""


class SubmitGameAnswerRequest(BaseModel):
    questionId: str = ""
    answer: str = ""


class ToggleQuestionSaveRequest(BaseModel):
    questionId: str = ""


class CreateCustomQuestionRequest(BaseModel):
    spaceId: str = ""
    category: str = "personal"
    content: str = ""


class SubmitDailyAnswerRequest(BaseModel):
    spaceId: str = ""
    dailyQuestionId: str = ""
    answer: str = ""


class CreateMemoryEntryRequest(BaseModel):
    spaceId: str = ""
    kind: Literal["memory", "letter", "journal", "shared_note"] = "memory"
    title: str = ""
    content: str = ""
    eventDate: str | None = None
    tags: list[str] = []


class UpdateMemoryEntryRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    isShared: bool | None = None


class CreateCalendarEventRequest(BaseModel):
    spaceId: str = ""
    title: str = ""
    description: str | None = None
    eventDate: str = ""
    eventTime: str | None = None
    isAnniversary: bool = False


class ToggleSavedArticleRequest(BaseModel):
    articleId: str = ""


class RecordReadingHistoryRequest(BaseModel):
    articleId: str = ""

