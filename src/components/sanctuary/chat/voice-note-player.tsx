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

  const WAVEFORM_HEIGHTS = [
    6, 10, 16, 12, 22, 14, 18, 24, 16, 10, 14, 20, 22, 14, 18, 26, 20, 12, 8, 14, 18, 12, 8, 5
  ];

  const progressFraction = Math.min(1, Math.max(0, elapsed / maxDuration));

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-1 min-w-[200px] max-w-[260px] select-none",
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

      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? "Pause voice memo" : "Play voice memo"}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full cursor-pointer transition-transform active:scale-90 shadow-2xs",
          isSent
            ? "bg-white text-[#007AFF] hover:bg-white/95"
            : "bg-[#007AFF] text-white hover:bg-[#0071EB]",
        )}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current translate-x-0.5" aria-hidden="true" />
        )}
      </button>

      {/* iMessage Style Audio Waveform */}
      <div
        className="flex-1 flex flex-col justify-center gap-1 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          handleSeek(ratio * maxDuration);
        }}
      >
        <div className="flex items-center gap-[2.5px] h-7">
          {WAVEFORM_HEIGHTS.map((height, i) => {
            const barFraction = i / WAVEFORM_HEIGHTS.length;
            const isPlayed = progressFraction > barFraction;
            return (
              <span
                key={i}
                style={{ height: `${height}px` }}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-150",
                  isSent
                    ? isPlayed
                      ? "bg-white"
                      : "bg-white/40"
                    : isPlayed
                      ? "bg-[#007AFF]"
                      : "bg-black/25 dark:bg-white/30"
                )}
              />
            );
          })}
        </div>

        {/* Duration & Speed */}
        <div
          className={cn(
            "flex items-center justify-between text-[11px] tabular-nums font-normal",
            isSent ? "text-white/90" : "text-[var(--muted-foreground)]"
          )}
        >
          <span>{formatSeconds(elapsed > 0 ? elapsed : resolvedDuration)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cycleSpeed();
            }}
            aria-label={`Playback speed ${speed}x`}
            className="rounded px-1 py-0.2 text-[10px] font-semibold hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}
