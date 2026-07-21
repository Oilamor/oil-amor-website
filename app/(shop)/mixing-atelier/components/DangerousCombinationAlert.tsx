'use client'

// ============================================================================
// COMPONENT: Dangerous Combination Alert
// ============================================================================
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertOctagon, Stethoscope } from 'lucide-react'
import { ATELIER_OILS } from '@/lib/atelier/atelier-engine'
import { cn } from '@/lib/utils'
import { BlendMode, DANGEROUS_COMBINATIONS } from '../atelier-utils'

export function DangerousCombinationAlert({
  selectedOils,
  healthProfile,
  mode,
}: {
  selectedOils: { oilId: string; ml: number }[]
  healthProfile: any
  mode: BlendMode
}) {
  const alerts = useMemo(() => {
    const alerts: { type: string; severity: string; title: string; message: string; oils: string[] }[] = []
    const selectedOilIds = selectedOils.map(o => o.oilId)

    // Check blood thinners
    const dangerousBloodOils = selectedOilIds.filter(id => 
      DANGEROUS_COMBINATIONS.bloodThinners.oils.includes(id)
    )
    if (dangerousBloodOils.length > 0) {
      const onBloodThinners = healthProfile?.medications?.some((m: string) =>
        DANGEROUS_COMBINATIONS.bloodThinners.medications.some(med => 
          m.toLowerCase().includes(med.toLowerCase())
        )
      )
      if (onBloodThinners) {
        alerts.push({
          type: 'blood-thinner',
          severity: 'critical',
          title: DANGEROUS_COMBINATIONS.bloodThinners.title,
          message: DANGEROUS_COMBINATIONS.bloodThinners.description,
          oils: dangerousBloodOils,
        })
      }
    }

    // Check epilepsy/seizure risk
    const epilepsyOils = selectedOilIds.filter(id =>
      DANGEROUS_COMBINATIONS.epilepsy.oils.includes(id)
    )
    if (epilepsyOils.length > 0 && healthProfile?.conditions?.includes('epilepsy')) {
      alerts.push({
        type: 'epilepsy',
        severity: 'critical',
        title: DANGEROUS_COMBINATIONS.epilepsy.title,
        message: DANGEROUS_COMBINATIONS.epilepsy.description,
        oils: epilepsyOils,
      })
    }

    // Check pregnancy
    const pregnancyOils = selectedOilIds.filter(id =>
      DANGEROUS_COMBINATIONS.pregnancy.oils.includes(id)
    )
    if (pregnancyOils.length > 0 && healthProfile?.isPregnant) {
      alerts.push({
        type: 'pregnancy',
        severity: 'high',
        title: DANGEROUS_COMBINATIONS.pregnancy.title,
        message: DANGEROUS_COMBINATIONS.pregnancy.description,
        oils: pregnancyOils,
      })
    }

    return alerts
  }, [selectedOils, healthProfile])

  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      {alerts.map((alert, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'p-4 rounded-xl border-l-4',
            alert.severity === 'critical' 
              ? 'bg-red-500/10 border-red-500' 
              : 'bg-orange-500/10 border-orange-500'
          )}
        >
          <div className="flex items-start gap-3">
            <AlertOctagon className={cn(
              'w-5 h-5 flex-shrink-0',
              alert.severity === 'critical' ? 'text-red-500' : 'text-orange-500'
            )} />
            <div className="flex-1">
              <h4 className={cn(
                'font-medium',
                alert.severity === 'critical' ? 'text-red-400' : 'text-orange-400'
              )}>
                {alert.title}
              </h4>
              <p className="text-sm text-[#a69b8a] mt-1">{alert.message}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alert.oils.map(oilId => {
                  const oil = ATELIER_OILS.find(o => o.id === oilId)
                  return (
                    <span key={oilId} className="px-2 py-1 rounded bg-[#0a080c] text-xs text-[#f5f3ef]">
                      {oil?.name || oilId}
                    </span>
                  )
                })}
              </div>
              {alert.severity === 'critical' && (
                <div className="mt-3 p-3 rounded-lg bg-[#0a080c] border border-red-500/30">
                  <p className="text-xs text-red-400 font-medium flex items-center gap-2">
                    <Stethoscope className="w-3.5 h-3.5" />
                    CONSULT PROFESSIONAL REQUIRED
                  </p>
                  <p className="text-xs text-[#a69b8a] mt-1">
                    This combination requires consultation with a qualified healthcare provider before use.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
