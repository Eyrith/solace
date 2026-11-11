"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type StatusTone = "error" | "warning" | "success" | "info";

export interface StatusBannerProps {
  tone: StatusTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const TONE_MAP: Record<
  StatusTone,
  {
    icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    borderClass: string;
    textClass: string;
    bgStyle: string;
    role: "alert" | "status";
  }
> = {
  error: {
    icon: AlertCircle,
    borderClass: "border-[var(--destructive)]",
    textClass: "text-[var(--destructive)]",
    bgStyle: "bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)]",
    role: "alert",
  },
  warning: {
    icon: AlertTriangle,
    borderClass: "border-[var(--warning)]",
    textClass: "text-[var(--foreground)]",
    bgStyle: "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)]",
    role: "status",
  },
  success: {
    icon: CheckCircle2,
    borderClass: "border-[var(--success)]",
    textClass: "text-[var(--success)]",
    bgStyle: "bg-[color-mix(in_srgb,var(--success)_9%,transparent)]",
    role: "status",
  },
  info: {
    icon: Info,
    borderClass: "border-[var(--border)]",
    textClass: "text-[var(--foreground)]",
    bgStyle: "bg-[var(--muted)]",
    role: "status",
  },
};

/**
 * Actionable feedback banner combining icon + semantic color + clear recovery CTA.
 */
export function StatusBanner({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: StatusBannerProps) {
  const cfg = TONE_MAP[tone];
  const Icon = cfg.icon;

  return (
    <div
      role={cfg.role}
      aria-live={cfg.role === "alert" ? "assertive" : "polite"}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--ds-radius)] border p-4",
        cfg.borderClass,
        cfg.bgStyle,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", cfg.textClass)} aria-hidden={true} />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
          {description && (
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {actionLabel && onAction && (
        <Button type="button" variant="outline" size="sm" onClick={onAction} className="shrink-0 self-start sm:self-center">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

