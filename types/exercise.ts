export type ExerciseCategory = 'stretching' | 'strength' | 'core' | 'correction' | 'rehabilitation'
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Exercise {
  id: string
  name: string
  nameKo: string
  description: string
  descriptionKo: string
  category: ExerciseCategory
  difficulty: ExerciseDifficulty
  duration: number // seconds
  defaultReps: number
  defaultSets: number
  targetMuscles: string[]
  instructions: string[]
  instructionsKo: string[]
  checkpoints: {
    name: string
    nameKo: string
    startAngle: number
    targetAngle: number
    completionThreshold: number
    joints: string[]
  }[]
  thumbnailUrl?: string
  videoUrl?: string
  caloriesPerRep: number
}

export interface ExerciseSession {
  exerciseId: string
  exerciseName: string
  startTime: string
  reps: number
  sets: number
  targetReps: number
  targetSets: number
  accuracy: number[]
  feedback: string[]
}

export interface ExerciseRecord extends ExerciseSession {
  id: string
  endTime: string
  duration: number // seconds
  averageAccuracy: number
  date: string // YYYY-MM-DD
  caloriesBurned?: number
}

export interface ExerciseFeedback {
  type: 'success' | 'warning' | 'error'
  message: string
  messageKo: string
  timestamp: number
}

export interface CalibrationSettings {
  startAngle: number
  targetAngle: number
  completionThreshold: number
}

// Hand rehabilitation specific types
export type HandExerciseType =
  | 'finger_flexion'
  | 'tendon_glide'
  | 'thumb_touch'
  | 'finger_spread'
  | 'grip_squeeze'
  | 'wrist_rotation'

export interface HandExercise extends Omit<Exercise, 'checkpoints'> {
  type: HandExerciseType
  handCheckpoints: {
    name: string
    nameKo: string
    fingerStates: ('open' | 'closed' | 'spread' | 'touching')[]
    targetFingers: number[] // 0-4: thumb to pinky
  }[]
}
