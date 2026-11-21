"use client";

import * as React from "react";
import { Check, CheckCheck, Clock, Download, FileText, Pencil, Pin, Reply, SmilePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BubbleStyleId } from "@/lib/design-system/tokens";
import { VoiceNotePlayer } from "@/components/sanctuary/voice-note-player";

export interface BubbleReaction {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
}

export interface BubbleAttachment {
  kind: "image" | "video" | "audio" | "file";
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  objectUrl?: string | null;
}

export interface ChatBubbleProps {
  id: string;
  direction: "sent" | "received";
  senderLabel?: string;
  text?: string;
  timestamp: string;
  bubbleStyle?: BubbleStyleId;
  replyPreview?: string;
  voiceDurationSeconds?: number;
  voiceSrc?: string;
  attachment?: BubbleAttachment;
  edited?: boolean;
  isPinned?: boolean;
  readReceipt?: "sent" | "delivered" | "read";
  disappearingLabel?: string;
  reactions?: BubbleReaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  className?: string;
}

const QUICK_EMOJIS = ["❤️", "🥰", "🫂", "🕊️", "✨"];

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

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Reusable private messaging bubble supporting 4 visual styles, reply quotes,
 * embedded voice notes, encrypted media previews, edit/delete/pin/reaction controls,
 * read receipts, and live disappearing countdowns.
 */
export function ChatBubble({
  id,
  direction,
  senderLabel,
  text,
  timestamp,
  bubbleStyle = "soft",
  replyPreview,
  voiceDurationSeconds,
  voiceSrc,
  attachment,
  edited = false,
  isPinned = false,
  readReceipt,
  disappearingLabel,
  reactions = [],
  onToggleReaction,
  onReply,
  onEdit,
  onDelete,
  onPin,
  className,
}: ChatBubbleProps) {
  const isSent = direction === "sent";
  const [pickerOpen, setPickerOpen] = React.useState(false);

  return (
    <div
      className={cn(
        "group flex flex-col gap-1",
        isSent ? "items-end" : "items-start",
        className,
      )}
    >
      {senderLabel && (
        <span className="px-1 text-[10px] font-medium text-[var(--muted-foreground)]">
          {senderLabel}
        </span>
      )}

      <div className={cn("max-w-[88%] sm:max-w-[74%] flex items-end gap-1.5", isSent && "flex-row-reverse")}>
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

          {attachment && (
            <div className="space-y-1.5">
              {attachment.kind === "image" && attachment.objectUrl ? (
                <a href={attachment.objectUrl} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.objectUrl}
                    alt={attachment.filename}
                    className="max-h-64 w-auto rounded-lg object-cover border border-black/10"
                  />
                </a>
              ) : attachment.kind === "video" && attachment.objectUrl ? (
                <video
                  controls
                  src={attachment.objectUrl}
                  className="max-h-64 w-full rounded-lg border border-black/10"
                />
              ) : attachment.kind !== "audio" ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-black/10 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{attachment.filename}</div>
                      {attachment.sizeBytes && (
                        <div className="text-[10px] opacity-75">{formatBytes(attachment.sizeBytes)}</div>
                      )}
                    </div>
                  </div>
                  {attachment.objectUrl && (
                    <a
                      href={attachment.objectUrl}
                      download={attachment.filename}
                      aria-label={`Download ${attachment.filename}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/15"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {text && (
            <p className="text-[15px] leading-relaxed wrap-anywhere whitespace-pre-wrap">{text}</p>
          )}

          {typeof voiceDurationSeconds === "number" && (
            <VoiceNotePlayer
              durationSeconds={voiceDurationSeconds}
              src={voiceSrc}
              isSent={isSent && bubbleStyle !== "minimal"}
            />
          )}

          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-[11px] tabular-nums",
              isSent && bubbleStyle !== "minimal"
                ? "justify-end opacity-80"
                : "text-[var(--muted-foreground)]",
            )}
          >
            {isPinned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium opacity-90">
                <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                <span>Pinned</span>
              </span>
            )}

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

        {(onReply || onToggleReaction || onEdit || onDelete || onPin) && (
          <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity shrink-0">
            {onToggleReaction && (
              <button
                type="button"
                onClick={() => setPickerOpen((prev) => !prev)}
                aria-label="React to message"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <SmilePlus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(id)}
                aria-label="Reply to message"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <Reply className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {onPin && (
              <button
                type="button"
                onClick={() => onPin(id)}
                aria-label={isPinned ? "Unpin message" : "Pin message"}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--muted)] cursor-pointer",
                  isPinned ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {isSent && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(id)}
                aria-label="Edit message"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {isSent && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(id)}
                aria-label="Delete message"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-red-500/15 hover:text-red-500 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {pickerOpen && onToggleReaction && (
        <div
          className={cn(
            "flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 shadow-xs",
            isSent ? "self-end" : "self-start",
          )}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onToggleReaction(id, emoji);
                setPickerOpen(false);
              }}
              className="text-sm hover:scale-125 transition-transform px-1 cursor-pointer"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

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

