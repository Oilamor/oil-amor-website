'use client'

// ============================================================================
// COMPONENT: Save Draft Dialog
// ============================================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save } from 'lucide-react'
import { BlendMode } from '../atelier-utils'

export function SaveDraftDialog({
  isOpen,
  onClose,
  onSave,
  recipeName,
  selectedOils,
  mode,
  bottleSize,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, notes: string) => void
  recipeName: string
  selectedOils: { oilId: string; ml: number }[]
  mode: BlendMode
  bottleSize: number
}) {
  const [name, setName] = useState(recipeName || '')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#111] border border-[#f5f3ef]/10 rounded-2xl p-6 w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-xl font-medium text-[#f5f3ef] mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-[#c9a227]" />
            Save Draft Blend
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#a69b8a] mb-1 block">Blend Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Sleep Blend"
                className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] focus:border-[#c9a227] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-[#a69b8a] mb-1 block">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why you created this blend, how it smells, etc."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] focus:border-[#c9a227] focus:outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#0a080c]">
              <p className="text-xs text-[#a69b8a]">
                {selectedOils.length} oils • {mode} • {bottleSize}ml bottle
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(name, notes)
                onClose()
              }}
              disabled={!name.trim()}
              className="flex-1 py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Draft
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
