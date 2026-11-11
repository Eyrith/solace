"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoiceNotePlayerProps {
  durationSeconds: number;
  isSent?: boolean;
  className?: string;
}

function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Accessible voice message player with play/pause, scrubbing, tabular duration,
 * and 1x / 1.5x / 2x playback speed toggles.
 */
export function VoiceNotePlayer({
  durationSeconds,
  isSent = false,
  className,
}: VoiceNotePlayerProps) {
  const [playing, setPlaying] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [speed, setSpeed] = React.useState<1 | 1.5 | 2>(1);

  React.useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.25 * speed;
        if (next >= durationSeconds) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [playing, speed, durationSeconds]);

  const cycleSpeed = () => {
    setSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--ds-radius)] px-2 py-1.5 min-w-[220px]",
        isSent ? "bg-black/15" : "bg-[var(--background)]/70",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setPlaying((prev) => !prev)}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full cursor-pointer transition-transform active:scale-95",
          isSent
            ? "bg-[var(--bubble-sent-foreground)] text-[var(--bubble-sent)]"
            : "bg-[var(--primary)] text-[var(--primary-foreground)]",
        )}
      >
        {playing ? (
          <Pause className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4 translate-x-0.5" aria-hidden="true" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <input
          type="range"
          min={0}
          max={durationSeconds}
          step={0.25}
          value={elapsed}
          onChange={(e) => setElapsed(Number(e.target.value))}
          aria-label="Voice message progress"
          className="w-full h-1.5 cursor-pointer accent-current"
        />
        <div className="flex items-center justify-between text-[11px] opacity-85 tabular-nums">
          <span>
            {formatSeconds(elapsed)} / {formatSeconds(durationSeconds)}
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            aria-label={`Playback speed ${speed}x`}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-black/10 cursor-pointer"
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}

