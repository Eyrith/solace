"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Gamepad2,
  Home,
  Lock,
  MessageCircle,
  MessageSquareQuote,
  Phone,
  Plus,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDecoyAlias } from "@/lib/sanctuary/stealth";

export { getDecoyAlias };

export interface PrivateSpaceSummary {
  id: string;
  label: string;
  partnerName: string;
  isPaired?: boolean;
  camouflageAlias?: string;
  burnTimer?: string;
}

export type SanctuarySection =
  | "home"
  | "messages"
  | "questions"
  | "games"
  | "shared"
  | "journal"
  | "calls"
  | "settings";

export interface PrivateShellProps {
  children: React.ReactNode;
  activeSection?: SanctuarySection;
  onSelectSection?: (section: SanctuarySection) => void;
  spaces?: PrivateSpaceSummary[];
  activeSpaceId?: string;
  onSwitchSpace?: (spaceId: string) => void;
  onCreateSpace?: (
    name: string,
    partnerName?: string,
    camouflageAlias?: string,
    burnTimer?: string
  ) => void | Promise<void>;
  onGenerateInvite?: (spaceId?: string) => Promise<{ inviteUrl: string }> | void;
  isLocalSandbox?: boolean;
  demoActor?: "self" | "partner";
  onSwitchDemoActor?: (actor: "self" | "partner") => void;
  headerTitle?: string;
  headerSubtitle?: string;
  headerActions?: React.ReactNode;
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const BURN_TIMER_OPTIONS = [
  { id: "off", label: "Keep History" },
  { id: "just_seen", label: "Once Seen" },
  { id: "1h", label: "1 Hour" },
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" },
];

function inferSection(pathname: string): SanctuarySection {
  if (pathname === "/home") return "home";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/questions")) return "questions";
  if (pathname.startsWith("/memories")) return "shared";
  if (pathname.startsWith("/calls")) return "calls";
  if (pathname.startsWith("/games")) return "games";
  if (pathname.startsWith("/calendar")) return "journal";
  if (pathname.startsWith("/settings")) return "settings";
  return "home";
}

function derivePageTitle(pathname: string, explicitTitle?: string): string {
  if (explicitTitle) return explicitTitle;
  if (pathname === "/home") return "Today";
  if (pathname.startsWith("/messages")) return "Conversation";
  if (pathname.startsWith("/questions")) return "Daily Prompts";
  if (pathname.startsWith("/memories")) return "Shared Vault";
  if (pathname.startsWith("/calls")) return "Calls";
  if (pathname.startsWith("/games")) return "Shared Moments";
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Sanctuary";
}

export function PrivateShell({
  children,
  activeSection,
  onSelectSection,
  spaces = [],
  activeSpaceId,
  onSwitchSpace,
  onCreateSpace,
  onGenerateInvite,
  isLocalSandbox = false,
  demoActor = "self",
  onSwitchDemoActor,
  headerTitle,
  headerSubtitle,
  headerActions,
}: PrivateShellProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const resolvedSection = activeSection ?? inferSection(pathname);
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) ?? spaces[0] ?? null;
  const messagesHref = "/messages";

