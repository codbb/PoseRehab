export interface User {
  id: string
  name: string
  email?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface UserGoal {
  id: string
  name: string
  nameKo: string
  icon: string
  description: string
  descriptionKo: string
}

export interface Badge {
  id: string
  name: string
  nameKo: string
  description: string
  descriptionKo: string
  icon: string
  condition: string
  earnedAt?: string
}

export interface DailyChallenge {
  id: string
  date: string
  title: string
  titleKo: string
  description: string
  descriptionKo: string
  targetValue: number
  currentValue: number
  reward: number // experience points
  completed: boolean
}

export interface WeeklyReport {
  weekStart: string
  weekEnd: string
  totalExerciseTime: number
  totalSessions: number
  averagePostureScore: number
  postureScoreChange: number
  exerciseStreak: number
  topExercises: { name: string; count: number }[]
  achievements: string[]
}
