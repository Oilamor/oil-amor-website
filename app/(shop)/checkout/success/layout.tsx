import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order Confirmed',
  description: 'Thank you — your Oil Amor order has been received.',
  robots: { index: false, follow: false },
}

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
