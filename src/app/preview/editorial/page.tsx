"use client";

import * as React from "react";
import { PublicShell } from "@/components/editorial/public-shell";
import { ArticleCard, type EditorialArticle } from "@/components/editorial/article-card";
import { PublicationCard, type PublicationSummary } from "@/components/editorial/publication-card";
import { Separator } from "@/components/ui/separator";
import { useDesignSystem } from "@/components/providers/design-system-provider";
import { useToast } from "@/components/ui/toast";

const FEATURED_ARTICLE: EditorialArticle = {
  id: "lead-1",
  title: "Why Attention Is the First Act of Generosity",
  author: "Simone Weil (Archive Analysis by Miriam Patel)",
  publication: "Aeon",
  publishedAt: "2026-11-04",
  description:
    "Sustained, unhurried attention is rarer than cleverness—and remains the foundation of both philosophical clarity and caring relationships.",
  originalUrl: "https://aeon.co",
  category: "Philosophy",
  readingDurationMinutes: 11,
};

const INDEX_ARTICLES: EditorialArticle[] = [
  {
    id: "idx-1",
    title: "The Quiet Psychology of Everyday Rituals",
    author: "Dr. Samuel Ortega",
    publication: "Greater Good Magazine",
    publishedAt: "2026-10-29",
    description:
      "Small, predictable shared routines lower relational friction far more reliably than grand occasional gestures.",
    originalUrl: "https://greatergood.berkeley.edu",
    category: "Relationships",
    readingDurationMinutes: 6,
  },
  {
    id: "idx-2",
    title: "Reading Rilke in an Age of Instant Replies",
    author: "Hannah Mercer",
    publication: "The Marginalian",
    publishedAt: "2026-10-21",
    description:
      "Living the questions patiently rather than demanding premature certainty in love and creative work.",
    originalUrl: "https://themarginalian.org",
    category: "Literature",
    readingDurationMinutes: 9,
  },
  {
    id: "idx-3",
    title: "How Emotional Memory Consolidates During Sleep",
    publication: "Psyche",
    publishedAt: "2026-10-12",
    description:
      "Neuroscience research suggests REM sleep strips sharp distress from memories while preserving meaning.",
    originalUrl: "https://psyche.co",
    category: "Science",
    readingDurationMinutes: 7,
  },
];

const PUBLICATIONS: PublicationSummary[] = [
  {
    slug: "aeon",
    name: "Aeon",
    focus: "Long-form essays across philosophy, science, society, and the arts.",
    websiteUrl: "https://aeon.co",
    curatedCount: 42,
  },
  {
    slug: "psyche",
    name: "Psyche",
    focus: "Thoughtful guides and essays illuminating psychology, philosophy, and daily life.",
    websiteUrl: "https://psyche.co",
    curatedCount: 38,
  },
  {
    slug: "greater-good",
    name: "Greater Good Magazine",
    focus: "Science-based insights on empathy, compassion, and meaningful human connection.",
    websiteUrl: "https://greatergood.berkeley.edu",
    curatedCount: 29,
  },
];

export default function EditorialShellPreviewPage() {
  const { setEnvironment } = useDesignSystem();
  const { notify } = useToast();
  const [savedIds, setSavedIds] = React.useState<string[]>(["idx-1"]);

  React.useEffect(() => {
    setEnvironment("editorial");
  }, [setEnvironment]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      notify({
        title: exists ? "Removed from saved essays" : "Saved to reading shelf",
        tone: "default",
      });
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  return (
    <PublicShell
      onSearchClick={() =>
        notify({ title: "Search drawer preview", description: "Full search route builds in Division 04." })
      }
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Asymmetric Editorial Lead + Index Grid */}
        <section aria-label="Featured reading" className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <ArticleCard
              article={FEATURED_ARTICLE}
              variant="featured"
              isSaved={savedIds.includes(FEATURED_ARTICLE.id)}
              onToggleSave={toggleSave}
            />
          </div>

          <div className="lg:col-span-5 space-y-2">
            <h2 className="font-[family-name:var(--ds-font-display)] text-xl font-semibold pb-2 border-b border-[var(--border)]">
              Recent Curations
            </h2>
            <div>
              {INDEX_ARTICLES.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="row"
                  isSaved={savedIds.includes(article.id)}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* Publication Directory Strip */}
        <section id="publications" aria-labelledby="pub-dir-heading" className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id="pub-dir-heading"
              className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold"
            >
              Curated Publications
            </h2>
            <span className="text-xs text-[var(--muted-foreground)]">
              Direct outbound attribution
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PUBLICATIONS.map((pub) => (
              <PublicationCard key={pub.slug} publication={pub} />
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

