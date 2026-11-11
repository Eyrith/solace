"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookMarked, Check, Moon, ShieldAlert, Sun } from "lucide-react";
import {
  BUBBLE_STYLES,
  CHAT_BACKGROUNDS,
  DENSITY_VALUES,
  FONT_PAIRINGS,
  FONT_SCALE_VALUES,
  PALETTES,
  type BubbleStyleId,
  type ChatBackgroundId,
  type DensityId,
  type FontPairingId,
  type FontScaleId,
} from "@/lib/design-system/tokens";
import { useDesignSystem } from "@/components/providers/design-system-provider";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorSummary, FormField, type ErrorSummaryItem } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatStreamSkeleton, EditorialCardSkeleton } from "@/components/ui/skeleton";
import { StatusBanner } from "@/components/ui/status-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ArticleCard, type EditorialArticle } from "@/components/editorial/article-card";
import { ChatBubble } from "@/components/sanctuary/chat-bubble";
import { TypingIndicator } from "@/components/sanctuary/typing-indicator";
import { cn } from "@/lib/utils";

const SAMPLE_ARTICLE: EditorialArticle = {
  id: "art-1",
  title: "The Architecture of Shared Solitude",
  author: "Dr. Clara Lindqvist",
  publication: "Psyche",
  publishedAt: "2026-10-18",
  description:
    "Why cultivating unhurried silence alongside another person deepens emotional safety and intellectual curiosity.",
  originalUrl: "https://psyche.co",
  category: "Psychology",
  readingDurationMinutes: 8,
};

