'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Palette, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const SETTINGS_NAV_ITEMS = [
  { href: '/settings/appearance', label: 'Appearance', icon: Palette },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/account', label: 'Account & Security', icon: Shield },
] as const

/**
 * Shared sub-navigation tabs across Sanctuary settings routes.
 */
export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
      {SETTINGS_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-[var(--ds-radius)] border px-3.5 py-2 text-xs font-medium transition-colors',
              active
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

