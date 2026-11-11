/**
 * Private (sanctuary) layout.
 * Wraps all app.example.com routes with PrivateShell.
 * Authentication is enforced by middleware before this layout renders.
 */

import { PrivateShell } from '@/components/sanctuary/private-shell'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PrivateShell>{children}</PrivateShell>
}
