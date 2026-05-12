'use client'

import { createContext, useContext, ReactNode } from 'react'

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = (message: string, _type?: 'success' | 'error' | 'info') => {
    // Stub implementation - just log to console
  }
  
  const addToast = showToast

  return (
    <ToastContext.Provider value={{ showToast, addToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (context === undefined) {
    // Return a stub instead of throwing
    return {
      showToast: () => {},
      addToast: () => {},
    }
  }
  return context
}
