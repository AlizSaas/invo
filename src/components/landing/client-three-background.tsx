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
    return (
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      </div>
    )
  }

  return <ThreeBackground />
}
