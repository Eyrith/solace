/**
 * Public (editorial) layout.
 * Wraps all www.example.com routes with the PublicShell.
 */

import { PublicShell } from '@/components/editorial/public-shell'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PublicShell>{children}</PublicShell>
}
