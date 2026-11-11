"use client";

import * as React from "react";
import { Check, CheckCheck, Clock, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BubbleStyleId } from "@/lib/design-system/tokens";
import { VoiceNotePlayer } from "@/components/sanctuary/voice-note-player";

export interface BubbleReaction {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

export interface ChatBubbleProps {
  id: string;
  direction: "sent" | "received";
  text?: string;
  timestamp: string;
  bubbleStyle?: BubbleStyleId;
  replyPreview?: string;
  voiceDurationSeconds?: number;
  edited?: boolean;
  readReceipt?: "sent" | "delivered" | "read";
  disappearingLabel?: string;
  reactions?: BubbleReaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  className?: string;
}

function getBubbleClasses(direction: "sent" | "received", style: BubbleStyleId): string {
  const isSent = direction === "sent";

  if (style === "minimal") {
    return cn(
      "rounded-none bg-transparent text-[var(--foreground)] py-1",
      isSent
        ? "border-r-2 border-[var(--primary)] pr-3.5 text-right"
        : "border-l-2 border-[var(--border)] pl-3.5 text-left",
    );
  }

  const baseColor = isSent
    ? "bg-[var(--bubble-sent)] text-[var(--bubble-sent-foreground)]"
    : "bg-[var(--bubble-received)] text-[var(--bubble-received-foreground)] border border-[var(--border)]";

  if (style === "editorial") {
    return cn(baseColor, "rounded-md");
  }

  if (style === "pill") {
    return cn(baseColor, isSent ? "rounded-3xl rounded-br-md" : "rounded-3xl rounded-bl-md");
  }

  return cn(baseColor, isSent ? "rounded-2xl rounded-br-xs" : "rounded-2xl rounded-bl-xs");
}

/**
 * Reusable private messaging bubble supporting 4 visual styles, reply quotes,
 * embedded voice notes, accessible reactions, read receipts, and disappearing countdowns.
 */
export function ChatBubble({
  id,
  direction,
  text,
  timestamp,
  bubbleStyle = "soft",
  replyPreview,
  voiceDurationSeconds,
  edited = false,
  readReceipt,
  disappearingLabel,
  reactions = [],
  onToggleReaction,
  onReply,
  className,
}: ChatBubbleProps) {
  const isSent = direction === "sent";

  return (
    <div
      className={cn(
        "group flex flex-col gap-1",
        isSent ? "items-end" : "items-start",
        className,
      )}
    >
      <div className={cn("max-w-[85%] sm:max-w-[74%] flex items-end gap-1.5", isSent && "flex-row-reverse")}>
        <div
          className={cn(
            "px-4 py-2.5 space-y-2 transition-colors",
            getBubbleClasses(direction, bubbleStyle),
          )}
        >
          {replyPreview && (
            <div
              className={cn(
                "text-xs leading-snug border-l-2 pl-2.5 py-0.5 opacity-85 line-clamp-2",
                isSent && bubbleStyle !== "minimal" ? "border-current/60" : "border-[var(--primary)]",
              )}
            >
              {replyPreview}
            </div>
          )}

          {text && (
            <p className="text-[15px] leading-relaxed wrap-anywhere whitespace-pre-wrap">{text}</p>
          )}

          {typeof voiceDurationSeconds === "number" && (
            <VoiceNotePlayer durationSeconds={voiceDurationSeconds} isSent={isSent && bubbleStyle !== "minimal"} />
          )}

          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-[11px] tabular-nums",
              isSent && bubbleStyle !== "minimal"
                ? "justify-end opacity-80"
                : "text-[var(--muted-foreground)]",
            )}
          >
            {disappearingLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 font-medium">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>{disappearingLabel}</span>
              </span>
            )}

            {edited && <span>Edited</span>}
            <time>{timestamp}</time>

            {isSent && readReceipt && (
              <span
                className="inline-flex items-center"
                aria-label={`Message ${readReceipt}`}
                title={`Message ${readReceipt}`}
              >
                {readReceipt === "read" ? (
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
            )}
          </div>
        </div>

        {onReply && (
          <button
            type="button"
            onClick={() => onReply(id)}
            aria-label="Reply to message"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-opacity"
          >
            <Reply className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {reactions.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5 px-1", isSent ? "justify-end" : "justify-start")}>
          {reactions.map((item) => (
            <button
              key={item.emoji}
              type="button"
              onClick={() => onToggleReaction?.(id, item.emoji)}
              aria-pressed={item.reactedByMe}
              aria-label={`Reaction ${item.emoji}, ${item.count}`}
              className={cn(
                "inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-xs cursor-pointer transition-colors",
                item.reactedByMe
                  ? "border-[var(--primary)] bg-[var(--muted)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              <span aria-hidden="true">{item.emoji}</span>
              <span className="tabular-nums">{item.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

