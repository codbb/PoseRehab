/**
 * ePose 기반 자세 분석 로직
 *
 * MediaPipe 랜드마크를 ePose 키포인트에 매핑하고
 * 좌우/전후 기울기 측정 및 자세 유형 분류를 수행합니다.
 */

import type { Landmark } from '@/types/posture'
import { POSE_LANDMARKS } from '@/hooks/use-pose-detection'

// ============================================================================
// 타입 정의
// ============================================================================

export interface Point2D {
  x: number
  y: number
}

export interface Point3D extends Point2D {
  z?: number
  visibility?: number
}

// ePose 키포인트
export interface EPoseKeypoints {
  topOfHead: Point2D
  neckMidpoint: Point2D
  leftShoulder: Point2D
  rightShoulder: Point2D
  leftElbow: Point2D
  rightElbow: Point2D
  leftWrist: Point2D
  rightWrist: Point2D
  leftGreaterTrochanter: Point2D  // 대전자 (엉덩이 외측)
  rightGreaterTrochanter: Point2D
  leftKnee: Point2D
  rightKnee: Point2D
  leftAnkle: Point2D
  rightAnkle: Point2D
  rightEye: Point2D
  rightEar: Point2D
  c7Vertebra: Point2D  // 제7경추
  rightPSIS: Point2D   // 후상장골극
  rightASIS: Point2D   // 전상장골극
  // 가상 중심점
  shoulderMidpoint: Point2D
  centerOfGravity: Point2D
  greaterTrochanterMidpoint: Point2D
  ankleMidpoint: Point2D
}

// 좌우 기울기 측정값 (9개)
export interface LeftRightTiltMeasurements {
  wholeBodyTilt: number        // 전신 좌우 기울기 (°)
  upperBodyTilt: number        // 상체 좌우 기울기 (°)
  lowerBodyTilt: number        // 하체 좌우 기울기 (°)
  headTilt: number             // 머리 좌우 기울기 (°)
  neckDeviation: number        // 목 좌우 편차 (cm 또는 정규화)
  shoulderTilt: number         // 어깨 좌우 기울기 (°)
  chestDeviation: number       // 흉부 좌우 편차
  hipTilt: number              // 골반 좌우 기울기 (°)
  hipDeviation: number         // 골반 좌우 편차
}

// 전후 기울기 측정값 (8개)
export interface FrontBackTiltMeasurements {
  wholeBodyTilt: number        // 전신 전후 기울기 (°)
  upperBodyTilt: number        // 상체 전후 기울기 (°)
  lowerBodyTilt: number        // 하체 전후 기울기 (°)
  headTilt: number             // 머리 전후 기울기 (°)
  neckDeviation: number        // 목 전후 편차 (cm)
  pelvicTilt: number           // 골반 전후 기울기 (°)
  hipDeviation: number         // 골반 전후 편차 (°)
  kneeFlexionAngle: number     // 무릎 굴곡 각도 (°)
}

// 자세 유형 (12가지)
export type EPosePostureType =
  | 'normal'                    // 정상
  | 'flat_back'                 // 일자등
  | 'flat_lumbar'               // 일자 요추
  | 'kyphosis'                  // 후만증 (굽은등)
  | 'lordosis'                  // 전만증 (오목등)
  | 'kyphosis_lordosis'         // 후만+전만
  | 'swayback'                  // 스웨이백
  | 'swayback_flat_lumbar'      // 스웨이백+일자요추
  | 'swayback_flat_back'        // 스웨이백+일자등
  | 'swayback_kyphosis'         // 스웨이백+후만
  | 'swayback_lordosis'         // 스웨이백+전만
  | 'swayback_kyphosis_lordosis'// 스웨이백+후만+전만

// 3가지 주요 분류 요소
export interface PostureClassificationFactors {
  anteriorPelvicDisplacement: number  // 골반 전방 변위 (양수: 전방, 음수: 후방)
  spinalCurvature: number             // 척추 만곡도 (양수: 후만, 음수: 전만)
  anteriorPosteriorPelvicTilt: number // 골반 전후 기울기 (양수: 전방경사, 음수: 후방경사)
}

