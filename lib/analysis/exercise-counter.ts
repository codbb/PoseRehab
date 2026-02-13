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

// Minimum landmark visibility to trust the detection
const MIN_LANDMARK_VISIBILITY = 0.5

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
  // Bodyweight exercises
  crunch: {
    startAngle: 180,
    targetAngle: 120,
    completionThreshold: 170,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  },
  lying_leg_raise: {
    startAngle: 180,
    targetAngle: 90,
    completionThreshold: 170,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_ANKLE],
  },
  good_morning: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  },
  side_lunge_realtime: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  },
  knee_pushup: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  },
  // Barbell/Dumbbell exercises
  barbell_deadlift: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  },
  barbell_row: {
    startAngle: 170,
    targetAngle: 45,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  },
  dumbbell_bentover_row: {
    startAngle: 170,
    targetAngle: 45,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  },
  front_raise: {
    startAngle: 10,
    targetAngle: 90,
    completionThreshold: 20,
    joints: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  },
  upright_row: {
    startAngle: 170,
    targetAngle: 60,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  },
  bicycle_crunch: {
    startAngle: 180,
    targetAngle: 90,
    completionThreshold: 170,
    joints: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  },
  burpee: {
    startAngle: 170,
    targetAngle: 90,
    completionThreshold: 160,
    joints: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  },
}

export function createExerciseCounter(exerciseId: string) {
  // Copy config to avoid mutating shared object
  let config: CounterConfig = { ...(EXERCISE_CONFIGS[exerciseId] || EXERCISE_CONFIGS.squat) }

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
      // Create new config object instead of mutating shared reference
      config = { ...config, ...newConfig }
      isGoingDown = config.targetAngle < config.startAngle
      // Reset state on config change to avoid stuck phases
      state = {
        phase: 'unknown',
        reps: state.reps, // Keep reps
        accuracy: 0,
        lastAngle: config.startAngle,
      }
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
        return { counted: false, feedback: '', accuracy: state.accuracy }
      }

      const [joint1, joint2, joint3] = config.joints
      const p1 = landmarks[joint1]
      const p2 = landmarks[joint2]
      const p3 = landmarks[joint3]

      if (!p1 || !p2 || !p3) {
        return { counted: false, feedback: '', accuracy: state.accuracy }
      }

      // Check landmark visibility/confidence
      const minVis = Math.min(
        p1.visibility ?? 0,
        p2.visibility ?? 0,
        p3.visibility ?? 0,
      )
      if (minVis < MIN_LANDMARK_VISIBILITY) {
        return { counted: false, feedback: '', accuracy: state.accuracy }
      }

      const currentAngle = calculateAngle(p1, p2, p3)
      state.lastAngle = currentAngle

      // Calculate how close to target (guard against division by zero)
      const range = Math.abs(config.startAngle - config.targetAngle)
      if (range === 0) {
        return { counted: false, feedback: '', accuracy: 0 }
      }
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
          feedback = 'adjustPosition'
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

      // Update accuracy continuously so UI doesn't show stale 0%
      state.accuracy = accuracy

      return { counted, feedback, accuracy }
    },
  }
}

export type ExerciseCounter = ReturnType<typeof createExerciseCounter>
