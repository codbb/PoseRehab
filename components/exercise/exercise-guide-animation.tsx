'use client'

import { useState, useEffect, memo } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const ANIMATION_FILES: Record<string, string> = {
  squat: '/animations/exercise-squat.json',
  lunge: '/animations/exercise-lunge.json',
  pushup: '/animations/exercise-pushup.json',
  bridge: '/animations/exercise-bridge.json',
  crunch: '/animations/exercise-crunch.json',
  shoulder_stretch: '/animations/exercise-shoulder_stretch.json',
}

const DEFAULT_ANIMATION = '/animations/exercise-squat.json'

interface ExerciseGuideAnimationProps {
  exerciseId: string
  size?: 'sm' | 'lg'
  className?: string
}

function ExerciseGuideAnimationInner({
  exerciseId,
  size = 'lg',
  className,
}: ExerciseGuideAnimationProps) {
  // Dynamic lottie-react component & animation data
  const [LottieComp, setLottieComp] = useState<React.ComponentType<{
    animationData: object
    loop: boolean
    autoplay: boolean
    style?: React.CSSProperties
  }> | null>(null)
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [error, setError] = useState(false)

  // Dynamically import lottie-react (avoids SSR issues)
  useEffect(() => {
    import('lottie-react')
      .then((mod) => setLottieComp(() => mod.default))
      .catch(() => setError(true))
  }, [])

  // Fetch animation JSON
  useEffect(() => {
    const filePath = ANIMATION_FILES[exerciseId] || DEFAULT_ANIMATION
    fetch(filePath)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(setAnimationData)
      .catch(() => {
        // Fallback to default animation
        if (filePath !== DEFAULT_ANIMATION) {
          fetch(DEFAULT_ANIMATION)
            .then((r) => r.json())
            .then(setAnimationData)
            .catch(() => setError(true))
        } else {
          setError(true)
        }
      })
  }, [exerciseId])

  const isSmall = size === 'sm'
  const px = isSmall ? 80 : 200

  // Loading state
  if (!LottieComp || !animationData) {
    if (error) {
      return (
        <div
          className={cn(
            'flex items-center justify-center rounded-lg bg-background/50 border border-border/30',
            isSmall ? 'h-20 w-20' : 'h-48 w-48',
            className
          )}
        >
          <span className="text-xs text-text-secondary">?</span>
        </div>
      )
    }
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-background/50 border border-border/30',
          isSmall ? 'h-20 w-20' : 'h-48 w-48',
          className
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-text-secondary/40" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-background/50 border border-border/30',
        isSmall ? 'h-20 w-20' : 'h-48 w-48',
        className
      )}
    >
      <LottieComp
        animationData={animationData}
        loop
        autoplay
        style={{ width: px, height: px }}
      />
    </div>
  )
}

export const ExerciseGuideAnimation = memo(ExerciseGuideAnimationInner)