export interface EPoseAnalysisResult {
  keypoints: EPoseKeypoints
  leftRightTilt: LeftRightTiltMeasurements
  frontBackTilt: FrontBackTiltMeasurements
  classificationFactors: PostureClassificationFactors
  postureType: EPosePostureType
  confidence: number
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 두 점 사이의 중점 계산
 */
export function getMidpoint(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }
}

/**
 * 두 점 사이의 거리 계산
 */
export function getDistance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

/**
 * 선과 수직선 사이의 각도 계산 (도 단위)
 * 양수: 오른쪽으로 기울어짐, 음수: 왼쪽으로 기울어짐
 */
export function getAngleFromVertical(p1: Point2D, p2: Point2D): number {
  // p1에서 p2로 향하는 벡터와 수직선(위로) 사이의 각도
  const dx = p2.x - p1.x
  const dy = p1.y - p2.y  // y축이 아래로 증가하므로 반전
  const angle = Math.atan2(dx, dy) * (180 / Math.PI)
  return angle
}

/**
 * 선과 수평선 사이의 각도 계산 (도 단위)
 * 양수: 위로 기울어짐 (오른쪽이 높음), 음수: 아래로 기울어짐 (왼쪽이 높음)
 * 수평일 때 0°가 되도록 -90~90 범위로 정규화
 */
export function getAngleFromHorizontal(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x
  const dy = p1.y - p2.y  // 이미지 좌표계에서 y는 아래로 증가하므로 반전
  let angle = Math.atan2(dy, dx) * (180 / Math.PI)

  // 수평선 기준 -90~90 범위로 정규화 (180° 보정)
  // 어깨/골반처럼 좌우 포인트를 연결할 때, 피험자 기준 왼쪽이 이미지 오른쪽에 있으면
  // dx가 음수가 되어 ±180° 근처 값이 나오므로 보정 필요
  if (angle > 90) {
    angle = angle - 180
  } else if (angle < -90) {
    angle = angle + 180
  }

  return angle
}

/**
 * 세 점으로 이루어진 각도 계산 (p2가 꼭지점)
 */
export function getAngleAtVertex(p1: Point2D, p2: Point2D, p3: Point2D): number {
  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x)
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x)
  let angle = Math.abs((angle1 - angle2) * (180 / Math.PI))
  if (angle > 180) angle = 360 - angle
  return angle
}

/**
 * 점에서 수직선까지의 수평 거리 계산
 */
export function getHorizontalDeviationFromVerticalLine(
  point: Point2D,
  linePoint: Point2D
): number {
  return point.x - linePoint.x
}

// ============================================================================
// MediaPipe → ePose 키포인트 매핑
// ============================================================================

/**
 * MediaPipe 랜드마크를 ePose 키포인트로 변환
 */
