from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import Settings
from app.core.errors import BackendApiError
from app.core.security import AuthenticatedSupabaseUser


class SupabaseGateway:
    """
    Async Supabase HTTP gateway wrapping PostgREST, GoTrue Auth, RPC, and Storage.

    Separates user-scoped RLS operations (`access_token` passed alongside anon key)
    from explicitly server-privileged operations (`use_service_role=True`).
    """

    def __init__(self, http_client: httpx.AsyncClient, settings: Settings) -> None:
        self._http = http_client
        self._settings = settings

    @property
    def base_url(self) -> str:
        return self._settings.supabase_url

    @staticmethod
    def _is_non_jwt_api_key(key: str) -> bool:
        """Return True for Supabase `sb_publishable_` / `sb_secret_` API keys (not JWTs)."""
        return key.startswith("sb_")

    def _headers(
        self,
        *,
        access_token: str | None = None,
        use_service_role: bool = False,
        extra: dict[str, str] | None = None,
    ) -> dict[str, str]:
        if use_service_role:
            key = self._settings.supabase_service_role_key
            if not key:
                raise BackendApiError(
                    503,
                    "SUPABASE_SERVICE_KEY_MISSING",
                    "SUPABASE_SERVICE_ROLE_KEY is not configured",
                )
            headers: dict[str, str] = {
                "apikey": key,
                "Content-Type": "application/json",
            }
            if not self._is_non_jwt_api_key(key):
                headers["Authorization"] = f"Bearer {key}"
        else:
            anon_key = self._settings.next_public_supabase_anon_key
            headers = {
                "apikey": anon_key,
                "Content-Type": "application/json",
            }
            bearer = access_token or (anon_key if not self._is_non_jwt_api_key(anon_key) else "")
            if bearer:
                headers["Authorization"] = f"Bearer {bearer}"

        if extra:
            headers.update(extra)
        return headers

    async def get_user(self, access_token: str) -> AuthenticatedSupabaseUser | None:
        if not self._settings.is_supabase_configured or not access_token:
            return None

        response = await self._http.get(
            f"{self.base_url}/auth/v1/user",
            headers={
                "apikey": self._settings.next_public_supabase_anon_key,
                "Authorization": f"Bearer {access_token}",
            },
        )
        if response.status_code != 200:
            return None
        data = response.json()
        user_id = data.get("id")
        if not isinstance(user_id, str) or not user_id:
            return None
        return AuthenticatedSupabaseUser(
            id=user_id,
            email=data.get("email"),
            access_token=access_token,
            user_metadata=data.get("user_metadata") or {},
        )

    async def exchange_code_for_session(
        self, code: str, code_verifier: str | None = None
    ) -> dict[str, Any] | None:
        if not self._settings.is_supabase_configured or not code:
            return None
        payload: dict[str, str] = {"auth_code": code}
        if code_verifier:
            payload["code_verifier"] = code_verifier
        response = await self._http.post(
            f"{self.base_url}/auth/v1/token?grant_type=pkce",
            headers={
                "apikey": self._settings.next_public_supabase_anon_key,
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if response.status_code != 200:
            return None
        return response.json()

    async def select(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: dict[str, str] | None = None,
        order: str | None = None,
        access_token: str | None = None,
        use_service_role: bool = False,
        single: bool = False,
        limit: int | None = None,
    ) -> Any:
        params: dict[str, str] = {"select": columns}
        if filters:
            params.update(filters)
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = str(limit)

        headers = self._headers(access_token=access_token, use_service_role=use_service_role)
        response = await self._http.get(
            f"{self.base_url}/rest/v1/{quote(table)}",
            params=params,
            headers=headers,
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500, "SUPABASE_QUERY_ERROR", f"PostgREST select failed: {response.text[:300]}"
            )
        rows = response.json()
        if single:
            return rows[0] if isinstance(rows, list) and rows else None
        return rows

    async def insert(
        self,
        table: str,
        payload: dict[str, Any] | list[dict[str, Any]],
        *,
        access_token: str | None = None,
        use_service_role: bool = False,
        single: bool = False,
    ) -> Any:
        headers = self._headers(
            access_token=access_token,
            use_service_role=use_service_role,
            extra={"Prefer": "return=representation"},
        )
        response = await self._http.post(
            f"{self.base_url}/rest/v1/{quote(table)}",
            headers=headers,
            json=payload,
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500, "SUPABASE_INSERT_ERROR", f"PostgREST insert failed: {response.text[:300]}"
            )
        rows = response.json() if response.content else []
        if single:
            return rows[0] if isinstance(rows, list) and rows else None
        return rows

    async def upsert(
        self,
        table: str,
        payload: dict[str, Any] | list[dict[str, Any]],
        *,
        on_conflict: str | None = None,
        access_token: str | None = None,
        use_service_role: bool = False,
    ) -> Any:
        params = {"on_conflict": on_conflict} if on_conflict else None
        headers = self._headers(
            access_token=access_token,
            use_service_role=use_service_role,
            extra={"Prefer": "resolution=merge-duplicates,return=representation"},
        )
        response = await self._http.post(
            f"{self.base_url}/rest/v1/{quote(table)}",
            params=params,
            headers=headers,
            json=payload,
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500, "SUPABASE_UPSERT_ERROR", f"PostgREST upsert failed: {response.text[:300]}"
            )
        return response.json() if response.content else []

    async def update(
        self,
        table: str,
        payload: dict[str, Any],
        *,
        filters: dict[str, str],
        access_token: str | None = None,
        use_service_role: bool = False,
    ) -> Any:
        headers = self._headers(
            access_token=access_token,
            use_service_role=use_service_role,
            extra={"Prefer": "return=representation"},
        )
        response = await self._http.patch(
            f"{self.base_url}/rest/v1/{quote(table)}",
            params=filters,
            headers=headers,
            json=payload,
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500, "SUPABASE_UPDATE_ERROR", f"PostgREST update failed: {response.text[:300]}"
            )
        return response.json() if response.content else []

    async def delete(
        self,
        table: str,
        *,
        filters: dict[str, str],
        access_token: str | None = None,
        use_service_role: bool = False,
    ) -> Any:
        headers = self._headers(
            access_token=access_token,
            use_service_role=use_service_role,
            extra={"Prefer": "return=representation"},
        )
        response = await self._http.delete(
            f"{self.base_url}/rest/v1/{quote(table)}",
            params=filters,
            headers=headers,
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500, "SUPABASE_DELETE_ERROR", f"PostgREST delete failed: {response.text[:300]}"
            )
        return response.json() if response.content else []

    async def count(
        self,
        table: str,
        *,
        filters: dict[str, str] | None = None,
        access_token: str | None = None,
        use_service_role: bool = False,
    ) -> int:
        params: dict[str, str] = {"select": "*"}
        if filters:
            params.update(filters)
        headers = self._headers(
            access_token=access_token,
            use_service_role=use_service_role,
            extra={"Prefer": "count=exact"},
        )
        response = await self._http.head(
            f"{self.base_url}/rest/v1/{quote(table)}",
            params=params,
            headers=headers,
        )
        if response.status_code >= 400:
            return 0
        content_range = response.headers.get("content-range", "")
        if "/" in content_range:
            total = content_range.split("/")[-1]
            if total.isdigit():
                return int(total)
        return 0

    async def rpc(
        self,
        fn_name: str,
        params: dict[str, Any],
        *,
        access_token: str | None = None,
        use_service_role: bool = False,
    ) -> Any:
        headers = self._headers(access_token=access_token, use_service_role=use_service_role)
        response = await self._http.post(
            f"{self.base_url}/rest/v1/rpc/{quote(fn_name)}",
            headers=headers,
            json=params,
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500, "SUPABASE_RPC_ERROR", f"RPC {fn_name} failed: {response.text[:300]}"
            )
        return response.json() if response.content else None

    async def remove_storage_objects(self, bucket: str, paths: list[str]) -> None:
        if not paths:
            return
        headers = self._headers(use_service_role=True)
        response = await self._http.request(
            "DELETE",
            f"{self.base_url}/storage/v1/object/{quote(bucket)}",
            headers=headers,
            json={"prefixes": paths},
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500, "SUPABASE_STORAGE_ERROR", f"Storage delete failed: {response.text[:300]}"
            )

    async def sign_out_other_sessions(self, access_token: str) -> None:
        """Invalidate other active refresh tokens via GoTrue user logout scope=others."""
        if not self._settings.is_supabase_configured or not access_token:
            return
        response = await self._http.post(
            f"{self.base_url}/auth/v1/logout?scope=others",
            headers={
                "apikey": self._settings.next_public_supabase_anon_key,
                "Authorization": f"Bearer {access_token}",
            },
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500,
                "SESSION_REVOKE_FAILED",
                f"GoTrue session revocation failed: {response.text[:300]}",
            )

    async def admin_delete_user(self, user_id: str) -> None:
        """Permanently delete a Supabase user via GoTrue Admin API."""
        if not self._settings.is_supabase_configured:
            return
        headers = self._headers(use_service_role=True)
        response = await self._http.delete(
            f"{self.base_url}/auth/v1/admin/users/{quote(user_id)}",
            headers=headers,
        )
        if response.status_code >= 400:
            raise BackendApiError(
                500,
                "ACCOUNT_DELETE_FAILED",
                f"GoTrue user deletion failed: {response.text[:300]}",
            )

