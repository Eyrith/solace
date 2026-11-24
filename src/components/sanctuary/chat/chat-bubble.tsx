"use client";

import * as React from "react";
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Pin,
  Reply,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BubbleStyleId } from "@/lib/design-system/tokens";
import { VoiceNotePlayer } from "@/components/sanctuary/voice-note-player";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  timestamp?: string;
  bubbleStyle?: BubbleStyleId;
  replyPreview?: string;
  voiceDurationSeconds?: number;
  voiceSrc?: string;
  attachment?: BubbleAttachment;
  edited?: boolean;
  isPinned?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
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

// Iconic Apple iMessage Tapbacks
const IMESSAGE_TAPBACKS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "👍", label: "Like" },
  { emoji: "👎", label: "Dislike" },
  { emoji: "😂", label: "HaHa" },
  { emoji: "‼️", label: "Emphasize" },
  { emoji: "❓", label: "Question" },
];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Authentic Apple iMessage Bubble Component:
 * - Signature iOS rounded corners with directional tail curvatures.
 * - Apple Vibrant Blue (#007AFF) for sent messages with crisp white text.
 * - iOS Light Gray (#E9E9EB) / Dark Gray (#26252A) for received messages.
 * - Authentic floating Tapback reaction badges anchored to bubble corners.
 * - iMessage Delivered / Read receipts below sent messages.
 * - Sleek audio waveform voice player with scrub bar.
 */
export function ChatBubble({
  id,
  direction,
  senderLabel,
  text,
  timestamp,
  replyPreview,
  voiceDurationSeconds,
  voiceSrc,
  attachment,
  edited = false,
  isPinned = false,
  isFirstInGroup = true,
  isLastInGroup = true,
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
  const hasActions = Boolean(onReply || onToggleReaction || onEdit || onDelete || onPin);
  const [showTapbackMenu, setShowTapbackMenu] = React.useState(false);

  // Authentic iOS iMessage Bubble Radii
  // In iOS: single message has rounded corners with a bottom corner tail.
  // Grouped messages have smoother intermediate curves connecting them.
  let cornerRadiusClasses = "";
  if (isSent) {
    if (isFirstInGroup && isLastInGroup) {
      cornerRadiusClasses = "rounded-[20px] rounded-br-[4px]";
    } else if (isFirstInGroup && !isLastInGroup) {
      cornerRadiusClasses = "rounded-[20px] rounded-br-[6px]";
    } else if (!isFirstInGroup && !isLastInGroup) {
      cornerRadiusClasses = "rounded-[20px] rounded-r-[6px]";
    } else {
      cornerRadiusClasses = "rounded-[20px] rounded-tr-[6px] rounded-br-[4px]";
    }
  } else {
    if (isFirstInGroup && isLastInGroup) {
      cornerRadiusClasses = "rounded-[20px] rounded-bl-[4px]";
    } else if (isFirstInGroup && !isLastInGroup) {
      cornerRadiusClasses = "rounded-[20px] rounded-bl-[6px]";
    } else if (!isFirstInGroup && !isLastInGroup) {
      cornerRadiusClasses = "rounded-[20px] rounded-l-[6px]";
    } else {
      cornerRadiusClasses = "rounded-[20px] rounded-tl-[6px] rounded-bl-[4px]";
    }
  }

  const bubbleColorClasses = isSent
    ? "bg-[#007AFF] text-white selection:bg-white/30 selection:text-white"
    : "bg-[#E9E9EB] text-black dark:bg-[#26252A] dark:text-white selection:bg-[#007AFF]/25";

  return (
    <div
      className={cn(
        "group relative flex flex-col w-full transition-all",
        isSent ? "items-end" : "items-start",
        isLastInGroup ? "mb-2" : "mb-0.5",
        className,
      )}
    >
      {/* Sender Label for Received Messages (Group chats / partner moniker) */}
      {senderLabel && isFirstInGroup && (
        <span className="px-2.5 pb-1 text-[11px] font-medium text-[var(--muted-foreground)] tracking-tight">
          {senderLabel}
        </span>
      )}

      {/* Floating iMessage Tapback Bar (revealed on double-tap or hover quick-action) */}
      {showTapbackMenu && onToggleReaction && (
        <div
          role="toolbar"
          aria-label="Tapback reactions"
          className={cn(
            "absolute z-30 -top-11 flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-lg border backdrop-blur-md animate-in fade-in zoom-in-95 duration-150",
            isSent
              ? "right-2 bg-white/95 border-black/10 dark:bg-[#2C2C2E]/95 dark:border-white/10"
              : "left-2 bg-white/95 border-black/10 dark:bg-[#2C2C2E]/95 dark:border-white/10"
          )}
        >
          {IMESSAGE_TAPBACKS.map(({ emoji, label }) => {
            const hasReacted = reactions.some((r) => r.emoji === emoji && r.reactedByMe);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggleReaction(id, emoji);
                  setShowTapbackMenu(false);
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-lg hover:scale-125 transition-transform active:scale-95 cursor-pointer",
                  hasReacted && "bg-[#007AFF]/15 scale-110"
                )}
                aria-label={`React ${label}`}
                title={label}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          "relative flex items-end gap-1.5 max-w-[82%] sm:max-w-[70%]",
          isSent ? "flex-row-reverse" : "flex-row",
        )}
      >
        {/* Main iMessage Bubble Container */}
        <div
          className={cn(
            "relative px-4 py-2.5 shadow-2xs transition-colors",
            cornerRadiusClasses,
            bubbleColorClasses,
            attachment?.kind === "image" && !text ? "p-0.5 overflow-hidden bg-transparent shadow-none" : ""
          )}
        >
          {/* Reply Context Banner */}
          {replyPreview && (
            <div
              className={cn(
                "mb-1.5 text-xs leading-snug border-l-2 pl-2 py-0.5 line-clamp-2 select-none",
                isSent ? "border-white/70 text-white/90" : "border-[#007AFF] text-[var(--muted-foreground)]",
              )}
            >
              {replyPreview}
            </div>
          )}

          {/* Media Attachments */}
          {attachment && (
            <div className="space-y-1.5">
              {attachment.kind === "image" && attachment.objectUrl ? (
                <a
                  href={attachment.objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-[16px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.objectUrl}
                    alt={attachment.filename}
                    className="max-h-72 w-auto object-cover rounded-[16px] hover:opacity-95 transition-opacity"
                  />
                </a>
              ) : attachment.kind === "video" && attachment.objectUrl ? (
                <video
                  controls
                  src={attachment.objectUrl}
                  className="max-h-72 w-full rounded-[16px]"
                />
              ) : attachment.kind !== "audio" ? (
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-xs",
                    isSent ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10"
                  )}
                >
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
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/15"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Message Text */}
          {text && (
            <p className="text-[15.5px] leading-[1.38] wrap-anywhere whitespace-pre-wrap font-normal tracking-[-0.01em]">
              {text}
            </p>
          )}

          {/* Voice Memo Player */}
          {typeof voiceDurationSeconds === "number" && (
            <VoiceNotePlayer
              durationSeconds={voiceDurationSeconds}
              src={voiceSrc}
              isSent={isSent}
            />
          )}

          {/* Auxiliary Status (Pin, Disappearing Timer, Edited) */}
          {(disappearingLabel || isPinned || edited) && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] tabular-nums pt-1 select-none",
                isSent ? "justify-end text-white/80" : "text-[var(--muted-foreground)]",
              )}
            >
              {isPinned && (
                <span className="inline-flex items-center gap-0.5">
                  <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>Pinned</span>
                </span>
              )}

              {disappearingLabel && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.2",
                  isSent ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10"
                )}>
                  <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>{disappearingLabel}</span>
                </span>
              )}

              {edited && <span>Edited</span>}
            </div>
          )}

          {/* Overlapping iMessage Tapback Reactions Badge */}
          {reactions.length > 0 && (
            <div
              className={cn(
                "absolute -top-3 flex items-center gap-0.5 rounded-full px-2 py-0.5 shadow-sm border select-none cursor-pointer z-10 transition-transform active:scale-95",
                isSent ? "-left-2 bg-white text-black dark:bg-[#323236] dark:text-white border-black/10 dark:border-white/10" : "-right-2 bg-white text-black dark:bg-[#323236] dark:text-white border-black/10 dark:border-white/10"
              )}
              onClick={() => setShowTapbackMenu((prev) => !prev)}
              title="View reactions"
            >
              {reactions.map((r) => (
                <span key={r.emoji} className="text-xs leading-none">
                  {r.emoji}
                </span>
              ))}
              {reactions.reduce((sum, r) => sum + r.count, 0) > 1 && (
                <span className="text-[10px] font-bold opacity-80 ml-0.5">
                  {reactions.reduce((sum, r) => sum + r.count, 0)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover / Context Actions Trigger */}
        {hasActions && (
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5">
            {onToggleReaction && (
              <button
                type="button"
                onClick={() => setShowTapbackMenu((prev) => !prev)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer text-xs"
                title="Tapback reaction"
                aria-label="Tapback reaction"
              >
                ❤️
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Message options"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isSent ? "end" : "start"}
                side="top"
                className="w-44 p-1 space-y-0.5 text-xs"
              >
                {onReply && (
                  <DropdownMenuItem onClick={() => onReply(id)}>
                    <Reply className="h-3.5 w-3.5 mr-2" />
                    <span>Reply</span>
                  </DropdownMenuItem>
                )}
                {onPin && (
                  <DropdownMenuItem onClick={() => onPin(id)}>
                    <Pin className="h-3.5 w-3.5 mr-2" />
                    <span>{isPinned ? "Unpin message" : "Pin message"}</span>
                  </DropdownMenuItem>
                )}
                {isSent && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(id)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    <span>Edit message</span>
                  </DropdownMenuItem>
                )}
                {isSent && onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(id)}
                      className="text-[var(--destructive)] focus:bg-[var(--danger-soft)] focus:text-[var(--destructive)]"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      <span>Delete message</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* iMessage Delivered / Read Status Receipts */}
      {isSent && isLastInGroup && (readReceipt || timestamp) && (
        <div className="flex items-center gap-1.5 text-[11px] font-normal text-[var(--muted-foreground)] tracking-tight pr-1 pt-1 select-none">
          {readReceipt === "read" ? (
            <span>Read {timestamp ? `· ${timestamp}` : ""}</span>
          ) : readReceipt === "delivered" ? (
            <span>Delivered {timestamp ? `· ${timestamp}` : ""}</span>
          ) : (
            <span>Sent {timestamp ? `· ${timestamp}` : ""}</span>
          )}
        </div>
      )}
    </div>
  );
}
