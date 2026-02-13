import type { Landmark } from '@/types/posture'
import { POSE_LANDMARKS } from '@/hooks/use-pose-detection'

export function calculateAngle(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  const radians =
    Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) {
    angle = 360 - angle
  }
  return angle
}

export function calculateDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

export function calculateMidpoint(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }
}

// Calculate head forward angle (for forward head posture detection)
export function calculateHeadForwardAngle(landmarks: Landmark[]): number {
  const ear = landmarks[POSE_LANDMARKS.LEFT_EAR]
  const shoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]

  // Vertical reference point
  const verticalRef = { x: shoulder.x, y: ear.y }

  return calculateAngle(verticalRef, shoulder, ear)
}

// Calculate shoulder alignment (for rounded shoulders detection)
export function calculateShoulderAlignment(landmarks: Landmark[]): {
  heightDiff: number
  forwardAngle: number
} {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]

  // Height difference (normalized by shoulder width)
  const shoulderWidth = calculateDistance(leftShoulder, rightShoulder)
  const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth

  // Forward angle (shoulder relative to hip)
  const forwardAngle = calculateAngle(
    { x: leftHip.x, y: leftShoulder.y },
    leftHip,
    leftShoulder
  )

  return { heightDiff, forwardAngle }
}

// Calculate spine curvature
export function calculateSpineCurvature(landmarks: Landmark[]): {
  lateralDeviation: number
  kyphosisAngle: number
  lordosisAngle: number
} {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  const shoulderMid = calculateMidpoint(leftShoulder, rightShoulder)
  const hipMid = calculateMidpoint(leftHip, rightHip)

  // Lateral deviation (for scoliosis detection)
  const lateralDeviation = shoulderMid.x - hipMid.x

  // Kyphosis angle (upper back curvature) - simplified
  const kyphosisAngle = calculateAngle(
    landmarks[POSE_LANDMARKS.NOSE],
    shoulderMid,
    hipMid
  )

  // Lordosis angle (lower back curvature) - simplified
  const lordosisAngle = calculateAngle(
    shoulderMid,
    hipMid,
    calculateMidpoint(
      landmarks[POSE_LANDMARKS.LEFT_KNEE],
      landmarks[POSE_LANDMARKS.RIGHT_KNEE]
    )
  )

  return { lateralDeviation, kyphosisAngle, lordosisAngle }
}

// Calculate pelvis tilt
export function calculatePelvisTilt(landmarks: Landmark[]): {
  lateralTilt: number
  anteriorTilt: number
} {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE]

  // Lateral tilt (left-right)
  const hipWidth = calculateDistance(leftHip, rightHip)
  const lateralTilt = (leftHip.y - rightHip.y) / hipWidth

  // Anterior tilt (front-back) - using hip-knee angle as proxy
  const anteriorTilt = calculateAngle(
    landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
    leftHip,
    leftKnee
  )

  return { lateralTilt, anteriorTilt }
}

// Calculate knee alignment
export function calculateKneeAlignment(landmarks: Landmark[]): {
  leftKneeAngle: number
  rightKneeAngle: number
  valgusAngle: number // For X-legs / O-legs detection
} {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle)
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle)

  // Valgus angle (knee deviation from hip-ankle line)
  const leftValgus =
    leftKnee.x - (leftHip.x + leftAnkle.x) / 2
  const rightValgus =
    rightKnee.x - (rightHip.x + rightAnkle.x) / 2
  const valgusAngle = (leftValgus + rightValgus) / 2

  return { leftKneeAngle, rightKneeAngle, valgusAngle }
}

