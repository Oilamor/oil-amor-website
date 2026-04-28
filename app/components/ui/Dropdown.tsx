'use client'

import Image from 'next/image'
import { ReactNode } from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DropdownItem {
  id: string
  label: string
  description?: string
  image?: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  separator?: boolean
}

export interface DropdownProps {
  children: ReactNode
  items: DropdownItem[]
  selectedId?: string
  onSelect?: (id: string) => void
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  width?: 'auto' | 'sm' | 'md' | 'lg'
}

export function Dropdown({
  children,
  items,
  selectedId,
  onSelect,
  align = 'end',
  side = 'bottom',
  className,
  width = 'auto',
}: DropdownProps) {
  const widths = {
    auto: 'w-auto',
    sm: 'w-48',
    md: 'w-64',
    lg: 'w-80',
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{children}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={8}
          className={cn(
            'z-[1000] overflow-hidden rounded-xl bg-cream-pure shadow-xl border border-miron-dark/10',
            widths[width],
            className
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {items.map((item, index) => {
              if (item.separator) {
                return (
                  <DropdownMenuPrimitive.Separator
                    key={`sep-${index}`}
                    className="h-px bg-miron-dark/10 my-1"
                  />
                )
              }

              const isSelected = selectedId === item.id

              return (
                <DropdownMenuPrimitive.Item
                  key={item.id}
                  disabled={item.disabled}
                  onSelect={() => onSelect?.(item.id)}
                  className={cn(
                    'relative flex items-center gap-3 px-4 py-3 text-sm outline-none cursor-pointer',
                    'transition-colors duration-150',
                    'hover:bg-miron-dark/5 focus:bg-miron-dark/5',
                    'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
                    item.image && 'py-2'
                  )}
                >
                  {item.image && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-miron-dark/5 flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.label}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  )}
                  {item.icon && !item.image && (
                    <span className="text-miron-dark/60">{item.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-miron-dark">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-miron-dark/50 truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-gold-pure" />
                  )}
                  {item.shortcut && (
                    <kbd className="ml-auto text-[10px] uppercase tracking-wider text-miron-dark/40 bg-miron-dark/5 px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </kbd>
                  )}
                </DropdownMenuPrimitive.Item>
              )
            })}
          </motion.div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

// Simple select dropdown for forms
export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled = false,
}: SelectProps) {
  const selectedOption = options.find((o) => o.value === value)

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 text-sm',
          'bg-cream-pure border border-miron-dark/20 rounded-lg',
          'hover:border-miron-dark/40 focus:border-gold-pure',
          'transition-colors duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        <span className={cn(!selectedOption && 'text-miron-dark/50')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronRight className="w-4 h-4 text-miron-dark/40 -rotate-90" />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-[1000] w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-lg bg-cream-pure shadow-xl border border-miron-dark/10"
        >
          {options.map((option) => (
            <DropdownMenuPrimitive.Item
              key={option.value}
              disabled={option.disabled}
              onSelect={() => onChange(option.value)}
              className={cn(
                'px-4 py-2.5 text-sm outline-none cursor-pointer',
                'transition-colors duration-150',
                'hover:bg-miron-dark/5 focus:bg-miron-dark/5',
                value === option.value && 'bg-miron-dark/5 font-medium',
                option.disabled && 'opacity-50 pointer-events-none'
              )}
            >
              {option.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export default Dropdown
