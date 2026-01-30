import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Exercise, ExerciseSession, ExerciseRecord } from '@/types/exercise'

interface ExerciseState {
  currentExercise: Exercise | null
  currentSession: ExerciseSession | null
  exerciseRecords: ExerciseRecord[]

  setCurrentExercise: (exercise: Exercise | null) => void
  startSession: (exercise: Exercise) => void
  updateSession: (updates: Partial<ExerciseSession>) => void
  endSession: () => ExerciseRecord | null
  addRecord: (record: ExerciseRecord) => void
  getRecordsByDate: (date: string) => ExerciseRecord[]
  getTotalStats: () => {
    totalTime: number
    totalReps: number
    totalSessions: number
    averageAccuracy: number
  }
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      currentExercise: null,
      currentSession: null,
      exerciseRecords: [],

      setCurrentExercise: (exercise) => set({ currentExercise: exercise }),

      startSession: (exercise) =>
        set({
          currentExercise: exercise,
          currentSession: {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            startTime: new Date().toISOString(),
            reps: 0,
            sets: 0,
            targetReps: exercise.defaultReps,
            targetSets: exercise.defaultSets,
            accuracy: [],
            feedback: [],
          },
        }),

      updateSession: (updates) =>
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, ...updates }
            : null,
        })),

      endSession: () => {
        const state = get()
        if (!state.currentSession) return null

        const endTime = new Date().toISOString()
        const record: ExerciseRecord = {
          id: crypto.randomUUID(),
          ...state.currentSession,
          endTime,
          duration: Math.floor(
            (new Date(endTime).getTime() - new Date(state.currentSession.startTime).getTime()) / 1000
          ),
          averageAccuracy:
            state.currentSession.accuracy.length > 0
              ? state.currentSession.accuracy.reduce((a, b) => a + b, 0) /
                state.currentSession.accuracy.length
              : 0,
          date: new Date().toISOString().split('T')[0],
        }

        set((state) => ({
          currentExercise: null,
          currentSession: null,
          exerciseRecords: [record, ...state.exerciseRecords],
        }))

        return record
      },

      addRecord: (record) =>
        set((state) => ({
          exerciseRecords: [record, ...state.exerciseRecords],
        })),

      getRecordsByDate: (date) => {
        return get().exerciseRecords.filter((r) => r.date === date)
      },

      getTotalStats: () => {
        const records = get().exerciseRecords
        return {
          totalTime: records.reduce((sum, r) => sum + r.duration, 0),
          totalReps: records.reduce((sum, r) => sum + r.reps, 0),
          totalSessions: records.length,
          averageAccuracy:
            records.length > 0
              ? records.reduce((sum, r) => sum + r.averageAccuracy, 0) / records.length
              : 0,
        }
      },
    }),
    {
      name: 'posture-ai-exercise',
    }
  )
)
