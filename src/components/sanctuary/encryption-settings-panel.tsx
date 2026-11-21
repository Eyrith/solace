"use client";

import * as React from "react";
import {
  Ban,
  Database,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMatrix } from "@/components/providers/matrix-provider";

interface AdminMediaItem {
  mediaId: string;
  bytes: number;
  mimeType: string;
  createdAt: number;
  lastAccessedAt: number | null;
  quarantinedBy: string | null;
  uploadName: string | null;
}

interface AdminStorageResponse {
  mxid: string;
  totalFiles: number;
  totalBytes: number;
  media: AdminMediaItem[];
  privacyGuarantee: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Encryption Keys, Recovery Backup, Device Trust, and Zero-Plaintext Server Storage Manager.
 */
export function EncryptionSettingsPanel() {
  const {
    status,
    session,
    securityStatus,
    setupEncryptionAndBackup,
    unlockWithRecoveryKey,
    refreshSecurityStatus,
  } = useMatrix();

  const [recoveryKeyInput, setRecoveryKeyInput] = React.useState("");
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [storage, setStorage] = React.useState<AdminStorageResponse | null>(null);
  const [loadingStorage, setLoadingStorage] = React.useState(false);

  const fetchStorageSnapshot = React.useCallback(async (): Promise<AdminStorageResponse | null> => {
    const params = new URLSearchParams();
    if (session?.mode === "local_poc") {
      params.set("pocUser", session.userId.includes("bob") ? "bob" : "alice");
    }
    const res = await fetch(`/api/matrix/media/admin?${params.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as AdminStorageResponse;
  }, [session]);

  const loadStorageInventory = React.useCallback(async () => {
    setLoadingStorage(true);
    try {
      setStorage(await fetchStorageSnapshot());
    } finally {
      setLoadingStorage(false);
    }
  }, [fetchStorageSnapshot]);

  React.useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    void fetchStorageSnapshot().then((data) => {
      if (!cancelled) setStorage(data);
    });
    return () => {
      cancelled = true;
    };
  }, [status, fetchStorageSnapshot]);

  const handleCreateRecovery = async () => {
    setFeedback(null);
    try {
      await setupEncryptionAndBackup();
      setFeedback("Cross-signing and encrypted 4S key backup initialized.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to initialize encryption");
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryKeyInput.trim()) return;
    setFeedback(null);
    try {
      await unlockWithRecoveryKey(recoveryKeyInput.trim());
      setRecoveryKeyInput("");
      setFeedback("Encrypted room & media keys restored into memory for this session.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Invalid recovery key");
    }
  };

  const handleDeleteBlob = async (mediaId: string) => {
    const params = new URLSearchParams({ mediaId });
    if (session?.mode === "local_poc") {
      params.set("pocUser", session.userId.includes("bob") ? "bob" : "alice");
    }
    const res = await fetch(`/api/matrix/media/admin?${params.toString()}`, { method: "DELETE" });
    if (res.ok) {
      await loadStorageInventory();
    }
  };

  const handleQuarantineBlob = async (mediaId: string) => {
    const res = await fetch("/api/matrix/media/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "quarantine",
        mediaId,
        pocUser: session?.mode === "local_poc" ? (session.userId.includes("bob") ? "bob" : "alice") : undefined,
      }),
    });
    if (res.ok) {
      await loadStorageInventory();
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            <h2 className="font-serif text-lg font-medium text-[var(--foreground)]">
              Media E2EE, Key Backup &amp; Storage Privacy
            </h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            All photos, videos, voice notes, and attachments are encrypted client-side with AES-256-CTR
            before reaching Synapse. Decryption keys stay exclusively on verified Sanctuary devices.
          </p>
        </div>

        {status === "ready" && (
          <Button type="button" size="sm" variant="ghost" onClick={() => void refreshSecurityStatus()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Refresh Trust</span>
          </Button>
        )}
      </div>

      {status !== "ready" ? (
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-xs text-[var(--muted-foreground)]">
          Open an encrypted room or configure your self-hosted Matrix Synapse environment to manage
          device keys, Secret Storage (4S), and ciphertext storage.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
              <p className="text-[var(--muted-foreground)]">Device Isolation Mode</p>
              <p className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                OnlySignedDevices (MSC4153)
              </p>
            </div>
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
              <p className="text-[var(--muted-foreground)]">Cross-Signing &amp; 4S</p>
              <p className="font-medium text-[var(--foreground)]">
                {securityStatus?.crossSigningReady && securityStatus?.secretStorageReady
                  ? "Active & Verified"
                  : "Needs Initialization"}
              </p>
            </div>
            <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
              <p className="text-[var(--muted-foreground)]">Encrypted Key Backup</p>
              <p className="font-medium text-[var(--foreground)]">
                {securityStatus?.backupVersion
                  ? `Version ${securityStatus.backupVersion}`
                  : "Not Enabled"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="primary" onClick={handleCreateRecovery}>
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {securityStatus?.secretStorageReady
                  ? "Rotate Recovery Key & Backup"
                  : "Create Recovery Key & Backup"}
              </span>
            </Button>
          </div>

          <form onSubmit={handleRestore} className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={recoveryKeyInput}
              onChange={(e) => setRecoveryKeyInput(e.target.value)}
              placeholder="Restore from Recovery Key (EsT...) to unlock past encrypted media"
              aria-label="Recovery key input"
              className="flex-1 min-w-[240px] h-9 rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-mono text-[var(--foreground)]"
            />
            <Button type="submit" size="sm" variant="secondary">
              Restore Session Keys
            </Button>
          </form>

          {feedback && (
            <p className="text-xs text-[var(--foreground)] bg-[var(--muted)]/50 rounded-md px-3 py-2">
              {feedback}
            </p>
          )}

          {securityStatus && securityStatus.ownDevices.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Registered Encryption Devices ({securityStatus.ownDevices.length})
              </h3>
              <ul className="space-y-1.5 text-xs">
                {securityStatus.ownDevices.map((dev) => (
                  <li
                    key={dev.deviceId}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
                  >
                    <span className="font-mono text-[var(--foreground)]">
                      {dev.deviceId}
                      {dev.deviceId === securityStatus.deviceId ? " (This Device)" : ""}
                    </span>
                    <span
                      className={
                        dev.verified
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-amber-600 dark:text-amber-400"
                      }
                    >
                      {dev.verified ? "Cross-signed & Trusted" : "Unverified"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Server Administrator Zero-Plaintext Storage Inventory */}
          <div className="space-y-2.5 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Encrypted Server Storage Audit (Zero Plaintext Preview)
                </h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loadingStorage}
                onClick={() => void loadStorageInventory()}
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>Refresh</span>
              </Button>
            </div>

            {storage ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Stored blobs: <strong className="text-[var(--foreground)]">{storage.totalFiles}</strong> ·
                  Total ciphertext: <strong className="text-[var(--foreground)]">{formatBytes(storage.totalBytes)}</strong> ·{" "}
                  <span>{storage.privacyGuarantee}</span>
                </p>
                {storage.media.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">No encrypted blobs stored.</p>
                ) : (
                  <div className="overflow-x-auto rounded-[var(--ds-radius)] border border-[var(--border)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--muted)]/50 text-[var(--muted-foreground)]">
                        <tr>
                          <th className="px-3 py-2 font-medium">Opaque Media ID</th>
                          <th className="px-3 py-2 font-medium">Stored Type</th>
                          <th className="px-3 py-2 font-medium">Filename</th>
                          <th className="px-3 py-2 font-medium">Size</th>
                          <th className="px-3 py-2 font-medium text-right">Storage Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {storage.media.map((item) => (
                          <tr key={item.mediaId}>
                            <td className="px-3 py-2 font-mono">{item.mediaId}</td>
                            <td className="px-3 py-2 font-mono text-[var(--muted-foreground)]">
                              {item.mimeType}
                            </td>
                            <td className="px-3 py-2 text-[var(--muted-foreground)]">
                              {item.uploadName ?? "none (stripped)"}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{formatBytes(item.bytes)}</td>
                            <td className="px-3 py-2 text-right space-x-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={Boolean(item.quarantinedBy)}
                                onClick={() => void handleQuarantineBlob(item.mediaId)}
                                title="Quarantine encrypted blob"
                              >
                                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">Quarantine</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleDeleteBlob(item.mediaId)}
                                title="Delete encrypted blob permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">Loading storage audit...</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

