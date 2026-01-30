import type { GameDifficulty, BubbleShooterBubble, BubbleShooterResult } from '@/types/game'

export interface BubbleShooterDifficultyConfig {
  gameDuration: number
  bubbleSpawnInterval: number
  bubbleSpeed: number
  bubbleRadius: number
  maxBubbles: number
  comboTimeWindow: number
}

export const BUBBLE_SHOOTER_DIFFICULTY_CONFIG: Record<GameDifficulty, BubbleShooterDifficultyConfig> = {
  easy: {
    gameDuration: 60000,
    bubbleSpawnInterval: 1500,
    bubbleSpeed: 1,
    bubbleRadius: 40,
    maxBubbles: 8,
    comboTimeWindow: 2000,
  },
  normal: {
    gameDuration: 60000,
    bubbleSpawnInterval: 1000,
    bubbleSpeed: 1.5,
    bubbleRadius: 35,
    maxBubbles: 12,
    comboTimeWindow: 1500,
  },
  hard: {
    gameDuration: 60000,
    bubbleSpawnInterval: 700,
    bubbleSpeed: 2,
    bubbleRadius: 30,
    maxBubbles: 16,
    comboTimeWindow: 1000,
  },
}

export const BUBBLE_COLORS = [
  { color: '#EF4444', name: 'red' },     // Red
  { color: '#F59E0B', name: 'orange' },  // Orange
  { color: '#10B981', name: 'green' },   // Green
  { color: '#3B82F6', name: 'blue' },    // Blue
  { color: '#8B5CF6', name: 'purple' },  // Purple
  { color: '#EC4899', name: 'pink' },    // Pink
]

export const BUBBLE_SCORES = {
  normal: 50,
  combo: 100,
  chain: 150,
}

export interface BubbleState {
  id: string
  x: number
  y: number
  radius: number
  color: string
  colorName: string
  velocityX: number
  velocityY: number
  points: number
  isPopping: boolean
  spawnTime: number
}

export function generateBubble(
  difficulty: GameDifficulty,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number
): BubbleState {
  const config = BUBBLE_SHOOTER_DIFFICULTY_CONFIG[difficulty]
  const colorData = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]

  // Spawn from edges (left, right, top, bottom)
  const edge = Math.floor(Math.random() * 4)
  let x: number
  let y: number
  let velocityX: number
  let velocityY: number

  const baseSpeed = config.bubbleSpeed * 50 // pixels per frame adjustment
  const randomAngle = (Math.random() - 0.5) * 0.5 // slight angle variation

  switch (edge) {
    case 0: // Left
      x = -config.bubbleRadius
      y = Math.random() * canvasHeight
      velocityX = baseSpeed + Math.random() * 20
      velocityY = randomAngle * baseSpeed
      break
    case 1: // Right
      x = canvasWidth + config.bubbleRadius
      y = Math.random() * canvasHeight
      velocityX = -(baseSpeed + Math.random() * 20)
      velocityY = randomAngle * baseSpeed
      break
    case 2: // Top
      x = Math.random() * canvasWidth
      y = -config.bubbleRadius
      velocityX = randomAngle * baseSpeed
      velocityY = baseSpeed + Math.random() * 20
      break
    default: // Bottom
      x = Math.random() * canvasWidth
      y = canvasHeight + config.bubbleRadius
      velocityX = randomAngle * baseSpeed
      velocityY = -(baseSpeed + Math.random() * 20)
      break
  }

  return {
    id: `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    radius: config.bubbleRadius + Math.random() * 10 - 5, // slight size variation
    color: colorData.color,
    colorName: colorData.name,
    velocityX: velocityX / 60, // Convert to per-frame velocity
    velocityY: velocityY / 60,
    points: BUBBLE_SCORES.normal,
    isPopping: false,
    spawnTime: currentTime,
  }
}

export function updateBubble(bubble: BubbleState, deltaTime: number): BubbleState {
  if (bubble.isPopping) return bubble

  return {
    ...bubble,
    x: bubble.x + bubble.velocityX * deltaTime,
    y: bubble.y + bubble.velocityY * deltaTime,
  }
}

export function isBubbleOffScreen(
  bubble: BubbleState,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const margin = bubble.radius * 2
  return (
    bubble.x < -margin ||
    bubble.x > canvasWidth + margin ||
    bubble.y < -margin ||
    bubble.y > canvasHeight + margin
  )
}

export function checkBubbleHit(
  fingerX: number,
  fingerY: number,
  bubble: BubbleState,
  hitRadius: number = 50
): boolean {
  if (bubble.isPopping) return false

  const dx = fingerX - bubble.x
  const dy = fingerY - bubble.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  return distance < bubble.radius + hitRadius
}

export function calculateResult(
  bubblesPopped: number,
  shotsFired: number,
  maxCombo: number,
  baseScore: number
): BubbleShooterResult {
  const accuracy = shotsFired > 0 ? Math.round((bubblesPopped / shotsFired) * 100) : 0
  const comboBonus = Math.floor(maxCombo / 3) * 50

  return {
    bubblesPopped,
    maxCombo,
    accuracy,
    score: baseScore + comboBonus,
  }
}
