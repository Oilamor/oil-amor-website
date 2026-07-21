'use client'

// ============================================================================
// SECTION: Atelier Page Header
// ============================================================================
import { FlaskConical, Info } from 'lucide-react'
import { Tooltip } from '@/app/components/tooltip'

export function AtelierHeader({ onEditProfile }: { onEditProfile: () => void }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-5 h-5 text-[#c9a227]" />
          <span className="text-xs text-[#c9a227] uppercase tracking-[0.2em]">The Atelier</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-[#f5f3ef]">
          Mixing <span className="text-[#c9a227]">Atelier</span>
        </h1>
        <p className="text-[#a69b8a] mt-2">
          Create your own custom essential oil blends with precise milliliter measurements.
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onEditProfile}
          className="px-4 py-2 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-[#a69b8a] text-sm hover:border-[#c9a227]/30 transition-colors"
        >
          Edit Health Profile
        </button>
        <Tooltip content="Keyboard shortcuts: Ctrl+S to save, Ctrl+Enter to add to cart, +/- to adjust oils" position="bottom">
          <button className="w-10 h-10 rounded-full bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
