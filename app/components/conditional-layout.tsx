'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './navigation'
import { Footer } from './layout/Footer'
import { LaunchBanner } from './launch-banner'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  if (isAdminRoute) {
    // Admin pages have their own full-screen layout — no site nav/footer
    return <>{children}</>
  }

  return (
    <>
      <Navigation />
      <LaunchBanner />
      <main id="main-content" className="relative">
        {children}
      </main>
      <Footer />
    </>
  )
}
