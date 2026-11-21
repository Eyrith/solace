"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookHeart,
  BookOpen,
  ChevronDown,
  Gamepad2,
  HelpCircle,
  Lock,
  MessageCircle,
  Phone,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export interface PrivateSpaceSummary {
  id: string;
  label: string;
  partnerName: string;
}

export type SanctuarySection =
  | "messages"
  | "questions"
  | "games"
  | "shared"
  | "journal"
  | "settings";

export interface PrivateShellProps {
  children: React.ReactNode;
  activeSection?: SanctuarySection;
  onSelectSection?: (section: SanctuarySection) => void;
  spaces?: PrivateSpaceSummary[];
  activeSpaceId?: string;
  onSwitchSpace?: (spaceId: string) => void;
  onCreateSpace?: (name: string) => void | Promise<void>;
  isLocalSandbox?: boolean;
  demoActor?: "self" | "partner";
  onSwitchDemoActor?: (actor: "self" | "partner") => void;
  headerTitle?: string;
  headerSubtitle?: string;
  headerActions?: React.ReactNode;
}

const PRIMARY_NAV: readonly {
  id: SanctuarySection;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}[] = [
  { id: "messages", label: "Messages", href: "/messages/space-1", icon: MessageCircle },
  { id: "questions", label: "Questions", href: "/questions", icon: HelpCircle },
  { id: "games", label: "Games", href: "/games", icon: Gamepad2 },
  { id: "shared", label: "Memories", href: "/memories", icon: Sparkles },
  { id: "journal", label: "Calendar", href: "/calendar", icon: BookHeart },
];

const DEFAULT_SPACES: PrivateSpaceSummary[] = [
  { id: "space-1", label: "Evening Sanctuary", partnerName: "Avery" },
  { id: "space-2", label: "Weekend Archive", partnerName: "Jordan" },
];

function inferSection(pathname: string): SanctuarySection {
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/questions")) return "questions";
  if (pathname.startsWith("/games")) return "games";
  if (pathname.startsWith("/memories")) return "shared";
  if (pathname.startsWith("/calendar")) return "journal";
  if (pathname.startsWith("/settings")) return "settings";
  return "messages";
}

/**
 * Experience B (Private Application) adaptive layout shell.
 * Renders a calm sidebar on desktop (>=1024px) and a 5-destination mobile bottom bar (<1024px)
 * with clear space switching and separated settings/security actions.
 */
