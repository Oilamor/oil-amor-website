'use client'

// ============================================================================
// COMPONENT: Acknowledgment Checklist
// ============================================================================
import { AlertTriangle, CheckSquare, Square } from 'lucide-react'
import {
  ExperienceLevel,
  getWarningMessage,
  SafetyWarning,
} from '@/lib/safety/comprehensive-safety-v2'
import { cn } from '@/lib/utils'

export function AcknowledgmentChecklist({
  warnings,
  acknowledgedIds,
  onAcknowledge,
  experienceLevel,
}: {
  warnings: SafetyWarning[]
  acknowledgedIds: string[]
  onAcknowledge: (id: string) => void
  experienceLevel: ExperienceLevel
}) {
  const acknowledgableWarnings = warnings.filter(w => w.requiresAcknowledgment)
  
  if (acknowledgableWarnings.length === 0) return null

  return (
    <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
      <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Required Acknowledgments
      </h4>
      <div className="space-y-2">
        {acknowledgableWarnings.map(warning => {
          const isAcknowledged = acknowledgedIds.includes(warning.id)
          return (
            <label 
              key={warning.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                isAcknowledged ? 'bg-red-500/10' : 'bg-[#0a080c] hover:bg-[#0a080c]/80'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isAcknowledged ? (
                  <CheckSquare 
                    className="w-5 h-5 text-red-500" 
                    onClick={() => onAcknowledge(warning.id)}
                  />
                ) : (
                  <Square 
                    className="w-5 h-5 text-red-500/50" 
                    onClick={() => onAcknowledge(warning.id)}
                  />
                )}
              </div>
              <div className="flex-1">
                <p className={cn('text-sm', isAcknowledged ? 'text-[#a69b8a] line-through' : 'text-[#f5f3ef]')}>
                  {warning.acknowledgmentText || warning.title}
                </p>
                {!isAcknowledged && (
                  <p className="text-xs text-[#a69b8a]/70 mt-1">
                    {getWarningMessage(warning, experienceLevel)}
                  </p>
                )}
              </div>
            </label>
          )
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-red-500/20">
        <p className="text-xs text-[#a69b8a]">
          {acknowledgedIds.length} of {acknowledgableWarnings.length} acknowledged
        </p>
      </div>
    </div>
  )
}
