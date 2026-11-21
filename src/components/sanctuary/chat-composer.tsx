"use client";

import * as React from "react";
import { Clock, Lock, Mic, Paperclip, Send, Sparkles, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QUESTION_LIBRARY } from "@/lib/questions/data";
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
  /** Called with raw local File to be AES-256-CTR encrypted in the browser before upload. */
  onAttachFile?: (file: File, caption?: string) => void | Promise<void>;
  /** Called with recorded audio Blob + mimeType + durationMs for client-side E2EE upload. */
  onSendVoiceBlob?: (blob: Blob, mimeType: string, durationMs: number) => void | Promise<void>;
  uploadingStage?: "verifying" | "encrypting" | "uploading" | "sending" | null;
  disabled?: boolean;
  initialText?: string;
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

const STAGE_LABELS: Record<NonNullable<ChatComposerProps["uploadingStage"]>, string> = {
  verifying: "Checking partner device signatures...",
  encrypting: "Encrypting media on device (AES-256-CTR)...",
  uploading: "Uploading opaque ciphertext...",
  sending: "Sharing key inside E2EE room...",
};

/**
 * Private messaging composer handling IME composition safely, Enter-to-send with Shift+Enter newline,
 * real browser file attachment picker, MediaRecorder voice recording, client-side E2EE upload stage display,
 * and disappearing timer preset selection.
 */
export function ChatComposer({
  onSend,
  onAttachMedia,
  onRecordVoice,
  onAttachFile,
  onSendVoiceBlob,
  uploadingStage = null,
  disabled = false,
  initialText = "",
  placeholder = "Write a quiet note...",
  className,
}: ChatComposerProps) {
  const [text, setText] = React.useState(initialText);
  const [timer, setTimer] = React.useState<DisappearingPreset>("off");
  const [recording, setRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [recorderError, setRecorderError] = React.useState<string | null>(null);
  const [showSparks, setShowSparks] = React.useState(false);

  const QUICK_GESTURES = [
    "🕊️ Thinking of you softly",
    "🫂 Sending a long quiet hug",
    "☕ Kettle is warm whenever you’re free",
  ];

  const handleInsertSpark = () => {
    const sample = QUESTION_LIBRARY[Math.floor(Math.random() * QUESTION_LIBRARY.length)];
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${sample.prompt}` : sample.prompt));
    setShowSparks(false);
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordingStartedAtRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [recording]);

  const submitMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || uploadingStage) return;
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

  const handleAttachClick = () => {
    if (onAttachFile) {
      fileInputRef.current?.click();
    } else {
      onAttachMedia?.();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onAttachFile) return;
    const caption = text.trim() || undefined;
    await onAttachFile(file, caption);
    if (caption) setText("");
  };

  const startVoiceRecording = async () => {
    if (!onSendVoiceBlob) {
      onRecordVoice?.();
      return;
    }
    setRecorderError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecorderError("Browser audio recording is unavailable here.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const chosenMime = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch {
      setRecorderError("Microphone permission denied.");
    }
  };

  const stopAndSendVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    const durationMs = Math.max(500, Date.now() - recordingStartedAtRef.current);
    const mimeType = recorder.mimeType || "audio/webm";

    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      setRecording(false);
      if (blob.size > 0) {
        void onSendVoiceBlob?.(blob, mimeType, durationMs);
      }
    };
    recorder.stop();
  };

  const cancelVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
      };
      recorder.stop();
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setRecording(false);
  };

  return (
    <div
      className={cn(
        "rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-2.5 sm:p-3 space-y-2 shadow-xs",
        className,
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Choose private file to encrypt and send"
      />

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={() => setShowSparks((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)] cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-[var(--primary)]" />
            <span>Sparks</span>
          </button>
        </div>
        <span className="text-[11px] text-[var(--muted-foreground)] hidden sm:inline">
          Enter to send · Shift+Enter for new line
        </span>
      </div>

      {showSparks && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-2 text-xs">
          {QUICK_GESTURES.map((gesture) => (
            <button
              key={gesture}
              type="button"
              onClick={() => {
                setText(gesture);
                setShowSparks(false);
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] hover:border-[var(--primary)] cursor-pointer"
            >
              {gesture}
            </button>
          ))}
          <button
            type="button"
            onClick={handleInsertSpark}
            className="rounded-full bg-[var(--primary)]/12 px-2.5 py-1 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20 cursor-pointer"
          >
            + Draw Question Spark
          </button>
        </div>
      )}

      {uploadingStage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[var(--ds-radius)] bg-[var(--muted)]/70 px-3 py-1.5 text-xs text-[var(--foreground)]"
        >
          <Lock className="h-3.5 w-3.5 text-[var(--primary)] shrink-0 animate-pulse" aria-hidden="true" />
          <span>{STAGE_LABELS[uploadingStage]}</span>
        </div>
      )}

      {recorderError && (
        <p className="text-xs text-red-600 dark:text-red-400 px-1">{recorderError}</p>
      )}

      {recording ? (
        <div className="flex items-center justify-between gap-2 rounded-[calc(var(--ds-radius)-4px)] border border-[var(--primary)] bg-[var(--muted)]/50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            <span className="tabular-nums font-medium">
              Recording E2EE voice note ({Math.floor(recordingSeconds / 60)}:
              {(recordingSeconds % 60).toString().padStart(2, "0")})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelVoiceRecording}
              aria-label="Discard voice recording"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={stopAndSendVoiceRecording}
              aria-label="Encrypt and send voice note"
            >
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Encrypt &amp; send</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleAttachClick}
            disabled={disabled || Boolean(uploadingStage)}
            aria-label="Encrypt and attach media or file"
            title="Encrypt and attach image, video, or document"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={startVoiceRecording}
            disabled={disabled || Boolean(uploadingStage)}
            aria-label="Record encrypted voice message"
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
            disabled={disabled || Boolean(uploadingStage)}
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
            disabled={disabled || Boolean(uploadingStage) || text.trim().length === 0}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
