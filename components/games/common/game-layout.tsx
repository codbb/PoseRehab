'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScoreDisplay } from './score-display'

interface GameLayoutProps {
  title: string
  score: number
  combo: number
  maxCombo?: number
  showBackButton?: boolean
  onBack?: () => void
  soundEnabled?: boolean
  onToggleSound?: () => void
  children: ReactNode
  className?: string
}

export function GameLayout({
  title,
  score,
  combo,
  maxCombo,
  showBackButton = true,
  onBack,
  soundEnabled = true,
  onToggleSound,
  children,
  className,
}: GameLayoutProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push('/exercise/games')
    }
  }

  return (
    <div className={`relative min-h-screen bg-background ${className || ''}`}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-surface/80 px-4 py-3 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        </div>

        <ScoreDisplay score={score} combo={combo} maxCombo={maxCombo} />

        {onToggleSound && (
          <Button variant="ghost" size="icon" onClick={onToggleSound}>
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        )}
      </motion.div>

      {/* Game Area */}
      <div className="pt-16">{children}</div>
    </div>
  )
}
