'use client'

import { motion } from 'framer-motion'
import { Zap, Flame, Skull } from 'lucide-react'
import type { GameDifficulty } from '@/types/game'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface DifficultySelectProps {
  selected: GameDifficulty
  onSelect: (difficulty: GameDifficulty) => void
  className?: string
}

const difficulties: {
  id: GameDifficulty
  labelKo: string
  labelEn: string
  descKo: string
  descEn: string
  icon: React.ReactNode
  color: string
}[] = [
  {
    id: 'easy',
    labelKo: '쉬움',
    labelEn: 'Easy',
    descKo: '천천히 연습하기',
    descEn: 'Take it slow',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-secondary border-secondary bg-secondary/10',
  },
  {
    id: 'normal',
    labelKo: '보통',
    labelEn: 'Normal',
    descKo: '적당한 도전',
    descEn: 'Balanced challenge',
    icon: <Flame className="h-6 w-6" />,
    color: 'text-warning border-warning bg-warning/10',
  },
  {
    id: 'hard',
    labelKo: '어려움',
    labelEn: 'Hard',
    descKo: '최고의 도전',
    descEn: 'Ultimate challenge',
    icon: <Skull className="h-6 w-6" />,
    color: 'text-error border-error bg-error/10',
  },
]

export function DifficultySelect({
  selected,
  onSelect,
  className,
}: DifficultySelectProps) {
  const { language } = useTranslation()

  return (
    <div className={`grid gap-4 sm:grid-cols-3 ${className || ''}`}>
      {difficulties.map((diff, index) => (
        <motion.button
          key={diff.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(diff.id)}
          className={cn(
            'relative rounded-xl border-2 p-4 text-left transition-all',
            selected === diff.id
              ? diff.color
              : 'border-border bg-surface hover:border-text-secondary'
          )}
        >
          {selected === diff.id && (
            <motion.div
              layoutId="difficulty-indicator"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}

          <div className={cn('mb-2', selected === diff.id ? '' : 'text-text-secondary')}>
            {diff.icon}
          </div>
          <div className="font-semibold text-text-primary">
            {language === 'ko' ? diff.labelKo : diff.labelEn}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {language === 'ko' ? diff.descKo : diff.descEn}
          </div>
        </motion.button>
      ))}
    </div>
  )
}
