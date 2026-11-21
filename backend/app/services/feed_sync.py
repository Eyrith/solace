import html
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any

import feedparser
import httpx

from app.core.config import Settings
from app.db.supabase import SupabaseGateway


@dataclass(frozen=True, slots=True)
class FeedSourceConfig:
    source_slug: str
    source_name: str
    feed_url: str
    default_category: str


FEED_SOURCES: tuple[FeedSourceConfig, ...] = (
    FeedSourceConfig(
        source_slug="psyche",
        source_name="Psyche",
        feed_url="https://psyche.co/feed",
        default_category="psychology",
    ),
    FeedSourceConfig(
        source_slug="aeon",
        source_name="Aeon",
        feed_url="https://aeon.co/feed.rss",
        default_category="philosophy",
    ),
    FeedSourceConfig(
        source_slug="greater-good",
        source_name="Greater Good Magazine",
        feed_url="https://greatergood.berkeley.edu/feeds/articles",
        default_category="relationships",
    ),
    FeedSourceConfig(
        source_slug="marginalian",
        source_name="The Marginalian",
        feed_url="https://www.themarginalian.org/feed/",
        default_category="literature",
    ),
)

_TAG_RE = re.compile(r"<[^>]*>")


def strip_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    without_tags = _TAG_RE.sub("", raw_html)
    unescaped = html.unescape(without_tags)
    return re.sub(r"\s+", " ", unescaped).strip()


def calculate_reading_time(text: str) -> int:
    words = [w for w in text.strip().split() if w]
    minutes = round(len(words) / 200) if words else 0
    return max(3, minutes or 7)


def _parse_iso_date(entry: Any) -> str:
    raw_date = entry.get("published") or entry.get("updated")
    if isinstance(raw_date, str) and raw_date.strip():
        try:
            dt = parsedate_to_datetime(raw_date.strip())
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt.astimezone(UTC).isoformat()
        except Exception:
            try:
                return datetime.fromisoformat(raw_date.strip().replace("Z", "+00:00")).astimezone(
                    UTC
                ).isoformat()
            except Exception:
                pass
    return datetime.now(UTC).isoformat()


def parse_feed_xml(xml_text: str, source: FeedSourceConfig) -> list[dict[str, Any]]:
    parsed = feedparser.parse(xml_text)
    if parsed.get("bozo") and not parsed.get("entries"):
        raise ValueError(f"Malformed RSS feed for {source.source_slug}")

    items: list[dict[str, Any]] = []
    for entry in parsed.get("entries", []):
        raw_desc = (
            entry.get("description")
            or entry.get("summary")
            or (entry.get("content", [{}])[0].get("value") if entry.get("content") else "")
            or ""
        )
        clean_desc = strip_html(str(raw_desc))
        excerpt = (
            f"{clean_desc[:320]}..." if len(clean_desc) > 320 else clean_desc
        )

        guid = str(
            entry.get("id")
            or entry.get("guid")
            or entry.get("link")
            or entry.get("title")
            or ""
        )
        link = str(entry.get("link") or "")
        title = strip_html(str(entry.get("title") or "Untitled Essay"))
        author = str(entry.get("author") or source.source_name)

        items.append(
            {
                "guid": guid,
                "title": title,
                "link": link,
                "description": excerpt,
                "author": author,
                "publishedAt": _parse_iso_date(entry),
                "category": source.default_category,
                "readingTimeMin": calculate_reading_time(clean_desc),
            }
        )
    return items


async def fetch_and_parse_feed(
    http_client: httpx.AsyncClient, source: FeedSourceConfig
) -> list[dict[str, Any]]:
    response = await http_client.get(
        source.feed_url,
        headers={
            "User-Agent": "Commonplace-Editorial-Bot/1.0 (+https://example.com)",
            "Accept": "application/rss+xml, application/xml, text/xml",
        },
        follow_redirects=True,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"Failed to fetch feed {source.feed_url}: "
            f"{response.status_code} {response.reason_phrase}"
        )
    return parse_feed_xml(response.text, source)


async def sync_all_feeds(
    http_client: httpx.AsyncClient,
    gateway: SupabaseGateway,
    settings: Settings,
) -> dict[str, dict[str, Any]]:
    results: dict[str, dict[str, Any]] = {}
    has_supabase_admin = bool(
        settings.is_supabase_configured and settings.supabase_service_role_key
    )

    for source in FEED_SOURCES:
        try:
            items = await fetch_and_parse_feed(http_client, source)
            results[source.source_slug] = {"status": "success", "count": len(items)}

            if has_supabase_admin:
                source_row = await gateway.select(
                    "editorial_sources",
                    columns="id",
                    filters={"slug": f"eq.{source.source_slug}"},
                    use_service_role=True,
                    single=True,
                )
                if isinstance(source_row, dict) and source_row.get("id"):
                    rows_to_upsert = [
                        {
                            "source_id": source_row["id"],
                            "external_id": item["guid"],
                            "title": item["title"],
                            "author": item["author"],
                            "excerpt": item["description"],
                            "original_url": item["link"],
                            "category": item["category"],
                            "reading_time_min": item["readingTimeMin"],
                            "published_at": item["publishedAt"],
                        }
                        for item in items
                    ]
                    if rows_to_upsert:
                        await gateway.upsert(
                            "editorial_articles",
                            rows_to_upsert,
                            on_conflict="source_id,external_id",
                            use_service_role=True,
                        )
                    await gateway.update(
                        "editorial_sources",
                        {"last_synced": datetime.now(UTC).isoformat()},
                        filters={"id": f"eq.{source_row['id']}"},
                        use_service_role=True,
                    )
        except Exception as exc:
            results[source.source_slug] = {
                "status": "failed",
                "error": str(exc) or "Parse error",
            }

    return results
