"use client";

import * as React from "react";
import {
  ArrowUp,
  Camera,
  Check,
  Clock,
  Image as ImageIcon,
  Lock,
  Mic,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QUESTION_LIBRARY } from "@/lib/questions/data";

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

const TIMER_OPTIONS: { id: DisappearingPreset; label: string; chipLabel: string; desc: string }[] = [
  { id: "off", label: "Timer: Off", chipLabel: "Timer", desc: "Messages do not expire" },
  { id: "just_seen", label: "Just seen", chipLabel: "Seen", desc: "Disappears immediately after viewing" },
  { id: "1s", label: "1 second", chipLabel: "1s", desc: "Disappears 1 second after view" },
  { id: "5m", label: "5 minutes", chipLabel: "5m", desc: "Disappears 5 minutes after view" },
  { id: "1h", label: "1 hour", chipLabel: "1h", desc: "Disappears 1 hour after view" },
  { id: "24h", label: "24 hours", chipLabel: "24h", desc: "Disappears after 24 hours" },
];

const STAGE_LABELS: Record<NonNullable<ChatComposerProps["uploadingStage"]>, string> = {
  verifying: "Checking device keys...",
  encrypting: "Encrypting on device (AES-256-CTR)...",
  uploading: "Uploading encrypted media...",
  sending: "Sharing key in room...",
};

