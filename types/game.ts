export type GameType = 'rhythm-grip' | 'pose-match' | 'fruit-ninja' | 'whack-a-mole' | 'bubble-shooter'
export type GameDifficulty = 'easy' | 'normal' | 'hard'

export interface GameScore {
  id: string
  gameType: GameType
  score: number
  maxCombo: number
  accuracy: number
  difficulty: GameDifficulty
  playedAt: string
  duration: number
}

export interface RhythmGripNote {
  id: string
  lane: 'left' | 'right'
  timing: number // milliseconds from start
  duration: number
}

export interface RhythmGripResult {
  perfect: number
  great: number
  good: number
  miss: number
  maxCombo: number
  score: number
}

export interface PoseMatchWall {
  id: string
  timing: number
  pose: {
    leftArmUp: boolean
    rightArmUp: boolean
    leftLegUp: boolean
    rightLegUp: boolean
    crouch: boolean
  }
  holeShape: string // SVG path or predefined shape
}

export interface PoseMatchResult {
  wallsPassed: number
  totalWalls: number
  accuracyBonus: number
  score: number
}

export interface FruitNinjaFruit {
  id: string
  type: 'apple' | 'orange' | 'watermelon' | 'banana' | 'bomb'
  spawnX: number
  spawnY: number
  velocityX: number
  velocityY: number
  points: number
}

export interface FruitNinjaResult {
  fruitsSliced: number
  bombsHit: number
  maxCombo: number
  score: number
}

// Whack-a-Mole types
export interface WhackAMoleMole {
  id: string
  position: number // 0-8 for 3x3 grid
  type: 'normal' | 'golden' | 'bomb'
  showTime: number // milliseconds
  hideTime: number // milliseconds
}

export interface WhackAMoleResult {
  molesHit: number
  totalMoles: number
  goldenHits: number
  bombsHit: number
  maxCombo: number
  score: number
}

// Bubble Shooter types
export interface BubbleShooterBubble {
  id: string
  x: number
  y: number
  radius: number
  color: string
  velocityX: number
  velocityY: number
  points: number
  isPopping: boolean
}

export interface BubbleShooterResult {
  bubblesPopped: number
  maxCombo: number
  accuracy: number
  score: number
}
