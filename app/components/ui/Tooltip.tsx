'use client'

import Image from 'next/image'
import { ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface TooltipProps {
  children: ReactNode
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  className?: string
  contentClassName?: string
}

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  className,
  contentClassName,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild className={className}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={8}
            className={cn(
              'z-[1000] px-3 py-2 rounded-lg text-sm',
              'bg-miron-void text-cream-pure',
              'shadow-lg',
              contentClassName
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-miron-void" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

// Rich tooltip with image and description for crystal/oil info
export interface RichTooltipProps {
  children: ReactNode
  title: string
  description: string
  image?: string
  properties?: { label: string; value: string }[]
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function RichTooltip({
  children,
  title,
  description,
  image,
  properties,
  side = 'right',
}: RichTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={12}
            className="z-[1000] w-72 overflow-hidden rounded-xl bg-cream-pure shadow-xl border border-miron-dark/10"
          >
            {image && (
              <div className="relative h-32 bg-miron-dark/5">
                <Image
                  src={image}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="288px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-miron-void/60 to-transparent" />
                <h4 className="absolute bottom-3 left-4 font-display text-xl text-white">
                  {title}
                </h4>
              </div>
            )}
            <div className="p-4">
              {!image && (
                <h4 className="font-display text-lg text-miron-dark mb-2">{title}</h4>
              )}
              <p className="text-sm text-miron-dark/70 leading-relaxed mb-3">
                {description}
              </p>
              {properties && properties.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-miron-dark/10">
                  {properties.map((prop) => (
                    <div key={prop.label}>
                      <span className="text-[10px] uppercase tracking-wider text-miron-dark/50">
                        {prop.label}
                      </span>
                      <p className="text-xs font-medium text-miron-dark">{prop.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <TooltipPrimitive.Arrow className="fill-cream-pure" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export default Tooltip
