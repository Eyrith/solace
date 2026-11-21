from typing import Literal

from pydantic import BaseModel, Field


class MatrixSessionRequest(BaseModel):
    spaceId: str | None = None
    pocUser: str | None = None


class MatrixSessionResponse(BaseModel):
    homeserverUrl: str
    serverName: str
    userId: str
    accessToken: str
    deviceId: str
    roomId: str | None = None
    peerUserId: str | None = None
    mode: Literal["supabase", "local_poc"]


class AdminMediaQuarantineRequest(BaseModel):
    action: Literal["quarantine"] | None = None
    mediaId: str = ""
    spaceId: str | None = None
    pocUser: str | None = None


class AdminMediaItem(BaseModel):
    mediaId: str
    bytes: int
    mimeType: str
    createdAt: int
    lastAccessedAt: int | None = None
    quarantinedBy: str | None = None
    uploadName: str | None = None


class AdminStorageResponse(BaseModel):
    mxid: str
    totalFiles: int
    totalBytes: int
    media: list[AdminMediaItem] = Field(default_factory=list)
    roomMedia: dict[str, list[str]] | None = None
    privacyGuarantee: str

