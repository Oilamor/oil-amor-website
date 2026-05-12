import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Journal | Oil Amor',
  description: 'Exploring essential oils, crystal healing, and the art of intentional living.',
}

const journalEntries = [
  {
    id: 'lavender-sleep-ritual',
    title: 'The Lavender Sleep Ritual',
    excerpt: 'How True Lavender essential oil can transform your evening routine and deepen your rest.',
    category: 'Rituals',
    date: 'March 2026',
    readTime: '5 min read',
  },
  {
    id: 'crystals-intention',
    title: 'Choosing Crystals with Intention',
    excerpt: 'A guide to selecting the crystal that resonates with your current journey.',
    category: 'Crystals',
    date: 'February 2026',
    readTime: '7 min read',
  },
  {
    id: 'sustainable-beauty',
    title: 'The Future of Sustainable Beauty',
    excerpt: 'Why we chose refillable Miron glass and forever bottles for our collection.',
    category: 'Sustainability',
    date: 'January 2026',
    readTime: '4 min read',
  },
  {
    id: 'eucalyptus-focus',
    title: 'Eucalyptus for Clarity',
    excerpt: 'How this ancient remedy can clear your space and sharpen your mind.',
    category: 'Essential Oils',
    date: 'January 2026',
    readTime: '6 min read',
  },
  {
    id: 'morning-rituals',
    title: 'Morning Rituals for Grounding',
    excerpt: 'Simple practices to start your day with intention and presence.',
    category: 'Wellness',
    date: 'December 2025',
    readTime: '5 min read',
  },
]

export default function JournalPage() {
  return (
    <div className="min-h-screen bg-[#0a080c] pt-32 pb-32">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20 lg:mb-32 text-center">
          <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] block mb-6">
            The Journal
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#f5f3ef] leading-[1.1] mb-6">
            Thoughts & <span className="italic text-[#c9a227]">Reflections</span>
          </h1>
          <p className="text-[#a69b8a] max-w-xl mx-auto leading-relaxed">
            Exploring essential oils, crystal healing, and the art of intentional living. 
            Written from our atelier on the Central Coast.
          </p>
        </div>

        {/* Journal Entries */}
        <div className="space-y-16">
          {journalEntries.map((entry) => (
            <article key={entry.id} className="group">
              <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-12">
                {/* Meta */}
                <div className="md:w-32 flex-shrink-0">
                  <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#c9a227]">
                    {entry.category}
                  </span>
                  <p className="text-[0.75rem] text-[#a69b8a] mt-2">
                    {entry.date}
                  </p>
                  <p className="text-[0.75rem] text-[#a69b8a]">
                    {entry.readTime}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 border-b border-[#262228] pb-12">
                  <h2 className="font-display text-2xl md:text-3xl text-[#f5f3ef] mb-4">
                    {entry.title}
                  </h2>
                  <p className="text-[#a69b8a] leading-relaxed">
                    {entry.excerpt}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-32 pt-20 border-t border-[#262228] text-center">
          <span className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] block mb-4">
            Stay Connected
          </span>
          <h3 className="font-display text-2xl text-[#f5f3ef] mb-4">
            Journal entries delivered to your inbox
          </h3>
          <p className="text-[#a69b8a] mb-8 max-w-md mx-auto">
            Monthly reflections on oils, crystals, and intentional living. No spam, ever.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 px-4 py-3 bg-[#141218] border border-[#262228] text-[#f5f3ef] placeholder:text-[#a69b8a] focus:outline-none focus:border-[#c9a227] transition-colors"
            />
            <button type="submit" className="btn-luxury">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
