"use client";

import * as React from "react";
import {
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VoiceNotePlayer } from "@/components/sanctuary/voice-note-player";
import type { ValidatedEncryptedMediaDescriptor } from "@/lib/matrix/encrypted-media";
import type { EncryptedFile } from "matrix-js-sdk/lib/@types/media";

export interface EncryptedMediaBubbleProps {
  id: string;
  direction: "sent" | "received";
  timestamp: string;
  kind: "text" | "image" | "video" | "audio" | "file";
  text?: string;
  media?: ValidatedEncryptedMediaDescriptor;
  isEncrypted?: boolean;
  decryptionError?: string;
  redacted?: boolean;
  decryptedUrls: Record<string, string>;
  onEnsureDecryptedUrl: (
    file: EncryptedFile,
    mimeType: string,
    variant: "full" | "thumbnail"
  ) => Promise<string>;
  onDelete?: (eventId: string) => void | Promise<void>;
}

function isSafeBlobUrl(url?: string): url is string {
  return typeof url === "string" && url.startsWith("blob:");
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Renders end-to-end encrypted Sanctuary messages and private media attachments
 * (images + encrypted thumbnails, videos, voice notes, and generic documents)
 * strictly from in-memory decrypted `blob:` URLs.
 */
export function EncryptedMediaBubble({
  id,
  direction,
  timestamp,
  kind,
  text,
  media,
  isEncrypted = true,
  decryptionError,
  redacted = false,
  decryptedUrls,
  onEnsureDecryptedUrl,
  onDelete,
}: EncryptedMediaBubbleProps) {
  const isSent = direction === "sent";
  const [decryptingVariant, setDecryptingVariant] = React.useState<"full" | "thumbnail" | null>(
    null
  );
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [fullViewRequested, setFullViewRequested] = React.useState(false);

  const thumbCacheKey = media?.thumbnailFile ? `${media.thumbnailFile.url}::thumbnail` : "";
  const fullCacheKey = media?.file ? `${media.file.url}::full` : "";
  const rawThumbUrl = thumbCacheKey ? decryptedUrls[thumbCacheKey] : undefined;
  const rawFullUrl = fullCacheKey ? decryptedUrls[fullCacheKey] : undefined;

  const safeThumbUrl = isSafeBlobUrl(rawThumbUrl) ? rawThumbUrl : undefined;
  const safeFullUrl = isSafeBlobUrl(rawFullUrl) ? rawFullUrl : undefined;

  const triggerDecrypt = React.useCallback(
    async (variant: "full" | "thumbnail") => {
      if (!media) return;
      const targetFile = variant === "thumbnail" ? media.thumbnailFile : media.file;
      if (!targetFile) return;
      const mimeType =
        variant === "thumbnail"
          ? media.thumbnailMimeType || "image/webp"
          : media.mimeType || "application/octet-stream";

      setLocalError(null);
      setDecryptingVariant(variant);
      try {
        await onEnsureDecryptedUrl(targetFile, mimeType, variant);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Decryption failed");
      } finally {
        setDecryptingVariant(null);
      }
    },
    [media, onEnsureDecryptedUrl]
  );

  // Automatically decrypt small thumbnails & audio clips in-memory when the message mounts
  React.useEffect(() => {
    if (redacted || decryptionError || !media) return;
    let targetFile: EncryptedFile | undefined;
    let mimeType = "application/octet-stream";
    let variant: "full" | "thumbnail" = "full";

    if (media.thumbnailFile && !safeThumbUrl) {
      targetFile = media.thumbnailFile;
      mimeType = media.thumbnailMimeType || "image/webp";
      variant = "thumbnail";
    } else if (kind === "audio" && !safeFullUrl) {
      targetFile = media.file;
      mimeType = media.mimeType || "audio/webm";
      variant = "full";
    } else if (kind === "image" && !media.thumbnailFile && !safeFullUrl) {
      targetFile = media.file;
      mimeType = media.mimeType || "image/png";
      variant = "full";
    }

    if (!targetFile) return;
    let cancelled = false;
    void onEnsureDecryptedUrl(targetFile, mimeType, variant).catch((err) => {
      if (!cancelled) {
        setLocalError(err instanceof Error ? err.message : "Decryption failed");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    kind,
    media,
    redacted,
    decryptionError,
    safeThumbUrl,
    safeFullUrl,
    onEnsureDecryptedUrl,
  ]);

  const handleDownloadDecrypted = async () => {
    if (!media) return;
    let url = safeFullUrl;
    if (!url) {
      setDecryptingVariant("full");
      setLocalError(null);
      try {
        url = await onEnsureDecryptedUrl(
          media.file,
          media.mimeType || "application/octet-stream",
          "full"
        );
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Failed to decrypt attachment");
        return;
      } finally {
        setDecryptingVariant(null);
      }
    }
    if (!isSafeBlobUrl(url)) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = media.filename || "decrypted-attachment";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const bubbleClasses = isSent
    ? "bg-[var(--bubble-sent)] text-[var(--bubble-sent-foreground)] rounded-br-sm"
    : "bg-[var(--bubble-received)] text-[var(--bubble-received-foreground)] border border-[var(--border)] rounded-bl-sm";

  return (
    <div
      className={cn(
        "group flex flex-col max-w-[85%] sm:max-w-[74%] gap-1",
        isSent ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div
        className={cn(
          "rounded-[var(--ds-radius)] px-3.5 py-2.5 text-sm shadow-xs space-y-2",
          bubbleClasses,
          redacted && "opacity-60 italic"
        )}
      >
        {decryptionError ? (
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{decryptionError}</span>
          </div>
        ) : redacted ? (
          <p className="text-xs">This encrypted message was deleted.</p>
        ) : (
          <>
            {kind === "image" && media && (
              <div className="space-y-2">
                {safeFullUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeFullUrl}
                    alt={media.filename || "Decrypted private photo"}
                    className="max-h-72 w-auto rounded-[calc(var(--ds-radius)-4px)] object-contain"
                  />
                ) : safeThumbUrl ? (
                  <div className="relative overflow-hidden rounded-[calc(var(--ds-radius)-4px)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeThumbUrl}
                      alt={`${media.filename} encrypted preview`}
                      className="max-h-56 w-auto object-cover"
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={decryptingVariant === "full"}
                        onClick={() => {
                          setFullViewRequested(true);
                          void triggerDecrypt("full");
                        }}
                      >
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {decryptingVariant === "full"
                            ? "Decrypting..."
                            : `Decrypt full (${formatBytes(media.size)})`}
                        </span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={decryptingVariant !== null}
                    onClick={() => void triggerDecrypt("full")}
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {decryptingVariant ? "Decrypting image..." : `Decrypt ${media.filename}`}
                    </span>
                  </Button>
                )}

                {(safeFullUrl || fullViewRequested) && (
                  <button
                    type="button"
                    onClick={handleDownloadDecrypted}
                    className="inline-flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100 underline cursor-pointer"
                  >
                    <Download className="h-3 w-3" aria-hidden="true" />
                    <span>Save decrypted copy</span>
                  </button>
                )}
              </div>
            )}

            {kind === "video" && media && (
              <div className="space-y-2">
                {safeFullUrl ? (
                  <video
                    src={safeFullUrl}
                    poster={safeThumbUrl}
                    controls
                    playsInline
                    className="max-h-72 w-full rounded-[calc(var(--ds-radius)-4px)] bg-black"
                  />
                ) : (
                  <div className="space-y-2">
                    {safeThumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={safeThumbUrl}
                        alt={`${media.filename} video frame`}
                        className="max-h-48 w-auto rounded-[calc(var(--ds-radius)-4px)] object-cover"
                      />
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={decryptingVariant === "full"}
                      onClick={() => void triggerDecrypt("full")}
                    >
                      <Film className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {decryptingVariant === "full"
                          ? "Decrypting video..."
                          : `Decrypt & play (${formatBytes(media.size)})`}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {kind === "audio" && media && (
              <div className="space-y-1">
                {safeFullUrl ? (
                  <VoiceNotePlayer
                    src={safeFullUrl}
                    durationSeconds={Math.max(1, Math.round((media.durationMs || 5000) / 1000))}
                    isSent={isSent}
                  />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={decryptingVariant === "full"}
                    onClick={() => void triggerDecrypt("full")}
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {decryptingVariant === "full"
                        ? "Decrypting voice note..."
                        : "Decrypt voice message"}
                    </span>
                  </Button>
                )}
              </div>
            )}

            {kind === "file" && media && (
              <div className="flex items-center justify-between gap-3 rounded-[calc(var(--ds-radius)-4px)] bg-black/10 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{media.filename}</p>
                    <p className="text-[10px] opacity-80">
                      {media.mimeType} {media.size ? `· ${formatBytes(media.size)}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={decryptingVariant === "full"}
                  onClick={handleDownloadDecrypted}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{decryptingVariant === "full" ? "Decrypting..." : "Decrypt"}</span>
                </Button>
              </div>
            )}

            {text && <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>}

            {localError && (
              <p className="text-[11px] text-red-500 dark:text-red-300">{localError}</p>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-0.5 text-[10px] opacity-75">
          <span className="inline-flex items-center gap-1">
            {isEncrypted ? (
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-3 w-3 text-red-500" aria-hidden="true" />
            )}
            <span>{isEncrypted ? "E2EE" : "Unencrypted"}</span>
            <span>·</span>
            <time>{timestamp}</time>
          </span>

          {onDelete && !redacted && (
            <button
              type="button"
              onClick={() => void onDelete(id)}
              aria-label="Delete and redact encrypted message"
              title="Redact message & expire room reference"
              className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

