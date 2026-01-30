import type { GameDifficulty, WhackAMoleMole, WhackAMoleResult } from '@/types/game'

export interface WhackAMoleDifficultyConfig {
  gameDuration: number // milliseconds
  moleShowDuration: number // how long mole stays visible
  moleInterval: number // time between moles
  goldenChance: number // 0-1 chance of golden mole
  bombChance: number // 0-1 chance of bomb
  maxSimultaneous: number // max moles visible at once
}

export const WHACK_A_MOLE_DIFFICULTY_CONFIG: Record<GameDifficulty, WhackAMoleDifficultyConfig> = {
  easy: {
    gameDuration: 60000,
    moleShowDuration: 2000,
    moleInterval: 1500,
    goldenChance: 0.1,
    bombChance: 0.05,
    maxSimultaneous: 2,
  },
  normal: {
    gameDuration: 60000,
    moleShowDuration: 1500,
    moleInterval: 1000,
    goldenChance: 0.15,
    bombChance: 0.1,
    maxSimultaneous: 3,
  },
  hard: {
    gameDuration: 60000,
    moleShowDuration: 1000,
    moleInterval: 700,
    goldenChance: 0.2,
    bombChance: 0.15,
    maxSimultaneous: 4,
  },
}

export const MOLE_SCORES = {
  normal: 100,
  golden: 300,
  bomb: -200,
}

export interface MoleState {
  id: string
  position: number
  type: 'normal' | 'golden' | 'bomb'
  isVisible: boolean
  isHit: boolean
  showTime: number
  hideTime: number
}

export function generateMole(
  difficulty: GameDifficulty,
  currentTime: number,
  occupiedPositions: number[]
): MoleState | null {
  const config = WHACK_A_MOLE_DIFFICULTY_CONFIG[difficulty]

  // Find available positions
  const allPositions = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  const availablePositions = allPositions.filter((p) => !occupiedPositions.includes(p))

  if (availablePositions.length === 0) return null

  // Random position from available
  const position = availablePositions[Math.floor(Math.random() * availablePositions.length)]

  // Determine mole type
  let type: 'normal' | 'golden' | 'bomb' = 'normal'
  const rand = Math.random()
  if (rand < config.bombChance) {
    type = 'bomb'
  } else if (rand < config.bombChance + config.goldenChance) {
    type = 'golden'
  }

  return {
    id: `mole-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position,
    type,
    isVisible: true,
    isHit: false,
    showTime: currentTime,
    hideTime: currentTime + config.moleShowDuration,
  }
}

export function calculateResult(
  molesHit: number,
  totalMoles: number,
  goldenHits: number,
  bombsHit: number,
  maxCombo: number,
  baseScore: number
): WhackAMoleResult {
  // Apply combo bonus
  const comboBonus = Math.floor(maxCombo / 5) * 50

  return {
    molesHit,
    totalMoles,
    goldenHits,
    bombsHit,
    maxCombo,
    score: Math.max(0, baseScore + comboBonus),
  }
}

export function calculateAccuracy(result: WhackAMoleResult): number {
  if (result.totalMoles === 0) return 0
  return Math.round((result.molesHit / result.totalMoles) * 100)
}

// Grid position to screen coordinates (for 3x3 grid)
export function getGridPosition(index: number, containerWidth: number, containerHeight: number) {
  const col = index % 3
  const row = Math.floor(index / 3)
  const cellWidth = containerWidth / 3
  const cellHeight = containerHeight / 3

  return {
    x: col * cellWidth + cellWidth / 2,
    y: row * cellHeight + cellHeight / 2,
    width: cellWidth * 0.8,
    height: cellHeight * 0.8,
  }
}
