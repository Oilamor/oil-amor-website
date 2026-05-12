import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BlendDetailClient from './blend-detail-client'
import { getBlendDetail, incrementBlendView } from '@/lib/community-blends/data'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const blend = await getBlendDetail(slug)
  
  if (!blend || blend.id.startsWith('demo-')) {
    return {
      title: 'Blend Not Found | Oil Amor',
    }
  }
  
  return {
    title: `${blend.name} by ${blend.creatorName} | Community Blends`,
    description: blend.description || `Discover ${blend.name}, a custom oil blend created by ${blend.creatorName} in the Oil Amor community.`,
  }
}

export default async function BlendDetailPage({ params }: Props) {
  const { slug } = await params
  const blend = await getBlendDetail(slug)
  
  if (!blend || blend.id.startsWith('demo-')) {
    notFound()
  }
  
  // Increment view count (fire and forget)
  incrementBlendView(blend.id).catch(() => {})
  
  return <BlendDetailClient blend={blend} />
}
