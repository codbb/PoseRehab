'use client'

import { motion } from 'framer-motion'
import { Trophy, Target, Flame, Clock, RotateCcw, Home } from 'lucide-react'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'
import { formatTime } from '@/lib/utils'

interface GameResultModalProps {
  isOpen: boolean
  gameTitle: string
  score: number
  highScore: number
  maxCombo: number
  accuracy?: number
  duration: number
  extraStats?: {
    label: string
    value: string | number
    icon?: React.ReactNode
  }[]
  onPlayAgain: () => void
  onExit: () => void
}

export function GameResultModal({
  isOpen,
  gameTitle,
  score,
  highScore,
  maxCombo,
  accuracy,
  duration,
  extraStats = [],
  onPlayAgain,
  onExit,
}: GameResultModalProps) {
  const { t, language } = useTranslation()
  const isNewHighScore = score >= highScore && score > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={language === 'ko' ? '게임 결과' : 'Game Result'}
      showCloseButton={false}
      size="lg"
    >
      <div className="space-y-6">
        {/* Trophy */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className={`flex h-20 w-20 items-center justify-center rounded-full ${
              isNewHighScore ? 'bg-warning/20' : 'bg-secondary/20'
            }`}
          >
            <Trophy
              className={`h-10 w-10 ${isNewHighScore ? 'text-warning' : 'text-secondary'}`}
            />
          </motion.div>
        </div>

        {/* New High Score Badge */}
        {isNewHighScore && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <span className="rounded-full bg-warning/20 px-4 py-1 text-sm font-semibold text-warning">
              {language === 'ko' ? '새로운 최고 기록!' : 'NEW HIGH SCORE!'}
            </span>
          </motion.div>
        )}

        {/* Score */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="text-5xl font-bold text-primary">{score.toLocaleString()}</div>
          <div className="mt-1 text-sm text-text-secondary">
            {language === 'ko' ? '최종 점수' : 'Final Score'}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg bg-background p-4 text-center"
          >
            <Flame className="mx-auto mb-2 h-6 w-6 text-warning" />
            <div className="text-xl font-bold text-text-primary">{maxCombo}</div>
            <div className="text-xs text-text-secondary">
              {language === 'ko' ? '최대 콤보' : 'Max Combo'}
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg bg-background p-4 text-center"
          >
            <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
            <div className="text-xl font-bold text-text-primary">{formatTime(duration)}</div>
            <div className="text-xs text-text-secondary">
              {language === 'ko' ? '플레이 시간' : 'Play Time'}
            </div>
          </motion.div>

          {accuracy !== undefined && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-lg bg-background p-4 text-center"
            >
              <Target className="mx-auto mb-2 h-6 w-6 text-secondary" />
              <div className="text-xl font-bold text-text-primary">{accuracy.toFixed(1)}%</div>
              <div className="text-xs text-text-secondary">
                {language === 'ko' ? '정확도' : 'Accuracy'}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-lg bg-background p-4 text-center"
          >
            <Trophy className="mx-auto mb-2 h-6 w-6 text-text-secondary" />
            <div className="text-xl font-bold text-text-primary">
              {highScore.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary">
              {language === 'ko' ? '최고 기록' : 'High Score'}
            </div>
          </motion.div>

          {extraStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="rounded-lg bg-background p-4 text-center"
            >
              {stat.icon && <div className="mx-auto mb-2">{stat.icon}</div>}
              <div className="text-xl font-bold text-text-primary">{stat.value}</div>
              <div className="text-xs text-text-secondary">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <ModalFooter className="mt-6">
        <Button variant="outline" onClick={onExit}>
          <Home className="mr-2 h-4 w-4" />
          {language === 'ko' ? '나가기' : 'Exit'}
        </Button>
        <Button onClick={onPlayAgain}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {language === 'ko' ? '다시 하기' : 'Play Again'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
