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
