'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User,
  ShieldAlert,
  LogOut,
  Trash2,
  ArrowLeft,
  KeyRound,
  Save,
  FolderPlus,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatusBanner } from '@/components/ui/status-banner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EncryptionSettingsPanel } from '@/components/sanctuary/encryption-settings-panel'
import { SettingsTabs } from '@/components/sanctuary/settings-tabs'
import { useSanctuary } from '@/components/providers/sanctuary-provider'
import { createClient } from '@/lib/supabase/client'
import {
  getLocalSanctuaryState,
  resetLocalSanctuaryState,
  subscribeLocalSanctuary,
  updateLocalProfile,
} from '@/lib/sanctuary/local-store'

function SandboxSpaceManager({
  activeSpaceId,
  activeSpaceName,
  spaceCount,
  demoActor,
  partnerName,
  onRenameSpace,
  onCreateSpace,
  onSwitchActor,
  onNotice,
}: {
  activeSpaceId: string | null
  activeSpaceName: string
  spaceCount: number
  demoActor: 'self' | 'partner'
  partnerName: string
  onRenameSpace: (spaceId: string, name: string) => void
  onCreateSpace: (name: string, partnerName?: string) => Promise<unknown>
  onSwitchActor: (actor: 'self' | 'partner') => void
  onNotice: (message: string) => void
}) {
  const [spaceName, setSpaceName] = React.useState(activeSpaceName)
  const [newSpaceName, setNewSpaceName] = React.useState('')
  const [newPartnerName, setNewPartnerName] = React.useState('')
  const [creatingSpace, setCreatingSpace] = React.useState(false)

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSpaceId || !spaceName.trim()) return
    onRenameSpace(activeSpaceId, spaceName.trim())
    onNotice(`Renamed space to "${spaceName.trim()}".`)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return
    setCreatingSpace(true)
    try {
      await onCreateSpace(newSpaceName.trim(), newPartnerName.trim() || undefined)
      onNotice(`Created sanctuary space "${newSpaceName.trim()}".`)
      setNewSpaceName('')
      setNewPartnerName('')
    } finally {
      setCreatingSpace(false)
    }
  }

  return (
    <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-[var(--primary)]" />
            <span>Sanctuary Spaces &amp; Test Perspective</span>
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Managing {spaceCount} local sanctuary space{spaceCount === 1 ? '' : 's'} stored in this browser.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-[var(--ds-radius)] border border-[var(--border)] p-1 text-xs">
          <button
            type="button"
            onClick={() => onSwitchActor('self')}
            className={`px-2.5 py-1 rounded-[var(--ds-radius)] cursor-pointer transition-colors ${
              demoActor === 'self'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Act as You
          </button>
          <button
            type="button"
            onClick={() => onSwitchActor('partner')}
            className={`px-2.5 py-1 rounded-[var(--ds-radius)] cursor-pointer transition-colors ${
              demoActor === 'partner'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Act as {partnerName}
          </button>
        </div>
      </div>

      {activeSpaceId && (
        <form onSubmit={handleRename} className="flex flex-col sm:flex-row gap-2.5 items-end text-xs">
          <div className="flex-1 w-full space-y-1">
            <Label htmlFor="sandbox-space-rename">Active Sanctuary Name</Label>
            <Input
              id="sandbox-space-rename"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              maxLength={60}
              required
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Rename Space
          </Button>
        </form>
      )}

      <form
        onSubmit={handleCreate}
        className="pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end text-xs"
      >
        <div className="space-y-1">
          <Label htmlFor="sandbox-new-space">New Space Name</Label>
          <Input
            id="sandbox-new-space"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            placeholder="e.g. Weekend Cabin"
            maxLength={60}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sandbox-new-partner">Partner Label</Label>
          <Input
            id="sandbox-new-partner"
            value={newPartnerName}
            onChange={(e) => setNewPartnerName(e.target.value)}
            placeholder="e.g. Elena"
            maxLength={50}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={creatingSpace}
          disabled={!newSpaceName.trim()}
        >
          Create Sanctuary Space
        </Button>
      </form>
    </div>
  )
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const {
    spaces,
    activeSpace,
    activeSpaceId,
    demoActor,
    setDemoActor,
    renameSpace,
    createSpace,
  } = useSanctuary()
  const [configured, setConfigured] = React.useState(false)
  const [loadingAccount, setLoadingAccount] = React.useState(true)
  const [email, setEmail] = React.useState<string>('')
  const [primaryRole, setPrimaryRole] = React.useState<string>('Member')
  const [spacesCount, setSpacesCount] = React.useState<number>(0)
  const [displayName, setDisplayName] = React.useState('')
  const [partnerDisplayName, setPartnerDisplayName] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [profileNotice, setProfileNotice] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [deletingAccount, setDeletingAccount] = React.useState(false)
  const [revoking, setRevoking] = React.useState(false)
  const [revokedSuccess, setRevokedSuccess] = React.useState(false)

  React.useEffect(() => {
    let active = true
    let unsubscribeLocal: (() => void) | undefined

    fetch('/api/account/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.configured) {
          setConfigured(true)
          if (data.user?.email) setEmail(data.user.email)
          if (data.profile?.display_name) setDisplayName(data.profile.display_name)
          if (data.profile?.bio) setBio(data.profile.bio)
          if (data.primaryRole) {
            setPrimaryRole(data.primaryRole === 'owner' ? 'Space Creator' : 'Partner')
          }
          if (typeof data.spacesCount === 'number') setSpacesCount(data.spacesCount)
          return
        }

        const applyLocal = () => {
          if (!active) return
          const local = getLocalSanctuaryState()
          setConfigured(false)
          setEmail(local.profile.email)
          setDisplayName(local.profile.selfDisplayName)
          setPartnerDisplayName(local.profile.partnerDisplayName)
          setBio(local.profile.bio)
          setSpacesCount(local.spaces.length)
        }
        applyLocal()
        unsubscribeLocal = subscribeLocalSanctuary(applyLocal)
      })
      .catch(() => {
        if (!active) return
        const local = getLocalSanctuaryState()
        setDisplayName(local.profile.selfDisplayName)
        setPartnerDisplayName(local.profile.partnerDisplayName)
        setBio(local.profile.bio)
        setEmail(local.profile.email)
        setSpacesCount(local.spaces.length)
        unsubscribeLocal = subscribeLocalSanctuary(() => {
          const next = getLocalSanctuaryState()
          setDisplayName(next.profile.selfDisplayName)
          setPartnerDisplayName(next.profile.partnerDisplayName)
          setBio(next.profile.bio)
          setEmail(next.profile.email)
          setSpacesCount(next.spaces.length)
        })
      })
      .finally(() => {
        if (active) setLoadingAccount(false)
      })

    return () => {
      active = false
      unsubscribeLocal?.()
    }
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    setProfileNotice(null)
    setSavingProfile(true)

    try {
      if (!configured) {
        updateLocalProfile({
          selfDisplayName: displayName.trim() || 'You',
          partnerDisplayName: partnerDisplayName.trim() || 'Partner',
          bio: bio.trim(),
        })
        setProfileNotice('Profile and partner identity saved locally in your browser workspace.')
        return
      }

      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio: bio || null }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setActionError(payload?.detail || payload?.error || 'Could not save profile.')
        return
      }
      setProfileNotice('Profile saved to your account.')
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {}
    router.push('/')
    router.refresh()
  }

  const handleRevokeSessions = async () => {
    setActionError(null)
    setRevokedSuccess(false)
    setRevoking(true)
    try {
      const res = await fetch('/api/account/revoke', { method: 'POST' })
      const payload = await res.json()
      if (!res.ok) {
        setActionError(
          payload?.detail || payload?.error || 'Unable to revoke external sessions.',
        )
        return
      }
      setRevokedSuccess(true)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke sessions.')
    } finally {
      setRevoking(false)
    }
  }

  const handleDeleteAccount = async () => {
    setActionError(null)
    if (!configured) {
      resetLocalSanctuaryState()
      setDeleteModalOpen(false)
      setProfileNotice('Local sandbox workspace reset to starter defaults.')
      router.refresh()
      return
    }

    setDeletingAccount(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) {
        setActionError(
          payload?.detail || payload?.error || 'Unable to delete account right now.',
        )
        setDeleteModalOpen(false)
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut().catch(() => {})
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Account deletion failed.')
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
      <div className="border-b border-[var(--border)] pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sanctuary</span>
          </Link>
          {!configured && !loadingAccount && (
            <Badge variant="outline" className="text-[11px] font-normal">
              Local Sandbox Mode
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <h1 className="font-[family-name:var(--ds-font-display)] text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Account &amp; Security Controls
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Session integrity, local workspace identity, device revocation, and irreversible termination.
          </p>
        </div>

        <SettingsTabs />
      </div>

      {actionError && (
        <StatusBanner tone="error" title="Account Action Issue" description={actionError} />
      )}

      {profileNotice && (
        <StatusBanner tone="success" title="Updated" description={profileNotice} />
      )}

      <div className="space-y-6">
        {/* Profile Card */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--primary)]" />
              <span>Profile Identity</span>
            </h2>
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {loadingAccount
                ? 'Loading...'
                : configured
                  ? `${primaryRole} · ${spacesCount} space${spacesCount === 1 ? '' : 's'}`
                  : `Local Sandbox · ${spaces.length} space${spaces.length === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="account-display-name">Your Display Name</Label>
              <Input
                id="account-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your sanctuary name"
                maxLength={50}
                required
              />
            </div>

            {!configured ? (
              <div className="space-y-1.5">
                <Label htmlFor="account-partner-name">Default Partner Name</Label>
                <Input
                  id="account-partner-name"
                  value={partnerDisplayName}
                  onChange={(e) => setPartnerDisplayName(e.target.value)}
                  placeholder="Partner name for sandbox mode"
                  maxLength={50}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="account-email">Signed-in Email</Label>
                <Input
                  id="account-email"
                  value={email || 'Authenticated session'}
                  readOnly
                  disabled
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <Label htmlFor="account-bio">Quiet Bio / Status Note</Label>
            <Input
              id="account-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Optional note visible only to your private partner"
              maxLength={300}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="outline" size="sm" isLoading={savingProfile}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              <span>Save Profile</span>
            </Button>
          </div>
        </form>

        {/* Local Sandbox Spaces & Actor Switcher */}
        {!configured && (
          <SandboxSpaceManager
            key={activeSpace?.id ?? 'default'}
            activeSpaceId={activeSpaceId}
            activeSpaceName={activeSpace?.name ?? 'Private Sanctuary'}
            spaceCount={spaces.length}
            demoActor={demoActor}
            partnerName={partnerDisplayName || activeSpace?.partner?.displayName || 'Partner'}
            onRenameSpace={renameSpace}
            onCreateSpace={createSpace}
            onSwitchActor={setDemoActor}
            onNotice={setProfileNotice}
          />
        )}

        {/* Matrix E2EE Key Management & Zero-Plaintext Storage */}
        <EncryptionSettingsPanel />

        {/* Sessions & Security */}
        <div className="rounded-[var(--ds-radius)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--primary)]" />
                <span>Session Revocation</span>
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] max-w-md leading-relaxed">
                {configured
                  ? 'If you suspect another browser or device has an open tab, you can immediately invalidate all other active refresh tokens.'
                  : 'Remote device token revocation becomes active once Supabase auth is configured. You can still return to the Commonplace reader anytime.'}
              </p>
            </div>
          </div>

          {revokedSuccess && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              All external sessions revoked successfully.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeSessions}
                isLoading={revoking}
              >
                <span>Revoke Other Devices</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              <span>{configured ? 'Sign Out' : 'Exit to Commonplace'}</span>
            </Button>
          </div>
        </div>

        {/* Danger Zone: Account Deletion / Sandbox Reset */}
        <div className="rounded-[var(--ds-radius)] border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>
                {configured
                  ? 'Danger Zone: Permanent Account Deletion'
                  : 'Danger Zone: Reset Local Sandbox'}
              </span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {configured
                ? 'Permanently purges your profile, leaves all private spaces, and hard-deletes your personal notes from the database. This action is irreversible.'
                : 'Restore all local messages, daily reflections, games, memories, calendar dates, and calls back to clean starter defaults.'}
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            disabled={deletingAccount}
          >
            {configured ? (
              <>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                <span>Delete My Account Permanently</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                <span>Reset Local Sandbox Data</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={
          configured
            ? 'Permanently Delete Your Account?'
            : 'Reset Local Sandbox Data?'
        }
        description={
          configured
            ? 'Are you absolutely certain? This will immediately remove your auth identity, personal notes, membership in private spaces, and profile credentials. Expired disappearing messages cannot be recovered.'
            : 'This clears any local messages, memories, games, and calendar milestones stored in this browser and restores starter sample entries.'
        }
        confirmLabel={
          deletingAccount
            ? 'Deleting...'
            : configured
              ? 'Yes, Delete Permanently'
              : 'Reset Sandbox Defaults'
        }
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
