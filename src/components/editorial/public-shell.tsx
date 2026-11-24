"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Menu, Moon, Search, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDesignSystem } from "@/components/providers/design-system-provider";
import { useEditorialLibrary } from "@/lib/editorial/library-store";
import { classifyStealthCode, handleStealthInput } from "@/lib/sanctuary/stealth";
import { StealthChatOverlay } from "@/components/sanctuary/stealth-chat-overlay";

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

const DEFAULT_EDITORIAL_NAV: NavItem[] = [
  { label: "Discover", href: "/discover" },
  { label: "Academics", href: "/academics" },
  { label: "Philosophy", href: "/discover?category=philosophy" },
  { label: "Neuroscience", href: "/discover?category=neuroscience" },
  { label: "Technology", href: "/discover?category=technology" },
];

export interface PublicShellProps {
  children: React.ReactNode;
  brandName?: string;
  navItems?: NavItem[];
  onSearchClick?: () => void;
  savedHref?: string;
  signInHref?: string;
}

/**
 * Experience A (Public Editorial Discovery Portal) page shell.
 * Enforces minimal magazine navigation, strict discretion (no private-app leakage),
 * skip links, accessible mobile drawer, and clean attribution footer.
 */
export function PublicShell({
  children,
  brandName = "Meridian",
  navItems = DEFAULT_EDITORIAL_NAV,
  onSearchClick,
  savedHref = "/saved",
  signInHref = "/auth/login",
}: PublicShellProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { mode, resolvedMode, setMode, toggleMode, setEnvironment } = useDesignSystem();
  const { savedIds } = useEditorialLibrary();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const [stealthChatOpen, setStealthChatOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const handleOpenOverlay = () => setStealthChatOpen(true);
    window.addEventListener("sanctuary:open-stealth-overlay", handleOpenOverlay);
    return () => window.removeEventListener("sanctuary:open-stealth-overlay", handleOpenOverlay);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const codeType = classifyStealthCode(val);
    if (codeType) {
      setSearchQuery("");
      setSearchExpanded(false);
      setMobileMenuOpen(false);
      if (codeType === "doorway") {
        setStealthChatOpen(true);
      }
      void handleStealthInput(val, router);
      return;
    }
    setSearchQuery(val);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const codeType = classifyStealthCode(searchQuery);
      if (codeType) {
        setSearchQuery("");
        setSearchExpanded(false);
        setMobileMenuOpen(false);
        if (codeType === "doorway") {
          setStealthChatOpen(true);
        }
        void handleStealthInput(searchQuery, router);
        return;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        setSearchQuery("");
        setSearchExpanded(false);
        setMobileMenuOpen(false);
        router.push(`/discover?q=${encodeURIComponent(q)}`);
      }
    } else if (e.key === "Escape") {
      setSearchExpanded(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codeType = classifyStealthCode(searchQuery);
    if (codeType) {
      setSearchQuery("");
      setSearchExpanded(false);
      setMobileMenuOpen(false);
      if (codeType === "doorway") {
        setStealthChatOpen(true);
      }
      void handleStealthInput(searchQuery, router);
      return;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      setSearchQuery("");
      setSearchExpanded(false);
      setMobileMenuOpen(false);
      router.push(`/discover?q=${encodeURIComponent(q)}`);
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (
        (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) &&
        !isInput
      ) {
        e.preventDefault();
        setSearchExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  React.useEffect(() => {
    setEnvironment("editorial");
  }, [setEnvironment]);

  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#editorial-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--ds-radius)] focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--primary-foreground)]"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-[family-name:var(--ds-font-display)] text-xl font-semibold text-[var(--foreground)] hover:opacity-80"
            >
              {brandName}
            </Link>

            <nav aria-label="Editorial topics" className="hidden lg:flex items-center gap-5">
              {navItems.map((item) => {
                const isActive =
                  item.active ??
                  (item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "text-sm transition-colors hover:text-[var(--foreground)]",
                      isActive
                        ? "font-medium text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => {
                if (onSearchClick) {
                  onSearchClick();
                } else {
                  setSearchExpanded(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }
              }}
              className="hidden sm:flex items-center gap-2.5 h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--card)]/60 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)] transition-colors cursor-pointer"
              title="Search inquiries & essays (Press ⌘K or /)"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Search inquiries...</span>
              <kbd className="ml-1 rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] border border-[var(--border)]">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Icon Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => {
                if (onSearchClick) {
                  onSearchClick();
                } else {
                  setSearchExpanded(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }
              }}
              aria-label="Search curated essays"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href={savedHref} aria-label={`Saved articles (${savedIds.length})`}>
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {savedIds.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-medium text-[var(--primary-foreground)]">
                    {savedIds.length}
                  </span>
                )}
              </Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMode(resolvedMode === "light" ? "dark" : "light")}
              aria-label={resolvedMode === "light" ? "Switch to dark appearance" : "Switch to light appearance"}
            >
              {resolvedMode === "light" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex ml-1">
              <Link href={signInHref}>Sign in</Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="editorial-mobile-nav"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* ── Search Modal Dialog Overlay ────────────────────────────────────── */}
        {searchExpanded && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search Inquiries and Essays"
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/40 backdrop-blur-xs"
            onClick={() => {
              setSearchExpanded(false);
              setSearchQuery("");
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl transition-all"
            >
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search essays, authors, psychology topics..."
                  className="h-11 pl-10 pr-9 text-sm rounded-lg border-[var(--border)] bg-[var(--background)] focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchExpanded(false);
                    setSearchQuery("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>

              {/* Suggested Inquiries */}
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  Curated topics
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                  {[
                    "Attachment Theory",
                    "On Forgiving Partner's Flaws",
                    "The Psychology of Solitude",
                    "Emotional Safety",
                  ].map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        setSearchQuery(topic);
                        router.push(`/discover?q=${encodeURIComponent(topic)}`);
                        setSearchExpanded(false);
                      }}
                      className="rounded-lg bg-[var(--muted)]/60 px-2.5 py-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <div
            id="editorial-mobile-nav"
            className="lg:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-3"
          >
            {/* Mobile drawer educational search bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search essays, authors, concepts..."
                className="h-10 pl-9 pr-8 text-sm rounded-[var(--ds-radius)] bg-[var(--card)] w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            <nav aria-label="Mobile editorial topics" className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-11 flex items-center rounded-[var(--ds-radius)] px-3 text-base text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={signInHref}
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-11 flex items-center rounded-[var(--ds-radius)] px-3 text-base font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              >
                Sign in
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main id="editorial-main" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--background)] py-10 mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[var(--muted-foreground)]">
          <p className="max-w-lg leading-relaxed">
            {brandName} curates external essays with full attribution and direct links to original publishers.
            All copyrights remain with their respective publications.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/publications" className="hover:text-[var(--foreground)] underline-offset-4 hover:underline">
              Publication Directory
            </Link>
            <Link href="/history" className="hover:text-[var(--foreground)] underline-offset-4 hover:underline">
              Reading History
            </Link>
            <Link href="/saved" className="hover:text-[var(--foreground)] underline-offset-4 hover:underline">
              Saved
            </Link>
            <Link href="/credits" className="hover:text-[var(--foreground)] underline-offset-4 hover:underline">
              Credits
            </Link>
          </div>
        </div>
      </footer>

      {/* Embedded Stealth In-Page Chat Overlay */}
      <div id="stealth-chat-overlay-root">
        <StealthChatOverlay
          isOpen={stealthChatOpen}
          onClose={() => setStealthChatOpen(false)}
        />
      </div>
    </div>
  );
}

