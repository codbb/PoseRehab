import type { Landmark } from '@/types/posture'
import type { JointMovement, MovementType, JointSide } from '@/types/rom'
import { getMovementById, getMirroredLandmarks } from '@/lib/rom-constants'

// 세 점 사이의 각도 계산 (point2가 중심점)
export function calculateAngle(
  point1: { x: number; y: number; z?: number },
  point2: { x: number; y: number; z?: number },
  point3: { x: number; y: number; z?: number }
): number {
  // 벡터 계산
  const v1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
  }
  const v2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
  }

  // 내적
  const dotProduct = v1.x * v2.x + v1.y * v2.y

  // 벡터 크기
  const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  // 각도 계산 (라디안 -> 도)
  const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magnitude1 * magnitude2)))
  const angleRadians = Math.acos(cosAngle)
  const angleDegrees = (angleRadians * 180) / Math.PI

  return angleDegrees
}

// 3D 각도 계산 (z 좌표 포함)
export function calculateAngle3D(
  point1: { x: number; y: number; z: number },
  point2: { x: number; y: number; z: number },
  point3: { x: number; y: number; z: number }
): number {
  // 벡터 계산
  const v1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
    z: point1.z - point2.z,
  }
  const v2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
    z: point3.z - point2.z,
  }

  // 3D 내적
  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z

  // 3D 벡터 크기
  const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z)
  const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z)

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  // 각도 계산 (라디안 -> 도)
  const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magnitude1 * magnitude2)))
  const angleRadians = Math.acos(cosAngle)
  const angleDegrees = (angleRadians * 180) / Math.PI

  return angleDegrees
}

// 특정 움직임에 대한 각도 측정
export function measureJointAngle(
  landmarks: Landmark[],
  movementId: MovementType,
  side: JointSide
): number | null {
  if (landmarks.length < 33) return null

  const movement = getMovementById(movementId)
  if (!movement) return null

  // 오른쪽인 경우 랜드마크 인덱스 미러링
  const landmarkIndices =
    side === 'right' && movement.side === 'left'
      ? getMirroredLandmarks(movement)
      : movement.landmarks

  const point1 = landmarks[landmarkIndices.point1]
  const point2 = landmarks[landmarkIndices.point2]
  const point3 = landmarks[landmarkIndices.point3]

  if (!point1 || !point2 || !point3) return null

  // 가시성 체크 (최소 0.3 이상)
  if (
    (point1.visibility ?? 0) < 0.3 ||
    (point2.visibility ?? 0) < 0.3 ||
    (point3.visibility ?? 0) < 0.3
  ) {
    return null
  }

  // 3D 좌표가 있으면 3D 각도 계산
  if (
    point1.z !== undefined &&
    point2.z !== undefined &&
    point3.z !== undefined
  ) {
    return calculateAngle3D(
      { x: point1.x, y: point1.y, z: point1.z },
      { x: point2.x, y: point2.y, z: point2.z },
      { x: point3.x, y: point3.y, z: point3.z }
    )
  }

  // 2D 각도 계산
  return calculateAngle(point1, point2, point3)
}

// 굴곡 각도 계산 (180 - 측정된 각도)
export function measureFlexionAngle(
  landmarks: Landmark[],
  movementId: MovementType,
  side: JointSide
): number | null {
  const rawAngle = measureJointAngle(landmarks, movementId, side)
  if (rawAngle === null) return null

  // 굴곡의 경우 180도에서 측정된 각도를 뺌
  return Math.max(0, 180 - rawAngle)
}

// 움직임 유형에 따라 적절한 각도 계산 방식 선택
export function getJointAngle(
  landmarks: Landmark[],
  movementId: MovementType,
  side: JointSide
): number | null {
  // 굴곡/신전 움직임들은 180 - angle로 계산
  const flexionMovements: MovementType[] = [
    'elbow_flexion',
    'knee_flexion',
    'hip_flexion',
    'shoulder_flexion',
    'neck_flexion',
    'spine_flexion',
    'wrist_flexion',
    'ankle_dorsiflexion',
  ]

  if (flexionMovements.includes(movementId)) {
    return measureFlexionAngle(landmarks, movementId, side)
  }

  return measureJointAngle(landmarks, movementId, side)
}

// 각도 안정화 (노이즈 제거)
export class AngleStabilizer {
  private history: number[] = []
  private maxHistorySize: number

  constructor(historySize: number = 5) {
    this.maxHistorySize = historySize
  }

  stabilize(angle: number): number {
    this.history.push(angle)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }

    // 이동 평균 계산
    const sum = this.history.reduce((a, b) => a + b, 0)
    return sum / this.history.length
  }

  reset(): void {
    this.history = []
  }
}

// 상태 판단
export type AngleStatus = 'normal' | 'low' | 'high' | 'max'

export function getAngleStatus(
  angle: number,
  normalMin: number,
  normalMax: number,
  calibrationMax?: number
): AngleStatus {
  if (calibrationMax !== undefined && angle >= calibrationMax) {
    return 'max'
  }
  if (angle < normalMin) {
    return 'low'
  }
  if (angle > normalMax) {
    return 'high'
  }
  return 'normal'
}
