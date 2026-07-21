import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mixing Atelier',
  description:
    'Craft your own bespoke essential oil blend in the Oil Amor Mixing Atelier — choose your oils, carrier, and bottle.',
  alternates: { canonical: 'https://oilamor.com/mixing-atelier' },
}

export default function MixingAtelierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
