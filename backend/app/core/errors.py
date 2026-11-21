from fastapi import Request
from fastapi.responses import JSONResponse


class BackendApiError(Exception):
    """Typed HTTP exception producing consistent JSON `{error, code}` responses."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


async def backend_api_error_handler(
    _request: Request, exc: BackendApiError
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "code": exc.code},
    )

