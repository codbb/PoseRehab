export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseLandmarks {
  nose: Landmark
  leftEye: Landmark
  rightEye: Landmark
  leftEar: Landmark
  rightEar: Landmark
  leftShoulder: Landmark
  rightShoulder: Landmark
  leftElbow: Landmark
  rightElbow: Landmark
  leftWrist: Landmark
  rightWrist: Landmark
  leftHip: Landmark
  rightHip: Landmark
  leftKnee: Landmark
  rightKnee: Landmark
  leftAnkle: Landmark
  rightAnkle: Landmark
}

export type PostureType =
  | 'normal'
  | 'forward_head'
  | 'rounded_shoulders'
  | 'round_shoulder'
  | 'kyphosis'
  | 'lordosis'
  | 'scoliosis'
  | 'pelvic_tilt'
  | 'bow_legs'
  | 'knock_knees'

export interface BodyPartAnalysis {
  name: string
  nameKo: string
  score: number
  angle?: number
  idealAngle?: number
  deviation?: number
  status: 'good' | 'warning' | 'poor'
  feedback: string
  feedbackKo: string
}

export interface MuscleStatus {
  name: string
  nameKo: string
  status: 'contracted' | 'stretched' | 'normal'
  location: { x: number; y: number }
}

export interface PostureAnalysisResult {
  id: string
  timestamp: string
  direction: 'front' | 'side' | 'back'
  overallScore: number
  postureTypes: PostureType[]
  bodyParts: {
    shoulders: BodyPartAnalysis
    spine: BodyPartAnalysis
    pelvis: BodyPartAnalysis
    knees: BodyPartAnalysis
    head: BodyPartAnalysis
  }
  muscles: MuscleStatus[]
  potentialConditions: {
    name: string
    nameKo: string
    probability: number
    description: string
    descriptionKo: string
  }[]
  recommendations: {
    title: string
    titleKo: string
    description: string
    descriptionKo: string
    exercises: string[]
    exerciseIds?: string[]
  }[]
  landmarks?: Landmark[]
  imageData?: string // base64
}

export interface CaptureGuide {
  direction: 'front' | 'side' | 'back'
  instructions: string[]
  instructionsKo: string[]
  checkpoints: string[]
  checkpointsKo: string[]
}
