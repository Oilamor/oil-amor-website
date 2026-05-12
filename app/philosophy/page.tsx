import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Philosophy | Oil Amor',
  description: 'We do not sell oils. We craft vessels of transformation that become keepsakes of your journey. Discover the Oil Amor philosophy.',
  openGraph: {
    title: 'Our Philosophy | Oil Amor',
    description: 'We craft vessels of transformation that become keepsakes of your journey.',
    type: 'article',
  },
}

export default function PhilosophyPage() {
  return (
    <div className="min-h-screen bg-[#0a080c]">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse at 30% 50%, rgba(90, 61, 140, 0.4) 0%, transparent 60%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-8 block">
            Our Philosophy
          </span>
          
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl text-[#f5f3ef] leading-[1.1] mb-8">
            We questioned the
            <br />
            <em className="text-[#c9a227] not-italic">disposability</em> of beauty.
          </h1>
          
          <blockquote className="text-xl lg:text-2xl text-[#a69b8a] leading-relaxed max-w-2xl mx-auto">
            &ldquo;What if the vessel that carries your wellness ritual could become a talisman you wear?&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="py-24 lg:py-32 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
            {[
              {
                num: '01',
                title: 'Miron Violetglass',
                description: 'Biophotonic violet glass filters harmful light while allowing beneficial violet and infrared rays to penetrate — preserving your oil\'s potency while creating an object of obsidian beauty.',
                points: ['Filters UV-A and UV-B rays', 'Allows violet and infrared', 'Preserves potency for years'],
              },
              {
                num: '02',
                title: 'Drilled Crystal Chips',
                description: 'Each bottle contains ethically-sourced crystal chips with precision-drilled holes. Amethyst. Rose Quartz. Citrine. Clear Quartz. They rest in the oil, absorbing its essence.',
                points: ['Ethically sourced from certified mines', 'Precision-drilled 1mm holes', 'Paired by energetic resonance'],
              },
              {
                num: '03',
                title: 'The Transformation',
                description: 'When the final drop is spent, the journey begins. Thread the crystals using the included silk cord. Create your bracelet, your necklace, your personal amulet — scented with memory.',
                points: ['Included silk threading cord', 'Crystals retain oil essence', 'Refill program available'],
              },
            ].map((pillar) => (
              <div key={pillar.num} className="relative">
                <span className="font-display text-8xl text-[#c9a227]/10 absolute -top-8 -left-4">
                  {pillar.num}
                </span>
                <div className="relative">
                  <h2 className="font-display text-2xl lg:text-3xl text-[#f5f3ef] mb-4">
                    {pillar.title}
                  </h2>
                  <p className="text-[#a69b8a] leading-relaxed mb-6">
                    {pillar.description}
                  </p>
                  <ul className="space-y-2 text-[#f5f3ef]/80">
                    {pillar.points.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c9a227]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 lg:py-32 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-6 block">
                Our Story
              </span>
              
              <h2 className="font-display text-3xl lg:text-5xl text-[#f5f3ef] leading-[1.15] mb-8">
                Born from a simple
                <br />
                <em className="text-[#c9a227] not-italic">observation</em>
              </h2>
              
              <div className="space-y-6 text-[#a69b8a] leading-relaxed">
                <p>
                  In 2026, nestled on the pristine Central Coast of NSW, we witnessed a contradiction. The wellness industry celebrated mindfulness and sustainability, yet its products were designed for disposal.
                </p>
                <p>
                  Beautiful glass bottles — crafted to protect precious oils — were discarded without a second thought. Crystals, millions of years in the making, thrown away when their container emptied.
                </p>
                <p className="text-[#f5f3ef]">
                  Oil Amor was born from this question.
                </p>
              </div>
            </div>
            
            <div className="relative aspect-[4/5] bg-[#141218] overflow-hidden">
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(90, 61, 140, 0.3) 0%, rgba(201, 162, 39, 0.1) 100%)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-9xl text-[#c9a227]/20 italic">
                  O
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 lg:py-32 border-t border-[#1c181f]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-6 block">
              Our Values
            </span>
            <h2 className="font-display text-3xl lg:text-5xl text-[#f5f3ef]">
              Principles that guide us
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Sustainability', desc: 'Every bottle is designed for infinite refills. Every crystal finds new purpose. Zero waste is our goal.' },
              { title: 'Transparency', desc: 'We share the origin of every oil and crystal. Fair wages. Complete traceability. No middlemen.' },
              { title: 'Ritual', desc: 'We believe in the power of intentional practice. Every product is designed to deepen your daily rituals.' },
              { title: 'Beauty', desc: 'Function and form are inseparable. Objects of utility should be objects of desire.' },
            ].map((v) => (
              <div key={v.title} className="text-center">
                <h3 className="font-display text-xl text-[#f5f3ef] mb-4">{v.title}</h3>
                <p className="text-[#a69b8a] text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="py-24 lg:py-32 border-t border-[#1c181f]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <span className="font-display text-[10rem] lg:text-[15rem] text-[#c9a227]/10 leading-none block -mb-32 lg:-mb-48">
            &ldquo;
          </span>
          <blockquote className="relative z-10">
            <p className="font-display text-2xl lg:text-4xl text-[#f5f3ef] leading-[1.3] mb-8">
              We do not sell oils.
              <br />
              <span className="text-[#c9a227]">We craft vessels of transformation</span>
              <br />
              that become keepsakes of your journey.
            </p>
            <footer className="flex items-center justify-center gap-4">
              <div className="w-12 h-px bg-[#c9a227]/30" />
              <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a]">
                Oil Amor Manifesto
              </span>
              <div className="w-12 h-px bg-[#c9a227]/30" />
            </footer>
          </blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 lg:py-32 border-t border-[#1c181f]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-display text-3xl lg:text-5xl text-[#f5f3ef] mb-6">
            Begin your transformation
          </h2>
          <p className="text-[#a69b8a] mb-12 max-w-xl mx-auto">
            Explore our collection of essential oils and crystal pairings, each designed to become a treasured part of your journey.
          </p>
          <a href="/oils" className="btn-luxury inline-block">
            Explore the Collection
          </a>
        </div>
      </section>

    </div>
  )
}
