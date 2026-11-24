/**
 * Public (editorial) layout.
 * Wraps all www.example.com routes with the PublicShell.
 */

import { PublicShell } from '@/components/editorial/public-shell'

export default function PublicLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal?: React.ReactNode
}) {
  return (
    <PublicShell>
      {children}
      {modal}
    </PublicShell>
  )
}