export function mapToEPoseKeypoints(landmarks: Landmark[]): EPoseKeypoints {
  // MediaPipe 기본 키포인트 추출
  const nose = landmarks[POSE_LANDMARKS.NOSE]
  const leftEye = landmarks[POSE_LANDMARKS.LEFT_EYE]
  const rightEye = landmarks[POSE_LANDMARKS.RIGHT_EYE]
  const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR]
  const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR]
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW]
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW]
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE]
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  // 가상 중심점 계산
  const shoulderMidpoint = getMidpoint(leftShoulder, rightShoulder)
  const ankleMidpoint = getMidpoint(leftAnkle, rightAnkle)

  // 대전자 (Greater Trochanter) - Hip보다 약간 외측/아래로 추정
  // MediaPipe Hip은 실제로 대전자에 가까움
  const leftGreaterTrochanter = {
    x: leftHip.x,
    y: leftHip.y,
  }
  const rightGreaterTrochanter = {
    x: rightHip.x,
    y: rightHip.y,
  }
  const greaterTrochanterMidpoint = getMidpoint(leftGreaterTrochanter, rightGreaterTrochanter)

  // 무게 중심 (Center of Gravity) - 어깨와 골반의 중간점 기반
  const centerOfGravity = {
    x: (shoulderMidpoint.x + greaterTrochanterMidpoint.x) / 2,
    y: (shoulderMidpoint.y + greaterTrochanterMidpoint.y * 2) / 3, // 골반 쪽으로 더 가중치
  }

  // 목 중심점 (Neck Midpoint) - 어깨 중심 바로 위
  const earMidpoint = getMidpoint(leftEar, rightEar)
  const neckMidpoint = {
    x: (shoulderMidpoint.x + earMidpoint.x) / 2,
    y: (shoulderMidpoint.y + earMidpoint.y) / 2,
  }

  // 머리 꼭대기 (Top of Head) - 코에서 귀 방향으로 추정
  const eyeMidpoint = getMidpoint(leftEye, rightEye)
  const headHeight = getDistance(eyeMidpoint, nose) * 1.5
  const topOfHead = {
    x: nose.x,
    y: nose.y - headHeight,
  }

  // 제7경추 (C7) - 어깨 중심 약간 위/뒤
  const c7Vertebra = {
    x: shoulderMidpoint.x,
    y: shoulderMidpoint.y - (shoulderMidpoint.y - neckMidpoint.y) * 0.3,
  }

  // ASIS/PSIS - Hip 위치 기반 추정 (측면 분석용)
  // 실제로는 골반 전면/후면 랜드마크가 필요하지만 MediaPipe는 제공하지 않음
  // Hip 위치를 기준으로 추정
  const rightPSIS = {
    x: rightHip.x + 0.02, // 약간 뒤쪽
    y: rightHip.y - 0.02, // 약간 위쪽
  }
  const rightASIS = {
    x: rightHip.x - 0.02, // 약간 앞쪽
    y: rightHip.y - 0.01, // 약간 위쪽
  }

  return {
    topOfHead,
    neckMidpoint,
    leftShoulder: { x: leftShoulder.x, y: leftShoulder.y },
    rightShoulder: { x: rightShoulder.x, y: rightShoulder.y },
    leftElbow: { x: leftElbow.x, y: leftElbow.y },
    rightElbow: { x: rightElbow.x, y: rightElbow.y },
    leftWrist: { x: leftWrist.x, y: leftWrist.y },
    rightWrist: { x: rightWrist.x, y: rightWrist.y },
    leftGreaterTrochanter,
    rightGreaterTrochanter,
    leftKnee: { x: leftKnee.x, y: leftKnee.y },
    rightKnee: { x: rightKnee.x, y: rightKnee.y },
    leftAnkle: { x: leftAnkle.x, y: leftAnkle.y },
    rightAnkle: { x: rightAnkle.x, y: rightAnkle.y },
    rightEye: { x: rightEye.x, y: rightEye.y },
    rightEar: { x: rightEar.x, y: rightEar.y },
    c7Vertebra,
    rightPSIS,
    rightASIS,
    shoulderMidpoint,
    centerOfGravity,
    greaterTrochanterMidpoint,
    ankleMidpoint,
  }
}

// ============================================================================
// 좌우 기울기 측정 함수 (9가지) - 정면 사진용
// ============================================================================

/**
 * 좌우 기울기 측정 (정면 분석)
 */
