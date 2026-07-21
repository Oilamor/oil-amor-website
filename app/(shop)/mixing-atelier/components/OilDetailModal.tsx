'use client'

// ============================================================================
// COMPONENT: Comprehensive Oil Detail Modal
// ============================================================================
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Award,
  Beaker,
  BookOpen,
  Brain,
  CheckCircle,
  Droplets,
  FlaskConical,
  Globe,
  Heart,
  History,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { AtelierOil } from '@/lib/atelier/atelier-engine'
import { getOilWisdom } from '@/lib/atelier/oil-wisdom'
import { BlendMode, formatDrops, getMlDecimals } from '../atelier-utils'

export function OilDetailModal({
  oil,
  isOpen,
  onClose,
  onAddOil,
  isAdded,
  currentMl,
  mode,
}: {
  oil: AtelierOil | null
  isOpen: boolean
  onClose: () => void
  onAddOil: (oilId: string) => void
  isAdded: boolean
  currentMl: number
  mode: BlendMode
}) {
  if (!isOpen || !oil) return null
  
  const wisdom = getOilWisdom(oil.id)
  const pricePerMl = oil.collectionPrice30ml / 30
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#111] border border-[#f5f3ef]/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with oil color banner */}
          <div className="relative h-32" style={{ backgroundColor: oil.color }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111]" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-6">
              <h2 className="text-3xl font-serif text-white drop-shadow-lg">{oil.name}</h2>
              <p className="text-white/80 text-sm">{oil.botanicalName}</p>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-128px)]">
            {/* Quick Info Bar */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#c9a227]" />
                <span className="text-sm text-[#a69b8a]">Origin: <span className="text-[#f5f3ef]">{oil.origin || 'Various'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#c9a227]" />
                <span className="text-sm text-[#a69b8a]">Extraction: <span className="text-[#f5f3ef]">{oil.extractionMethod || 'Steam Distilled'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c9a227]" />
                <span className="text-sm text-[#a69b8a]">Rarity: <span className="text-[#f5f3ef] capitalize">{oil.rarity}</span></span>
              </div>
              {oil.certification && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#c9a227]" />
                  <span className="text-sm text-[#a69b8a]">Cert: <span className="text-[#f5f3ef]">{oil.certification}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-[#a69b8a]">Price:</span>
                <span className="text-lg font-medium text-[#c9a227]">${pricePerMl.toFixed(2)}/ml</span>
              </div>
            </div>
            
            {wisdom ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Description */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#c9a227]" />
                      Essence
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed italic">
                      &ldquo;{wisdom.description.short}&rdquo;
                    </p>
                  </section>
                  
                  {/* Scientific */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Beaker className="w-5 h-5 text-[#c9a227]" />
                      Scientific Understanding
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed">
                      {wisdom.description.scientific}
                    </p>
                    {wisdom.constituents && (
                      <div className="mt-3 p-3 rounded-lg bg-[#0a080c]">
                        <p className="text-xs text-[#c9a227] font-medium mb-1">Key Constituents:</p>
                        <p className="text-xs text-[#a69b8a]">{wisdom.constituents.primary.join(', ')}</p>
                      </div>
                    )}
                  </section>
                  
                  {/* Physical Benefits */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#c9a227]" />
                      Physical Properties
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed">
                      {wisdom.description.physical}
                    </p>
                  </section>
                  
                  {/* Traditional Uses */}
                  {wisdom.traditionalUses && (
                    <section>
                      <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                        <History className="w-5 h-5 text-[#c9a227]" />
                        Ancient Wisdom
                      </h3>
                      <p className="text-[#a69b8a] text-sm leading-relaxed mb-2">
                        {wisdom.traditionalUses.history}
                      </p>
                      {wisdom.traditionalUses.cultures && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {wisdom.traditionalUses.cultures.map(culture => (
                            <span key={culture} className="text-xs px-2 py-1 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                              {culture}
                            </span>
                          ))}
                        </div>
                      )}
                      {wisdom.traditionalUses.folklore && (
                        <p className="text-[#a69b8a]/70 text-xs mt-2 italic">
                          Folklore: {wisdom.traditionalUses.folklore}
                        </p>
                      )}
                    </section>
                  )}
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                  {/* Spiritual */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#c9a227]" />
                      Spiritual & Energetic
                    </h3>
                    <p className="text-[#a69b8a] text-sm leading-relaxed">
                      {wisdom.description.spiritual}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a]">
                        Element: {wisdom.element}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a]">
                        Chakra: {wisdom.chakra}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a]">
                        {wisdom.frequency.note} note • {wisdom.frequency.hz}Hz
                      </span>
                    </div>
                  </section>
                  
                  {/* Mental & Emotional */}
                  <section>
                    <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-[#c9a227]" />
                      Mental & Emotional
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-[#c9a227] font-medium">Mental:</p>
                        <p className="text-[#a69b8a] text-sm">{wisdom.description.mental}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#c9a227] font-medium">Emotional:</p>
                        <p className="text-[#a69b8a] text-sm">{wisdom.description.emotional}</p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Therapeutic Benefits */}
                  {wisdom.therapeutic && (
                    <section>
                      <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-[#c9a227]" />
                        Therapeutic Applications
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-[#c9a227] font-medium">Benefits:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {wisdom.therapeutic.benefits.map(benefit => (
                              <span key={benefit} className="text-xs px-2 py-0.5 rounded bg-[#2ecc71]/20 text-[#2ecc71]">
                                {benefit}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-[#c9a227] font-medium">Best for:</p>
                          <p className="text-[#a69b8a] text-xs">{wisdom.therapeutic.indications.join(', ')}</p>
                        </div>
                      </div>
                    </section>
                  )}
                  
                  {/* Application */}
                  {wisdom.application && (
                    <section>
                      <h3 className="text-lg font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-[#c9a227]" />
                        How to Use
                      </h3>
                      <p className="text-[#a69b8a] text-sm">
                        <span className="text-[#c9a227]">Methods:</span> {wisdom.application.bestMethods.join(', ')}
                      </p>
                      <p className="text-[#a69b8a] text-sm mt-1">
                        <span className="text-[#c9a227]">Dilution:</span> {wisdom.application.dilutionGuidelines}
                      </p>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#a69b8a]">
                <p>Detailed wisdom for this oil is being compiled.</p>
              </div>
            )}
            
            {/* Action Button */}
            <div className="mt-8 pt-6 border-t border-[#f5f3ef]/10 flex justify-end">
              {isAdded ? (
                <div className="flex items-center gap-4">
                  <span className="text-[#2ecc71] text-sm">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {currentMl.toFixed(getMlDecimals(mode))}ml · {formatDrops(currentMl)}
                  </span>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      onAddOil(oil.id)
                      onClose()
                    }}
                    className="px-6 py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Blend
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
