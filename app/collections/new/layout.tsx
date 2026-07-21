import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Arrivals',
  description: 'The latest essential oils and blends from Oil Amor.',
  alternates: { canonical: 'https://oilamor.com/collections/new' },
}

export default function NewCollectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
