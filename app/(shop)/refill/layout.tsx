import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forever Bottle Refills',
  description:
    'Refill your Oil Amor Forever Bottle — same blend, less waste. Sustainable refills delivered to your door.',
  alternates: { canonical: 'https://oilamor.com/refill' },
}

export default function RefillLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