export function measureLeftRightTilt(keypoints: EPoseKeypoints): LeftRightTiltMeasurements {
  const {
    ankleMidpoint,
    centerOfGravity,
    greaterTrochanterMidpoint,
    shoulderMidpoint,
    neckMidpoint,
    topOfHead,
    leftShoulder,
    rightShoulder,
    leftGreaterTrochanter,
    rightGreaterTrochanter,
  } = keypoints

  // 1. 전신 좌우 기울기: 발목 중심 → 무게 중심 선과 수직선 사이 각도
  const wholeBodyTilt = getAngleFromVertical(ankleMidpoint, centerOfGravity)

  // 2. 상체 좌우 기울기: 대전자 중심 → 어깨 중심 선과 수직선 사이 각도
  const upperBodyTilt = getAngleFromVertical(greaterTrochanterMidpoint, shoulderMidpoint)

  // 3. 하체 좌우 기울기: 발목 중심 → 대전자 중심 선과 수직선 사이 각도
  const lowerBodyTilt = getAngleFromVertical(ankleMidpoint, greaterTrochanterMidpoint)

  // 4. 머리 좌우 기울기: 목 중심 → 머리 꼭대기 선과 수직선 사이 각도
  const headTilt = getAngleFromVertical(neckMidpoint, topOfHead)

  // 5. 목 좌우 편차: 무게 중심 수직선과 목 중심 사이의 좌우 편차
  const neckDeviation = getHorizontalDeviationFromVerticalLine(neckMidpoint, centerOfGravity)

  // 6. 어깨 좌우 기울기: 수평선과 양 어깨를 연결한 선 사이 각도
  const shoulderTilt = getAngleFromHorizontal(leftShoulder, rightShoulder)

  // 7. 흉부 좌우 편차: 무게 중심 수직선과 어깨 중심 사이의 좌우 편차
  const chestDeviation = getHorizontalDeviationFromVerticalLine(shoulderMidpoint, centerOfGravity)

  // 8. 골반 좌우 기울기: 수평선과 양 대전자를 연결한 선 사이 각도
  const hipTilt = getAngleFromHorizontal(leftGreaterTrochanter, rightGreaterTrochanter)

  // 9. 골반 좌우 편차: 무게 중심 수직선과 대전자 중심 사이의 수평 편차
  const hipDeviation = getHorizontalDeviationFromVerticalLine(greaterTrochanterMidpoint, centerOfGravity)

  return {
    wholeBodyTilt: Math.round(wholeBodyTilt * 10) / 10,
    upperBodyTilt: Math.round(upperBodyTilt * 10) / 10,
    lowerBodyTilt: Math.round(lowerBodyTilt * 10) / 10,
    headTilt: Math.round(headTilt * 10) / 10,
    neckDeviation: Math.round(neckDeviation * 1000) / 10, // 정규화 값을 cm로 변환 (대략적)
    shoulderTilt: Math.round(shoulderTilt * 10) / 10,
    chestDeviation: Math.round(chestDeviation * 1000) / 10,
    hipTilt: Math.round(hipTilt * 10) / 10,
    hipDeviation: Math.round(hipDeviation * 1000) / 10,
  }
}

// ============================================================================
// 전후 기울기 측정 함수 (8가지) - 측면 사진용
// ============================================================================

/**
 * 전후 기울기 측정 (측면 분석)
 */
export function measureFrontBackTilt(keypoints: EPoseKeypoints): FrontBackTiltMeasurements {
  const {
    ankleMidpoint,
    centerOfGravity,
    greaterTrochanterMidpoint,
    shoulderMidpoint,
    rightEar,
    rightEye,
    rightPSIS,
    rightASIS,
    rightKnee,
    rightAnkle,
    rightGreaterTrochanter,
  } = keypoints

  // 1. 전신 전후 기울기: 발목 → 무게 중심 선과 수직선 사이 각도
  const wholeBodyTilt = getAngleFromVertical(ankleMidpoint, centerOfGravity)

  // 2. 상체 전후 기울기: 대전자 → 어깨 선과 수직선 사이 각도
  const upperBodyTilt = getAngleFromVertical(greaterTrochanterMidpoint, shoulderMidpoint)

  // 3. 하체 전후 기울기: 발목 → 대전자 선과 수직선 사이 각도
  const lowerBodyTilt = getAngleFromVertical(ankleMidpoint, greaterTrochanterMidpoint)

  // 4. 머리 전후 기울기: 귀-눈 선과 수평선 사이 각도
  const headTilt = getAngleFromHorizontal(rightEar, rightEye)

  // 5. 목 전후 편차: 어깨 수직선과 귀 위치 사이의 전후 편차
  const neckDeviation = getHorizontalDeviationFromVerticalLine(rightEar, shoulderMidpoint)

  // 6. 골반 전후 기울기 (Pelvic Tilt): ASIS-PSIS 선과 수평선 사이 각도
  const pelvicTilt = getAngleFromHorizontal(rightPSIS, rightASIS)

  // 7. 골반 전후 편차 (Hip Deviation): 발목-대전자 선과 대전자-어깨 선 사이 각도
  const lowerAngle = getAngleFromVertical(rightAnkle, rightGreaterTrochanter)
  const upperAngle = getAngleFromVertical(rightGreaterTrochanter, shoulderMidpoint)
  const hipDeviation = upperAngle - lowerAngle

  // 8. 무릎 굴곡 각도: 발목-무릎 선과 무릎-대전자 선 사이 각도
  const kneeFlexionAngle = 180 - getAngleAtVertex(rightAnkle, rightKnee, rightGreaterTrochanter)

  return {
    wholeBodyTilt: Math.round(wholeBodyTilt * 10) / 10,
    upperBodyTilt: Math.round(upperBodyTilt * 10) / 10,
    lowerBodyTilt: Math.round(lowerBodyTilt * 10) / 10,
    headTilt: Math.round(headTilt * 10) / 10,
    neckDeviation: Math.round(neckDeviation * 1000) / 10,
    pelvicTilt: Math.round(pelvicTilt * 10) / 10,
    hipDeviation: Math.round(hipDeviation * 10) / 10,
    kneeFlexionAngle: Math.round(kneeFlexionAngle * 10) / 10,
  }
}

