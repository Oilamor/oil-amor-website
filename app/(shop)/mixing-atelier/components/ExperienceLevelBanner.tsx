'use client'

// ============================================================================
// COMPONENT: Experience Level Warning Banner
// ============================================================================
import { AlertCircle, Info, Stethoscope, Zap } from 'lucide-react'
import { ExperienceLevel } from '@/lib/safety/comprehensive-safety-v2'
import { cn } from '@/lib/utils'

export function ExperienceLevelBanner({ 
  experienceLevel,
  warningCount 
}: { 
  experienceLevel: ExperienceLevel
  warningCount: number 
}) {
  const configs = {
    beginner: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      icon: AlertCircle,
      title: 'Beginner Mode: Extra Caution Advised',
      message: warningCount > 0 
        ? `We've identified ${warningCount} safety consideration${warningCount !== 1 ? 's' : ''}. Please review all warnings carefully.`
        : 'Start with low dilutions (1-2%) and patch test new blends.',
    },
    intermediate: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: Info,
      title: 'Intermediate Mode: Standard Precautions',
      message: 'You have some experience. Follow standard safety guidelines for your selections.',
    },
    advanced: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      icon: Zap,
      title: 'Advanced Mode: Professional Discretion',
      message: 'You understand essential oil chemistry. Critical warnings are still displayed.',
    },
    professional: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: Stethoscope,
      title: 'Professional Mode: Clinical Judgment',
      message: 'Only critical contraindications and medication interactions are highlighted.',
    },
  }

  const config = configs[experienceLevel]
  const Icon = config.icon

  return (
    <div className={cn('p-4 rounded-xl border', config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5', config.text)} />
        <div>
          <h4 className={cn('font-medium', config.text)}>{config.title}</h4>
          <p className="text-sm text-[#a69b8a] mt-1">{config.message}</p>
        </div>
      </div>
    </div>
  )
}
