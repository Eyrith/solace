/**
 * Private (sanctuary) layout.
 * Wraps all app.example.com routes with PrivateShell.
 * Authentication is enforced by middleware before this layout renders.
 */

import { MatrixProvider } from '@/components/providers/matrix-provider'
import { SanctuaryProvider } from '@/components/providers/sanctuary-provider'
import { SanctuaryShell } from '@/components/sanctuary/sanctuary-shell'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SanctuaryProvider>
      <MatrixProvider>
        <SanctuaryShell>{children}</SanctuaryShell>
      </MatrixProvider>
    </SanctuaryProvider>
  )
}