  // Modal Dialog for Inviting Partner
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);

  const handleOpenInvite = async () => {
    setDialogOpen(true);
    setIsSubmitting(true);
    try {
      if (onGenerateInvite) {
        const res = await onGenerateInvite(activeSpace?.id);
        if (res && res.inviteUrl) {
          setInviteUrl(res.inviteUrl);
          return;
        }
      }
      const fallbackToken = `sol-${Math.random().toString(36).slice(2, 9)}`;
      const base = typeof window !== "undefined" ? window.location.origin : "";
      setInviteUrl(`${base}/invite/${fallbackToken}`);
    } catch {
      const fallbackToken = `sol-${Math.random().toString(36).slice(2, 9)}`;
      const base = typeof window !== "undefined" ? window.location.origin : "";
      setInviteUrl(`${base}/invite/${fallbackToken}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInvite = async (text?: string) => {
    const toCopy = text || inviteUrl;
    if (!toCopy || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(toCopy);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2200);
  };

  const activePartnerName = activeSpace?.partnerName || "Partner";
  const activeInitials = getInitials(activePartnerName);

  const DESKTOP_NAV = [
    { id: "home" as const, label: "Bedtime Home", href: "/home", icon: Home },
    { id: "messages" as const, label: "Chat & Whispers", href: messagesHref, icon: MessageCircle },
    { id: "games" as const, label: "Kulfi Games", href: "/games", icon: Gamepad2 },
    { id: "questions" as const, label: "Daily Prompts", href: "/questions", icon: MessageSquareQuote },
    { id: "calls" as const, label: "FaceTime & Call", href: "/calls", icon: Phone },
    { id: "shared" as const, label: "Shared Memories", href: "/memories", icon: Sparkles },
    { id: "journal" as const, label: "Couples Calendar", href: "/calendar", icon: Calendar },
  ];

  const MOBILE_NAV = [
    { id: "home" as const, label: "Home", href: "/home", icon: Home },
    { id: "messages" as const, label: "Chat", href: messagesHref, icon: MessageCircle },
    { id: "games" as const, label: "Games", href: "/games", icon: Gamepad2 },
    { id: "questions" as const, label: "Prompts", href: "/questions", icon: MessageSquareQuote },
    { id: "calls" as const, label: "Calls", href: "/calls", icon: Phone },
  ];

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#sanctuary-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--ds-radius)] focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--primary-foreground)]"
      >
        Skip to content
      </a>

      {/* ── Invite Partner Dialog ────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setCopiedLink(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--ds-radius)] bg-[var(--surface-2)] text-[var(--primary)] shrink-0">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle>Invite Your Partner</DialogTitle>
                <DialogDescription className="mt-1">
                  Share this private link. Once your partner opens it on their device, you will be connected directly in this sanctuary.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  Private Invite Link
                </span>
                <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                  Single-use
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-xs font-mono break-all select-all">
                {isSubmitting ? 'Generating invite link...' : (inviteUrl || 'Loading...')}
              </div>

              <Button
                type="button"
                disabled={isSubmitting || !inviteUrl}
                onClick={() => handleCopyInvite(inviteUrl ?? undefined)}
                className="w-full"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    <span>Copy Invite Link</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Desktop Sidebar (264px) ───────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[264px] lg:shrink-0 lg:flex-col border-r border-[var(--border)] bg-[var(--surface-1)]">
        {/* Wordmark & Kulfi Brand Capsule */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
          <Link
            href="/home"
            className="group flex items-center gap-2.5 font-[family-name:var(--ds-font-display)] text-lg font-bold tracking-tight text-[var(--foreground)] hover:opacity-90 transition-opacity"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)] text-base shadow-xs group-hover:scale-105 transition-transform">
              🍨
            </span>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span>Kulfi</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  For Two
                </span>
              </div>
              <span className="text-[11px] font-normal text-[var(--muted-foreground)]">
                Bedtime Sanctuary
              </span>
            </div>
          </Link>
        </div>

        {/* Partner Status & Interlocking Avatars */}
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between p-2.5 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-0)] shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex -space-x-2 shrink-0">
                <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[11px] font-bold ring-2 ring-[var(--surface-0)] shadow-xs">
                  Y
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--secondary)] text-white text-[11px] font-bold ring-2 ring-[var(--surface-0)] shadow-xs">
                  {activeInitials}
                </span>
              </div>
              <div className="truncate">
                <div className="truncate text-xs font-semibold text-[var(--foreground)]">
                  You &amp; {activePartnerName}
                </div>
                <div className="truncate text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Bedtime sync active</span>
                </div>
              </div>
            </div>

            {activeSpace?.isPaired === false || activeSpace?.partnerName === 'Partner pending' ? (
              <button
                type="button"
                onClick={handleOpenInvite}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline p-1 cursor-pointer"
                title="Invite Partner"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invite</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Primary Navigation */}
        <nav aria-label="Sanctuary primary navigation" className="flex-1 p-3 space-y-1">
          {DESKTOP_NAV.map((item) => {
            const Icon = item.icon;
            const active = resolvedSection === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onSelectSection?.(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full min-h-[44px] items-center gap-3 rounded-full px-3.5 text-sm transition-all cursor-pointer",
                  active
                    ? "bg-[var(--primary)]/15 text-[var(--primary)] font-semibold shadow-xs"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings at Bottom */}
        <div className="p-3 border-t border-[var(--border)] space-y-1">
          <Link
            href="/settings/appearance"
            onClick={() => onSelectSection?.("settings")}
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className={cn(
              "flex w-full min-h-[44px] items-center gap-3 rounded-full px-3.5 text-sm transition-all cursor-pointer",
              pathname.startsWith("/settings")
                ? "bg-[var(--primary)]/15 text-[var(--primary)] font-semibold shadow-xs"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* ── Main Column ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar (56px) (<1024px) */}
        <header className="lg:hidden sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-4">
          <Link href="/home" className="flex items-center gap-2 min-w-0">
            <div className="flex -space-x-1.5 shrink-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[10px] font-bold ring-2 ring-[var(--surface-1)]">
                Y
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--secondary)] text-white text-[10px] font-bold ring-2 ring-[var(--surface-1)]">
                {activeInitials}
              </span>
            </div>
            <div className="truncate flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--foreground)] truncate">
                {activePartnerName}
              </span>
              <span className="text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
                Kulfi
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {activeSpace?.isPaired === false || activeSpace?.partnerName === 'Partner pending' ? (
              <button
                type="button"
                onClick={handleOpenInvite}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)] border border-[var(--border)] transition-colors cursor-pointer"
                title="Invite Partner"
                aria-label="Invite Partner"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Invite</span>
              </button>
            ) : null}
          </div>
        </header>

        {/* Desktop Header (56px) (>=1024px) */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-1)] px-6">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-[family-name:var(--ds-font-display)] text-lg font-semibold text-[var(--foreground)] truncate">
              {derivePageTitle(pathname, headerTitle)}
            </h1>
            {headerSubtitle && (
              <span className="text-xs text-[var(--muted-foreground)] truncate">
                · {headerSubtitle}
              </span>
            )}
          </div>

          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </header>

        <main
          id="sanctuary-main"
          tabIndex={-1}
          className={cn(
            "flex-1",
            pathname.startsWith("/messages")
              ? "flex flex-col min-h-0 pb-16 lg:pb-0 overflow-hidden"
              : "pb-20 lg:pb-8",
          )}
        >
          {children}
        </main>
      </div>

      {/* ── Mobile Fixed Five-Item Bottom Navigation (<1024px) ─────────── */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--surface-1)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === "home"
                ? pathname === "/home"
                : resolvedSection === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onSelectSection?.(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer transition-colors min-h-[48px]",
                  active
                    ? "text-[var(--primary)] font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
