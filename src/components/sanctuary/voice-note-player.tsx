"use client";

import * as React from "react";
import { Lock, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoiceNotePlayerProps {
  durationSeconds: number;
  /** Must strictly be a client-decrypted in-memory `blob:` URL; http(s) URLs are rejected. */
  src?: string;
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
 * Accessible voice message player with real decrypted `blob:` `<audio>` playback,
 * scrubbing, tabular duration, and 1x / 1.5x / 2x speed toggles.
 * Rejects non-`blob:` remote URLs so unencrypted server audio can never play.
 */
export function VoiceNotePlayer({
  durationSeconds,
  src,
  isSent = false,
  className,
}: VoiceNotePlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [speed, setSpeed] = React.useState<1 | 1.5 | 2>(1);
  const [metadataDuration, setMetadataDuration] = React.useState<number | null>(null);
  const resolvedDuration = metadataDuration ?? durationSeconds;

  const safeBlobSrc = typeof src === "string" && src.startsWith("blob:") ? src : undefined;
  const blockedRemoteSrc = typeof src === "string" && src.length > 0 && !safeBlobSrc;

  React.useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.playbackRate = speed;
    }
  }, [speed]);

  React.useEffect(() => {
    if (safeBlobSrc) return;
    if (!playing) return;
    const interval = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.25 * speed;
        if (next >= resolvedDuration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [playing, speed, resolvedDuration, safeBlobSrc]);

  const togglePlayback = async () => {
    if (blockedRemoteSrc) return;
    const el = audioRef.current;
    if (safeBlobSrc && el) {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
        try {
          el.playbackRate = speed;
          await el.play();
          setPlaying(true);
        } catch {
          setPlaying(false);
        }
      }
      return;
    }
    setPlaying((prev) => !prev);
  };

  const handleSeek = (value: number) => {
    setElapsed(value);
    const el = audioRef.current;
    if (safeBlobSrc && el) {
      el.currentTime = value;
    }
  };

  const cycleSpeed = () => {
    setSpeed((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  if (blockedRemoteSrc) {
    return (
      <div className="flex items-center gap-1.5 rounded-[var(--ds-radius)] bg-red-500/10 px-2.5 py-2 text-xs text-red-500">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Blocked unencrypted remote audio source</span>
      </div>
    );
  }

  const maxDuration = Math.max(1, resolvedDuration);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--ds-radius)] px-2 py-1.5 min-w-[220px]",
        isSent ? "bg-black/15" : "bg-[var(--background)]/70",
        className,
      )}
    >
      {safeBlobSrc && (
        <audio
          ref={audioRef}
          src={safeBlobSrc}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0) {
              setMetadataDuration(Math.round(dur));
            }
          }}
          onTimeUpdate={(e) => {
            setElapsed(e.currentTarget.currentTime);
          }}
          onEnded={() => {
            setPlaying(false);
            setElapsed(0);
          }}
        />
      )}

      <button
        type="button"
        onClick={togglePlayback}
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
          max={maxDuration}
          step={0.25}
          value={Math.min(elapsed, maxDuration)}
          onChange={(e) => handleSeek(Number(e.target.value))}
          aria-label="Voice message progress"
          className="w-full h-1.5 cursor-pointer accent-current"
        />
        <div className="flex items-center justify-between text-[11px] opacity-85 tabular-nums">
          <span>
            {formatSeconds(elapsed)} / {formatSeconds(resolvedDuration)}
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
