FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    APP_ENV=production

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app

RUN groupadd --system app && useradd --system --create-home --gid app appuser && chown -R appuser:app /app /home/appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

