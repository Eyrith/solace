"use client";

import * as React from "react";
import { Clock, Image as ImageIcon, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DisappearingPreset = "off" | "just_seen" | "1s" | "5m" | "1h" | "24h";

export interface ChatComposerProps {
  onSend: (text: string, disappearing: DisappearingPreset) => void;
  onAttachMedia?: () => void;
  onRecordVoice?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const DISAPPEARING_LABELS: Record<DisappearingPreset, string> = {
  off: "Timer: Off",
  just_seen: "Just seen",
  "1s": "1 sec after view",
  "5m": "5 min after view",
  "1h": "1 hr after view",
  "24h": "24 hours",
};

/**
 * Private messaging composer handling IME composition safely, Enter-to-send with Shift+Enter newline,
 * accessible media/voice triggers, and disappearing timer preset selection.
 */
export function ChatComposer({
  onSend,
  onAttachMedia,
  onRecordVoice,
  disabled = false,
  placeholder = "Write a quiet note...",
  className,
}: ChatComposerProps) {
  const [text, setText] = React.useState("");
  const [timer, setTimer] = React.useState<DisappearingPreset>("off");

  const submitMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, timer);
    setText("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    // Cancel Enter default before IME composition guard per accessibility/IME UX standards
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submitMessage();
  };

  return (
    <div
      className={cn(
        "rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-2.5 sm:p-3 space-y-2 shadow-xs",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
          <Select value={timer} onValueChange={(v) => setTimer(v as DisappearingPreset)}>
            <SelectTrigger
              aria-label="Disappearing message expiration mode"
              className="h-8 min-h-8 border-none bg-transparent px-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] w-auto gap-1.5"
            >
              <SelectValue>{DISAPPEARING_LABELS[timer]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DISAPPEARING_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-[11px] text-[var(--muted-foreground)] hidden sm:inline">
          Enter to send · Shift+Enter for new line
        </span>
      </div>

      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAttachMedia}
          disabled={disabled}
          aria-label="Attach photo or video"
        >
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRecordVoice}
          disabled={disabled}
          aria-label="Record voice message"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
        </Button>

        <label htmlFor="sanctuary-composer-input" className="sr-only">
          Message text
        </label>
        <textarea
          id="sanctuary-composer-input"
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-h-11 max-h-36 resize-y rounded-[calc(var(--ds-radius)-4px)] bg-[var(--background)] px-3.5 py-2.5 text-base sm:text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] border border-[var(--border)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        />

        <Button
          type="button"
          variant="primary"
          size="icon"
          onClick={submitMessage}
          disabled={disabled || text.trim().length === 0}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