/**
 * Clean, single-row private messaging composer featuring:
 * - One row: attach, auto-growing textarea, timer popover chip, and send/mic toggle.
 * - Auto-growing textarea that retains focus after sending.
 * - Timer popover backed by Radix.
 * - Question prompts inside an accessible Sheet.
 * - Disappearing timer status.
 * - Single-line upload stage indicator above composer.
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
  placeholder = "Write a private note...",
  className,
}: ChatComposerProps) {
  const [text, setText] = React.useState(initialText);
  const [timer, setTimer] = React.useState<DisappearingPreset>("off");
  const [timerOpen, setTimerOpen] = React.useState(false);
  const [sparksOpen, setSparksOpen] = React.useState(false);

  const [recording, setRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [recorderError, setRecorderError] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordingStartedAtRef = React.useRef<number>(0);

  // Auto-resize textarea height
  const adjustTextareaHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, 140);
    el.style.height = `${nextHeight}px`;
  }, []);

  React.useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

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

    // Retain focus in composer after send
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
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
    if (caption) {
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${promptText}` : promptText));
    setSparksOpen(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleDrawRandomPrompt = () => {
    const item = QUESTION_LIBRARY[Math.floor(Math.random() * QUESTION_LIBRARY.length)];
    if (item) handleSelectPrompt(item.prompt);
  };

  const startVoiceRecording = async () => {
    if (!onSendVoiceBlob) {
      onRecordVoice?.();
      return;
    }
    setRecorderError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecorderError("Audio recording is not supported on this browser.");
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
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch {
      setRecorderError("Microphone access was denied.");
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

  const activeTimerOption = TIMER_OPTIONS.find((o) => o.id === timer) || TIMER_OPTIONS[0];

  return (
    <div className={cn("space-y-1.5", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Choose private file to encrypt and send"
      />

      {/* Upload stages: single inline status line above composer */}
      {uploadingStage && (
        <div
          role="status"
          className="flex items-center gap-2 px-1 text-xs text-[var(--muted-foreground)]"
        >
          <Lock className="h-3.5 w-3.5 text-[var(--primary)] shrink-0 animate-pulse" aria-hidden="true" />
          <span>{STAGE_LABELS[uploadingStage]}</span>
        </div>
      )}

      {/* Recording error alert */}
      {recorderError && (
        <div role="alert" className="text-xs text-[var(--destructive)] px-1">
          {recorderError}
        </div>
      )}

      {/* Voice Recording Active View */}
      {recording ? (
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#007AFF] bg-[#007AFF]/10 p-2.5 px-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-xs text-[var(--foreground)]">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            <span className="tabular-nums font-medium text-[13px]">
              Audio memo ({Math.floor(recordingSeconds / 60)}:
              {(recordingSeconds % 60).toString().padStart(2, "0")})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="h-7 w-7 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 flex items-center justify-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              aria-label="Discard recording"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={stopAndSendVoiceRecording}
              className="h-7 w-7 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-xs hover:bg-[#0071EB] active:scale-95 transition-all cursor-pointer"
              aria-label="Send voice memo"
            >
              <ArrowUp className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        </div>
      ) : (
        /* iMessage Style Unified Composer Bar */
        <div className="flex items-end gap-2 px-1">
          {/* iOS Style '+' Action Menu (Photos, Audio, Sparks, Timer) */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-8 w-8 mb-1 rounded-full bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer shadow-2xs"
                aria-label="Add attachment, prompts or set timer"
                title="Apps & Attachments"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1.5 space-y-0.5 rounded-2xl shadow-xl backdrop-blur-md bg-[var(--surface-1)]/95 border-[var(--border)]">
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={disabled || Boolean(uploadingStage)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#007AFF]/15 text-[#007AFF]">
                  <ImageIcon className="h-4 w-4" />
                </span>
                <span>Photos & Files</span>
              </button>

              <button
                type="button"
                onClick={() => setSparksOpen(true)}
                disabled={disabled || Boolean(uploadingStage)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>Conversation Sparks</span>
              </button>

              <button
                type="button"
                onClick={() => setTimerOpen(true)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/15 text-purple-500">
                    <Clock className="h-4 w-4" />
                  </span>
                  <span>Disappearing Timer</span>
                </div>
                {timer !== "off" && (
                  <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#007AFF]">
                    {activeTimerOption.chipLabel}
                  </span>
                )}
              </button>
            </PopoverContent>
          </Popover>

          {/* iMessage Pill Input Box */}
          <div className="flex-1 flex items-end gap-1.5 min-h-[38px] max-h-[140px] rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)] dark:bg-[#1C1C1E] px-3.5 py-1.5 focus-within:border-[#007AFF] shadow-2xs transition-colors">
            {/* Auto-growing Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              disabled={disabled || Boolean(uploadingStage)}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={placeholder || "Write a note"}
              className="flex-1 min-h-[24px] max-h-[120px] resize-none bg-transparent py-0.5 text-[15.5px] leading-snug text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none"
            />

            {/* Disappearing Timer active badge inside input */}
            {timer !== "off" && (
              <button
                type="button"
                onClick={() => setTimerOpen(true)}
                className="mb-0.5 inline-flex items-center gap-0.5 rounded-full bg-[#007AFF]/15 text-[#007AFF] px-2 py-0.5 text-[10px] font-bold tracking-tight shrink-0"
                title={`Disappearing: ${activeTimerOption.label}`}
              >
                <Clock className="h-2.5 w-2.5" />
                <span>{activeTimerOption.chipLabel}</span>
              </button>
            )}

            {/* iMessage Send or Mic Icon */}
            {text.trim().length === 0 ? (
              <button
                type="button"
                onClick={startVoiceRecording}
                disabled={disabled || Boolean(uploadingStage)}
                className="h-7 w-7 mb-0.5 rounded-full text-[#007AFF] hover:text-[#007AFF]/80 flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
                aria-label="Record audio message"
                title="Audio message"
              >
                <Mic className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submitMessage}
                disabled={disabled || Boolean(uploadingStage)}
                className="h-7 w-7 mb-0.5 rounded-full bg-[#007AFF] hover:bg-[#0071EB] text-white flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer animate-in zoom-in-75 duration-100"
                aria-label="Send iMessage"
                title="Send"
              >
                <ArrowUp className="h-4 w-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sparks Sheet */}
      <Sheet open={sparksOpen} onOpenChange={setSparksOpen}>
        <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base sm:text-lg">Question Sparks</SheetTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDrawRandomPrompt}
                className="text-xs mr-6 gap-1"
              >
                <Sparkles className="h-3 w-3 text-[var(--primary)]" />
                <span>Draw Random</span>
              </Button>
            </div>
            <SheetDescription className="text-xs">
              Select a conversation prompt to insert into your composer.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUESTION_LIBRARY.slice(0, 20).map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelectPrompt(q.prompt)}
                className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--surface-1)] p-3 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-2)] hover:border-[var(--primary)] transition-colors cursor-pointer space-y-1"
              >
                <span className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">
                  {q.category}
                </span>
                <p className="leading-snug">{q.prompt}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
