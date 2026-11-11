"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  notify: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Accessible non-focus-stealing toast region (aria-live="polite") auto-dismissing after 4s.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-2), { ...toast, id }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {items.map((item) => {
          const Icon =
            item.tone === "success"
              ? CheckCircle2
              : item.tone === "error"
                ? AlertCircle
                : Info;

          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start justify-between gap-3 rounded-[var(--ds-radius)]",
                "border border-[var(--border)] bg-[var(--card)] p-3.5 text-[var(--foreground)] shadow-lg",
              )}
            >
              <div className="flex items-start gap-2.5">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 mt-0.5",
                    item.tone === "error"
                      ? "text-[var(--destructive)]"
                      : item.tone === "success"
                        ? "text-[var(--success)]"
                        : "text-[var(--primary)]",
                  )}
                  aria-hidden="true"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return ctx;
}

