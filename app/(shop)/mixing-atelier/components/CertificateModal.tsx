'use client'

// ============================================================================
// SECTION: Certificate Download Modal
// ============================================================================
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Download } from 'lucide-react'
import { BlendCodex } from '@/lib/atelier/living-blend-codex'

export function CertificateModal({
  isOpen,
  blendCodex,
  onClose,
  onDownload,
}: {
  isOpen: boolean
  blendCodex: BlendCodex | null
  onClose: () => void
  onDownload: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && blendCodex && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-[#111] rounded-2xl border border-[#c9a227]/30 z-50 p-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#c9a227]/20 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-[#c9a227]" />
              </div>
              <h3 className="text-xl font-serif text-[#f5f3ef] mb-2">Blend Certificate</h3>
              <p className="text-sm text-[#a69b8a] mb-6">
                Download your official blend certificate with full composition details.
              </p>
              <div className="space-y-2">
                <button
                  onClick={onDownload}
                  className="w-full py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a]"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
