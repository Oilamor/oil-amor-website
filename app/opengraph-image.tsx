import { ImageResponse } from 'next/og'
import { getSiteUrl } from '@/lib/utils'

export const runtime = 'edge'

export const alt = 'Oil Amor — Essential Oils That Transcend'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  const wordmarkUrl = `${getSiteUrl()}/images/logo/oil-amor-wordmark.png`

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a0f2e 0%, #3d2066 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wordmarkUrl}
          alt="Oil Amor"
          style={{
            width: '880px',
            objectFit: 'contain',
          }}
        />
        <div
          style={{
            fontSize: 34,
            color: '#e8d5a3',
            marginTop: '30px',
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}
        >
          Essential oils that transform into crystal jewelry
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
