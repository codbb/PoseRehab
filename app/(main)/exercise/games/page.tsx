'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Hand, User, Sword, Trophy, ChevronRight, Gamepad2, Target, Circle } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'

interface GameInfo {
  id: string
  href: string
  nameKo: string
  nameEn: string
  descriptionKo: string
  descriptionEn: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const GAMES: GameInfo[] = [
  {
    id: 'rhythm-grip',
    href: '/exercise/games/rhythm-grip',
    nameKo: '리듬 그립',
    nameEn: 'Rhythm Grip',
    descriptionKo: '음악에 맞춰 손을 쥐고 펴세요',
    descriptionEn: 'Grip your hands to the rhythm',
    icon: <Hand className="h-8 w-8" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'pose-match',
    href: '/exercise/games/pose-match',
    nameKo: '자세 맞추기',
    nameEn: 'Pose Match',
    descriptionKo: '벽의 구멍에 맞는 자세를 취하세요',
    descriptionEn: 'Match the pose to pass through walls',
    icon: <User className="h-8 w-8" />,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    id: 'fruit-ninja',
    href: '/exercise/games/fruit-ninja',
    nameKo: '과일 닌자',
    nameEn: 'Fruit Ninja',
    descriptionKo: '손을 휘둘러 과일을 자르세요',
    descriptionEn: 'Slice fruits with your hand',
    icon: <Sword className="h-8 w-8" />,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    id: 'whack-a-mole',
    href: '/exercise/games/whack-a-mole',
    nameKo: 'AI 두더지 잡기',
    nameEn: 'AI Whack-a-Mole',
    descriptionKo: '손가락으로 두더지를 잡아라',
    descriptionEn: 'Catch moles with your finger',
    icon: <Target className="h-8 w-8" />,
    color: 'text-error',
    bgColor: 'bg-error/10',
  },
  {
    id: 'bubble-shooter',
    href: '/exercise/games/bubble-shooter',
    nameKo: '버블 슈터',
    nameEn: 'Bubble Shooter',
    descriptionKo: '떠다니는 버블을 터뜨려라',
    descriptionEn: 'Pop the floating bubbles',
    icon: <Circle className="h-8 w-8" fill="currentColor" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
]

export default function GamesPage() {
  const { language } = useTranslation()
  const { getHighScore, getTotalGamesPlayed, getRecentScores } = useGameStore()

  const totalGames = getTotalGamesPlayed()
  const recentScores = getRecentScores(5)

  return (
    <MainLayout title={language === 'ko' ? '재활 게임' : 'Rehab Games'}>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">{totalGames}</div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '총 플레이' : 'Total Plays'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Trophy className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {Math.max(
                    getHighScore('rhythm-grip'),
                    getHighScore('pose-match'),
                    getHighScore('fruit-ninja'),
                    getHighScore('whack-a-mole'),
                    getHighScore('bubble-shooter')
                  ).toLocaleString()}
                </div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '최고 점수' : 'Best Score'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <Hand className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">5</div>
                <div className="text-sm text-text-secondary">
                  {language === 'ko' ? '게임 종류' : 'Game Types'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Game Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {language === 'ko' ? '게임 선택' : 'Select Game'}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game, index) => {
              const highScore = getHighScore(game.id as any)
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={game.href}>
                    <Card className="h-full cursor-pointer transition-all hover:border-primary hover:shadow-lg">
                      <CardContent className="p-6">
                        <div className={`mb-4 inline-flex rounded-xl p-3 ${game.bgColor}`}>
                          <span className={game.color}>{game.icon}</span>
                        </div>

                        <h3 className="text-lg font-semibold text-text-primary">
                          {language === 'ko' ? game.nameKo : game.nameEn}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {language === 'ko' ? game.descriptionKo : game.descriptionEn}
                        </p>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-warning" />
                            <span className="text-sm font-medium text-text-primary">
                              {highScore.toLocaleString()}
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-text-secondary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Recent Scores */}
        {recentScores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {language === 'ko' ? '최근 기록' : 'Recent Scores'}
            </h2>

            <Card>
              <CardContent className="divide-y divide-border p-0">
                {recentScores.map((score, index) => {
                  const game = GAMES.find((g) => g.id === score.gameType)
                  if (!game) return null

                  return (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${game.bgColor}`}>
                          <span className={game.color}>{game.icon}</span>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">
                            {language === 'ko' ? game.nameKo : game.nameEn}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {new Date(score.playedAt).toLocaleDateString(
                              language === 'ko' ? 'ko-KR' : 'en-US'
                            )}
                            {' - '}
                            {score.difficulty}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {score.score.toLocaleString()}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {score.maxCombo}x combo
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </MainLayout>
  )
}
