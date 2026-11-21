import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Server configuration loaded from environment variables (never exposed to browser)."""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Runtime environment
    app_env: str = Field(default="development", validation_alias="APP_ENV")
    node_env: str = Field(default="development", validation_alias="NODE_ENV")
    enable_background_worker: bool = Field(
        default=False, validation_alias="ENABLE_BACKGROUND_WORKER"
    )
    backend_internal_url: str = Field(
        default="http://127.0.0.1:8000", validation_alias="BACKEND_INTERNAL_URL"
    )

    # Supabase
    next_public_supabase_url: str = Field(
        default="", validation_alias="NEXT_PUBLIC_SUPABASE_URL"
    )
    next_public_supabase_anon_key: str = Field(
        default="", validation_alias="NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    supabase_service_role_key: str = Field(
        default="", validation_alias="SUPABASE_SERVICE_ROLE_KEY"
    )

    # Matrix Synapse
    matrix_homeserver_internal_url: str = Field(
        default="", validation_alias="MATRIX_HOMESERVER_INTERNAL_URL"
    )
    next_public_matrix_homeserver_url: str = Field(
        default="", validation_alias="NEXT_PUBLIC_MATRIX_HOMESERVER_URL"
    )
    next_public_matrix_server_name: str = Field(
        default="matrix.localhost", validation_alias="NEXT_PUBLIC_MATRIX_SERVER_NAME"
    )
    synapse_admin_access_token: str = Field(
        default="", validation_alias="SYNAPSE_ADMIN_ACCESS_TOKEN"
    )
    matrix_user_hmac_secret: str = Field(
        default="", validation_alias="MATRIX_USER_HMAC_SECRET"
    )
    matrix_local_poc_mode: bool = Field(
        default=False, validation_alias="MATRIX_LOCAL_POC_MODE"
    )

    # LiveKit
    livekit_api_key: str = Field(default="", validation_alias="LIVEKIT_API_KEY")
    livekit_api_secret: str = Field(default="", validation_alias="LIVEKIT_API_SECRET")
    next_public_livekit_url: str = Field(
        default="", validation_alias="NEXT_PUBLIC_LIVEKIT_URL"
    )

    # App URLs & internal secrets
    next_public_app_url: str = Field(
        default="http://localhost:3000", validation_alias="NEXT_PUBLIC_APP_URL"
    )
    next_public_public_url: str = Field(
        default="http://localhost:3000", validation_alias="NEXT_PUBLIC_PUBLIC_URL"
    )
    cron_secret: str = Field(default="", validation_alias="CRON_SECRET")
    supabase_webhook_secret: str = Field(
        default="", validation_alias="SUPABASE_WEBHOOK_SECRET"
    )

    @property
    def is_production(self) -> bool:
        return (
            self.app_env.lower() == "production"
            or self.node_env.lower() == "production"
        )

    @property
    def supabase_url(self) -> str:
        return self.next_public_supabase_url.rstrip("/")

    @property
    def is_supabase_configured(self) -> bool:
        url = self.supabase_url
        return bool(
            url
            and "placeholder" not in url
            and "your-project-ref" not in url
        )

    @property
    def matrix_internal_url(self) -> str:
        raw = self.matrix_homeserver_internal_url or self.next_public_matrix_homeserver_url
        return raw.rstrip("/")

    @property
    def matrix_public_url(self) -> str:
        raw = self.next_public_matrix_homeserver_url or self.matrix_homeserver_internal_url
        return raw.rstrip("/")

    @property
    def is_matrix_server_configured(self) -> bool:
        return bool(self.matrix_internal_url and self.synapse_admin_access_token)

    @property
    def is_local_poc_mode_enabled(self) -> bool:
        return (
            not self.is_production
            and self.matrix_local_poc_mode
            and not self.is_supabase_configured
        )


def get_settings() -> Settings:
    """Return runtime Settings without stale .env overrides during pytest."""
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return Settings(_env_file=None)  # type: ignore[arg-type]
    return Settings()
