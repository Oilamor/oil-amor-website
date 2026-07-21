import Link from 'next/link'

export default function OilNotFound() {
  return (
    <div className="min-h-screen bg-miron-void flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <span className="text-8xl text-gold-pure/30 font-display block mb-4">
          404
        </span>
        <h1 className="font-display text-4xl lg:text-5xl text-white mb-6">
          Oil Not Found
        </h1>
        <p className="text-white/60 mb-8 text-lg">
          This essence is no longer in the collection — or never was. Explore our oils to find your match.
        </p>
        <Link
          href="/oils"
          className="inline-flex items-center gap-2 px-8 py-4 border border-gold-pure text-gold-pure text-sm uppercase tracking-wide hover:bg-gold-pure hover:text-miron-void transition-colors"
        >
          Browse All Oils
        </Link>
      </div>
    </div>
  )
}
