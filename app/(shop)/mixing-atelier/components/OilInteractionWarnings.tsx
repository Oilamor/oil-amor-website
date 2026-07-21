'use client'

// ============================================================================
// COMPONENT: Oil Interaction Warnings with Consent
// ============================================================================
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, AlertOctagon, AlertTriangle, Info } from 'lucide-react'
import {
  getInteractionsForMix,
  hasCriticalInteraction,
} from '@/lib/safety/oil-interactions'
import { cn } from '@/lib/utils'

export function OilInteractionWarnings({ 
  selectedOils,
  userProfile,
  acknowledgedInteractions,
  onAcknowledgeInteraction
}: { 
  selectedOils: { oilId: string; ml: number }[]
  userProfile: {
    isPregnant?: boolean
    isTryingToConceive?: boolean
    onBloodThinners?: boolean
    hasEpilepsy?: boolean
    hasBleedingDisorder?: boolean
    age?: number
  }
  acknowledgedInteractions: string[]
  onAcknowledgeInteraction: (interactionKey: string) => void
}) {
  const interactions = useMemo(() => {
    const oilIds = selectedOils.map(o => o.oilId)
    return getInteractionsForMix(oilIds)
  }, [selectedOils])

  if (interactions.length === 0) return null

  const severityColors = {
    low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    moderate: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  }

  const severityIcons = {
    low: Info,
    moderate: AlertCircle,
    high: AlertTriangle,
    critical: AlertOctagon,
  }
  
  // Check if any critical interactions are unacknowledged
  const criticalUnacknowledged = interactions.some(
    i => i.severity === 'critical' && 
    !acknowledgedInteractions.includes(`${i.oilId1}-${i.oilId2}`)
  )

  return (
    <div className="p-5 rounded-xl bg-[#111] border border-[#f5f3ef]/10">
      <h4 className="text-sm font-medium text-[#a69b8a] mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Oil Interaction Warnings
        <span className="px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-xs">
          {interactions.length} found
        </span>
        {criticalUnacknowledged && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs animate-pulse">
            CONSENT REQUIRED
          </span>
        )}
      </h4>

      <div className="space-y-3">
        {interactions.map((interaction, index) => {
          const Icon = severityIcons[interaction.severity]
          const colors = severityColors[interaction.severity]
          const interactionKey = `${interaction.oilId1}-${interaction.oilId2}`
          const isAcknowledged = acknowledgedInteractions.includes(interactionKey)
          
          // Determine if acknowledgment is required
          const requiresAck = interaction.severity === 'critical' || 
            (interaction.severity === 'high' && (
              userProfile.isPregnant || 
              userProfile.isTryingToConceive || 
              userProfile.onBloodThinners ||
              userProfile.hasEpilepsy ||
              userProfile.hasBleedingDisorder
            ))
          
          return (
            <motion.div
              key={interactionKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                `p-4 rounded-lg border ${colors}`,
                requiresAck && !isAcknowledged && 'ring-2 ring-red-500/50'
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium">{interaction.title}</h5>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-medium ${
                      interaction.severity === 'critical' ? 'bg-red-500/20' :
                      interaction.severity === 'high' ? 'bg-orange-500/20' :
                      interaction.severity === 'moderate' ? 'bg-amber-500/20' :
                      'bg-blue-500/20'
                    }`}>
                      {interaction.severity}
                    </span>
                    {requiresAck && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 text-[10px]">
                        {isAcknowledged ? '✓ ACKNOWLEDGED' : 'REQUIRES CONSENT'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-90 mb-2">{interaction.description}</p>
                  <p className="text-xs opacity-70 mb-2">{interaction.explanation}</p>
                  <div className="p-2 rounded bg-[#0a080c]/50 mb-3">
                    <p className="text-xs">
                      <span className="font-medium">Recommendation:</span> {interaction.recommendation}
                    </p>
                  </div>
                  
                  {/* Consent checkbox for critical/high risk interactions */}
                  {requiresAck && (
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-[#0a080c]/80 border border-red-500/30">
                      <input
                        type="checkbox"
                        checked={isAcknowledged}
                        onChange={() => onAcknowledgeInteraction(interactionKey)}
                        className="mt-0.5 w-4 h-4 rounded border-red-500/50 bg-[#0a080c] text-red-500 focus:ring-red-500"
                      />
                      <span className="text-xs text-red-200">
                        I understand that combining {interaction.oilId1} and {interaction.oilId2} 
                        {interaction.severity === 'critical' 
                          ? ' poses a CRITICAL risk. I accept full responsibility for using this combination.'
                          : ' may not be recommended for my health profile. I accept responsibility for this choice.'}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {hasCriticalInteraction(selectedOils.map(o => o.oilId)) && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/50">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5" />
            <strong>Critical Warning:</strong> This combination contains serious incompatibilities. 
            Please review carefully before proceeding.
          </p>
        </div>
      )}
    </div>
  )
}
