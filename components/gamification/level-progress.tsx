'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'

interface LevelProgressProps {
  level: number
  experience: number
  xpForNextLevel: number
}

export function LevelProgress({ level, experience, xpForNextLevel }: LevelProgressProps) {
  const { language } = useTranslation()
  const progress = (experience / xpForNextLevel) * 100

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
      <div className="flex items-center gap-4">
        <motion.div
          className="relative flex h-16 w-16 items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary opacity-20" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-surface">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {level}
          </div>
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-text-primary">
              {language === 'ko' ? `레벨 ${level}` : `Level ${level}`}
            </span>
            <span className="text-sm text-text-secondary">
              {experience} / {xpForNextLevel} XP
            </span>
          </div>

          <div className="h-3 rounded-full bg-background overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <p className="mt-1 text-xs text-text-secondary">
            {language === 'ko'
              ? `다음 레벨까지 ${xpForNextLevel - experience} XP`
              : `${xpForNextLevel - experience} XP to next level`}
          </p>
        </div>
      </div>
    </div>
  )
}
