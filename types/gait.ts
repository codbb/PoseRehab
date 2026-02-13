import type { Landmark } from './posture'

// MediaPipe Pose 키포인트 인덱스 (33개 중 보행 분석에 필요한 것만)
export const GAIT_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export type GaitLandmarkIndex = typeof GAIT_LANDMARKS[keyof typeof GAIT_LANDMARKS]

// 측정값 타입
export interface MeasurementValue {
  value: number
  idealMin: number
  idealMax: number
  unit: string
  status: 'normal' | 'warning' | 'danger'
}

// 보행 측정 항목
export interface GaitMeasurements {
  strideLength: MeasurementValue // 보폭
  gaitSpeed: MeasurementValue // 보행 속도
  gaitCycle: MeasurementValue // 보행 주기
  leftRightSymmetry: MeasurementValue // 좌우 대칭성
  kneeFlexionLeft: MeasurementValue // 왼쪽 무릎 굴곡
  kneeFlexionRight: MeasurementValue // 오른쪽 무릎 굴곡
  hipFlexionLeft: MeasurementValue // 왼쪽 엉덩이 굴곡
  hipFlexionRight: MeasurementValue // 오른쪽 엉덩이 굴곡
  trunkInclination: MeasurementValue // 몸통 기울기
  footClearance: MeasurementValue // 발 들어올림 높이
}

// 보행 단계 - 입각기
export type StancePhase =
  | 'initial_contact' // 초기 접촉 (Heel Strike)
  | 'loading_response' // 하중 반응
  | 'mid_stance' // 중간 입각기
  | 'terminal_stance' // 말기 입각기

// 보행 단계 - 유각기
export type SwingPhase =
  | 'pre_swing' // 전유각기
  | 'initial_swing' // 초기 유각기
  | 'mid_swing' // 중간 유각기
  | 'terminal_swing' // 말기 유각기

export type GaitPhase = StancePhase | SwingPhase

// 보행 단계 상태
export interface GaitPhaseState {
  leftLeg: 'stance' | 'swing'
  rightLeg: 'stance' | 'swing'
  leftPhase: GaitPhase
  rightPhase: GaitPhase
  cycleCount: number
  lastHeelStrike: {
    left: number
    right: number
  }
  lastToeOff: {
    left: number
    right: number
  }
}

// 보행 프레임 데이터
export interface GaitFrame {
  timestamp: number
  landmarks: Landmark[]
  phase: GaitPhaseState
  measurements: Partial<GaitMeasurements>
  // 추가 분석 데이터
  leftAnkleY: number
  rightAnkleY: number
  leftKneeAngle: number
  rightKneeAngle: number
  leftHipAngle: number
  rightHipAngle: number
  trunkAngle: number
}

// 보행 이상 타입
export type GaitAnomalyType =
  | 'asymmetry' // 비대칭
  | 'limping' // 절뚝거림
  | 'shuffling' // 끌기
  | 'reduced_clearance' // 발 들어올림 감소
  | 'excessive_trunk_lean' // 과도한 몸통 기울기
  | 'reduced_knee_flexion' // 무릎 굴곡 감소
  | 'reduced_hip_flexion' // 엉덩이 굴곡 감소

// 보행 이상 징후
export interface GaitAnomaly {
  type: GaitAnomalyType
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  descriptionKo: string
  affectedSide?: 'left' | 'right' | 'both'
}

// 차트 데이터 (결과 페이지 렌더링용)
export interface GaitChartData {
  timestamps: number[]
  leftKneeAngles: number[]
  rightKneeAngles: number[]
  leftHipAngles: number[]
  rightHipAngles: number[]
  leftAnkleHeights: number[]
  rightAnkleHeights: number[]
}

// 보행 분석 결과
export interface GaitAnalysisResult {
  id: string
  timestamp: string
  duration: number // 초
  totalStrides: number
  averageMeasurements: GaitMeasurements
  minMeasurements: Partial<GaitMeasurements>
  maxMeasurements: Partial<GaitMeasurements>
  phaseBreakdown: {
    stancePercent: number
    swingPercent: number
    doubleSupport: number
  }
  anomalies: GaitAnomaly[]
  overallScore: number // 0-100
  recommendations: GaitRecommendation[]
  chartData?: GaitChartData
  isSideView?: boolean
}

// 권장사항
export interface GaitRecommendation {
  type: 'exercise' | 'posture' | 'medical' | 'lifestyle'
  title: string
  titleKo: string
  description: string
  descriptionKo: string
  priority: 'high' | 'medium' | 'low'
}

// 보행 세션
export interface GaitSession {
  id: string
  startTime: number
  mode: 'webcam' | 'video'
  frames: GaitFrame[]
  isActive: boolean
}

// 스토어 상태 타입
export interface GaitState {
  // 분석 상태
  isActive: boolean
  isModelLoaded: boolean
  currentMode: 'webcam' | 'video'
  currentSession: GaitSession | null
  currentMeasurements: GaitMeasurements | null
  currentPhase: GaitPhaseState | null

  // 프레임 히스토리 (차트용)
  frameHistory: GaitFrame[]
  maxFrameHistory: number

  // 저장된 기록
  analysisHistory: GaitAnalysisResult[]
  maxHistoryCount: number

  // 설정
  showSkeleton: boolean
  showMetrics: boolean
  showPhaseIndicator: boolean
  targetFps: number

