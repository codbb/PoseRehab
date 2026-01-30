'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Target, CheckCircle, Gift, Dumbbell, Activity, Gamepad2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useChallengeStore, type ChallengeType } from '@/stores/challenge-store'
import { useUserStore } from '@/stores/user-store'
import { useTranslation } from '@/hooks/use-translation'

export function DailyChallenges() {
  const { language } = useTranslation()
  const { getTodayChallenges, claimReward, generateDailyChallenges } = useChallengeStore()
  const { addExperience } = useUserStore()

  useEffect(() => {
    generateDailyChallenges()
  }, [generateDailyChallenges])

  const challenges = getTodayChallenges()

  const getChallengeIcon = (type: ChallengeType) => {
    switch (type) {
      case 'exercise':
        return <Dumbbell className="h-5 w-5" />
      case 'posture':
        return <Activity className="h-5 w-5" />
      case 'game':
        return <Gamepad2 className="h-5 w-5" />
      case 'streak':
        return <Target className="h-5 w-5" />
    }
  }

  const handleClaimReward = (challengeId: string) => {
    const reward = claimReward(challengeId)
    if (reward > 0) {
      addExperience(reward)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {language === 'ko' ? '일일 챌린지' : 'Daily Challenges'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            {language === 'ko'
              ? '오늘의 챌린지가 없습니다'
              : 'No challenges for today'}
          </div>
        ) : (
          challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-lg border p-4 ${
                challenge.completed
                  ? 'border-secondary/50 bg-secondary/5'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    challenge.completed
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {challenge.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    getChallengeIcon(challenge.type)
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-text-primary">
                        {language === 'ko' ? challenge.titleKo : challenge.title}
                      </h4>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {language === 'ko'
                          ? challenge.descriptionKo
                          : challenge.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Gift className="h-4 w-4 text-warning" />
                      <span className="font-medium text-warning">
                        +{challenge.reward} XP
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">
                        {language === 'ko' ? '진행' : 'Progress'}
                      </span>
                      <span className="font-medium text-text-primary">
                        {challenge.current} / {challenge.target}
                      </span>
                    </div>
                    <Progress
                      value={(challenge.current / challenge.target) * 100}
                      variant={challenge.completed ? 'success' : undefined}
                      className="h-2"
                    />
                  </div>

                  {challenge.completed && !challenge.claimedAt && (
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => handleClaimReward(challenge.id)}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      {language === 'ko' ? '보상 받기' : 'Claim Reward'}
                    </Button>
                  )}

                  {challenge.claimedAt && (
                    <div className="mt-3 text-center text-sm text-secondary">
                      {language === 'ko' ? '보상 수령 완료!' : 'Reward Claimed!'}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
