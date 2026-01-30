'use client'

import { motion } from 'framer-motion'
import { Dumbbell, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'
import { useRouter } from 'next/navigation'
import type { PainPrediction } from '@/lib/prediction'

interface PreventionTipsProps {
  predictions: PainPrediction[]
}

export function PreventionTips({ predictions }: PreventionTipsProps) {
  const { language } = useTranslation()
  const router = useRouter()

  // Collect unique recommendations from all predictions
  const allRecommendations = predictions.flatMap((p) =>
    language === 'ko' ? p.recommendationsKo : p.recommendations
  )
  const uniqueRecommendations = Array.from(new Set(allRecommendations)).slice(0, 6)

  if (predictions.length === 0 || uniqueRecommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ko' ? '예방 운동' : 'Prevention Exercises'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-40 items-center justify-center text-text-secondary">
          {language === 'ko'
            ? '예측 결과가 없습니다'
            : 'No predictions available'}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          {language === 'ko' ? '추천 예방 운동' : 'Recommended Prevention Exercises'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-secondary">
          {language === 'ko'
            ? '통증을 예방하기 위해 아래 운동을 규칙적으로 수행하세요.'
            : 'Perform these exercises regularly to prevent pain.'}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {uniqueRecommendations.map((exercise, index) => (
            <motion.div
              key={exercise}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 rounded-lg bg-background p-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{exercise}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4 mt-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {language === 'ko'
                ? '일일 권장: 15-20분'
                : 'Daily recommended: 15-20 min'}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => router.push('/exercise/list')}
          >
            {language === 'ko' ? '운동 시작' : 'Start Exercise'}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-text-primary">
            {language === 'ko' ? '일상 생활 팁' : 'Daily Life Tips'}
          </h4>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {language === 'ko'
                ? '30분마다 자세를 바꾸고 스트레칭하세요'
                : 'Change position and stretch every 30 minutes'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {language === 'ko'
                ? '모니터는 눈높이에 맞추세요'
                : 'Keep your monitor at eye level'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {language === 'ko'
                ? '의자에 깊이 앉고 등을 기대세요'
                : 'Sit deep in your chair with back support'}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