  // 액션
  setIsActive: (active: boolean) => void
  setIsModelLoaded: (loaded: boolean) => void
  setCurrentMode: (mode: 'webcam' | 'video') => void
  startSession: (mode: 'webcam' | 'video') => void
  endSession: () => GaitAnalysisResult | null
  updateMeasurements: (measurements: GaitMeasurements) => void
  updatePhase: (phase: GaitPhaseState) => void
  addFrame: (frame: GaitFrame) => void
  saveAnalysis: (result: GaitAnalysisResult) => void
  deleteAnalysis: (id: string) => void
  clearHistory: () => void
  setShowSkeleton: (show: boolean) => void
  setShowMetrics: (show: boolean) => void
  setShowPhaseIndicator: (show: boolean) => void
  setTargetFps: (fps: number) => void
  resetFrameHistory: () => void
}

// MediaPipe 스켈레톤 연결 정의 (보행 분석에 필요한 것만)
export const GAIT_SKELETON_CONNECTIONS: [number, number][] = [
  // 상체
  [GAIT_LANDMARKS.LEFT_SHOULDER, GAIT_LANDMARKS.RIGHT_SHOULDER],
  [GAIT_LANDMARKS.LEFT_SHOULDER, GAIT_LANDMARKS.LEFT_ELBOW],
  [GAIT_LANDMARKS.RIGHT_SHOULDER, GAIT_LANDMARKS.RIGHT_ELBOW],
  [GAIT_LANDMARKS.LEFT_ELBOW, GAIT_LANDMARKS.LEFT_WRIST],
  [GAIT_LANDMARKS.RIGHT_ELBOW, GAIT_LANDMARKS.RIGHT_WRIST],
  // 몸통
  [GAIT_LANDMARKS.LEFT_SHOULDER, GAIT_LANDMARKS.LEFT_HIP],
  [GAIT_LANDMARKS.RIGHT_SHOULDER, GAIT_LANDMARKS.RIGHT_HIP],
  [GAIT_LANDMARKS.LEFT_HIP, GAIT_LANDMARKS.RIGHT_HIP],
  // 하체
  [GAIT_LANDMARKS.LEFT_HIP, GAIT_LANDMARKS.LEFT_KNEE],
  [GAIT_LANDMARKS.RIGHT_HIP, GAIT_LANDMARKS.RIGHT_KNEE],
  [GAIT_LANDMARKS.LEFT_KNEE, GAIT_LANDMARKS.LEFT_ANKLE],
  [GAIT_LANDMARKS.RIGHT_KNEE, GAIT_LANDMARKS.RIGHT_ANKLE],
  // 발
  [GAIT_LANDMARKS.LEFT_ANKLE, GAIT_LANDMARKS.LEFT_HEEL],
  [GAIT_LANDMARKS.RIGHT_ANKLE, GAIT_LANDMARKS.RIGHT_HEEL],
  [GAIT_LANDMARKS.LEFT_HEEL, GAIT_LANDMARKS.LEFT_FOOT_INDEX],
  [GAIT_LANDMARKS.RIGHT_HEEL, GAIT_LANDMARKS.RIGHT_FOOT_INDEX],
  [GAIT_LANDMARKS.LEFT_ANKLE, GAIT_LANDMARKS.LEFT_FOOT_INDEX],
  [GAIT_LANDMARKS.RIGHT_ANKLE, GAIT_LANDMARKS.RIGHT_FOOT_INDEX],
]

// 측면 스켈레톤 연결 (왼쪽 기준)
export const GAIT_SIDE_SKELETON_LEFT: [number, number][] = [
  [GAIT_LANDMARKS.LEFT_EAR, GAIT_LANDMARKS.LEFT_SHOULDER],
  [GAIT_LANDMARKS.LEFT_SHOULDER, GAIT_LANDMARKS.LEFT_HIP],
  [GAIT_LANDMARKS.LEFT_HIP, GAIT_LANDMARKS.LEFT_KNEE],
  [GAIT_LANDMARKS.LEFT_KNEE, GAIT_LANDMARKS.LEFT_ANKLE],
  [GAIT_LANDMARKS.LEFT_ANKLE, GAIT_LANDMARKS.LEFT_HEEL],
  [GAIT_LANDMARKS.LEFT_HEEL, GAIT_LANDMARKS.LEFT_FOOT_INDEX],
]

// 측면 스켈레톤 연결 (오른쪽 기준)
export const GAIT_SIDE_SKELETON_RIGHT: [number, number][] = [
  [GAIT_LANDMARKS.RIGHT_EAR, GAIT_LANDMARKS.RIGHT_SHOULDER],
  [GAIT_LANDMARKS.RIGHT_SHOULDER, GAIT_LANDMARKS.RIGHT_HIP],
  [GAIT_LANDMARKS.RIGHT_HIP, GAIT_LANDMARKS.RIGHT_KNEE],
  [GAIT_LANDMARKS.RIGHT_KNEE, GAIT_LANDMARKS.RIGHT_ANKLE],
  [GAIT_LANDMARKS.RIGHT_ANKLE, GAIT_LANDMARKS.RIGHT_HEEL],
  [GAIT_LANDMARKS.RIGHT_HEEL, GAIT_LANDMARKS.RIGHT_FOOT_INDEX],
]
