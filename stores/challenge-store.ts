import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ChallengeType = 'exercise' | 'posture' | 'game' | 'streak'

export interface DailyChallenge {
  id: string
  type: ChallengeType
  title: string
  titleKo: string
  description: string
  descriptionKo: string
  target: number
  current: number
  reward: number
  completed: boolean
  claimedAt?: string
}

interface ChallengeState {
  challenges: DailyChallenge[]
  lastGeneratedDate: string | null

  generateDailyChallenges: () => void
  updateChallengeProgress: (type: ChallengeType, increment?: number) => void
  claimReward: (challengeId: string) => number
  getTodayChallenges: () => DailyChallenge[]
  getCompletedCount: () => number
}

const CHALLENGE_TEMPLATES: Omit<DailyChallenge, 'id' | 'current' | 'completed' | 'claimedAt'>[] = [
  {
    type: 'exercise',
    title: 'Complete 1 Exercise',
    titleKo: '운동 1회 완료',
    description: 'Complete at least one exercise session today',
    descriptionKo: '오늘 최소 1회 운동을 완료하세요',
    target: 1,
    reward: 20,
  },
  {
    type: 'exercise',
    title: 'Complete 3 Exercises',
    titleKo: '운동 3회 완료',
    description: 'Complete three exercise sessions today',
    descriptionKo: '오늘 운동을 3회 완료하세요',
    target: 3,
    reward: 50,
  },
  {
    type: 'posture',
    title: 'Posture Check',
    titleKo: '자세 점검',
    description: 'Complete a posture analysis',
    descriptionKo: '자세 분석을 1회 완료하세요',
    target: 1,
    reward: 25,
  },
  {
    type: 'game',
    title: 'Play a Game',
    titleKo: '게임 플레이',
    description: 'Play at least one rehabilitation game',
    descriptionKo: '재활 게임을 1회 플레이하세요',
    target: 1,
    reward: 15,
  },
  {
    type: 'game',
    title: 'Game Master',
    titleKo: '게임 마스터',
    description: 'Play 3 rehabilitation games',
    descriptionKo: '재활 게임을 3회 플레이하세요',
    target: 3,
    reward: 40,
  },
  {
    type: 'streak',
    title: 'Daily Activity',
    titleKo: '일일 활동',
    description: 'Complete any activity to maintain your streak',
    descriptionKo: '연속 기록을 유지하기 위해 어떤 활동이든 완료하세요',
    target: 1,
    reward: 30,
  },
]

function getRandomChallenges(count: number): DailyChallenge[] {
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)

  return selected.map((template, index) => ({
    ...template,
    id: `challenge_${Date.now()}_${index}`,
    current: 0,
    completed: false,
  }))
}

function isSameDay(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0]
}

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set, get) => ({
      challenges: [],
      lastGeneratedDate: null,

      generateDailyChallenges: () => {
        const today = new Date().toISOString()
        const lastGenerated = get().lastGeneratedDate

        if (lastGenerated && isSameDay(lastGenerated, today)) {
          return
        }

        const newChallenges = getRandomChallenges(3)
        set({
          challenges: newChallenges,
          lastGeneratedDate: today,
        })
      },

      updateChallengeProgress: (type, increment = 1) => {
        set((state) => ({
          challenges: state.challenges.map((challenge) => {
            if (challenge.type === type && !challenge.completed) {
              const newCurrent = challenge.current + increment
              return {
                ...challenge,
                current: newCurrent,
                completed: newCurrent >= challenge.target,
              }
            }
            return challenge
          }),
        }))
      },

      claimReward: (challengeId) => {
        let reward = 0
        set((state) => {
          const challenge = state.challenges.find((c) => c.id === challengeId)
          if (!challenge || !challenge.completed || challenge.claimedAt) {
            return state
          }
          reward = challenge.reward
          return {
            challenges: state.challenges.map((c) =>
              c.id === challengeId
                ? { ...c, claimedAt: new Date().toISOString() }
                : c
            ),
          }
        })
        return reward
      },

      getTodayChallenges: () => {
        const today = new Date().toISOString()
        const lastGenerated = get().lastGeneratedDate

        if (!lastGenerated || !isSameDay(lastGenerated, today)) {
          get().generateDailyChallenges()
        }

        return get().challenges
      },

      getCompletedCount: () => {
        return get().challenges.filter((c) => c.completed).length
      },
    }),
    {
      name: 'posture-ai-challenges',
      version: 1,
    }
  )
)
