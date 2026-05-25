'use client'

import { useEffect } from 'react'

// Tiny client wrapper that fires window.print() once after the page is fully
// loaded (fonts, images, etc.). Gives the user the Save-as-PDF dialog
// immediately when the print route opens.
//
// Browsers sometimes block window.print() if it fires before document is
// fully painted, so we wait for window 'load' (or fire immediately if it
// already loaded) plus a small frame delay.
export function PrintAutoTrigger() {
  useEffect(() => {
    let cancelled = false
    function trigger() {
      if (cancelled) return
      // One animation frame so the layout is settled before the dialog opens.
      requestAnimationFrame(() => {
        try { window.print() } catch { /* noop */ }
      })
    }
    if (document.readyState === 'complete') trigger()
    else window.addEventListener('load', trigger, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', trigger)
    }
  }, [])
  return null
}
