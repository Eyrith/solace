"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useDesignSystem } from "@/components/providers/design-system-provider";

export interface TypingIndicatorProps {
  partnerName: string;
}

/**
 * Calm typing indicator respecting reduced-motion preferences and live screen reader announcements.
 */
export function TypingIndicator({ partnerName }: TypingIndicatorProps) {
  const { reducedMotion } = useDesignSystem();

  return (
    <div
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bubble-received)] px-3.5 py-2 text-xs text-[var(--muted-foreground)]"
    >
      <span className="sr-only">{partnerName} is typing</span>
      <span aria-hidden="true">{partnerName} is writing</span>
      {reducedMotion ? (
        <span aria-hidden="true">...</span>
      ) : (
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-current"
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: index * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

