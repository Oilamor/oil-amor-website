'use client'

// ============================================================================
// COMPONENT: Enhanced Safety Summary Panel
// ============================================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, AlertOctagon, AlertTriangle, Info, Shield } from 'lucide-react'
import { MixValidationResult } from '@/lib/safety'
import {
  getWarningMessage,
  SafetyValidationResult,
} from '@/lib/safety/comprehensive-safety-v2'
import { cn } from '@/lib/utils'
import { AcknowledgmentChecklist } from './AcknowledgmentChecklist'
import { CriticalWarningModal } from './CriticalWarningModal'
import { DangerousCombinationAlert } from './DangerousCombinationAlert'
import { ExperienceLevelBanner } from './ExperienceLevelBanner'

export function EnhancedSafetySummary({
  validation,
  comprehensiveSafety,
  onAcknowledge,
  acknowledgedIds,
  healthProfile,
}: {
  validation: MixValidationResult | null
  comprehensiveSafety: SafetyValidationResult | null
  onAcknowledge: (ids: string[]) => void
  acknowledgedIds: string[]
  healthProfile: any
}) {
  const [showCriticalModal, setShowCriticalModal] = useState(false)

  if (!comprehensiveSafety) {
    return (
      <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto mb-3 text-[#a69b8a]/30" />
          <p className="text-[#a69b8a]">Complete your health profile to see safety information</p>
        </div>
      </div>
    )
  }

  const criticalCount = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'critical').length
  const highCount = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'high').length
  const moderateCount = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'moderate').length

  return (
    <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#c9a227]" />
          <h3 className="text-lg font-medium text-[#f5f3ef]">Safety Assessment</h3>
        </div>
        <span className={cn(
          'px-3 py-1 rounded-full text-xs font-medium',
          comprehensiveSafety.safetyScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
          comprehensiveSafety.safetyScore >= 60 ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        )}>
          Score: {comprehensiveSafety.safetyScore}/100
        </span>
      </div>

      {/* Experience Level Banner */}
      <ExperienceLevelBanner 
        experienceLevel={comprehensiveSafety.experienceLevel}
        warningCount={comprehensiveSafety.warnings.length}
      />

      {/* Dangerous Combinations */}
      <DangerousCombinationAlert
        selectedOils={comprehensiveSafety.warnings.flatMap(w => w.affectedOils?.map(id => ({ oilId: id, ml: 0 })) || [])}
        healthProfile={healthProfile}
        mode="pure"
      />

      {/* Warning Summary */}
      {(criticalCount > 0 || highCount > 0 || moderateCount > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {criticalCount > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
              <div className="text-xs text-red-400">Critical</div>
            </div>
          )}
          {highCount > 0 && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
              <div className="text-2xl font-bold text-orange-500">{highCount}</div>
              <div className="text-xs text-orange-400">High</div>
            </div>
          )}
          {moderateCount > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
              <div className="text-2xl font-bold text-amber-500">{moderateCount}</div>
              <div className="text-xs text-amber-400">Moderate</div>
            </div>
          )}
        </div>
      )}

      {/* Warning Details */}
      {comprehensiveSafety.warnings.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {comprehensiveSafety.warnings.map(warning => (
            <motion.div
              key={warning.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'p-3 rounded-lg border',
                warning.riskLevel === 'critical' && 'bg-red-500/5 border-red-500/30',
                warning.riskLevel === 'high' && 'bg-orange-500/5 border-orange-500/30',
                warning.riskLevel === 'moderate' && 'bg-amber-500/5 border-amber-500/30',
                warning.riskLevel === 'low' && 'bg-blue-500/5 border-blue-500/30',
                warning.riskLevel === 'info' && 'bg-[#0a080c] border-[#f5f3ef]/10',
              )}
            >
              <div className="flex items-start gap-2">
                {warning.riskLevel === 'critical' && <AlertOctagon className="w-4 h-4 text-red-500 mt-0.5" />}
                {warning.riskLevel === 'high' && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                {warning.riskLevel === 'moderate' && <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />}
                {warning.riskLevel === 'low' && <Info className="w-4 h-4 text-blue-500 mt-0.5" />}
                {warning.riskLevel === 'info' && <Info className="w-4 h-4 text-[#a69b8a] mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    warning.riskLevel === 'critical' && 'text-red-400',
                    warning.riskLevel === 'high' && 'text-orange-400',
                    warning.riskLevel === 'moderate' && 'text-amber-400',
                    warning.riskLevel === 'low' && 'text-blue-400',
                    warning.riskLevel === 'info' && 'text-[#a69b8a]',
                  )}>
                    {warning.title}
                  </p>
                  <p className="text-xs text-[#a69b8a] mt-1">
                    {getWarningMessage(warning, comprehensiveSafety.experienceLevel)}
                  </p>
                  {warning.requiresAcknowledgment && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">
                      Requires Acknowledgment
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Acknowledgment Checklist */}
      <AcknowledgmentChecklist
        warnings={comprehensiveSafety.warnings}
        acknowledgedIds={acknowledgedIds}
        onAcknowledge={(id) => {
          const newIds = acknowledgedIds.includes(id)
            ? acknowledgedIds.filter(i => i !== id)
            : [...acknowledgedIds, id]
          onAcknowledge(newIds)
        }}
        experienceLevel={comprehensiveSafety.experienceLevel}
      />

      {/* Critical Warning Modal Trigger */}
      {criticalCount > 0 && (
        <button
          onClick={() => setShowCriticalModal(true)}
          className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
        >
          View Critical Warnings
        </button>
      )}

      <CriticalWarningModal
        isOpen={showCriticalModal}
        onClose={() => setShowCriticalModal(false)}
        warnings={comprehensiveSafety.warnings}
        onAcknowledge={(ids) => {
          onAcknowledge(Array.from(new Set([...acknowledgedIds, ...ids])))
        }}
        experienceLevel={comprehensiveSafety.experienceLevel}
      />
    </div>
  )
}
