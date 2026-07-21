import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

// Pass-through layout. The auth gate lives in (protected)/layout.tsx so that
// /admin/login (a sibling of the (protected) group) is NOT wrapped by it —
// gating here would redirect /admin/login onto itself in a loop.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
