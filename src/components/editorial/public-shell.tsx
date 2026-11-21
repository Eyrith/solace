"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Menu, Moon, Search, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDesignSystem } from "@/components/providers/design-system-provider";
import { useEditorialLibrary } from "@/lib/editorial/library-store";

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

const DEFAULT_EDITORIAL_NAV: NavItem[] = [
  { label: "Discover", href: "/discover" },
  { label: "Psychology", href: "/psychology" },
  { label: "Relationships", href: "/relationships" },
  { label: "Philosophy", href: "/philosophy" },
  { label: "Science", href: "/science" },
  { label: "Literature", href: "/literature" },
  { label: "Publications", href: "/publications" },
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
  brandName = "Commonplace",
  navItems = DEFAULT_EDITORIAL_NAV,
  onSearchClick,
  savedHref = "/saved",
  signInHref = "/auth/login",
}: PublicShellProps) {
  const pathname = usePathname() ?? "/";
  const { mode, toggleMode, setEnvironment } = useDesignSystem();
  const { savedIds } = useEditorialLibrary();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
              className="font-[family-name:var(--ds-font-display)] text-xl font-semibold tracking-tight text-[var(--foreground)] hover:opacity-80"
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
                        ? "font-medium text-[var(--foreground)] underline underline-offset-8 decoration-[var(--primary)]"
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              asChild={!onSearchClick}
              onClick={onSearchClick}
              aria-label="Search curated essays"
            >
              {onSearchClick ? (
                <Search className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Link href="/search" aria-label="Search curated essays">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
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
              onClick={toggleMode}
              aria-label={mode === "light" ? "Switch to dark appearance" : "Switch to light appearance"}
            >
              {mode === "light" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex ml-1">
              <Link href={signInHref}>Sign in</Link>
            </Button>

            {/* Quick Sanctuary access pill (Development helper only) */}
            {process.env.NODE_ENV === "development" && (
              <Button variant="primary" size="sm" asChild className="hidden md:inline-flex ml-1">
                <Link href="/home" title="Enter private Sanctuary chat & games">
                  <span>Sanctuary</span>
                </Link>
              </Button>
            )}

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

        {mobileMenuOpen && (
          <div
            id="editorial-mobile-nav"
            className="lg:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-1"
          >
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
              {process.env.NODE_ENV === "development" && (
                <Link
                  href="/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-11 flex items-center rounded-[var(--ds-radius)] px-3 text-base font-medium text-[var(--primary)] hover:bg-[var(--muted)]"
                >
                  Enter Sanctuary &rarr;
                </Link>
              )}
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
          </div>
        </div>
      </footer>
    </div>
  );
}

