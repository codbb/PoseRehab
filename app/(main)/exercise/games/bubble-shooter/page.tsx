'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Circle, Play, Trophy } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DifficultySelect } from '@/components/games/common'
import { BubbleShooterGame } from '@/components/games/bubble-shooter'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty } from '@/types/game'

export default function BubbleShooterPage() {
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
    return <BubbleShooterGame difficulty={difficulty} onBack={handleBack} />
  }

  const highScores = {
    easy: getHighScore('bubble-shooter', 'easy'),
    normal: getHighScore('bubble-shooter', 'normal'),
    hard: getHighScore('bubble-shooter', 'hard'),
  }

  return (
    <MainLayout title={language === 'ko' ? '버블 슈터' : 'Bubble Shooter'}>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Game Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <Circle className="h-8 w-8 text-primary" fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {language === 'ko' ? '버블 슈터' : 'Bubble Shooter'}
                  </h2>
                  <p className="mt-1 text-text-secondary">
                    {language === 'ko'
                      ? '떠다니는 버블을 터뜨려라!'
                      : 'Pop the floating bubbles!'}
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
                        ? '2. 검지 손가락으로 떠다니는 버블을 터치하세요'
                        : '2. Touch the floating bubbles with your index finger'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '3. 연속으로 터뜨리면 콤보 보너스를 얻습니다'
                        : '3. Pop consecutively for combo bonuses'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '4. 60초 안에 최대한 많은 버블을 터뜨리세요!'
                        : '4. Pop as many bubbles as you can in 60 seconds!'}
                    </li>
                  </ul>
                </div>

                {/* Scoring Info */}
                <div className="rounded-lg bg-background p-4">
                  <h3 className="font-semibold text-text-primary">
                    {language === 'ko' ? '점수' : 'Scoring'}
                  </h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">
                        {language === 'ko' ? '기본 점수' : 'Base Score'}
                      </span>
                      <span className="font-semibold text-secondary">+50</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">
                        {language === 'ko' ? '콤보 점수' : 'Combo Score'}
                      </span>
                      <span className="font-semibold text-primary">+100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">
                        {language === 'ko' ? '콤보 보너스 (3콤보당)' : 'Combo Bonus (per 3)'}
                      </span>
                      <span className="font-semibold text-warning">+50</span>
                    </div>
                  </div>
                </div>

                {/* Bubble Colors Preview */}
                <div className="rounded-lg bg-background p-4">
                  <h3 className="font-semibold text-text-primary">
                    {language === 'ko' ? '버블 종류' : 'Bubble Types'}
                  </h3>
                  <div className="mt-2 flex justify-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-500" />
                    <div className="h-8 w-8 rounded-full bg-orange-500" />
                    <div className="h-8 w-8 rounded-full bg-green-500" />
                    <div className="h-8 w-8 rounded-full bg-blue-500" />
                    <div className="h-8 w-8 rounded-full bg-purple-500" />
                    <div className="h-8 w-8 rounded-full bg-pink-500" />
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
                      <div className="font-bold text-error">{highScores.hard.toLocaleString()}</div>
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
