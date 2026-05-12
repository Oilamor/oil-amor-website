import { Metadata } from 'next'
import { getAllOils, getAllCrystals } from '@/lib/content/oil-crystal-synergies'

export const metadata: Metadata = {
  title: 'Our Story | Oil Amor',
  description: 'Born on the Central Coast of NSW, Oil Amor creates essential oil and crystal pairings for intentional living.',
}

export default function AboutPage() {
  const oilCount = getAllOils().length
  const crystalCount = getAllCrystals().length

  return (
    <div className="min-h-screen bg-[#0a080c] pt-32 pb-32">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] block mb-6">
            Our Story
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#f5f3ef] leading-[1.1] mb-8">
            Rooted in <span className="italic text-[#c9a227]">Intention</span>
          </h1>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-[#a69b8a] leading-relaxed text-xl mb-8">
            In 2026, nestled on the pristine Central Coast of NSW, we witnessed a contradiction. 
            The wellness industry celebrated mindfulness and sustainability, yet its products were 
            designed for disposal.
          </p>

          <p className="text-[#f5f3ef]/80 leading-relaxed mb-8">
            Oil Amor was born from a simple belief: that the objects we use daily should be as 
            intentional as the practices they support. Our essential oils are sourced from 
            sustainable farms. Our crystals are ethically mined. And our forever bottles are 
            designed to last a lifetime.
          </p>

          <div className="my-16 p-8 border border-[#262228] bg-[#141218]/50">
            <blockquote className="font-display text-2xl text-[#f5f3ef] italic mb-4">
              &ldquo;Every drop holds intention. Every crystal carries energy. Together, they create 
              something greater than the sum of their parts.&rdquo;
            </blockquote>
            <cite className="text-[#a69b8a] not-italic">— The Oil Amor Atelier</cite>
          </div>

          <p className="text-[#f5f3ef]/80 leading-relaxed mb-8">
            We are not a wellness brand in the traditional sense. We are artisans, creating 
            tools for those who understand that true luxury lies in mindful consumption. Each 
            oil is paired with crystals selected for their complementary energies. Each bottle 
            is designed to be refilled, not discarded.
          </p>

          <p className="text-[#f5f3ef]/80 leading-relaxed">
            From our atelier on the Central Coast, we serve a community that values substance 
            over trends, sustainability over convenience, and intention over impulse. Welcome 
            to Oil Amor.
          </p>
        </div>

        {/* Stats — dynamically sourced from canonical data */}
        <div className="mt-20 pt-20 border-t border-[#262228] grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <span className="font-display text-4xl text-[#c9a227] block mb-2">{oilCount}</span>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a]">Essential Oils</span>
          </div>
          <div className="text-center">
            <span className="font-display text-4xl text-[#c9a227] block mb-2">{crystalCount}</span>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a]">Crystal Varieties</span>
          </div>
          <div className="text-center">
            <span className="font-display text-4xl text-[#c9a227] block mb-2">∞</span>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a]">Refills</span>
          </div>
          <div className="text-center">
            <span className="font-display text-4xl text-[#c9a227] block mb-2">1</span>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a]">Planet</span>
          </div>
        </div>
      </div>
    </div>
  )
}