// ============================================================================
// 자세 유형 분류 (3요소 기반)
// ============================================================================

/**
 * 3가지 분류 요소 계산
 */
export function calculateClassificationFactors(
  keypoints: EPoseKeypoints,
  frontBackTilt: FrontBackTiltMeasurements
): PostureClassificationFactors {
  const {
    ankleMidpoint,
    greaterTrochanterMidpoint,
    shoulderMidpoint,
  } = keypoints

  // 1. 골반 전방 변위 (Anterior Pelvic Displacement)
  // 발목 수직선을 기준으로 대전자가 얼마나 앞으로 나왔는지
  const anteriorPelvicDisplacement = (greaterTrochanterMidpoint.x - ankleMidpoint.x) * 100

  // 2. 척추 만곡도 (Spinal Curvature)
  // 상체 기울기로 대체 - 양수면 후만 경향, 음수면 전만 경향
  const spinalCurvature = frontBackTilt.upperBodyTilt

  // 3. 골반 전후 기울기 (Anterior-Posterior Pelvic Tilt)
  const anteriorPosteriorPelvicTilt = frontBackTilt.pelvicTilt

  return {
    anteriorPelvicDisplacement: Math.round(anteriorPelvicDisplacement * 10) / 10,
    spinalCurvature: Math.round(spinalCurvature * 10) / 10,
    anteriorPosteriorPelvicTilt: Math.round(anteriorPosteriorPelvicTilt * 10) / 10,
  }
}

/**
 * 자세 유형 분류 (12가지)
 */
export function classifyPostureType(
  factors: PostureClassificationFactors
): { type: EPosePostureType; confidence: number } {
  const { anteriorPelvicDisplacement, spinalCurvature, anteriorPosteriorPelvicTilt } = factors

  // 임계값 정의
  const SWAYBACK_THRESHOLD = 3        // 골반 전방 변위 임계값
  const KYPHOSIS_THRESHOLD = 8        // 후만 (상체 전방 기울기) 임계값
  const LORDOSIS_THRESHOLD = -8       // 전만 (상체 후방 기울기) 임계값
  const FLAT_THRESHOLD_UPPER = 5      // 일자 상한
  const FLAT_THRESHOLD_LOWER = -5     // 일자 하한
  const PELVIC_TILT_THRESHOLD = 10    // 골반 기울기 임계값

  // 조건 판단
  const hasSwayback = anteriorPelvicDisplacement > SWAYBACK_THRESHOLD
  const hasKyphosis = spinalCurvature > KYPHOSIS_THRESHOLD
  const hasLordosis = anteriorPosteriorPelvicTilt > PELVIC_TILT_THRESHOLD
  const hasFlatBack = spinalCurvature > FLAT_THRESHOLD_LOWER && spinalCurvature < FLAT_THRESHOLD_UPPER
  const hasFlatLumbar = anteriorPosteriorPelvicTilt > FLAT_THRESHOLD_LOWER &&
                        anteriorPosteriorPelvicTilt < FLAT_THRESHOLD_UPPER

  let type: EPosePostureType = 'normal'
  let confidence = 85

  // 스웨이백 조합 판단
  if (hasSwayback) {
    if (hasKyphosis && hasLordosis) {
      type = 'swayback_kyphosis_lordosis'
      confidence = 75
    } else if (hasKyphosis) {
      type = 'swayback_kyphosis'
      confidence = 78
    } else if (hasLordosis) {
      type = 'swayback_lordosis'
      confidence = 78
    } else if (hasFlatBack) {
      type = 'swayback_flat_back'
      confidence = 80
    } else if (hasFlatLumbar) {
      type = 'swayback_flat_lumbar'
      confidence = 80
    } else {
      type = 'swayback'
      confidence = 82
    }
  }
  // 스웨이백 없이 후만/전만 조합
  else if (hasKyphosis && hasLordosis) {
    type = 'kyphosis_lordosis'
    confidence = 78
  }
  // 단독 유형
  else if (hasKyphosis) {
    type = 'kyphosis'
    confidence = 82
  } else if (hasLordosis) {
    type = 'lordosis'
    confidence = 82
  } else if (hasFlatBack) {
    type = 'flat_back'
    confidence = 80
  } else if (hasFlatLumbar) {
    type = 'flat_lumbar'
    confidence = 80
  } else {
    type = 'normal'
    confidence = 90
  }

  return { type, confidence }
}

