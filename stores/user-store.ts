import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PainArea {
  id: string
  name: string
  intensity: number // 1-10
  frequency: 'daily' | 'weekly' | 'occasionally'
}

export interface UserProfile {
  name: string
  gender: 'male' | 'female' | 'other'
  age: number
  height: number // cm
  weight: number // kg
  occupation: 'desk' | 'standing' | 'active' | 'other'
  medicalHistory: string[]
}

interface UserState {
  isOnboardingComplete: boolean
  goals: string[]
  painAreas: PainArea[]
  profile: UserProfile | null
  exercisePreferences: {
    dailyTime: number // minutes
    preferredTime: 'morning' | 'afternoon' | 'evening'
  }
  postureScore: number | null
  level: number
  experience: number
  badges: string[]

  setOnboardingComplete: (complete: boolean) => void
  setGoals: (goals: string[]) => void
  setPainAreas: (areas: PainArea[]) => void
  setProfile: (profile: UserProfile) => void
  setExercisePreferences: (prefs: Partial<UserState['exercisePreferences']>) => void
  setPostureScore: (score: number) => void
  addExperience: (exp: number) => void
  addBadge: (badge: string) => void
  resetUser: () => void
}

const initialState = {
  isOnboardingComplete: false,
  goals: [],
  painAreas: [],
  profile: null,
  exercisePreferences: {
    dailyTime: 20,
    preferredTime: 'morning' as const,
  },
  postureScore: null,
  level: 1,
  experience: 0,
  badges: [],
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,
      setOnboardingComplete: (complete) => set({ isOnboardingComplete: complete }),
      setGoals: (goals) => set({ goals }),
      setPainAreas: (areas) => set({ painAreas: areas }),
      setProfile: (profile) => set({ profile }),
      setExercisePreferences: (prefs) =>
        set((state) => ({
          exercisePreferences: { ...state.exercisePreferences, ...prefs },
        })),
      setPostureScore: (score) => set({ postureScore: score }),
      addExperience: (exp) =>
        set((state) => {
          if (!Number.isFinite(exp) || exp < 0) return state
          const MAX_LEVEL = 100
          if (state.level >= MAX_LEVEL) return { experience: state.experience }
          const newExp = state.experience + exp
          const expForNextLevel = state.level * 100
          if (newExp >= expForNextLevel) {
            const nextLevel = Math.min(state.level + 1, MAX_LEVEL)
            return {
              experience: newExp - expForNextLevel,
              level: nextLevel,
            }
          }
          return { experience: newExp }
        }),
      addBadge: (badge) =>
        set((state) => ({
          badges: state.badges.includes(badge) ? state.badges : [...state.badges, badge],
        })),
      resetUser: () => set(initialState),
    }),
    {
      name: 'posture-ai-user',
      version: 1,
    }
  )
)
