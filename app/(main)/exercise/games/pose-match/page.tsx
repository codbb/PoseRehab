'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Play, Trophy } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DifficultySelect } from '@/components/games/common'
import { PoseGame } from '@/components/games/pose-match'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty } from '@/types/game'

export default function PoseMatchPage() {
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
    return <PoseGame difficulty={difficulty} onBack={handleBack} />
  }

  const highScores = {
    easy: getHighScore('pose-match', 'easy'),
    normal: getHighScore('pose-match', 'normal'),
    hard: getHighScore('pose-match', 'hard'),
  }

  return (
    <MainLayout title={language === 'ko' ? '자세 맞추기' : 'Pose Match'}>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Game Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary/10">
                  <User className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {language === 'ko' ? '자세 맞추기' : 'Pose Match'}
                  </h2>
                  <p className="mt-1 text-text-secondary">
                    {language === 'ko'
                      ? '벽의 구멍에 맞는 자세를 취하세요!'
                      : 'Match the pose shown on the wall!'}
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
                        ? '1. 카메라 앞에 전신이 보이도록 서세요'
                        : '1. Stand so your full body is visible to the camera'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '2. 벽이 다가오면 표시된 자세를 취하세요'
                        : '2. Strike the pose shown as the wall approaches'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '3. 자세가 맞으면 벽을 통과합니다'
                        : '3. Pass through the wall if your pose matches'}
                    </li>
                    <li>
                      {language === 'ko'
                        ? '4. 연속으로 통과하면 콤보 보너스!'
                        : '4. Chain passes for combo bonuses!'}
                    </li>
                  </ul>
                </div>

                {/* Pose Examples */}
                <div className="rounded-lg bg-background p-4">
                  <h3 className="font-semibold text-text-primary">
                    {language === 'ko' ? '자세 종류' : 'Pose Types'}
                  </h3>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg bg-surface p-2">
                      {language === 'ko' ? '양팔 들기' : 'Arms Up'}
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      {language === 'ko' ? 'T자 자세' : 'T-Pose'}
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      {language === 'ko' ? '쪼그려 앉기' : 'Crouch'}
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
