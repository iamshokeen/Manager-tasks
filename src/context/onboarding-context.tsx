// src/context/onboarding-context.tsx
'use client'
import { createContext, useContext, useState, useCallback } from 'react'

interface OnboardingContextType {
  open: boolean
  launch: () => void
  close: () => void
}

const OnboardingContext = createContext<OnboardingContextType>({
  open: false,
  launch: () => {},
  close: () => {},
})

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const launch = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])

  return (
    <OnboardingContext.Provider value={{ open, launch, close }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  return useContext(OnboardingContext)
}
