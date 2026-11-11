/**
 * Public homepage — editorial portal landing page.
 * Server Component: fetches featured articles and publication strips.
 */

export const revalidate = 3600 // ISR: revalidate every hour

export default function PublicHomePage() {
  return (
    <main className="min-h-screen">
      {/* Placeholder until Division 05 (Public Portal) */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <p className="text-muted-foreground text-sm">
          Editorial portal — coming in Division 05.
        </p>
      </div>
    </main>
  )
}
