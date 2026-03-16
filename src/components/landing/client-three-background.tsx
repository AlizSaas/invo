'use client'

import { useEffect, useState } from 'react'
import { ThreeBackground } from './three-background'

export function ClientThreeBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only render on client-side to avoid SSR issues with Three.js
  if (!mounted || typeof window === 'undefined') {
    return null
  }

  return <ThreeBackground />
}
