'use client'

// ============================================================================
// COMPONENT: Critical Warning Modal
// ============================================================================
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertOctagon, CheckSquare, Square } from 'lucide-react'
import {
  ExperienceLevel,
  getWarningMessage,
  SafetyWarning,
} from '@/lib/safety/comprehensive-safety-v2'

export function CriticalWarningModal({
  isOpen,
  onClose,
  warnings,
  onAcknowledge,
  experienceLevel,
}: {
  isOpen: boolean
  onClose: () => void
  warnings: SafetyWarning[]
  onAcknowledge: (warningIds: string[]) => void
  experienceLevel: ExperienceLevel
}) {
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({})
  const criticalWarnings = warnings.filter(w => w.riskLevel === 'critical')

  useEffect(() => {
    if (isOpen) {
      setAcknowledged({})
    }
  }, [isOpen])

  const handleAcknowledge = () => {
    const acknowledgedIds = Object.entries(acknowledged)
      .filter(([_, checked]) => checked)
      .map(([id]) => id)
    onAcknowledge(acknowledgedIds)
    onClose()
  }

  const allAcknowledged = criticalWarnings.every(w => acknowledged[w.id])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-lg w-full bg-[#111] border border-red-500/50 rounded-2xl p-6 shadow-2xl shadow-red-500/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white">Critical Safety Warning</h3>
              <p className="text-red-400 text-sm">Action Required Before Proceeding</p>
            </div>
          </div>

          <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
            {criticalWarnings.map(warning => (
              <div key={warning.id} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <h4 className="font-medium text-red-400 mb-2">{warning.title}</h4>
                <p className="text-sm text-[#a69b8a] mb-2">
                  {getWarningMessage(warning, experienceLevel)}
                </p>
                <p className="text-xs text-[#a69b8a]/70 mb-3">{warning.detailedExplanation}</p>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-shrink-0 mt-0.5">
                    {acknowledged[warning.id] ? (
                      <CheckSquare 
                        className="w-5 h-5 text-red-500" 
                        onClick={() => setAcknowledged(prev => ({ ...prev, [warning.id]: false }))}
                      />
                    ) : (
                      <Square 
                        className="w-5 h-5 text-red-500/50" 
                        onClick={() => setAcknowledged(prev => ({ ...prev, [warning.id]: true }))}
                      />
                    )}
                  </div>
                  <span className="text-sm text-[#f5f3ef]">
                    {warning.acknowledgmentText || 'I understand and accept the risks associated with this warning.'}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/20 text-[#a69b8a] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={!allAcknowledged}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Acknowledge & Proceed
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
