import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOilByHandle, getOilById, getAllOils } from '@/lib/content/oil-crystal-synergies'
import OilPageClient from './oil-page-client'

// Map URL slugs to oil IDs for legacy URLs
const SLUG_TO_OIL_ID: Record<string, string> = {
  'lavender-essential-oil': 'lavender',
  'blue-mallee-eucalyptus': 'eucalyptus',
  'tea-tree-oil': 'tea-tree',
  'clove-bud-oil': 'clove-bud',
  'lemongrass-oil': 'lemongrass',
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const oilData = getOilByHandle(slug)

  const title = oilData?.commonName || 'Essential Oil'
  const description = oilData?.description || ''

  return {
    title: `${title} | Oil Amor`,
    description: description.slice(0, 160),
    openGraph: {
      title: `${title} | Oil Amor`,
      description: description.slice(0, 160),
      images: oilData ? [oilData.image] : undefined,
    },
  }
}

// Generate static params for ALL oils
export async function generateStaticParams() {
  const allOils = getAllOils()
  return allOils.map(oil => ({
    slug: oil.handle || oil.id
  }))
}

export default async function OilPage({ params }: Props) {
  const { slug } = await params;
  // Try to get oil by handle first, then by ID mapping
  let oilData = getOilByHandle(slug)

  if (!oilData) {
    const oilId = SLUG_TO_OIL_ID[slug]
    if (oilId) {
      oilData = getOilById(oilId)
    } else {
      oilData = getOilById(slug)
    }
  }

  if (!oilData) {
    notFound()
  }

  return (
    <OilPageClient
      slug={slug}
    />
  )
}