// ============================================================================
// 메인 분석 함수
// ============================================================================

/**
 * ePose 기반 전체 자세 분석 실행
 */
export function analyzeWithEPose(
  landmarks: Landmark[],
  direction: 'front' | 'side' = 'front'
): EPoseAnalysisResult {
  // 1. 키포인트 매핑
  const keypoints = mapToEPoseKeypoints(landmarks)

  // 2. 방향에 따른 측정
  let leftRightTilt: LeftRightTiltMeasurements
  let frontBackTilt: FrontBackTiltMeasurements

  if (direction === 'front') {
    leftRightTilt = measureLeftRightTilt(keypoints)
    // 정면에서는 전후 기울기를 정확히 측정할 수 없으므로 기본값
    frontBackTilt = {
      wholeBodyTilt: 0,
      upperBodyTilt: 0,
      lowerBodyTilt: 0,
      headTilt: 0,
      neckDeviation: 0,
      pelvicTilt: 0,
      hipDeviation: 0,
      kneeFlexionAngle: 0,
    }
  } else {
    // 측면에서는 좌우 기울기를 정확히 측정할 수 없으므로 기본값
    leftRightTilt = {
      wholeBodyTilt: 0,
      upperBodyTilt: 0,
      lowerBodyTilt: 0,
      headTilt: 0,
      neckDeviation: 0,
      shoulderTilt: 0,
      chestDeviation: 0,
      hipTilt: 0,
      hipDeviation: 0,
    }
    frontBackTilt = measureFrontBackTilt(keypoints)
  }

  // 3. 분류 요소 계산 (측면 데이터 기반)
  const classificationFactors = calculateClassificationFactors(keypoints, frontBackTilt)

  // 4. 자세 유형 분류
  const { type: postureType, confidence } = classifyPostureType(classificationFactors)

  return {
    keypoints,
    leftRightTilt,
    frontBackTilt,
    classificationFactors,
    postureType,
    confidence,
  }
}

// ============================================================================
// 점수 계산 유틸리티
// ============================================================================

/**
 * 측정값을 점수로 변환 (0-100)
 */
export function measurementToScore(
  value: number,
  idealMin: number,
  idealMax: number,
  maxDeviation: number
): number {
  if (value >= idealMin && value <= idealMax) {
    return 100
  }

  const deviation = value < idealMin
    ? idealMin - value
    : value - idealMax

  const score = Math.max(0, 100 - (deviation / maxDeviation) * 100)
  return Math.round(score)
}

/**
 * 측정값 상태 판정
 */
export function getMeasurementStatus(
  value: number,
  idealMin: number,
  idealMax: number,
  warningThreshold: number
): 'normal' | 'warning' | 'danger' {
  if (value >= idealMin && value <= idealMax) {
    return 'normal'
  }

  const deviation = value < idealMin
    ? idealMin - value
    : value - idealMax

  if (deviation <= warningThreshold) {
    return 'warning'
  }

  return 'danger'
}

// ============================================================================
// 자세 유형 라벨
// ============================================================================

