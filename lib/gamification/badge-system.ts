import type { Badge } from '@/types/user'
import type { ExerciseRecord } from '@/types/exercise'
import type { GameScore } from '@/types/game'
import type { PostureAnalysisResult } from '@/types/posture'

export interface BadgeDefinition extends Omit<Badge, 'earnedAt'> {
  check: (context: BadgeCheckContext) => boolean
}

export interface BadgeCheckContext {
  exerciseRecords: ExerciseRecord[]
  gameScores: GameScore[]
  analysisHistory: PostureAnalysisResult[]
  currentAnalysis: PostureAnalysisResult | null
  level: number
  badges: string[]
  streak: number
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_analysis',
    name: 'First Analysis',
    nameKo: '첫 분석',
    description: 'Complete your first posture analysis',
    descriptionKo: '첫 자세 분석을 완료하세요',
    icon: '🎯',
    condition: '1 posture analysis',
    check: (ctx) => ctx.analysisHistory.length >= 1,
  },
  {
    id: 'analysis_10',
    name: 'Analysis Pro',
    nameKo: '분석 전문가',
    description: 'Complete 10 posture analyses',
    descriptionKo: '자세 분석을 10회 완료하세요',
    icon: '📊',
    condition: '10 posture analyses',
    check: (ctx) => ctx.analysisHistory.length >= 10,
  },
  {
    id: 'first_exercise',
    name: 'First Workout',
    nameKo: '첫 운동',
    description: 'Complete your first exercise session',
    descriptionKo: '첫 운동 세션을 완료하세요',
    icon: '💪',
    condition: '1 exercise session',
    check: (ctx) => ctx.exerciseRecords.length >= 1,
  },
  {
    id: 'exercise_10',
    name: 'Exercise Enthusiast',
    nameKo: '운동 애호가',
    description: 'Complete 10 exercise sessions',
    descriptionKo: '운동을 10회 완료하세요',
    icon: '🏋️',
    condition: '10 exercise sessions',
    check: (ctx) => ctx.exerciseRecords.length >= 10,
  },
  {
    id: 'exercise_50',
    name: 'Fitness Dedicated',
    nameKo: '피트니스 열정가',
    description: 'Complete 50 exercise sessions',
    descriptionKo: '운동을 50회 완료하세요',
    icon: '🔥',
    condition: '50 exercise sessions',
    check: (ctx) => ctx.exerciseRecords.length >= 50,
  },
  {
    id: 'exercise_100',
    name: 'Exercise Master',
    nameKo: '운동 마스터',
    description: 'Complete 100 exercise sessions',
    descriptionKo: '운동을 100회 완료하세요',
    icon: '🏆',
    condition: '100 exercise sessions',
    check: (ctx) => ctx.exerciseRecords.length >= 100,
  },
  {
    id: 'perfect_posture',
    name: 'Perfect Posture',
    nameKo: '완벽한 자세',
    description: 'Achieve a posture score of 90 or higher',
    descriptionKo: '자세 점수 90점 이상을 달성하세요',
    icon: '⭐',
    condition: 'Score 90+',
    check: (ctx) => ctx.currentAnalysis?.overallScore ? ctx.currentAnalysis.overallScore >= 90 : false,
  },
  {
    id: 'accuracy_master',
    name: 'Accuracy Master',
    nameKo: '정확도 마스터',
    description: 'Achieve 95% accuracy in an exercise',
    descriptionKo: '운동에서 95% 정확도를 달성하세요',
    icon: '🎯',
    condition: '95% accuracy',
    check: (ctx) => ctx.exerciseRecords.some((r) => r.averageAccuracy >= 95),
  },
  {
    id: 'first_game',
    name: 'First Game',
    nameKo: '첫 게임',
    description: 'Play your first rehabilitation game',
    descriptionKo: '첫 재활 게임을 플레이하세요',
    icon: '🎮',
    condition: '1 game played',
    check: (ctx) => ctx.gameScores.length >= 1,
  },
  {
    id: 'game_pro',
    name: 'Game Pro',
    nameKo: '게임 프로',
    description: 'Play 20 rehabilitation games',
    descriptionKo: '재활 게임을 20회 플레이하세요',
    icon: '👾',
    condition: '20 games played',
    check: (ctx) => ctx.gameScores.length >= 20,
  },
  {
    id: 'high_scorer',
    name: 'High Scorer',
    nameKo: '하이 스코어러',
    description: 'Score 5000+ points in any game',
    descriptionKo: '게임에서 5000점 이상을 달성하세요',
    icon: '🌟',
    condition: '5000+ points',
    check: (ctx) => ctx.gameScores.some((s) => s.score >= 5000),
  },
  {
    id: 'combo_king',
    name: 'Combo King',
    nameKo: '콤보 킹',
    description: 'Achieve a combo of 20 or more',
    descriptionKo: '20 이상의 콤보를 달성하세요',
    icon: '👑',
    condition: '20+ combo',
    check: (ctx) => ctx.gameScores.some((s) => s.maxCombo >= 20),
  },
  {
    id: 'week_streak',
    name: '7 Day Streak',
    nameKo: '7일 연속',
    description: 'Exercise 7 days in a row',
    descriptionKo: '7일 연속 운동하세요',
    icon: '📅',
    condition: '7 day streak',
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: 'month_streak',
    name: '30 Day Streak',
    nameKo: '30일 연속',
    description: 'Exercise 30 days in a row',
    descriptionKo: '30일 연속 운동하세요',
    icon: '🗓️',
    condition: '30 day streak',
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: 'level_5',
    name: 'Level 5',
    nameKo: '레벨 5 달성',
    description: 'Reach level 5',
    descriptionKo: '레벨 5에 도달하세요',
    icon: '🎖️',
    condition: 'Level 5',
    check: (ctx) => ctx.level >= 5,
  },
  {
    id: 'level_10',
    name: 'Level 10',
    nameKo: '레벨 10 달성',
    description: 'Reach level 10',
    descriptionKo: '레벨 10에 도달하세요',
    icon: '🏅',
    condition: 'Level 10',
    check: (ctx) => ctx.level >= 10,
  },
  {
    id: 'level_20',
    name: 'Level 20',
    nameKo: '레벨 20 달성',
    description: 'Reach level 20',
    descriptionKo: '레벨 20에 도달하세요',
    icon: '🥇',
    condition: 'Level 20',
    check: (ctx) => ctx.level >= 20,
  },
]

export function checkNewBadges(context: BadgeCheckContext): Badge[] {
  const newBadges: Badge[] = []

  for (const definition of BADGE_DEFINITIONS) {
    if (context.badges.includes(definition.id)) {
      continue
    }

    if (definition.check(context)) {
      newBadges.push({
        id: definition.id,
        name: definition.name,
        nameKo: definition.nameKo,
        description: definition.description,
        descriptionKo: definition.descriptionKo,
        icon: definition.icon,
        condition: definition.condition,
        earnedAt: new Date().toISOString(),
      })
    }
  }

  return newBadges
}

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id)
}

export function getAllBadges(): BadgeDefinition[] {
  return BADGE_DEFINITIONS
}

export function calculateStreak(exerciseRecords: ExerciseRecord[]): number {
  if (exerciseRecords.length === 0) return 0

  const sortedDates = Array.from(new Set(exerciseRecords.map((r) => r.date))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0
  }

  let streak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i - 1])
    const prevDate = new Date(sortedDates[i])

    const diffDays = Math.floor(
      (currentDate.getTime() - prevDate.getTime()) / 86400000
    )

    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}
