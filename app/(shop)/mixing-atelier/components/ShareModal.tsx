'use client'

// ============================================================================
// SECTION: Share Modal
// ============================================================================
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function ShareModal({
  isOpen,
  onClose,
  shareUrl,
  recipeName,
  addToast,
}: {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
  recipeName: string
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
}) {
  return (
    <AnimatePresence>
      {isOpen && (
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
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-[#111] rounded-2xl border border-[#f5f3ef]/10 z-50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#f5f3ef]">Share Your Blend</h3>
              <button 
                onClick={onClose}
                className="text-[#a69b8a] hover:text-[#f5f3ef]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[#a69b8a] mb-4">
              Share this link with friends so they can see (and order!) your creation:
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl)
                  addToast('Copied to clipboard!', 'success')
                }}
                className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#0a080c] text-sm font-medium"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out my custom essential oil blend: ${recipeName || 'Unnamed Blend'}`)}`, '_blank')
                }}
                className="flex-1 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] text-sm"
              >
                Share on X
              </button>
              <button 
                onClick={() => {
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
                }}
                className="flex-1 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] text-sm"
              >
                Share on Facebook
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
