'use client'

import { useEffect } from 'react'

// Tiny client wrapper that fires window.print() once after mount. Gives the
// user the "Save as PDF" dialog immediately when the print route opens.
export function PrintAutoTrigger() {
  useEffect(() => {
    const t = setTimeout(() => {
      try { window.print() } catch { /* noop */ }
    }, 350)
    return () => clearTimeout(t)
  }, [])
  return null
}
