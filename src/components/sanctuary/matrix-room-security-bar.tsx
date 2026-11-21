"use client";

import * as React from "react";
import { AlertTriangle, KeyRound, Lock, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMatrix } from "@/components/providers/matrix-provider";
import { useSanctuary } from "@/components/providers/sanctuary-provider";
import { cn } from "@/lib/utils";

export interface MatrixRoomSecurityBarProps {
  spaceId: string;
  pocUser?: "alice" | "bob";
  onSwitchPocUser?: (next: "alice" | "bob") => void;
  className?: string;
}

/**
 * Compact Sanctuary header bar displaying real Matrix E2EE verification state,
 * Recovery Key backup/unlock actions, and fail-closed warnings before media keys
 * can be shared or decrypted.
 */
export function MatrixRoomSecurityBar({
  spaceId,
  pocUser = "alice",
  onSwitchPocUser,
  className,
}: MatrixRoomSecurityBarProps) {
  const { isLocalSandbox } = useSanctuary();
  const {
    status,
    statusMessage,
    session,
    activeRoomId,
    securityStatus,
    setupEncryptionAndBackup,
    unlockWithRecoveryKey,
    initiatePartnerVerification,
    connectSpace,
  } = useMatrix();

  const [showRestoreInput, setShowRestoreInput] = React.useState(false);
  const [recoveryInput, setRecoveryInput] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const peer = securityStatus?.peers?.[0];
  const partnerVerified = Boolean(peer?.verified);
  const partnerViolation = Boolean(peer?.needsUserApproval);
  const identityReady = Boolean(securityStatus?.crossSigningReady && securityStatus?.secretStorageReady);

  const handleBootstrap = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await setupEncryptionAndBackup();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to set up recovery key");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryInput.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await unlockWithRecoveryKey(recoveryInput.trim());
      setRecoveryInput("");
      setShowRestoreInput(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Invalid recovery key");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPartner = async () => {
    if (!activeRoomId || !session?.peerUserId) return;
    setBusy(true);
    setActionError(null);
    try {
      await initiatePartnerVerification(activeRoomId, session.peerUserId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start verification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)]/90 px-3 py-2 text-xs space-y-2",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {status === "ready" && partnerVerified && identityReady ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          ) : partnerViolation ? (
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" aria-hidden="true" />
          ) : (
            <Lock className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden="true" />
          )}

          <div className="min-w-0">
            <span className="font-medium text-[var(--foreground)]">
              {status === "connecting" && "Initializing Matrix Rust E2EE engine..."}
              {status === "unconfigured" &&
                (isLocalSandbox
                  ? "Local Sandbox · Messages saved in browser · Media encrypted client-side via AES-256-CTR"
                  : "E2EE Preview Mode (Synapse server not connected)")}
              {status === "error" && (statusMessage || "Matrix connection error")}
              {status === "ready" &&
                (partnerVerified && identityReady
                  ? "Strict E2EE Active · Partner Devices Verified · Encrypted Media Locked"
                  : "Strict E2EE Enabled · Device Setup / Verification Required Before Media Sharing")}
              {status === "idle" && "Connecting to encrypted room..."}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {session?.mode === "local_poc" && onSwitchPocUser && (
            <div className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--background)] p-0.5 mr-1">
              <Users className="h-3 w-3 mx-1.5 text-[var(--muted-foreground)]" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onSwitchPocUser("alice")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] cursor-pointer",
                  pocUser === "alice"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-medium"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                Partner A
              </button>
              <button
                type="button"
                onClick={() => onSwitchPocUser("bob")}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] cursor-pointer",
                  pocUser === "bob"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-medium"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                Partner B
              </button>
            </div>
          )}

          {status === "ready" && !identityReady && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={handleBootstrap}
              className="h-7 px-2.5 text-xs"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Enable Key Backup</span>
            </Button>
          )}

          {status === "ready" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setShowRestoreInput((v) => !v)}
              className="h-7 px-2 text-xs"
            >
              <span>{showRestoreInput ? "Hide Restore" : "Unlock Recovery Key"}</span>
            </Button>
          )}

          {status === "ready" && identityReady && session?.peerUserId && !partnerVerified && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={busy || !activeRoomId}
              onClick={handleVerifyPartner}
              className="h-7 px-2.5 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Verify Partner</span>
            </Button>
          )}

          {(status === "error" || status === "unconfigured") && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void connectSpace(spaceId, pocUser)}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      </div>

      {showRestoreInput && (
        <form onSubmit={handleUnlock} className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="password"
            value={recoveryInput}
            onChange={(e) => setRecoveryInput(e.target.value)}
            placeholder="Paste Matrix Recovery Key (EsT...)"
            aria-label="Matrix backup recovery key"
            className="flex-1 min-w-[200px] h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs font-mono text-[var(--foreground)]"
          />
          <Button type="submit" size="sm" variant="primary" disabled={busy} className="h-8 text-xs">
            Restore Encrypted Keys
          </Button>
        </form>
      )}

      {actionError && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{actionError}</p>
      )}
    </div>
  );
}

