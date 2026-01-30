import type { GameDifficulty, RhythmGripNote, RhythmGripResult } from '@/types/game'
import { generateId } from '@/lib/utils'

// Difficulty configurations
export const RHYTHM_DIFFICULTY_CONFIG = {
  easy: {
    noteSpeed: 3000, // ms for note to travel
    bpm: 80,
    noteInterval: 1500, // ms between notes
    gameDuration: 60000, // 1 minute
  },
  normal: {
    noteSpeed: 2000,
    bpm: 120,
    noteInterval: 1000,
    gameDuration: 90000, // 1.5 minutes
  },
  hard: {
    noteSpeed: 1500,
    bpm: 160,
    noteInterval: 600,
    gameDuration: 120000, // 2 minutes
  },
}

// Timing windows for judgments (in ms)
export const TIMING_WINDOWS = {
  perfect: 50,
  great: 100,
  good: 150,
}

// Score values
export const SCORE_VALUES = {
  perfect: 100,
  great: 75,
  good: 50,
  miss: 0,
}

export type JudgmentType = 'perfect' | 'great' | 'good' | 'miss'

export interface NoteWithState extends RhythmGripNote {
  y: number // current y position (0-100%)
  active: boolean
  hit: boolean
  judgment?: JudgmentType
}

// Generate notes for a game session
export function generateNotes(difficulty: GameDifficulty): RhythmGripNote[] {
  const config = RHYTHM_DIFFICULTY_CONFIG[difficulty]
  const notes: RhythmGripNote[] = []
  const { gameDuration, noteInterval } = config

  let currentTime = 2000 // Start notes after 2 seconds

  while (currentTime < gameDuration - 2000) {
    // Random lane selection
    const lane: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right'

    // Sometimes add notes on both lanes
    if (difficulty !== 'easy' && Math.random() > 0.8) {
      notes.push({
        id: generateId(),
        lane: 'left',
        timing: currentTime,
        duration: 100,
      })
      notes.push({
        id: generateId(),
        lane: 'right',
        timing: currentTime,
        duration: 100,
      })
    } else {
      notes.push({
        id: generateId(),
        lane,
        timing: currentTime,
        duration: 100,
      })
    }

    // Add variation to interval
    const variation = (Math.random() - 0.5) * (noteInterval * 0.3)
    currentTime += noteInterval + variation
  }

  return notes
}

// Calculate judgment based on timing difference
export function getJudgment(timingDiff: number): JudgmentType {
  const diff = Math.abs(timingDiff)

  if (diff <= TIMING_WINDOWS.perfect) return 'perfect'
  if (diff <= TIMING_WINDOWS.great) return 'great'
  if (diff <= TIMING_WINDOWS.good) return 'good'
  return 'miss'
}

// Calculate score for a judgment
export function getScore(judgment: JudgmentType): number {
  return SCORE_VALUES[judgment]
}

// Calculate final result
export function calculateResult(
  judgments: { type: JudgmentType }[]
): RhythmGripResult {
  const result: RhythmGripResult = {
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    maxCombo: 0,
    score: 0,
  }

  let currentCombo = 0

  for (const judgment of judgments) {
    result[judgment.type]++
    result.score += SCORE_VALUES[judgment.type]

    if (judgment.type !== 'miss') {
      currentCombo++
      result.maxCombo = Math.max(result.maxCombo, currentCombo)
      // Combo bonus
      result.score += Math.floor(currentCombo / 10) * 10
    } else {
      currentCombo = 0
    }
  }

  return result
}

// Calculate accuracy percentage
export function calculateAccuracy(result: RhythmGripResult): number {
  const total = result.perfect + result.great + result.good + result.miss
  if (total === 0) return 0

  const weighted =
    result.perfect * 100 + result.great * 75 + result.good * 50 + result.miss * 0
  return weighted / total
}