export default function DesignSystemWorkbenchPage() {
  const ds = useDesignSystem();
  const { notify } = useToast();

  const [isLoadingBtn, setIsLoadingBtn] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [savedArticle, setSavedArticle] = React.useState(false);

  // Form validation state demo
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<ErrorSummaryItem[]>([]);
  const errorSummaryRef = React.useRef<HTMLDivElement | null>(null);

  const handleLoadingTest = () => {
    setIsLoadingBtn(true);
    setTimeout(() => {
      setIsLoadingBtn(false);
      notify({
        title: "Changes saved",
        description: "Appearance preferences updated cleanly.",
        tone: "success",
      });
    }, 900);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: ErrorSummaryItem[] = [];
    if (!email.includes("@") || !email.includes(".")) {
      errs.push({ fieldId: "ds-demo-email", message: "Enter a valid email address." });
    }
    if (note.trim().length < 8) {
      errs.push({ fieldId: "ds-demo-note", message: "Write at least 8 characters in your note." });
    }
    setFormErrors(errs);
    if (errs.length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
    } else {
      notify({ title: "Invitation ready", tone: "success" });
    }
  };

  const fieldError = (id: string) => formErrors.find((e) => e.fieldId === id)?.message;

  const activePaletteMeta = PALETTES.find((p) => p.id === ds.palette) ?? PALETTES[0];

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {/* Top Workbench Control Bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Index</span>
              </Link>
            </Button>
            <span className="text-sm font-medium hidden sm:inline">
              Design System Workbench · {activePaletteMeta.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={ds.toggleMode}
              aria-label={`Switch to ${ds.mode === "light" ? "dark" : "light"} mode`}
            >
              {ds.mode === "light" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{ds.mode === "light" ? "Light" : "Dark"}</span>
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => ds.resetDefaults()}
            >
              Reset defaults
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* 1. Theme, Typography & Density Controls */}
        <section aria-labelledby="workbench-controls-heading" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1
                id="workbench-controls-heading"
                className="font-[family-name:var(--ds-font-display)] text-3xl sm:text-4xl font-semibold tracking-tight"
              >
                Tokens, Palettes & Typography
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Every theme switches CSS variables live and enforces WCAG 2.1 AA contrast across Light and Dark modes.
              </p>
            </div>
            <Badge variant="neutral" className="self-start sm:self-auto tabular-nums">
              Contrast: {activePaletteMeta.contrastNote}
            </Badge>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PALETTES.map((palette) => {
              const selected = ds.palette === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => {
                    ds.setEnvironment(palette.environment === "public" ? "editorial" : "private");
                    ds.setPalette(palette.id);
                  }}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-[var(--ds-radius)] border p-3.5 text-left cursor-pointer transition-colors",
                    selected
                      ? "border-[var(--primary)] bg-[var(--card)] ring-1 ring-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--card)]/70 hover:bg-[var(--card)]",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-4 w-4 rounded-full border border-black/15"
                        style={{ backgroundColor: palette.lightSwatch }}
                        aria-hidden="true"
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-white/20"
                        style={{ backgroundColor: palette.darkSwatch }}
                        aria-hidden="true"
                      />
                    </span>
                    {selected && <Check className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{palette.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)] capitalize">
                      {palette.environment}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Typography, Scale, Density, Bubble & Motion Controls */}
          <Card>
            <CardContent className="pt-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ctl-font-pairing">Typography pairing</Label>
                <Select
                  value={ds.fontPairing}
                  onValueChange={(v) => ds.setFontPairing(v as FontPairingId)}
                >
                  <SelectTrigger id="ctl-font-pairing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_PAIRINGS.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ctl-font-scale">Font scale</Label>
                <Select
                  value={ds.fontScale}
                  onValueChange={(v) => ds.setFontScale(v as FontScaleId)}
                >
                  <SelectTrigger id="ctl-font-scale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FONT_SCALE_VALUES).map(([id, item]) => (
                      <SelectItem key={id} value={id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ctl-density">Interface density</Label>
                <Select
                  value={ds.density}
                  onValueChange={(v) => ds.setDensity(v as DensityId)}
                >
                  <SelectTrigger id="ctl-density">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DENSITY_VALUES).map(([id, item]) => (
                      <SelectItem key={id} value={id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ctl-bubble">Chat bubble style</Label>
                <Select
                  value={ds.bubbleStyle}
                  onValueChange={(v) => ds.setBubbleStyle(v as BubbleStyleId)}
                >
                  <SelectTrigger id="ctl-bubble">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUBBLE_STYLES.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ctl-chat-bg">Chat background</Label>
                <Select
                  value={ds.chatBackground}
                  onValueChange={(v) => ds.setChatBackground(v as ChatBackgroundId)}
                >
                  <SelectTrigger id="ctl-chat-bg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAT_BACKGROUNDS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 lg:col-span-5 flex flex-wrap items-center gap-6 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Switch
                    id="ctl-reduced-motion"
                    checked={ds.reducedMotion}
                    onCheckedChange={ds.setReducedMotion}
                  />
                  <Label htmlFor="ctl-reduced-motion">Reduce animations</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="ctl-discreet"
                    checked={ds.discreetNotifications}
                    onCheckedChange={ds.setDiscreetNotifications}
                  />
                  <Label htmlFor="ctl-discreet">Discreet notification previews</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 2. Typography Scale Specimen */}
        <section aria-labelledby="type-specimen-heading" className="space-y-4">
          <h2
            id="type-specimen-heading"
            className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold"
          >
            Typography & Reading Measure
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="font-[family-name:var(--ds-font-display)] text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
                On Quiet Attention and Durable Intimacy
              </p>
              <p className="font-[family-name:var(--ds-font-display)] text-2xl font-medium">
                Heading Level Two · 24px / 1.25
              </p>
              <p className="text-base leading-relaxed max-w-[68ch]">
                Body copy holds a strict maximum line length of 68 characters (`max-w-[68ch]`) at a
                16px minimum floor on mobile viewports, balancing line height (`1.55–1.65`) for
                effortless reading across both editorial abstracts and digital letters.
              </p>
              <p className="text-sm text-[var(--muted-foreground)] tabular-nums">
                Secondary metadata (14px) · Expiration countdown 04:58 · 2026-11-11
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 3. Buttons, Dialogs & Modals */}
        <section aria-labelledby="buttons-modals-heading" className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle id="buttons-modals-heading">Buttons & Interactive Dialogs</CardTitle>
              <CardDescription>
                Six semantic variants, loading width stability, keyboard-trapped modals, and safe
                destructive confirmation separation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2.5">
                <Button variant="primary">Save changes</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="subtle">Subtle</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                  Delete space
                </Button>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[var(--border)]">
                <Button
                  variant="primary"
                  isLoading={isLoadingBtn}
                  loadingText="Saving preferences..."
                  onClick={handleLoadingTest}
                >
                  Test async loading & toast
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open standard modal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disappearing message policy</DialogTitle>
                      <DialogDescription>
                        Timers run on authoritative server timestamps. Screenshots or screen
                        recordings on a recipient device cannot be technically prevented.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="primary">Understood</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                variant="destructive"
                title="Permanently delete this space?"
                description="Shared messages, media, and games in this space will be erased. Your personal private notes remain intact."
                confirmLabel="Delete space"
                cancelLabel="Keep space"
                onConfirm={() => {
                  setConfirmOpen(false);
                  notify({ title: "Confirmation dialog verified", tone: "default" });
                }}
              />
            </CardContent>
          </Card>

          {/* 4. Forms & Accessible Error Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Inputs, Password Toggle & Validation</CardTitle>
              <CardDescription>
                Explicit labels, helper text, blur-safe validation, and focusable error summaries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
                <ErrorSummary errors={formErrors} summaryRef={errorSummaryRef} />

                <FormField
                  id="ds-demo-email"
                  label="Partner email"
                  required
                  helperText="Invitation expires automatically in 48 hours."
                  error={fieldError("ds-demo-email")}
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      type="email"
                      autoComplete="email"
                      placeholder="partner@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </FormField>

                <FormField id="ds-demo-pass" label="Passphrase">
                  {(fieldProps) => (
                    <PasswordInput
                      {...fieldProps}
                      autoComplete="new-password"
                      placeholder="Enter passphrase"
                    />
                  )}
                </FormField>

                <FormField
                  id="ds-demo-note"
                  label="Personal invitation note"
                  required
                  error={fieldError("ds-demo-note")}
                >
                  {(fieldProps) => (
                    <Textarea
                      {...fieldProps}
                      placeholder="Write a brief welcoming note..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  )}
                </FormField>

                <Button type="submit" variant="primary">
                  Validate & send invite
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* 5. Dual-Environment Specimens: Editorial Card & Messaging Bubbles */}
        <section aria-labelledby="dual-specimen-heading" className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2
              id="dual-specimen-heading"
              className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold"
            >
              Experience A · Editorial Article Card
            </h2>
            <ArticleCard
              article={SAMPLE_ARTICLE}
              variant="standard"
              isSaved={savedArticle}
              onToggleSave={() => setSavedArticle((prev) => !prev)}
            />
          </div>

          <div className="space-y-3">
            <h2 className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold">
              Experience B · Private Messaging & Voice Note
            </h2>
            <div
              className={cn(
                "rounded-[var(--ds-radius)] border border-[var(--border)] p-4 sm:p-5 space-y-3",
                ds.chatBackground === "linen"
                  ? "chat-bg-linen"
                  : ds.chatBackground === "botanical"
                    ? "chat-bg-botanical"
                    : "chat-bg-solid",
              )}
            >
              <ChatBubble
                id="m-1"
                direction="received"
                bubbleStyle={ds.bubbleStyle}
                text="Have you had a chance to read the Psyche piece on shared solitude yet?"
                timestamp="20:14"
              />
              <ChatBubble
                id="m-2"
                direction="sent"
                bubbleStyle={ds.bubbleStyle}
                replyPreview="Have you had a chance to read the Psyche piece..."
                text="Just finished it—here is a quick thought before dinner."
                voiceDurationSeconds={28}
                edited
                readReceipt="read"
                disappearingLabel="5m · 04:42"
                timestamp="20:16"
                reactions={[{ emoji: "♥", count: 1, reactedByMe: true }]}
              />
              <TypingIndicator partnerName="Avery" />
            </div>
          </div>
        </section>

        {/* 6. Loading, Error & Empty States */}
        <section aria-labelledby="states-heading" className="space-y-5">
          <h2
            id="states-heading"
            className="font-[family-name:var(--ds-font-display)] text-2xl font-semibold"
          >
            Loading, Error & Empty States
          </h2>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <EditorialCardSkeleton />
              <Card className="p-5">
                <ChatStreamSkeleton />
              </Card>
            </div>

            <div className="space-y-4">
              <StatusBanner
                tone="error"
                title="Unable to verify microphone permission"
                description="Grant audio permission in your browser settings to record a voice note."
                actionLabel="Retry mic check"
                onAction={() => notify({ title: "Microphone permission check requested" })}
              />
              <StatusBanner
                tone="warning"
                title="Reconnecting to private channel"
                description="Unsent messages will deliver automatically as soon as connectivity returns."
              />
              <StatusBanner
                tone="success"
                title="Disappearing message cleanup completed"
                description="Expired attachments were removed from private storage."
              />
              <EmptyState
                icon={BookMarked}
                title="No saved essays yet"
                description="Bookmark essays from Psychology, Philosophy, or Science to build your personal reading shelf."
                actionLabel="Explore curated essays"
                onAction={() => notify({ title: "Navigates to Discover" })}
              />
            </div>
          </div>

          <StatusBanner
            tone="info"
            title="Division 02 Design System Boundary"
            description="Individual application feature pages (auth, live messaging backend, games, calling) are intentionally deferred to subsequent divisions."
          />
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            <span>Zero backend secrets or user records are loaded in these design system previews.</span>
          </div>
        </section>
      </main>
    </div>
  );
}

