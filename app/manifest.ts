import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oil Amor — Essential Oils That Transcend',
    short_name: 'Oil Amor',
    description: 'Essential oils that transform into crystal jewelry.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f6f3',
    theme_color: '#1a0f2e',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
