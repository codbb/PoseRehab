// ROM (Range of Motion) 측정 관련 타입 정의

export type JointCategory =
  | 'neck'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'spine'

export type JointSide = 'left' | 'right' | 'center'

export type MovementType =
  // Neck
  | 'neck_flexion'
  | 'neck_extension'
  | 'neck_rotation_left'
  | 'neck_rotation_right'
  | 'neck_lateral_left'
  | 'neck_lateral_right'
  // Shoulder
  | 'shoulder_flexion'
  | 'shoulder_extension'
  | 'shoulder_abduction'
  | 'shoulder_adduction'
  | 'shoulder_internal_rotation'
  | 'shoulder_external_rotation'
  // Elbow
  | 'elbow_flexion'
  | 'elbow_extension'
  // Wrist
  | 'wrist_flexion'
  | 'wrist_extension'
  | 'wrist_radial_deviation'
  | 'wrist_ulnar_deviation'
  // Hip
  | 'hip_flexion'
  | 'hip_extension'
  | 'hip_abduction'
  | 'hip_adduction'
  | 'hip_internal_rotation'
  | 'hip_external_rotation'
  // Knee
  | 'knee_flexion'
  | 'knee_extension'
  // Ankle
  | 'ankle_dorsiflexion'
  | 'ankle_plantarflexion'
  // Spine
  | 'spine_flexion'
  | 'spine_extension'
  | 'spine_lateral_left'
  | 'spine_lateral_right'

export interface NormalRange {
  min: number
  max: number
}

export interface JointMovement {
  id: MovementType
  category: JointCategory
  nameEn: string
  nameKo: string
  descriptionEn: string
  descriptionKo: string
  guideEn: string
  guideKo: string
  normalRange: NormalRange
  side: JointSide
  // MediaPipe 랜드마크 인덱스
  landmarks: {
    point1: number // 시작점
    point2: number // 중심점 (각도 측정 기준)
    point3: number // 끝점
  }
}

export interface CalibrationData {
  movementId: MovementType
  side: JointSide
  minAngle: number
  maxAngle: number
  calibratedAt: string
}

export interface MeasurementRecord {
  id: string
  movementId: MovementType
  side: JointSide
  angle: number
  normalRange: NormalRange
  calibration?: CalibrationData
  timestamp: string
}

export interface RomMeasurementSession {
  id: string
  timestamp: string
  measurements: MeasurementRecord[]
}

// 관절별 카테고리 정보
export interface JointCategoryInfo {
  id: JointCategory
  nameEn: string
  nameKo: string
  icon: string
  movements: MovementType[]
}
