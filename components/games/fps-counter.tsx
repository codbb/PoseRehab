'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface FpsCounterProps {
  className?: string
  showGraph?: boolean
  warningThreshold?: number
  criticalThreshold?: number
}

export function FpsCounter({
  className = '',
  showGraph = false,
  warningThreshold = 30,
  criticalThreshold = 20,
}: FpsCounterProps) {
  const [fps, setFps] = useState(0)
  const [fpsHistory, setFpsHistory] = useState<number[]>([])
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const animationRef = useRef<number>()

  const updateFps = useCallback(() => {
    frameCount.current++
    const currentTime = performance.now()
    const elapsed = currentTime - lastTime.current

    if (elapsed >= 1000) {
      const currentFps = Math.round((frameCount.current * 1000) / elapsed)
      setFps(currentFps)

      if (showGraph) {
        setFpsHistory(prev => [...prev.slice(-29), currentFps])
      }

      frameCount.current = 0
      lastTime.current = currentTime
    }

    animationRef.current = requestAnimationFrame(updateFps)
  }, [showGraph])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateFps)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [updateFps])

  const getFpsColor = () => {
    if (fps < criticalThreshold) return 'text-red-500'
    if (fps < warningThreshold) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getBarColor = (value: number) => {
    if (value < criticalThreshold) return 'bg-red-500'
    if (value < warningThreshold) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2">
        <div className={`text-sm font-mono font-bold ${getFpsColor()}`}>
          {fps} FPS
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{
          backgroundColor: fps < criticalThreshold ? '#EF4444' :
                          fps < warningThreshold ? '#F59E0B' : '#10B981'
        }} />
      </div>

      {showGraph && fpsHistory.length > 0 && (
        <div className="mt-1 flex items-end gap-[2px] h-6 bg-black/20 rounded px-1">
          {fpsHistory.map((value, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${Math.min((value / 60) * 100, 100)}%` }}
              className={`w-1 rounded-t ${getBarColor(value)}`}
              style={{ minHeight: '2px' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
