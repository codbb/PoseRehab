'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/use-translation'
import { getAllBadges, type BadgeDefinition } from '@/lib/gamification'
import type { Badge } from '@/types/user'

interface BadgeGridProps {
  earnedBadges: Badge[]
}

export function BadgeGrid({ earnedBadges }: BadgeGridProps) {
  const { language } = useTranslation()
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null)

  const allBadges = getAllBadges()
  const earnedIds = new Set(earnedBadges.map((b) => b.id))

  const getEarnedBadge = (id: string): Badge | undefined => {
    return earnedBadges.find((b) => b.id === id)
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
        {allBadges.map((badge, index) => {
          const isEarned = earnedIds.has(badge.id)
          const earned = getEarnedBadge(badge.id)

          return (
            <motion.button
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedBadge(badge)}
              className={`relative flex flex-col items-center justify-center rounded-lg p-3 transition-all ${
                isEarned
                  ? 'bg-primary/10 hover:bg-primary/20'
                  : 'bg-background hover:bg-surface'
              }`}
            >
              <span
                className={`text-3xl ${!isEarned ? 'grayscale opacity-30' : ''}`}
              >
                {badge.icon}
              </span>
              {!isEarned && (
                <Lock className="absolute top-1 right-1 h-3 w-3 text-text-secondary" />
              )}
              <span
                className={`mt-1 text-xs text-center line-clamp-1 ${
                  isEarned ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {language === 'ko' ? badge.nameKo : badge.name}
              </span>
            </motion.button>
          )
        })}
      </div>

      <Modal
        isOpen={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        title={
          selectedBadge
            ? language === 'ko'
              ? selectedBadge.nameKo
              : selectedBadge.name
            : ''
        }
        size="sm"
      >
        {selectedBadge && (
          <div className="text-center space-y-4">
            <div
              className={`mx-auto text-6xl ${
                !earnedIds.has(selectedBadge.id) ? 'grayscale opacity-50' : ''
              }`}
            >
              {selectedBadge.icon}
            </div>

            <div>
              <h3 className="font-semibold text-text-primary text-lg">
                {language === 'ko' ? selectedBadge.nameKo : selectedBadge.name}
              </h3>
              <p className="text-text-secondary mt-1">
                {language === 'ko'
                  ? selectedBadge.descriptionKo
                  : selectedBadge.description}
              </p>
            </div>

            <div className="rounded-lg bg-background p-3">
              <span className="text-sm text-text-secondary">
                {language === 'ko' ? '조건' : 'Condition'}
              </span>
              <p className="font-medium text-text-primary">
                {selectedBadge.condition}
              </p>
            </div>

            {earnedIds.has(selectedBadge.id) ? (
              <div className="flex items-center justify-center gap-2 text-secondary">
                <span className="text-sm">
                  {language === 'ko' ? '획득 완료' : 'Earned'}
                </span>
                {getEarnedBadge(selectedBadge.id)?.earnedAt && (
                  <span className="text-xs text-text-secondary">
                    {new Date(
                      getEarnedBadge(selectedBadge.id)!.earnedAt!
                    ).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-text-secondary">
                <Lock className="h-4 w-4" />
                <span className="text-sm">
                  {language === 'ko' ? '미획득' : 'Not earned yet'}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
