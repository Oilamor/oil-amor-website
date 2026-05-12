'use client'

import { SafetySeverity } from '@/lib/safety'
import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

interface SafetyBadgeProps {
  severity: SafetySeverity
  children: React.ReactNode
  className?: string
  showIcon?: boolean
}

const severityConfig: Record<SafetySeverity, {
  bg: string
  text: string
  border: string
  icon: React.ReactNode
}> = {
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: <Info className="w-4 h-4" />,
  },
  caution: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  warning: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  critical: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: <XCircle className="w-4 h-4" />,
  },
  blocked: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
    icon: <XCircle className="w-4 h-4" />,
  },
  minor: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    icon: <Info className="w-4 h-4" />,
  },
  moderate: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  major: {
    bg: 'bg-orange-600/10',
    text: 'text-orange-500',
    border: 'border-orange-600/30',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  avoid: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
    icon: <XCircle className="w-4 h-4" />,
  },
}

export function SafetyBadge({ 
  severity, 
  children, 
  className,
  showIcon = true,
}: SafetyBadgeProps) {
  const config = severityConfig[severity]
  
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm',
      config.bg,
      config.text,
      config.border,
      className
    )}>
      {showIcon && config.icon}
      {children}
    </div>
  )
}

interface SafetyScoreBadgeProps {
  score: number
  rating: string
  className?: string
}

export function SafetyScoreBadge({ score, rating, className }: SafetyScoreBadgeProps) {
  const getColor = () => {
    if (score >= 90) return 'bg-green-500/20 text-green-400 border-green-500/40'
    if (score >= 75) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
    if (score >= 40) return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
    return 'bg-red-500/20 text-red-400 border-red-500/40'
  }
  
  const getIcon = () => {
    if (score >= 75) return <CheckCircle className="w-4 h-4" />
    if (score >= 60) return <Info className="w-4 h-4" />
    if (score >= 40) return <AlertTriangle className="w-4 h-4" />
    return <XCircle className="w-4 h-4" />
  }
  
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium',
      getColor(),
      className
    )}>
      {getIcon()}
      <span>Safety Score: {score}/100</span>
      <span className="opacity-60">({rating})</span>
    </div>
  )
}
