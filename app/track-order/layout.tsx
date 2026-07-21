import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Track the status of your Oil Amor order and delivery.',
  alternates: { canonical: 'https://oilamor.com/track-order' },
}

export default function TrackOrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
