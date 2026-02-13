export type ExerciseCategory = 'stretching' | 'strength' | 'core' | 'correction' | 'rehabilitation'
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type ExerciseType = 'realtime' | 'guided'

// 운동-질환 매핑을 위한 타겟 조건 타입
export type TargetCondition =
  | 'forward_head'         // 거북목
  | 'round_shoulder'       // 라운드숄더
  | 'upper_cross'          // 상부교차증후군
  | 'shoulder_imbalance'   // 어깨 불균형
  | 'thoracic_kyphosis'    // 흉추 후만
  | 'lumbar_lordosis'      // 요추 전만
  | 'lower_cross'          // 하부교차증후군
  | 'pelvic_tilt'          // 골반 틀어짐
  | 'scoliosis'            // 척추측만증
  | 'bow_legs'             // O다리
  | 'knock_knees'          // X다리

export interface Exercise {
  id: string
  name: string
  nameKo: string
  description: string
  descriptionKo: string
  category: ExerciseCategory
  difficulty: ExerciseDifficulty
  exerciseType: ExerciseType
  duration: number // seconds
  defaultReps: number
  defaultSets: number
  holdDuration?: number // 유지 시간 (초) - 가이드 운동용
  restBetweenSets?: number // 세트 사이 휴식 시간 (초)
  targetMuscles: string[]
  targetConditions?: TargetCondition[] // 이 운동이 도움이 되는 질환/상태
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
  benefits?: string[]       // 효과
  benefitsKo?: string[]
  precautions?: string[]    // 주의사항
  precautionsKo?: string[]
  breathingTip?: string     // 호흡 팁
  breathingTipKo?: string
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
