import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ConditionalLayout } from './components/conditional-layout'
import { GlobalAtmosphere } from './components/global-atmosphere'
// Cart is now handled by Zustand store in hooks/use-cart.tsx - no provider needed
import { UserProvider } from '@/lib/context/user-context'
import { HealthProfileProvider } from '@/lib/context/health-profile-context'
import { RecipeProvider } from '@/lib/context/recipe-context'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: true,
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f3ef' },
    { media: '(prefers-color-scheme: dark)', color: '#0a080c' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL('https://oilamor.com'),
  title: {
    default: 'Oil Amor — Essence Transcended',
    template: '%s | Oil Amor',
  },
  description: 'Essential oils that culminate in crystal jewelry. A journey from bottle to keepsake.',
  keywords: ['essential oils', 'crystal jewelry', 'aromatherapy', 'sustainable', 'luxury wellness'],
  authors: [{ name: 'Oil Amor' }],
  creator: 'Oil Amor',
  publisher: 'Oil Amor',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://oilamor.com',
    siteName: 'Oil Amor',
    title: 'Oil Amor — Essence Transcended',
    description: 'Essential oils that culminate in crystal jewelry. A journey from bottle to keepsake.',
    // og:image is generated dynamically by app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oil Amor — Essence Transcended',
    description: 'Essential oils that culminate in crystal jewelry.',
    creator: '@oilamor',
  },
  alternates: {
    canonical: 'https://oilamor.com',
  },
  category: 'luxury wellness',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      className={`${cormorant.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="preconnect" href="https://cdn.sanity.io" />
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />
      </head>
      <body className="font-body bg-[#0a080c] text-[#f5f3ef] antialiased">
        <GlobalAtmosphere />
        
        {/* Skip Link for Accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <UserProvider>
          <HealthProfileProvider>
            <RecipeProvider>
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </RecipeProvider>
          </HealthProfileProvider>
        </UserProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
