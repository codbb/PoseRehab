'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Star, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'

interface LevelUpModalProps {
  isOpen: boolean
  onClose: () => void
  newLevel: number
}

export function LevelUpModal({ isOpen, onClose, newLevel }: LevelUpModalProps) {
  const { language } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <AnimatePresence>
        {isOpen && (
          <div className="text-center py-4">
            {/* Confetti-like particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#6366F1', '#10B981', '#F59E0B', '#EC4899'][
                      i % 4
                    ],
                    left: `${Math.random() * 100}%`,
                    top: '-10px',
                  }}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{
                    y: 400,
                    opacity: 0,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>

            {/* Level badge */}
            <motion.div
              className="relative mx-auto w-32 h-32"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8 }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary opacity-20 blur-xl" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary to-secondary" />
              <div className="absolute inset-4 rounded-full bg-surface flex items-center justify-center">
                <Star className="h-12 w-12 text-primary" />
              </div>
              <motion.div
                className="absolute -top-2 -right-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles className="h-8 w-8 text-warning" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <h2 className="text-2xl font-bold text-text-primary">
                {language === 'ko' ? '레벨 업!' : 'Level Up!'}
              </h2>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mt-2">
                {language === 'ko' ? `레벨 ${newLevel}` : `Level ${newLevel}`}
              </p>
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-text-secondary"
            >
              {language === 'ko'
                ? '축하합니다! 꾸준한 노력으로 새로운 레벨에 도달했습니다.'
                : 'Congratulations! Your dedication has paid off.'}
            </motion.p>

            {/* Rewards info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 p-4 rounded-lg bg-background"
            >
              <p className="text-sm text-text-secondary">
                {language === 'ko'
                  ? '다음 레벨까지 더 많은 운동과 분석을 진행하세요!'
                  : 'Keep exercising and analyzing to reach the next level!'}
              </p>
            </motion.div>

            {/* Close button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6"
            >
              <Button onClick={onClose} className="w-full">
                {language === 'ko' ? '계속하기' : 'Continue'}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
