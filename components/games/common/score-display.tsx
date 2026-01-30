'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Flame } from 'lucide-react'

interface ScoreDisplayProps {
  score: number
  combo: number
  maxCombo?: number
  showComboFire?: boolean
  className?: string
}

export function ScoreDisplay({
  score,
  combo,
  maxCombo,
  showComboFire = true,
  className,
}: ScoreDisplayProps) {
  const isComboHot = combo >= 10

  return (
    <div className={`flex items-center gap-6 ${className || ''}`}>
      {/* Score */}
      <div className="text-center">
        <motion.div
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-2xl font-bold text-primary"
        >
          {score.toLocaleString()}
        </motion.div>
        <div className="text-xs text-text-secondary">SCORE</div>
      </div>

      {/* Combo */}
      <AnimatePresence mode="wait">
        {combo > 0 && (
          <motion.div
            key="combo"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="text-center"
          >
            <div className="flex items-center gap-1">
              {showComboFire && isComboHot && (
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  <Flame className="h-5 w-5 text-warning" />
                </motion.div>
              )}
              <motion.div
                key={combo}
                initial={{ scale: 1.5, color: '#F59E0B' }}
                animate={{ scale: 1, color: isComboHot ? '#F59E0B' : '#10B981' }}
                className="text-2xl font-bold"
              >
                {combo}
              </motion.div>
            </div>
            <div className="text-xs text-text-secondary">COMBO</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Max Combo */}
      {maxCombo !== undefined && maxCombo > 0 && (
        <div className="text-center">
          <div className="text-lg font-semibold text-text-secondary">{maxCombo}</div>
          <div className="text-xs text-text-secondary">MAX</div>
        </div>
      )}
    </div>
  )
}
