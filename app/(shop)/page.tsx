import type { Metadata } from 'next'
import { HeroSection } from '../components/hero-section'
import { CodexSection } from '../components/codex-section'
import { LaboratorySection } from '../components/laboratory-section'
import { CommunityStrip } from '../components/community-strip'
import { CircleSection } from '../components/circle-section'
import { AwakeningSection } from '../components/awakening-section'
import { AscensionSection } from '../components/ascension-section'

export const metadata: Metadata = {
  title: { absolute: 'Oil Amor — Essence Transcended' },
  description:
    'Essential oils that culminate in crystal jewelry. Shop luxury Australian-made essential oils, bespoke blends, and the Forever Bottle refill program.',
  alternates: { canonical: 'https://oilamor.com' },
  openGraph: {
    title: 'Oil Amor — Essence Transcended',
    description:
      'Essential oils that culminate in crystal jewelry. A journey from bottle to keepsake.',
    url: 'https://oilamor.com',
  },
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CodexSection />
      <LaboratorySection />
      <CommunityStrip />
      <CircleSection />
      <AwakeningSection />
      <AscensionSection />
    </>
  )
}
