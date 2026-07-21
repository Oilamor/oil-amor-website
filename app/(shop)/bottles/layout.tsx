import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bottles',
  description:
    'MIRON violetglass bottles and closures for your Oil Amor blends — UV-protective glass in 5ml to 30ml sizes.',
  alternates: { canonical: 'https://oilamor.com/bottles' },
}

export default function BottlesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
