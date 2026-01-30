export type XPAction =
  | 'posture_analysis'
  | 'exercise_complete'
  | 'game_play'
  | 'daily_challenge'
  | 'streak_bonus'
  | 'badge_earned'
  | 'high_accuracy'

export interface XPReward {
  action: XPAction
  baseXP: number
  description: string
  descriptionKo: string
}

export const XP_REWARDS: Record<XPAction, XPReward> = {
  posture_analysis: {
    action: 'posture_analysis',
    baseXP: 20,
    description: 'Posture Analysis',
    descriptionKo: '자세 분석',
  },
  exercise_complete: {
    action: 'exercise_complete',
    baseXP: 30,
    description: 'Exercise Complete',
    descriptionKo: '운동 완료',
  },
  game_play: {
    action: 'game_play',
    baseXP: 15,
    description: 'Game Play',
    descriptionKo: '게임 플레이',
  },
  daily_challenge: {
    action: 'daily_challenge',
    baseXP: 50,
    description: 'Daily Challenge',
    descriptionKo: '일일 챌린지',
  },
  streak_bonus: {
    action: 'streak_bonus',
    baseXP: 10,
    description: 'Streak Bonus',
    descriptionKo: '연속 출석 보너스',
  },
  badge_earned: {
    action: 'badge_earned',
    baseXP: 25,
    description: 'Badge Earned',
    descriptionKo: '뱃지 획득',
  },
  high_accuracy: {
    action: 'high_accuracy',
    baseXP: 15,
    description: 'High Accuracy Bonus',
    descriptionKo: '고정확도 보너스',
  },
}

export interface XPCalculationResult {
  baseXP: number
  bonusXP: number
  totalXP: number
  breakdown: Array<{
    source: string
    sourceKo: string
    amount: number
  }>
}

export function calculateXPForAction(
  action: XPAction,
  context?: {
    accuracy?: number
    score?: number
    combo?: number
    streak?: number
    duration?: number
  }
): XPCalculationResult {
  const reward = XP_REWARDS[action]
  let baseXP = reward.baseXP
  let bonusXP = 0
  const breakdown: XPCalculationResult['breakdown'] = [
    {
      source: reward.description,
      sourceKo: reward.descriptionKo,
      amount: baseXP,
    },
  ]

  if (context) {
    // Accuracy bonus for exercises
    if (action === 'exercise_complete' && context.accuracy) {
      if (context.accuracy >= 95) {
        bonusXP += 15
        breakdown.push({
          source: 'Perfect Accuracy (95%+)',
          sourceKo: '완벽한 정확도 (95%+)',
          amount: 15,
        })
      } else if (context.accuracy >= 85) {
        bonusXP += 10
        breakdown.push({
          source: 'Great Accuracy (85%+)',
          sourceKo: '우수한 정확도 (85%+)',
          amount: 10,
        })
      } else if (context.accuracy >= 75) {
        bonusXP += 5
        breakdown.push({
          source: 'Good Accuracy (75%+)',
          sourceKo: '좋은 정확도 (75%+)',
          amount: 5,
        })
      }
    }

    // Score bonus for games
    if (action === 'game_play' && context.score) {
      if (context.score >= 10000) {
        bonusXP += 20
        breakdown.push({
          source: 'Score Bonus (10000+)',
          sourceKo: '점수 보너스 (10000+)',
          amount: 20,
        })
      } else if (context.score >= 5000) {
        bonusXP += 10
        breakdown.push({
          source: 'Score Bonus (5000+)',
          sourceKo: '점수 보너스 (5000+)',
          amount: 10,
        })
      }
    }

    // Combo bonus for games
    if (action === 'game_play' && context.combo) {
      if (context.combo >= 30) {
        bonusXP += 15
        breakdown.push({
          source: 'Combo Bonus (30+)',
          sourceKo: '콤보 보너스 (30+)',
          amount: 15,
        })
      } else if (context.combo >= 20) {
        bonusXP += 10
        breakdown.push({
          source: 'Combo Bonus (20+)',
          sourceKo: '콤보 보너스 (20+)',
          amount: 10,
        })
      }
    }

    // Streak bonus
    if (action === 'streak_bonus' && context.streak) {
      const streakMultiplier = Math.min(context.streak, 30)
      baseXP = 10 * streakMultiplier
      breakdown[0].amount = baseXP
    }

    // Duration bonus for exercises
    if (action === 'exercise_complete' && context.duration) {
      if (context.duration >= 1800) {
        // 30+ minutes
        bonusXP += 20
        breakdown.push({
          source: 'Long Session (30+ min)',
          sourceKo: '긴 세션 (30분+)',
          amount: 20,
        })
      } else if (context.duration >= 900) {
        // 15+ minutes
        bonusXP += 10
        breakdown.push({
          source: 'Good Session (15+ min)',
          sourceKo: '좋은 세션 (15분+)',
          amount: 10,
        })
      }
    }
  }

  return {
    baseXP,
    bonusXP,
    totalXP: baseXP + bonusXP,
    breakdown,
  }
}

export function calculateLevelFromXP(totalXP: number): {
  level: number
  currentLevelXP: number
  xpForNextLevel: number
  progress: number
} {
  let level = 1
  let xpRemaining = totalXP

  // Level formula: XP needed for level N = N * 100
  while (xpRemaining >= level * 100) {
    xpRemaining -= level * 100
    level++
  }

  const xpForNextLevel = level * 100

  return {
    level,
    currentLevelXP: xpRemaining,
    xpForNextLevel,
    progress: (xpRemaining / xpForNextLevel) * 100,
  }
}

export function getXPForLevel(level: number): number {
  return level * 100
}

export function getTotalXPForLevel(targetLevel: number): number {
  let total = 0
  for (let i = 1; i < targetLevel; i++) {
    total += i * 100
  }
  return total
}
