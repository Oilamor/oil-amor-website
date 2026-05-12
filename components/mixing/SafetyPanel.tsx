'use client'

import { MixValidationResult, SafetyWarning } from '@/lib/safety'
import { SafetyBadge, SafetyScoreBadge } from './SafetyBadge'
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle, Sun, Baby, Heart, Wind } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SafetyPanelProps {
  validation: MixValidationResult
  className?: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  concentration: <AlertCircle className="w-4 h-4" />,
  contraindication: <Heart className="w-4 h-4" />,
  interaction: <AlertTriangle className="w-4 h-4" />,
  age: <Baby className="w-4 h-4" />,
  pregnancy: <Heart className="w-4 h-4" />,
  usage: <Wind className="w-4 h-4" />,
}

function WarningItem({ warning }: { warning: SafetyWarning }) {
  const severityColors: Record<import('@/lib/safety').SafetySeverity, string> = {
    info: 'border-blue-500/30 bg-blue-500/5',
    caution: 'border-yellow-500/30 bg-yellow-500/5',
    warning: 'border-orange-500/30 bg-orange-500/5',
    critical: 'border-red-500/30 bg-red-500/5',
    blocked: 'border-red-500/50 bg-red-500/10',
    minor: 'border-slate-500/30 bg-slate-500/5',
    moderate: 'border-amber-500/30 bg-amber-500/5',
    major: 'border-orange-600/30 bg-orange-600/5',
    avoid: 'border-red-500/50 bg-red-500/10',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'p-3 rounded-lg border-l-2',
        severityColors[warning.severity]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[#a69b8a]">
          {categoryIcons[warning.category] || <Info className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-[#f5f3ef]">{warning.title}</h4>
          <p className="text-sm text-[#a69b8a] mt-1">{warning.description}</p>
          {warning.recommendation && (
            <p className="text-sm text-[#c9a227] mt-2">
              Recommendation: {warning.recommendation}
            </p>
          )}
          {warning.affectedOils && warning.affectedOils.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {warning.affectedOils.map(oil => (
                <span key={oil} className="px-2 py-0.5 rounded-full bg-[#0a080c] text-[#a69b8a] text-xs">
                  {oil}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function BlockedItem({ blocked }: { blocked: MixValidationResult['blockedCombinations'][0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-lg border border-red-500/50 bg-red-500/10"
    >
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-400">{blocked.type.replace(/-/g, ' ').toUpperCase()}</h4>
          <p className="text-sm text-[#f5f3ef] mt-1">{blocked.description}</p>
          {blocked.chemicalExplanation && (
            <p className="text-xs text-[#a69b8a] mt-2 italic">
              {blocked.chemicalExplanation}
            </p>
          )}
          {blocked.alternativeSuggestion && (
            <p className="text-sm text-[#2ecc71] mt-2">
              💡 {blocked.alternativeSuggestion}
            </p>
          )}
          {blocked.affectedOils && (
            <div className="flex flex-wrap gap-2 mt-3">
              {blocked.affectedOils.map(oil => (
                <span key={oil} className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                  {oil}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function SafetyPanel({ validation, className }: SafetyPanelProps) {
  const { 
    canProceed, 
    safetyScore, 
    safetyRating, 
    blockedCombinations, 
    criticalWarnings,
    warnings,
    cautions,
    info,
    calculations,
    recommendations,
  } = validation

  const hasAnyIssues = 
    blockedCombinations.length > 0 ||
    criticalWarnings.length > 0 ||
    warnings.length > 0 ||
    cautions.length > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#f5f3ef]">Safety Check</h3>
        <SafetyScoreBadge score={safetyScore} rating={safetyRating} />
      </div>

      {/* Status Banner */}
      {!canProceed ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Cannot Proceed</p>
            <p className="text-sm text-[#a69b8a]">
              {blockedCombinations.length} critical safety issue{blockedCombinations.length !== 1 && 's'} must be resolved
            </p>
          </div>
        </div>
      ) : hasAnyIssues ? (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-400">Use with Caution</p>
            <p className="text-sm text-[#a69b8a]">
              {warnings.length + cautions.length} warning{cautions.length !== 1 && 's'} to review
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <div>
            <p className="font-medium text-green-400">All Clear</p>
            <p className="text-sm text-[#a69b8a]">This blend is safe for your profile</p>
          </div>
        </div>
      )}

      {/* Calculations */}
      <div className="p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/10">
        <h4 className="text-sm font-medium text-[#f5f3ef] mb-3">Blend Analysis</h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[#a69b8a]">Essential Oil</p>
            <p className="text-lg font-serif text-[#c9a227]">{(calculations.totalDrops / 20).toFixed(1)}ml</p>
            <p className="text-xs text-[#a69b8a]">{calculations.totalDrops} drops</p>
          </div>
          <div>
            <p className="text-xs text-[#a69b8a]">
              {calculations.safeDilutionPercent === 100 ? 'Type' : 'Dilution'}
            </p>
            <p className={cn(
              'text-lg font-serif',
              calculations.dilutionPercent > calculations.safeDilutionPercent * 0.9
                ? 'text-orange-400'
                : 'text-[#f5f3ef]'
            )}>
              {calculations.safeDilutionPercent === 100 
                ? 'Pure' 
                : `${calculations.dilutionPercent.toFixed(1)}%`}
            </p>
            <p className="text-xs text-[#a69b8a]">
              {calculations.safeDilutionPercent === 100 
                ? '100% Essential Oil' 
                : `Max: ${calculations.safeDilutionPercent}%`}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#a69b8a]">Total Volume</p>
            <p className="text-lg font-serif text-[#f5f3ef]">30ml</p>
          </div>
          <div>
            <p className="text-xs text-[#a69b8a]">Safety Score</p>
            <p className={cn(
              'text-lg font-serif',
              safetyScore >= 90 ? 'text-green-400' :
              safetyScore >= 70 ? 'text-yellow-400' :
              safetyScore >= 50 ? 'text-orange-400' : 'text-red-400'
            )}>
              {safetyScore}/100
            </p>
          </div>
        </div>
      </div>

      {/* Blocked Combinations */}
      <AnimatePresence>
        {blockedCombinations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Critical Issues ({blockedCombinations.length})
            </h4>
            {blockedCombinations.map((blocked, index) => (
              <BlockedItem key={index} blocked={blocked} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Critical Warnings */}
      <AnimatePresence>
        {criticalWarnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Critical Warnings ({criticalWarnings.length})
            </h4>
            {criticalWarnings.map((warning, index) => (
              <WarningItem key={index} warning={warning} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Warnings */}
      <AnimatePresence>
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Warnings ({warnings.length})
            </h4>
            {warnings.map((warning, index) => (
              <WarningItem key={index} warning={warning} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Cautions */}
      <AnimatePresence>
        {cautions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-[#a69b8a] flex items-center gap-2">
              <Info className="w-4 h-4" />
              Cautions ({cautions.length})
            </h4>
            {cautions.map((warning, index) => (
              <WarningItem key={index} warning={warning} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Recommendations */}
      {(recommendations.patchTestRecommended || 
        recommendations.professionalConsultationRecommended ||
        recommendations.reduceDrops) && (
        <div className="p-4 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/30">
          <h4 className="text-sm font-medium text-[#c9a227] mb-2">Recommendations</h4>
          <ul className="space-y-2 text-sm text-[#f5f3ef]">
            {recommendations.reduceDrops && (
              <li className="flex items-start gap-2">
                <span className="text-[#c9a227]">•</span>
                Consider reducing by {recommendations.reduceDrops} drops for safer dilution
              </li>
            )}
            {recommendations.patchTestRecommended && (
              <li className="flex items-start gap-2">
                <span className="text-[#c9a227]">•</span>
                Perform a patch test before full use (apply to inner arm, wait 24 hours)
              </li>
            )}
            {recommendations.professionalConsultationRecommended && (
              <li className="flex items-start gap-2">
                <span className="text-[#c9a227]">•</span>
                Consult a certified aromatherapist or healthcare provider before use
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Phototoxic Warning */}
      {canProceed && !blockedCombinations.some(b => b.type === 'exceeds-max-dilution') && 
       validation.calculations.dilutionPercent > 0 && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
          <Sun className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-400 font-medium">Sun Exposure Reminder</p>
            <p className="text-[#a69b8a]">
              Some citrus oils can increase sun sensitivity. If your blend contains phototoxic oils, 
              avoid direct sun exposure for 12-72 hours after application.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
