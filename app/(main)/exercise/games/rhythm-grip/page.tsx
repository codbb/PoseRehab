'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Hand, Play, Trophy } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DifficultySelect } from '@/components/games/common'
import { RhythmGame } from '@/components/games/rhythm-grip'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty } from '@/types/game'

export default function RhythmGripPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
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
    return <RhythmGame difficulty={difficulty} onBack={handleBack} />
  }

  const highScores = {
    easy: getHighScore('rhythm-grip', 'easy'),
    normal: getHighScore('rhythm-grip', 'normal'),
    hard: getHighScore('rhythm-grip', 'hard'),
  }

  return (
    <MainLayout title={language === 'ko' ? '리듬 그립' : 'Rhythm Grip'}>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Game Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <Hand className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {language === 'ko' ? '리듬 그립' : 'Rhythm Grip'}
                  </h2>
                  <p className="mt-1 text-text-secondary">
                    {language === 'ko'
                      ? '음악에 맞춰 손을 쥐고 펴세요!'
                      : 'Grip your hands to the rhythm!'}
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
                        ? '1. 카메라 앞에 양손을 위치시키세요'
                        : '1. Position both hands in front of the camera'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '2. 노트가 판정선에 도달하면 해당 손을 쥐세요'
                        : '2. Grip the corresponding hand when notes reach the line'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '3. 타이밍에 맞춰 손을 쥐면 점수를 얻습니다'
                        : '3. Score points by gripping at the right timing'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '4. 콤보를 유지하면 보너스 점수를 얻습니다'
                        : '4. Maintain combos for bonus points'}
                    </li>
                  </ul>
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