export function PrivateShell({
  children,
  activeSection,
  onSelectSection,
  spaces = DEFAULT_SPACES,
  activeSpaceId,
  onSwitchSpace,
  onCreateSpace,
  isLocalSandbox = false,
  demoActor = "self",
  onSwitchDemoActor,
  headerTitle,
  headerSubtitle,
  headerActions,
}: PrivateShellProps) {
  const pathname = usePathname() ?? "";
  const resolvedSection = activeSection ?? inferSection(pathname);
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) ?? spaces[0] ?? null;
  const messagesHref = activeSpace ? `/messages/${activeSpace.id}` : "/home";
  const navItems = PRIMARY_NAV.map((item) =>
    item.id === "messages" ? { ...item, href: messagesHref } : item,
  );

  const [addingSpace, setAddingSpace] = React.useState(false);
  const [newSpaceLabel, setNewSpaceLabel] = React.useState("");

  const handleAddSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateSpace || !newSpaceLabel.trim()) return;
    await onCreateSpace(newSpaceLabel.trim());
    setNewSpaceLabel("");
    setAddingSpace(false);
  };

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#sanctuary-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--ds-radius)] focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--primary-foreground)]"
      >
        Skip to workspace
      </a>

      {/* Desktop Left Sidebar (>=1024px) */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col border-r border-[var(--border)] bg-[var(--card)]/75">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] px-1">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Private space
            </span>
            {onCreateSpace && (
              <button
                type="button"
                onClick={() => setAddingSpace((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-[var(--ds-radius)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--muted)] cursor-pointer"
                aria-label="Create new private space"
              >
                <Plus className="h-3 w-3" />
                <span>New</span>
              </button>
            )}
          </div>

          {activeSpace ? (
            <Select value={activeSpace.id} onValueChange={onSwitchSpace}>
              <SelectTrigger aria-label="Switch private space" className="bg-[var(--background)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.label} ({space.partnerName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Link
              href="/home"
              className="flex min-h-10 items-center justify-center rounded-[var(--ds-radius)] border border-dashed border-[var(--border)] bg-[var(--background)] px-3 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              + Create private space
            </Link>
          )}

          {addingSpace && onCreateSpace && (
            <form onSubmit={handleAddSpaceSubmit} className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newSpaceLabel}
                onChange={(e) => setNewSpaceLabel(e.target.value)}
                placeholder="Space name..."
                className="flex-1 min-w-0 h-8 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newSpaceLabel.trim()}
                className="h-8 rounded-[var(--ds-radius)] bg-[var(--primary)] px-2.5 text-xs font-medium text-[var(--primary-foreground)] disabled:opacity-50 cursor-pointer"
              >
                Add
              </button>
            </form>
          )}

          {isLocalSandbox && onSwitchDemoActor && (
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)]/80 p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Sandbox perspective
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-[var(--ds-radius)] bg-[var(--muted)]/60 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => onSwitchDemoActor("self")}
                  aria-pressed={demoActor === "self"}
                  className={cn(
                    "rounded-[calc(var(--ds-radius)-2px)] py-1 font-medium transition-colors cursor-pointer",
                    demoActor === "self"
                      ? "bg-[var(--background)] text-[var(--foreground)] shadow-xs"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  You
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchDemoActor("partner")}
                  aria-pressed={demoActor === "partner"}
                  className={cn(
                    "rounded-[calc(var(--ds-radius)-2px)] py-1 font-medium transition-colors cursor-pointer",
                    demoActor === "partner"
                      ? "bg-[var(--background)] text-[var(--foreground)] shadow-xs"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  Partner
                </button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <nav aria-label="Private sanctuary navigation" className="flex-1 p-3 space-y-1">
          <Link
            href="/home"
            aria-current={pathname === "/home" ? "page" : undefined}
            className={cn(
              "flex w-full min-h-11 items-center gap-3 rounded-[var(--ds-radius)] px-3.5 py-2 text-sm font-semibold mb-1 transition-colors",
              pathname === "/home"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--foreground)] hover:bg-[var(--muted)]",
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Sanctuary Home</span>
          </Link>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname !== "/home" &&
              !pathname.startsWith("/calls") &&
              resolvedSection === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onSelectSection?.(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full min-h-11 items-center gap-3 rounded-[var(--ds-radius)] px-3.5 py-2 text-sm font-medium cursor-pointer transition-colors",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <Link
            href="/calls"
            aria-current={pathname.startsWith("/calls") ? "page" : undefined}
            className={cn(
              "flex w-full min-h-11 items-center gap-3 rounded-[var(--ds-radius)] px-3.5 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/calls")
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden={true} />
            <span>Calls</span>
          </Link>
        </nav>

        <Separator />

        <div className="p-3 space-y-1">
          <Link
            href="/settings/appearance"
            onClick={() => onSelectSection?.("settings")}
            aria-current={pathname.startsWith("/settings/appearance") ? "page" : undefined}
            className={cn(
              "flex w-full min-h-10 items-center gap-3 rounded-[var(--ds-radius)] px-3.5 py-2 text-sm font-medium cursor-pointer transition-colors",
              pathname.startsWith("/settings/appearance")
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden={true} />
            <span>Appearance</span>
          </Link>
          <Link
            href="/settings/notifications"
            aria-current={pathname.startsWith("/settings/notifications") ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-[var(--ds-radius)] px-3.5 text-xs transition-colors",
              pathname.startsWith("/settings/notifications")
                ? "bg-[var(--primary)]/12 font-medium text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Notifications</span>
          </Link>
          <Link
            href="/settings/account"
            aria-current={pathname.startsWith("/settings/account") ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center justify-between rounded-[var(--ds-radius)] px-3.5 text-xs transition-colors",
              pathname.startsWith("/settings/account")
                ? "bg-[var(--primary)]/12 font-medium text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <span>Account &amp; Security</span>
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="flex min-h-10 items-center gap-3 rounded-[var(--ds-radius)] px-3.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Commonplace Reader</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)]/92 px-4 sm:px-6 backdrop-blur-xs">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--ds-font-display)] text-lg sm:text-xl font-semibold truncate text-[var(--foreground)]">
              {headerTitle ?? activeSpace?.partnerName ?? "Sanctuary"}
            </h1>
            {headerSubtitle && (
              <p className="text-xs text-[var(--muted-foreground)] truncate">{headerSubtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isLocalSandbox && onSwitchDemoActor && (
              <button
                type="button"
                onClick={() => onSwitchDemoActor(demoActor === "self" ? "partner" : "self")}
                title="Toggle local perspective between You and Partner"
                className="lg:hidden inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] cursor-pointer"
              >
                <Users className="h-3 w-3 text-[var(--primary)]" />
                <span>{demoActor === "self" ? "You" : "Partner"}</span>
              </button>
            )}
            <Link
              href="/home"
              aria-label="Sanctuary Home"
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--ds-radius)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <Sparkles className="h-4 w-4" />
            </Link>
            <Link
              href="/calls"
              aria-label="Voice & Video Calls"
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--ds-radius)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <Phone className="h-4 w-4" />
            </Link>
            <Link
              href="/settings/appearance"
              aria-label="Settings"
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--ds-radius)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <Settings className="h-4 w-4" />
            </Link>
            {activeSpace && (
              <div className="lg:hidden">
                <Select value={activeSpace.id} onValueChange={onSwitchSpace}>
                  <SelectTrigger aria-label="Switch private space" className="h-9 max-w-[125px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {headerActions}
          </div>
        </header>

        <main
          id="sanctuary-main"
          tabIndex={-1}
          className="flex-1 pb-24 lg:pb-6"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (<1024px, <=5 top-level destinations + safe area) */}
      <nav
        aria-label="Mobile sanctuary navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname !== "/home" &&
              !pathname.startsWith("/calls") &&
              resolvedSection === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onSelectSection?.(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-h-11 text-[11px] font-medium cursor-pointer transition-colors",
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden={true} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

