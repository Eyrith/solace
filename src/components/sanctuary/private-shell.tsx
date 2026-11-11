"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookHeart,
  ChevronDown,
  Gamepad2,
  HelpCircle,
  Lock,
  MessageCircle,
  Settings,
  Sparkles,
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
  headerTitle?: string;
  headerSubtitle?: string;
  headerActions?: React.ReactNode;
}

const PRIMARY_NAV: readonly {
  id: SanctuarySection;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}[] = [
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "questions", label: "Questions", icon: HelpCircle },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "shared", label: "Shared", icon: Sparkles },
  { id: "journal", label: "Journal", icon: BookHeart },
];

const DEFAULT_SPACES: PrivateSpaceSummary[] = [
  { id: "space-1", label: "Evening Sanctuary", partnerName: "Avery" },
  { id: "space-2", label: "Weekend Archive", partnerName: "Jordan" },
];

/**
 * Experience B (Private Application) adaptive layout shell.
 * Renders a calm sidebar on desktop (>=1024px) and a 5-destination mobile bottom bar (<1024px)
 * with clear space switching and separated settings/security actions.
 */
export function PrivateShell({
  children,
  activeSection = "messages",
  onSelectSection,
  spaces = DEFAULT_SPACES,
  activeSpaceId = DEFAULT_SPACES[0].id,
  onSwitchSpace,
  headerTitle,
  headerSubtitle,
  headerActions,
}: PrivateShellProps) {
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) ?? spaces[0];

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
          </div>

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
        </div>

        <Separator />

        <nav aria-label="Private sanctuary navigation" className="flex-1 p-3 space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
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
              </button>
            );
          })}
        </nav>

        <Separator />

        <div className="p-3 space-y-1">
          <button
            type="button"
            onClick={() => onSelectSection?.("settings")}
            aria-current={activeSection === "settings" ? "page" : undefined}
            className={cn(
              "flex w-full min-h-11 items-center gap-3 rounded-[var(--ds-radius)] px-3.5 py-2 text-sm font-medium cursor-pointer transition-colors",
              activeSection === "settings"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden={true} />
            <span>Appearance & Security</span>
          </button>
          <Link
            href="/design-system"
            className="flex min-h-10 items-center justify-between rounded-[var(--ds-radius)] px-3.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <span>Design System</span>
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" aria-hidden="true" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)]/92 px-4 sm:px-6 backdrop-blur-xs">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--ds-font-display)] text-lg sm:text-xl font-semibold truncate text-[var(--foreground)]">
              {headerTitle ?? activeSpace.partnerName}
            </h1>
            {headerSubtitle && (
              <p className="text-xs text-[var(--muted-foreground)] truncate">{headerSubtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="lg:hidden">
              <Select value={activeSpace.id} onValueChange={onSwitchSpace}>
                <SelectTrigger aria-label="Switch private space" className="h-10 max-w-[140px] text-xs">
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
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
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
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

