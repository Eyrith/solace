from typing import Any

from pydantic import BaseModel


class SupabaseWebhookPayload(BaseModel):
    type: str = ""
    table: str = ""
    record: dict[str, Any] | None = None
    old_record: dict[str, Any] | None = None