// Calculate overall body balance
export function calculateBodyBalance(landmarks: Landmark[]): {
  centerOfMassX: number
  centerOfMassY: number
  isBalanced: boolean
} {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  // Simplified center of mass calculation
  const centerOfMassX =
    (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4
  const centerOfMassY =
    (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4

  // Check if center of mass is between ankles
  const anklesMidX = (leftAnkle.x + rightAnkle.x) / 2
  const tolerance = 0.1 // 10% tolerance
  const isBalanced = Math.abs(centerOfMassX - anklesMidX) < tolerance

  return { centerOfMassX, centerOfMassY, isBalanced }
}

// ============================================
// O다리 / X다리 분석 (정면 뷰)
// ============================================
export type LegAlignmentSeverity = 'none' | 'mild' | 'moderate' | 'severe'

// LegType과 호환되는 타입 (types/analysis-result.ts와 일치)
export type LegAlignmentType = 'normal' | 'o_legs' | 'x_legs'

export interface LegAlignmentResult {
  leftAngle: number       // Hip-Knee-Ankle 각도 (왼쪽)
  rightAngle: number      // Hip-Knee-Ankle 각도 (오른쪽)
  overallAngle: number    // 평균 각도
  type: LegAlignmentType
  severity: LegAlignmentSeverity
  kneeDistance: number    // 무릎 간 거리
  ankleDistance: number   // 발목 간 거리
}

export function calculateLegAlignment(landmarks: Landmark[]): LegAlignmentResult {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  // Hip-Knee-Ankle 각도 계산
  const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle)
  const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle)
  const overallAngle = (leftAngle + rightAngle) / 2

  // 무릎 간 거리와 발목 간 거리
  const kneeDistance = calculateDistance(leftKnee, rightKnee)
  const ankleDistance = calculateDistance(leftAnkle, rightAnkle)

  // O다리 / X다리 판정
  // 정상: 170~180°
  // O다리: < 170° (무릎이 바깥으로)
  // X다리: > 180° 또는 무릎간 거리 < 발목간 거리
  let type: LegAlignmentType = 'normal'
  let severity: LegAlignmentSeverity = 'none'

  if (overallAngle < 170) {
    // O다리 (Genu Varum)
    type = 'o_legs'
    if (overallAngle >= 165) severity = 'mild'
    else if (overallAngle >= 155) severity = 'moderate'
    else severity = 'severe'
  } else if (overallAngle > 185 || kneeDistance < ankleDistance * 0.8) {
    // X다리 (Genu Valgum)
    type = 'x_legs'
    if (overallAngle <= 190) severity = 'mild'
    else if (overallAngle <= 200) severity = 'moderate'
    else severity = 'severe'
  }

  return {
    leftAngle,
    rightAngle,
    overallAngle,
    type,
    severity,
    kneeDistance,
    ankleDistance,
  }
}

// ============================================
// 라운드숄더 분석 (측면 뷰)
// ============================================
export interface RoundShoulderResult {
  earShoulderOffset: number    // 귀-어깨 수평 거리 (양수 = 어깨가 앞으로)
  offsetRatio: number          // 귀-어깨 거리 / 어깨-골반 거리 비율
  isRoundShoulder: boolean
  severity: LegAlignmentSeverity
}

export function calculateRoundShoulder(landmarks: Landmark[], side: 'left' | 'right' = 'left'): RoundShoulderResult {
  // 측면 뷰에서 귀와 어깨의 x 좌표 차이로 판단
  const ear = side === 'left'
    ? landmarks[POSE_LANDMARKS.LEFT_EAR]
    : landmarks[POSE_LANDMARKS.RIGHT_EAR]
  const shoulder = side === 'left'
    ? landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
    : landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const hip = side === 'left'
    ? landmarks[POSE_LANDMARKS.LEFT_HIP]
    : landmarks[POSE_LANDMARKS.RIGHT_HIP]

  // 귀-어깨 수평 거리 (양수 = 어깨가 귀보다 앞으로 나옴)
  // 정면을 보고 있다면 x 좌표 차이, 측면이면 z 좌표 사용 필요
  // 측면 뷰에서는 x 좌표가 앞뒤를 나타냄
  const earShoulderOffset = shoulder.x - ear.x

  // 어깨-골반 거리로 정규화
  const shoulderHipDistance = calculateDistance(shoulder, hip)
  const offsetRatio = Math.abs(earShoulderOffset) / shoulderHipDistance

  // 라운드숄더 판정
  // offsetRatio가 0.1 이상이면 라운드숄더로 판단
  let isRoundShoulder = false
  let severity: LegAlignmentSeverity = 'none'

  if (offsetRatio > 0.05 && earShoulderOffset > 0) {
    isRoundShoulder = true
    if (offsetRatio <= 0.1) severity = 'mild'
    else if (offsetRatio <= 0.2) severity = 'moderate'
    else severity = 'severe'
  }

  return {
    earShoulderOffset,
    offsetRatio,
    isRoundShoulder,
    severity,
  }
}
