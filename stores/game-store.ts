'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameScore, GameType, GameDifficulty } from '@/types/game'
import { generateId } from '@/lib/utils'

interface GameStore {
  // State
  gameScores: GameScore[]

  // Actions
  addScore: (score: Omit<GameScore, 'id' | 'playedAt'>) => GameScore
  getScoresByGame: (gameType: GameType) => GameScore[]
  getHighScore: (gameType: GameType, difficulty?: GameDifficulty) => number
  getRecentScores: (limit?: number) => GameScore[]
  getTotalGamesPlayed: () => number
  getAverageScore: (gameType: GameType) => number
  clearScores: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameScores: [],

      addScore: (scoreData) => {
        const newScore: GameScore = {
          ...scoreData,
          id: generateId(),
          playedAt: new Date().toISOString(),
        }

        set((state) => ({
          gameScores: [...state.gameScores, newScore],
        }))

        return newScore
      },

      getScoresByGame: (gameType) => {
        return get().gameScores
          .filter((score) => score.gameType === gameType)
          .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      },

      getHighScore: (gameType, difficulty) => {
        const scores = get().gameScores.filter(
          (score) =>
            score.gameType === gameType &&
            (difficulty ? score.difficulty === difficulty : true)
        )

        if (scores.length === 0) return 0
        return Math.max(...scores.map((s) => s.score))
      },

      getRecentScores: (limit = 10) => {
        return [...get().gameScores]
          .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
          .slice(0, limit)
      },

      getTotalGamesPlayed: () => {
        return get().gameScores.length
      },

      getAverageScore: (gameType) => {
        const scores = get().gameScores.filter((s) => s.gameType === gameType)
        if (scores.length === 0) return 0
        return scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      },

      clearScores: () => {
        set({ gameScores: [] })
      },
    }),
    {
      name: 'posture-ai-games',
    }
  )
)
