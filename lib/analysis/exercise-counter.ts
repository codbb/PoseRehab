import type { Landmark } from '@/types/posture'
import { calculateAngle } from './angle-calculator'
import { POSE_LANDMARKS } from '@/hooks/use-pose-detection'

interface ExerciseState {
  phase: 'up' | 'down' | 'unknown'
  reps: number
  accuracy: number
  lastAngle: number
}

interface CounterConfig {
  startAngle: number
  targetAngle: number
  completionThreshold: number
  joints: [number, number, number] // Three landmark indices to calculate angle
}

// Default configurations for exercises
export const EXERCISE_CONFIGS: Record<string, CounterConfig> = {
  squat: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  },
  lunge: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  },
  pushup: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  },
  bridge: {
    startAngle: 90,
    targetAngle: 170,
    completionThreshold: 100,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  },
}

export function createExerciseCounter(exerciseId: string) {
  const config = EXERCISE_CONFIGS[exerciseId] || EXERCISE_CONFIGS.squat

  let state: ExerciseState = {
    phase: 'unknown',
    reps: 0,
    accuracy: 0,
    lastAngle: config.startAngle,
  }

  let isGoingDown = config.targetAngle < config.startAngle

  return {
    getState: () => ({ ...state }),

    setConfig: (newConfig: Partial<CounterConfig>) => {
      Object.assign(config, newConfig)
      isGoingDown = config.targetAngle < config.startAngle
    },

    reset: () => {
      state = {
        phase: 'unknown',
        reps: 0,
        accuracy: 0,
        lastAngle: config.startAngle,
      }
    },

    update: (landmarks: Landmark[]): { counted: boolean; feedback: string; accuracy: number } => {
      if (landmarks.length < 33) {
        return { counted: false, feedback: '', accuracy: 0 }
      }

      const [joint1, joint2, joint3] = config.joints
      const p1 = landmarks[joint1]
      const p2 = landmarks[joint2]
      const p3 = landmarks[joint3]

      if (!p1 || !p2 || !p3) {
        return { counted: false, feedback: '', accuracy: 0 }
      }

      const currentAngle = calculateAngle(p1, p2, p3)
      state.lastAngle = currentAngle

      // Calculate how close to target
      const range = Math.abs(config.startAngle - config.targetAngle)
      const progress = isGoingDown
        ? (config.startAngle - currentAngle) / range
        : (currentAngle - config.startAngle) / range
      const accuracy = Math.min(100, Math.max(0, progress * 100))

      let counted = false
      let feedback = ''

      // State machine for rep counting
      if (isGoingDown) {
        // For exercises like squat, pushup where you go down first
        if (currentAngle <= config.targetAngle && state.phase !== 'down') {
          state.phase = 'down'
          state.accuracy = accuracy
        } else if (currentAngle >= config.completionThreshold && state.phase === 'down') {
          state.phase = 'up'
          state.reps++
          counted = true
          feedback = 'good'
        }

        // Feedback based on current phase
        if (state.phase === 'unknown' && currentAngle < config.startAngle - 10) {
          feedback = 'adjustKnee'
        }
      } else {
        // For exercises like bridge where you go up first
        if (currentAngle >= config.targetAngle && state.phase !== 'up') {
          state.phase = 'up'
          state.accuracy = accuracy
        } else if (currentAngle <= config.completionThreshold && state.phase === 'up') {
          state.phase = 'down'
          state.reps++
          counted = true
          feedback = 'good'
        }
      }

      return { counted, feedback, accuracy }
    },
  }
}

export type ExerciseCounter = ReturnType<typeof createExerciseCounter>
