import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names deterministically without specificity conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates that a redirect target is a safe same-origin relative path.
 * Blocks protocol-relative URLs (`//evil.com`), backslashes, and absolute URLs.
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.includes("\\")) {
    return fallback;
  }
  if (/[\r\n\0]/.test(trimmed)) return fallback;
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Returns non-negative calendar days remaining until a `YYYY-MM-DD` date.
 * When `annual` is true, computes days until the next annual recurrence.
 */
export function daysUntilDate(dateStr: string, annual = false): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  let target: Date;
  if (match) {
    target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  } else {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 0;
    target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (annual) {
    let next = new Date(today.getFullYear(), target.getMonth(), target.getDate());
    if (next.getTime() < today.getTime()) {
      next = new Date(today.getFullYear() + 1, target.getMonth(), target.getDate());
    }
    return Math.max(0, Math.round((next.getTime() - today.getTime()) / 86_400_000));
  }

  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000));
}

