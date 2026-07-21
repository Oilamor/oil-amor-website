import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review your Oil Amor cart and proceed to checkout.',
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