export const EPOSE_TYPE_LABELS: Record<EPosePostureType, { en: string; ko: string }> = {
  normal: { en: 'Normal', ko: '정상' },
  flat_back: { en: 'Flat Back', ko: '일자등' },
  flat_lumbar: { en: 'Flat Lumbar', ko: '일자 요추' },
  kyphosis: { en: 'Kyphosis', ko: '후만증 (굽은등)' },
  lordosis: { en: 'Lordosis', ko: '전만증 (오목등)' },
  kyphosis_lordosis: { en: 'Kyphosis-Lordosis', ko: '후만+전만' },
  swayback: { en: 'Swayback', ko: '스웨이백' },
  swayback_flat_lumbar: { en: 'Swayback + Flat Lumbar', ko: '스웨이백+일자요추' },
  swayback_flat_back: { en: 'Swayback + Flat Back', ko: '스웨이백+일자등' },
  swayback_kyphosis: { en: 'Swayback + Kyphosis', ko: '스웨이백+후만' },
  swayback_lordosis: { en: 'Swayback + Lordosis', ko: '스웨이백+전만' },
  swayback_kyphosis_lordosis: { en: 'Swayback + Kyphosis-Lordosis', ko: '스웨이백+후만+전만' },
}

// 측정 항목 라벨 및 이상 범위
export const MEASUREMENT_LABELS = {
  leftRight: {
    wholeBodyTilt: {
      en: 'Whole Body Left-Right Tilt',
      ko: '전신 좌우 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    upperBodyTilt: {
      en: 'Upper Body Left-Right Tilt',
      ko: '상체 좌우 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 10
    },
    lowerBodyTilt: {
      en: 'Lower Body Left-Right Tilt',
      ko: '하체 좌우 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    headTilt: {
      en: 'Head Left-Right Tilt',
      ko: '머리 좌우 기울기',
      idealMin: -4, idealMax: 4, unit: '°', maxDeviation: 15
    },
    neckDeviation: {
      en: 'Neck Left-Right Deviation',
      ko: '목 좌우 편차',
      idealMin: -1, idealMax: 1, unit: 'cm', maxDeviation: 5
    },
    shoulderTilt: {
      en: 'Shoulder Left-Right Tilt',
      ko: '어깨 좌우 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 10
    },
    chestDeviation: {
      en: 'Chest Left-Right Deviation',
      ko: '흉부 좌우 편차',
      idealMin: -1, idealMax: 1, unit: 'cm', maxDeviation: 5
    },
    hipTilt: {
      en: 'Hip Left-Right Tilt',
      ko: '골반 좌우 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 10
    },
    hipDeviation: {
      en: 'Hip Left-Right Deviation',
      ko: '골반 좌우 편차',
      idealMin: -1, idealMax: 1, unit: 'cm', maxDeviation: 5
    },
  },
  frontBack: {
    wholeBodyTilt: {
      en: 'Whole Body Front-Back Tilt',
      ko: '전신 전후 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    upperBodyTilt: {
      en: 'Upper Body Front-Back Tilt',
      ko: '상체 전후 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 15
    },
    lowerBodyTilt: {
      en: 'Lower Body Front-Back Tilt',
      ko: '하체 전후 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    headTilt: {
      en: 'Head Front-Back Tilt',
      ko: '머리 전후 기울기',
      idealMin: -5, idealMax: 5, unit: '°', maxDeviation: 20
    },
    neckDeviation: {
      en: 'Neck Front-Back Deviation',
      ko: '목 전후 편차',
      idealMin: 0, idealMax: 3, unit: 'cm', maxDeviation: 8
    },
    pelvicTilt: {
      en: 'Pelvic Tilt (Front-Back)',
      ko: '골반 전후 기울기',
      idealMin: 5, idealMax: 15, unit: '°', maxDeviation: 15
    },
    hipDeviation: {
      en: 'Hip Front-Back Deviation',
      ko: '골반 전후 편차',
      idealMin: -5, idealMax: 5, unit: '°', maxDeviation: 15
    },
    kneeFlexionAngle: {
      en: 'Knee Flexion Angle',
      ko: '무릎 굴곡 각도',
      idealMin: 0, idealMax: 10, unit: '°', maxDeviation: 20
    },
  },
}
