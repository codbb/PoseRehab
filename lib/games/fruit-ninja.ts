import type { GameDifficulty, FruitNinjaFruit, FruitNinjaResult } from '@/types/game'
import { generateId } from '@/lib/utils'

// Difficulty configurations
export const FRUIT_NINJA_DIFFICULTY_CONFIG = {
  easy: {
    fruitInterval: 1200, // ms between fruit spawns
    gravity: 0.0015,
    gameDuration: 60000, // 1 minute
    bombChance: 0.1,
    maxFruitsAtOnce: 2,
  },
  normal: {
    fruitInterval: 900,
    gravity: 0.002,
    gameDuration: 90000,
    bombChance: 0.15,
    maxFruitsAtOnce: 3,
  },
  hard: {
    fruitInterval: 600,
    gravity: 0.0025,
    gameDuration: 120000,
    bombChance: 0.2,
    maxFruitsAtOnce: 4,
  },
}

// Fruit types
export type FruitType = 'apple' | 'orange' | 'watermelon' | 'banana' | 'bomb'

export interface FruitConfig {
  type: FruitType
  points: number
  size: number // radius in percentage of screen
  color: string
  emoji: string
}

export const FRUIT_CONFIGS: Record<FruitType, FruitConfig> = {
  apple: { type: 'apple', points: 10, size: 4, color: '#EF4444', emoji: '🍎' },
  orange: { type: 'orange', points: 10, size: 4, color: '#F97316', emoji: '🍊' },
  watermelon: { type: 'watermelon', points: 20, size: 6, color: '#22C55E', emoji: '🍉' },
  banana: { type: 'banana', points: 15, size: 3.5, color: '#EAB308', emoji: '🍌' },
  bomb: { type: 'bomb', points: -50, size: 4.5, color: '#1F2937', emoji: '💣' },
}

export interface FruitWithState extends FruitNinjaFruit {
  x: number
  y: number
  rotation: number
  sliced: boolean
  missed: boolean
  sliceAngle?: number
}

// Generate random fruit spawn
export function spawnFruit(difficulty: GameDifficulty): FruitWithState {
  const config = FRUIT_NINJA_DIFFICULTY_CONFIG[difficulty]

  // Determine fruit type
  const isBomb = Math.random() < config.bombChance
  const fruitTypes: FruitType[] = ['apple', 'orange', 'watermelon', 'banana']
  const type: FruitType = isBomb
    ? 'bomb'
    : fruitTypes[Math.floor(Math.random() * fruitTypes.length)]

  // Random spawn position (bottom of screen)
  const spawnX = 20 + Math.random() * 60 // 20-80% of screen width
  const spawnY = 105 // below screen

  // Calculate velocity to make fruit arc nicely
  const targetX = 30 + Math.random() * 40 // aim for middle area
  const targetY = 20 + Math.random() * 30 // peak height

  const velocityX = (targetX - spawnX) * 0.015 + (Math.random() - 0.5) * 0.5
  const velocityY = -2 - Math.random() * 0.5 // upward velocity

  return {
    id: generateId(),
    type,
    spawnX,
    spawnY,
    velocityX,
    velocityY,
    points: FRUIT_CONFIGS[type].points,
    x: spawnX,
    y: spawnY,
    rotation: Math.random() * 360,
    sliced: false,
    missed: false,
  }
}

// Update fruit physics
export function updateFruit(
  fruit: FruitWithState,
  deltaTime: number,
  gravity: number
): FruitWithState {
  return {
    ...fruit,
    x: fruit.x + fruit.velocityX * deltaTime,
    y: fruit.y + fruit.velocityY * deltaTime,
    velocityY: fruit.velocityY + gravity * deltaTime,
    rotation: fruit.rotation + deltaTime * 0.2,
  }
}

// Check if a line segment (hand trail) intersects with a circle (fruit)
export function checkSlice(
  fruit: FruitWithState,
  prevHandX: number,
  prevHandY: number,
  handX: number,
  handY: number
): boolean {
  if (fruit.sliced || fruit.missed) return false

  const fruitConfig = FRUIT_CONFIGS[fruit.type]
  const radius = fruitConfig.size

  // Calculate distance from line to circle center
  const dx = handX - prevHandX
  const dy = handY - prevHandY
  const fx = prevHandX - fruit.x
  const fy = prevHandY - fruit.y

  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - radius * radius

  let discriminant = b * b - 4 * a * c

  if (discriminant < 0) return false

  discriminant = Math.sqrt(discriminant)

  const t1 = (-b - discriminant) / (2 * a)
  const t2 = (-b + discriminant) / (2 * a)

  // Check if intersection is within the line segment
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)
}

// Calculate slice angle for visual effect
export function calculateSliceAngle(
  prevX: number,
  prevY: number,
  currX: number,
  currY: number
): number {
  return Math.atan2(currY - prevY, currX - prevX) * (180 / Math.PI)
}

// Calculate final result
export function calculateFruitNinjaResult(
  fruitsSliced: number,
  bombsHit: number,
  maxCombo: number,
  totalScore: number
): FruitNinjaResult {
  return {
    fruitsSliced,
    bombsHit,
    maxCombo,
    score: Math.max(0, totalScore),
  }
}

// Calculate accuracy
export function calculateAccuracy(
  fruitsSliced: number,
  totalFruits: number,
  bombsHit: number
): number {
  if (totalFruits === 0) return 0
  const effectiveSlices = fruitsSliced - bombsHit
  return Math.max(0, (effectiveSlices / totalFruits) * 100)
}
