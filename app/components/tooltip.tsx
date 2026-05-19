'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface TooltipProps {
  content: string | React.ReactNode
  children: React.ReactNode
  rich?: boolean
  position?: 'top' | 'bottom'
}

export function Tooltip({ content, children, rich = false, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className={cn('relative inline-block', !rich && 'inline-block')}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: position === 'top' ? 5 : -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? 5 : -5 }}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 px-4 py-3 bg-[#0a080c] border border-[#f5f3ef]/20 rounded-lg text-xs text-[#a69b8a] z-50 shadow-xl',
              position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
              rich ? 'min-w-[220px] max-w-[280px]' : 'whitespace-nowrap'
            )}
          >
            {content}
            <div
              className={cn(
                'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
                position === 'top'
                  ? 'top-full -mt-1 border-t-[#0a080c]'
                  : 'bottom-full -mb-1 border-b-[#0a080c]'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
