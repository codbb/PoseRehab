'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sword, Play, Trophy } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DifficultySelect } from '@/components/games/common'
import { NinjaGame } from '@/components/games/fruit-ninja'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty } from '@/types/game'

export default function FruitNinjaPage() {
  const router = useRouter()
  const { language } = useTranslation()
  const { getHighScore } = useGameStore()

  const [gameStarted, setGameStarted] = useState(false)
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal')

  const handleStart = () => {
    setGameStarted(true)
  }

  const handleBack = () => {
    setGameStarted(false)
  }

  if (gameStarted) {
    return <NinjaGame difficulty={difficulty} onBack={handleBack} />
  }

  const highScores = {
    easy: getHighScore('fruit-ninja', 'easy'),
    normal: getHighScore('fruit-ninja', 'normal'),
    hard: getHighScore('fruit-ninja', 'hard'),
  }

  return (
    <MainLayout title={language === 'ko' ? '과일 닌자' : 'Fruit Ninja'}>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Game Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-warning/10">
                  <Sword className="h-8 w-8 text-warning" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {language === 'ko' ? '과일 닌자' : 'Fruit Ninja'}
                  </h2>
                  <p className="mt-1 text-text-secondary">
                    {language === 'ko'
                      ? '손을 휘둘러 과일을 잘라요!'
                      : 'Slice fruits with your hand!'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-background p-4">
                  <h3 className="font-semibold text-text-primary">
                    {language === 'ko' ? '게임 방법' : 'How to Play'}
                  </h3>
                  <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                    <li>
                      {language === 'ko'
                        ? '1. 카메라 앞에 손을 위치시키세요'
                        : '1. Position your hand in front of the camera'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '2. 날아오는 과일을 손으로 베세요'
                        : '2. Slash the flying fruits with your hand'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '3. 폭탄은 피하세요! 점수가 깎여요'
                        : '3. Avoid bombs! They deduct points'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '4. 연속으로 베면 콤보 보너스!'
                        : '4. Chain slices for combo bonuses!'}
                    </li>
                  </ul>
                </div>

                {/* Fruit Info */}
                <div className="rounded-lg bg-background p-4">
                  <h3 className="font-semibold text-text-primary">
                    {language === 'ko' ? '과일 종류' : 'Fruit Types'}
                  </h3>
                  <div className="mt-2 grid grid-cols-5 gap-2 text-center">
                    <div className="rounded-lg bg-surface p-2">
                      <div className="text-2xl">🍎</div>
                      <div className="text-xs text-text-secondary">+10</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <div className="text-2xl">🍊</div>
                      <div className="text-xs text-text-secondary">+10</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <div className="text-2xl">🍌</div>
                      <div className="text-xs text-text-secondary">+15</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <div className="text-2xl">🍉</div>
                      <div className="text-xs text-text-secondary">+20</div>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <div className="text-2xl">💣</div>
                      <div className="text-xs text-error">-50</div>
                    </div>
                  </div>
                </div>

                {/* High Scores */}
                <div className="rounded-lg bg-background p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-text-primary">
                    <Trophy className="h-4 w-4 text-warning" />
                    {language === 'ko' ? '최고 기록' : 'High Scores'}
                  </h3>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-text-secondary">Easy</div>
                      <div className="font-bold text-secondary">
                        {highScores.easy.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Normal</div>
                      <div className="font-bold text-warning">
                        {highScores.normal.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Hard</div>
                      <div className="font-bold text-error">
                        {highScores.hard.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Difficulty Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="mb-4 font-semibold text-text-primary">
            {language === 'ko' ? '난이도 선택' : 'Select Difficulty'}
          </h3>
          <DifficultySelect selected={difficulty} onSelect={setDifficulty} />
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <Button size="xl" onClick={handleStart}>
            <Play className="mr-2 h-5 w-5" />
            {language === 'ko' ? '게임 시작' : 'Start Game'}
          </Button>
        </motion.div>
      </div>
    </MainLayout>
  )
}
