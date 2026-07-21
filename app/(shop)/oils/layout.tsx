import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Essential Oils',
  description:
    'Browse the full Oil Amor collection of pure, Australian-made essential oils — each paired with its crystal synergy.',
  alternates: { canonical: 'https://oilamor.com/oils' },
}

export default function OilsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
