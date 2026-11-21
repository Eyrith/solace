import httpx
import respx

from app.services.feed_sync import FEED_SOURCES


def test_feed_sources_match_official_feeds() -> None:
    assert len(FEED_SOURCES) >= 4
    psyche = next((f for f in FEED_SOURCES if f.source_slug == "psyche"), None)
    assert psyche is not None
    assert psyche.feed_url == "https://psyche.co/feed"


async def test_feeds_sync_requires_cron_secret_and_upserts_articles(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("CRON_SECRET", "cron_secret_xyz")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")

    denied = await api_client.get(
        "/api/feeds/sync", headers={"Authorization": "Bearer wrong"}
    )
    assert denied.status_code == 401

    sample_rss = """<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0"><channel><title>Sample Feed</title>
      <item>
        <guid>essay-1</guid>
        <title>On Emotional Attunement</title>
        <link>https://psyche.co/ideas/attunement</link>
        <description>&lt;p&gt;A quiet reflection on listening.&lt;/p&gt;</description>
        <author>Ada Lovelace</author>
        <pubDate>Wed, 11 Nov 2026 10:00:00 GMT</pubDate>
      </item>
    </channel></rss>"""

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://psyche.co/feed").mock(
            return_value=httpx.Response(200, text=sample_rss)
        )
        mock.get("https://aeon.co/feed.rss").mock(
            return_value=httpx.Response(200, text=sample_rss)
        )
        mock.get("https://greatergood.berkeley.edu/feeds/articles").mock(
            return_value=httpx.Response(200, text=sample_rss)
        )
        mock.get("https://www.themarginalian.org/feed/").mock(
            return_value=httpx.Response(200, text=sample_rss)
        )
        mock.get("https://demo.supabase.co/rest/v1/editorial_sources").mock(
            return_value=httpx.Response(200, json=[{"id": "src-uuid-1"}])
        )
        upsert_articles = mock.post(
            "https://demo.supabase.co/rest/v1/editorial_articles"
        ).mock(return_value=httpx.Response(201, json=[]))
        mock.patch("https://demo.supabase.co/rest/v1/editorial_sources").mock(
            return_value=httpx.Response(200, json=[])
        )

        res = await api_client.get(
            "/api/feeds/sync", headers={"Authorization": "Bearer cron_secret_xyz"}
        )

    assert res.status_code == 200
    body = res.json()
    assert body["results"]["psyche"] == {"status": "success", "count": 1}
    assert upsert_articles.called


async def test_retention_cron_purges_due_ephemeral_media_and_messages(
    api_client: httpx.AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("CRON_SECRET", "cron_secret_xyz")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    monkeypatch.setenv("MATRIX_HOMESERVER_INTERNAL_URL", "http://synapse.local:8008")
    monkeypatch.setenv("NEXT_PUBLIC_MATRIX_SERVER_NAME", "sanctuary.local")
    monkeypatch.setenv("SYNAPSE_ADMIN_ACCESS_TOKEN", "syt_admin_secret")

    denied = await api_client.post("/api/cron/retention")
    assert denied.status_code == 401

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://demo.supabase.co/rest/v1/ephemeral_media_timers").mock(
            return_value=httpx.Response(
                200,
                json=[
                    {
                        "id": "timer-1",
                        "matrix_media_id": "cipherBlob99",
                        "matrix_server_name": "sanctuary.local",
                    }
                ],
            )
        )
        synapse_del = mock.delete(
            "http://synapse.local:8008/_synapse/admin/v1/media/sanctuary.local/cipherBlob99"
        ).mock(
            return_value=httpx.Response(
                200, json={"deleted_media": ["cipherBlob99"], "total": 1}
            )
        )
        timer_patch = mock.patch(
            "https://demo.supabase.co/rest/v1/ephemeral_media_timers"
        ).mock(return_value=httpx.Response(200, json=[{"id": "timer-1"}]))
        msg_del = mock.delete("https://demo.supabase.co/rest/v1/messages").mock(
            return_value=httpx.Response(200, json=[{"id": "msg-expired-1"}])
        )

        res = await api_client.post(
            "/api/cron/retention", headers={"Authorization": "Bearer cron_secret_xyz"}
        )

    assert res.status_code == 200
    data = res.json()
    assert data["skipped"] is False
    assert data["purgedTimers"] == 1
    assert data["deletedMessages"] == 1
    assert synapse_del.called
    assert timer_patch.called
    assert msg_del.called
