/**
 * 3D 기반 규칙 분석기
 * ONNX 모델로 변환된 3D 좌표에서 각도/거리를 계산하고
 * 규칙 기반으로 질환 위험도를 판정합니다.
 */

import type { Pose3DResult } from '@/hooks/use-onnx-model'
import { calculate3DAngle } from '@/lib/pose-3d-utils'
import type {
  FrontViewMetrics,
  SideViewMetrics,
  BackViewMetrics,
  MultiView3DAnalysisResult,
  Pose3DBodyPartRisk,
  Pose3DPredictedCondition,
  Pose3DRecommendation,
  LegType,
} from '@/types/analysis-result'

// ── 위험도 수준 ──
export type RiskLevel = 'normal' | 'warning' | 'danger'

// ── 부위별 위험도 ──
export interface BodyPartRisk {
  name: string
  nameKo: string
  measuredValue: number
  unit: string
  threshold: { warning: number; danger: number }
  level: RiskLevel
  description: string
  descriptionKo: string
}

// ── 예측 질환 ──
export interface PredictedCondition {
  name: string
  nameKo: string
  probability: number
  severity: 'low' | 'medium' | 'high'
  description: string
  descriptionKo: string
  relatedParts: string[]
}

// ── 개선 권장사항 ──
export interface Recommendation3D {
  title: string
  titleKo: string
  description: string
  descriptionKo: string
  exercises: { id: string; name: string; nameKo: string }[]
  priority: 'low' | 'medium' | 'high'
}

// ── 3D 분석 전체 결과 ──
export interface Pose3DAnalysisResult {
  neckRisk: BodyPartRisk
  shoulderRisk: BodyPartRisk
  pelvisRisk: BodyPartRisk
  spineRisk: BodyPartRisk
  overallScore: number
  conditions: PredictedCondition[]
  recommendations: Recommendation3D[]
  angles: {
    neckForwardAngle: number
    shoulderTiltAngle: number
    pelvisTiltAngle: number
    spineLateralDeviation: number
    spineAngle: number
  }
}

// ── 3D 벡터 유틸 ──
interface Vec3 {
  x: number
  y: number
  z: number
}

function getJoint(pose3D: Pose3DResult, name: string): Vec3 | null {
  const j = pose3D.joints.find((j) => j.name === name)
  return j ? { x: j.x, y: j.y, z: j.z } : null
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
}

function rad2deg(rad: number): number {
  return rad * (180 / Math.PI)
}

// ── 목 전방 기울기 계산 ──
function calculateNeckForwardAngle(pose3D: Pose3DResult): number {
  const angle = calculate3DAngle(pose3D, 'Spine3', 'Neck', 'Head')
  return Math.abs(180 - angle)
}

// ── 어깨 기울기 계산 ──
function calculateShoulderTiltAngle(pose3D: Pose3DResult): number {
  const lShoulder = getJoint(pose3D, 'L_Shoulder')
  const rShoulder = getJoint(pose3D, 'R_Shoulder')
  if (!lShoulder || !rShoulder) return 0

  const dx = rShoulder.x - lShoulder.x
  const dy = rShoulder.y - lShoulder.y
  const dz = rShoulder.z - lShoulder.z
  const horizontalDist = Math.sqrt(dx ** 2 + dz ** 2)

  if (horizontalDist === 0) return 0
  return rad2deg(Math.atan2(Math.abs(dy), horizontalDist))
}

// ── 골반 기울기 계산 ──
function calculatePelvisTiltAngle(pose3D: Pose3DResult): number {
  const lHip = getJoint(pose3D, 'L_Hip')
  const rHip = getJoint(pose3D, 'R_Hip')
  if (!lHip || !rHip) return 0

  const dx = rHip.x - lHip.x
  const dy = rHip.y - lHip.y
  const dz = rHip.z - lHip.z
  const horizontalDist = Math.sqrt(dx ** 2 + dz ** 2)

  if (horizontalDist === 0) return 0
  return rad2deg(Math.atan2(Math.abs(dy), horizontalDist))
}

// ── 척추 측만 편차 계산 ──
function calculateSpineLateralDeviation(pose3D: Pose3DResult): number {
  const pelvis = getJoint(pose3D, 'Pelvis')
  const spine1 = getJoint(pose3D, 'Spine1')
  const spine2 = getJoint(pose3D, 'Spine2')
  const spine3 = getJoint(pose3D, 'Spine3')
  const neck = getJoint(pose3D, 'Neck')

  if (!pelvis || !spine1 || !spine2 || !spine3 || !neck) return 0

  const lineDir = vec3Sub(neck, pelvis)
  const lineLen = vec3Length(lineDir)
  if (lineLen === 0) return 0

  const spinePoints = [spine1, spine2, spine3]
  let totalDeviation = 0

  for (const point of spinePoints) {
    const ap = vec3Sub(point, pelvis)

    const t =
      (ap.x * lineDir.x + ap.y * lineDir.y + ap.z * lineDir.z) /
      (lineDir.x ** 2 + lineDir.y ** 2 + lineDir.z ** 2)

    const closest = {
      x: pelvis.x + t * lineDir.x,
      y: pelvis.y + t * lineDir.y,
      z: pelvis.z + t * lineDir.z,
    }

    const lateralDev = Math.sqrt(
      (point.x - closest.x) ** 2 + (point.z - closest.z) ** 2
    )
    totalDeviation += lateralDev
  }

  const avgDeviation = totalDeviation / spinePoints.length
  // 평균 측면 편차를 전체 척추 길이 대비 각도로 변환
  return rad2deg(Math.atan2(avgDeviation, lineLen))
}

// ── 위험도 판정 ──
function determineRiskLevel(
  value: number,
  warningThreshold: number,
  dangerThreshold: number
): RiskLevel {
  if (value >= dangerThreshold) return 'danger'
  if (value >= warningThreshold) return 'warning'
  return 'normal'
}

// ── 점수 계산 (100점 만점) ──
function riskToScore(level: RiskLevel): number {
  switch (level) {
    case 'normal':
      return 95
    case 'warning':
      return 65
    case 'danger':
      return 30
  }
}

// ── 메인 분석 함수 ──
export function analyze3DPosture(pose3D: Pose3DResult): Pose3DAnalysisResult {
  const neckForwardAngle = calculateNeckForwardAngle(pose3D)
  const shoulderTiltAngle = calculateShoulderTiltAngle(pose3D)
  const pelvisTiltAngle = calculatePelvisTiltAngle(pose3D)
  const spineLateralDeviation = calculateSpineLateralDeviation(pose3D)
  const spineAngle = calculate3DAngle(pose3D, 'Pelvis', 'Spine2', 'Neck')

  const neckLevel = determineRiskLevel(neckForwardAngle, 15, 25)
  const neckRisk: BodyPartRisk = {
    name: 'Neck',
    nameKo: '목',
    measuredValue: Math.round(neckForwardAngle * 10) / 10,
    unit: '°',
    threshold: { warning: 15, danger: 25 },
    level: neckLevel,
    description:
      neckLevel === 'normal'
        ? 'Neck alignment is within normal range'
        : neckLevel === 'warning'
        ? 'Slight forward head posture detected'
        : 'Significant forward head posture - turtle neck risk',
    descriptionKo:
      neckLevel === 'normal'
        ? '목 정렬이 정상 범위입니다'
        : neckLevel === 'warning'
        ? '약간의 거북목 자세가 감지되었습니다'
        : '심한 거북목 자세 - 거북목 증후군 위험',
  }

  const shoulderLevel = determineRiskLevel(shoulderTiltAngle, 3, 6)
  const shoulderRisk: BodyPartRisk = {
    name: 'Shoulders',
    nameKo: '어깨',
    measuredValue: Math.round(shoulderTiltAngle * 10) / 10,
    unit: '°',
    threshold: { warning: 3, danger: 6 },
    level: shoulderLevel,
    description:
      shoulderLevel === 'normal'
        ? 'Shoulder alignment is balanced'
        : shoulderLevel === 'warning'
        ? 'Slight shoulder imbalance detected'
        : 'Significant shoulder height difference',
    descriptionKo:
      shoulderLevel === 'normal'
        ? '어깨 높이가 균형 잡혀 있습니다'
        : shoulderLevel === 'warning'
        ? '약간의 어깨 불균형이 감지되었습니다'
        : '어깨 높이 차이가 큽니다',
  }

  const pelvisLevel = determineRiskLevel(pelvisTiltAngle, 5, 10)
  const pelvisRisk: BodyPartRisk = {
    name: 'Pelvis',
    nameKo: '골반',
    measuredValue: Math.round(pelvisTiltAngle * 10) / 10,
    unit: '°',
    threshold: { warning: 5, danger: 10 },
    level: pelvisLevel,
    description:
      pelvisLevel === 'normal'
        ? 'Pelvis alignment is within normal range'
        : pelvisLevel === 'warning'
        ? 'Slight pelvic tilt detected'
        : 'Significant pelvic misalignment',
    descriptionKo:
      pelvisLevel === 'normal'
        ? '골반 정렬이 정상 범위입니다'
        : pelvisLevel === 'warning'
        ? '약간의 골반 틀어짐이 감지되었습니다'
        : '골반 틀어짐이 심합니다',
  }

  const spineLevel = determineRiskLevel(spineLateralDeviation, 5, 10)
  const spineRisk: BodyPartRisk = {
    name: 'Spine',
    nameKo: '척추',
    measuredValue: Math.round(spineLateralDeviation * 10) / 10,
    unit: '°',
    threshold: { warning: 5, danger: 10 },
    level: spineLevel,
    description:
      spineLevel === 'normal'
        ? 'Spine alignment is straight'
        : spineLevel === 'warning'
        ? 'Slight lateral spinal curvature detected'
        : 'Significant spinal curvature - scoliosis risk',
    descriptionKo:
      spineLevel === 'normal'
        ? '척추가 곧게 정렬되어 있습니다'
        : spineLevel === 'warning'
        ? '약간의 척추 측면 만곡이 감지되었습니다'
        : '척추 만곡이 심함 - 척추측만증 위험',
  }

  const overallScore = Math.round(
    riskToScore(neckLevel) * 0.3 +
      riskToScore(shoulderLevel) * 0.2 +
      riskToScore(pelvisLevel) * 0.25 +
      riskToScore(spineLevel) * 0.25
  )

  const conditions: PredictedCondition[] = []

  if (neckLevel !== 'normal') {
    conditions.push({
      name: 'Forward Head Posture (Turtle Neck)',
      nameKo: '거북목 증후군',
      probability: neckLevel === 'danger' ? 85 : 55,
      severity: neckLevel === 'danger' ? 'high' : 'medium',
      description: 'The head is positioned forward of the shoulder line, increasing cervical spine stress.',
      descriptionKo: '머리가 어깨 라인보다 앞으로 나와 있어 경추에 부담이 증가합니다.',
      relatedParts: ['neck'],
    })
  }

  if (shoulderLevel !== 'normal') {
    conditions.push({
      name: 'Shoulder Imbalance',
      nameKo: '어깨 불균형',
      probability: shoulderLevel === 'danger' ? 80 : 50,
      severity: shoulderLevel === 'danger' ? 'high' : 'medium',
      description: 'One shoulder is higher than the other, which may indicate muscle imbalance or scoliosis.',
      descriptionKo: '한쪽 어깨가 다른 쪽보다 높아 근육 불균형이나 척추측만을 의심할 수 있습니다.',
      relatedParts: ['shoulders'],
    })
  }

  if (pelvisLevel !== 'normal') {
    conditions.push({
      name: 'Pelvic Misalignment',
      nameKo: '골반 틀어짐',
      probability: pelvisLevel === 'danger' ? 80 : 50,
      severity: pelvisLevel === 'danger' ? 'high' : 'medium',
      description: 'The pelvis is tilted, which can lead to lower back pain and leg length discrepancy.',
      descriptionKo: '골반이 기울어져 있어 허리 통증과 다리 길이 차이를 유발할 수 있습니다.',
      relatedParts: ['pelvis'],
    })
  }

  if (spineLevel !== 'normal') {
    conditions.push({
      name: 'Scoliosis Risk',
      nameKo: '척추측만증 위험',
      probability: spineLevel === 'danger' ? 75 : 45,
      severity: spineLevel === 'danger' ? 'high' : 'medium',
      description: 'Lateral curvature of the spine detected, which may progress without intervention.',
      descriptionKo: '척추의 측면 만곡이 감지되었으며, 관리하지 않으면 진행될 수 있습니다.',
      relatedParts: ['spine'],
    })
  }

  if (neckLevel !== 'normal' && shoulderLevel !== 'normal') {
    conditions.push({
      name: 'Upper Cross Syndrome',
      nameKo: '상부교차증후군',
      probability: 60,
      severity: 'medium',
      description: 'Combined forward head and shoulder imbalance suggests upper cross syndrome pattern.',
      descriptionKo: '거북목과 어깨 불균형이 동반되어 상부교차증후군이 의심됩니다.',
      relatedParts: ['neck', 'shoulders'],
    })
  }

  if (pelvisLevel !== 'normal' && spineLevel !== 'normal') {
    conditions.push({
      name: 'Lower Cross Syndrome',
      nameKo: '하부교차증후군',
      probability: 55,
      severity: 'medium',
      description: 'Combined pelvic tilt and spinal curvature suggests lower cross syndrome pattern.',
      descriptionKo: '골반 틀어짐과 척추 만곡이 동반되어 하부교차증후군이 의심됩니다.',
      relatedParts: ['pelvis', 'spine'],
    })
  }

  conditions.sort((a, b) => b.probability - a.probability)

  const recommendations: Recommendation3D[] = []

  if (neckLevel !== 'normal') {
    recommendations.push({
      title: 'Neck Stretching & Strengthening',
      titleKo: '목 스트레칭 & 강화 운동',
      description: 'Reduce forward head posture by strengthening deep neck flexors and stretching tight neck extensors.',
      descriptionKo: '심부 목 굴곡근을 강화하고 긴장된 목 신전근을 스트레칭하여 거북목을 교정합니다.',
      exercises: [
        { id: 'chin_tuck', name: 'Chin Tucks', nameKo: '턱 당기기' },
        { id: 'neck_stretch', name: 'Neck Stretch', nameKo: '목 스트레칭' },
        { id: 'upper_trap_stretch', name: 'Upper Trapezius Stretch', nameKo: '상부 승모근 스트레칭' },
      ],
      priority: neckLevel === 'danger' ? 'high' : 'medium',
    })
  }

  if (shoulderLevel !== 'normal') {
    recommendations.push({
      title: 'Shoulder Balance Exercises',
      titleKo: '어깨 균형 운동',
      description: 'Correct shoulder height difference by strengthening the weaker side and stretching the tighter side.',
      descriptionKo: '약한 쪽을 강화하고 긴장된 쪽을 스트레칭하여 어깨 높이를 교정합니다.',
      exercises: [
        { id: 'wall_slide', name: 'Wall Slide', nameKo: '월 슬라이드' },
        { id: 'chest_stretch', name: 'Chest Stretch', nameKo: '가슴 스트레칭' },
        { id: 'upper_trap_stretch', name: 'Upper Trapezius Stretch', nameKo: '상부 승모근 스트레칭' },
      ],
      priority: shoulderLevel === 'danger' ? 'high' : 'medium',
    })
  }

  if (pelvisLevel !== 'normal') {
    recommendations.push({
      title: 'Pelvic Alignment Exercises',
      titleKo: '골반 교정 운동',
      description: 'Restore pelvic alignment through core stabilization and hip stretching exercises.',
      descriptionKo: '코어 안정화 운동과 고관절 스트레칭으로 골반 정렬을 회복합니다.',
      exercises: [
        { id: 'pelvic_tilt', name: 'Pelvic Tilt', nameKo: '골반 기울이기' },
        { id: 'clamshell', name: 'Clamshell', nameKo: '클램쉘' },
        { id: 'bridge', name: 'Glute Bridge', nameKo: '힙 브릿지' },
      ],
      priority: pelvisLevel === 'danger' ? 'high' : 'medium',
    })
  }

  if (spineLevel !== 'normal') {
    recommendations.push({
      title: 'Spinal Alignment Exercises',
      titleKo: '척추 정렬 운동',
      description: 'Address lateral spinal curvature through targeted stretching and strengthening.',
      descriptionKo: '척추 측면 만곡을 교정하기 위한 맞춤 스트레칭과 강화 운동을 합니다.',
      exercises: [
        { id: 'plank', name: 'Plank', nameKo: '플랭크' },
        { id: 'cat_cow', name: 'Cat-Cow Stretch', nameKo: '고양이-소 스트레칭' },
        { id: 'dead_bug', name: 'Dead Bug', nameKo: '데드버그' },
      ],
      priority: spineLevel === 'danger' ? 'high' : 'medium',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Maintain Good Posture',
      titleKo: '좋은 자세 유지',
      description: 'Your 3D posture analysis shows good alignment. Continue with regular exercise to maintain it.',
      descriptionKo: '3D 자세 분석 결과 좋은 정렬 상태입니다. 유지를 위해 규칙적인 운동을 계속하세요.',
      exercises: [
        { id: 'plank', name: 'Plank', nameKo: '플랭크' },
        { id: 'dead_bug', name: 'Dead Bug', nameKo: '데드버그' },
        { id: 'cat_cow', name: 'Cat-Cow Stretch', nameKo: '고양이-소 스트레칭' },
      ],
      priority: 'low',
    })
  }

  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return {
    neckRisk,
    shoulderRisk,
    pelvisRisk,
    spineRisk,
    overallScore,
    conditions,
    recommendations,
    angles: {
      neckForwardAngle: Math.round(neckForwardAngle * 10) / 10,
      shoulderTiltAngle: Math.round(shoulderTiltAngle * 10) / 10,
      pelvisTiltAngle: Math.round(pelvisTiltAngle * 10) / 10,
      spineLateralDeviation: Math.round(spineLateralDeviation * 10) / 10,
      spineAngle: Math.round(spineAngle * 10) / 10,
    },
  }
}

// ══════════════════════════════════════════════
// ── 멀티뷰 분석 함수 (정면/측면/후면) ──
// ══════════════════════════════════════════════

function calculateThoracicKyphosis(pose3D: Pose3DResult): number {
  const angle = calculate3DAngle(pose3D, 'Spine1', 'Spine2', 'Spine3')
  return Math.abs(180 - angle)
}

function calculateLumbarLordosis(pose3D: Pose3DResult): number {
  const angle = calculate3DAngle(pose3D, 'Pelvis', 'Spine1', 'Spine2')
  return Math.abs(180 - angle)
}

function calculateScapulaAsymmetry(pose3D: Pose3DResult): number {
  const lShoulder = getJoint(pose3D, 'L_Shoulder')
  const rShoulder = getJoint(pose3D, 'R_Shoulder')
  if (!lShoulder || !rShoulder) return 0

  const dy = Math.abs(lShoulder.y - rShoulder.y)
  const dx = lShoulder.x - rShoulder.x
  const dz = lShoulder.z - rShoulder.z
  const horizontalDist = Math.sqrt(dx * dx + dz * dz)
  if (horizontalDist === 0) return 0
  return rad2deg(Math.atan2(dy, horizontalDist))
}

// ── 3D 무릎 관상면(좌우) 편차 각도 계산 ──
// 무릎이 고관절-발목 직선에서 좌우 방향으로 얼마나 벗어나는지 계산
// 시상면(전후) 굴곡은 제외, 좌표계 독립적
function calculateLegLateralDeviation(
  hip: Vec3, knee: Vec3, ankle: Vec3,
  bodyLR: Vec3
): number {
  // 다리 축: 고관절→발목
  const legDir = vec3Sub(ankle, hip)
  const legLen = vec3Length(legDir)
  if (legLen === 0) return 0
  const legUnit = { x: legDir.x / legLen, y: legDir.y / legLen, z: legDir.z / legLen }

  // 고관절→무릎 벡터
  const hipToKnee = vec3Sub(knee, hip)

  // 다리 축 방향 투영 (along-line component)
  const along = hipToKnee.x * legUnit.x + hipToKnee.y * legUnit.y + hipToKnee.z * legUnit.z

  // 수직 성분 (다리 축에서 벗어난 방향)
  const perp = {
    x: hipToKnee.x - along * legUnit.x,
    y: hipToKnee.y - along * legUnit.y,
    z: hipToKnee.z - along * legUnit.z,
  }

  // 수직 성분을 체축 좌우 방향으로 투영 → 관상면(varus/valgus) 편차만 추출
  const lateralDev = perp.x * bodyLR.x + perp.y * bodyLR.y + perp.z * bodyLR.z

  if (along <= 0) return 0
  return rad2deg(Math.atan2(Math.abs(lateralDev), along))
}

// ── 다리 정렬 분석 (정면 뷰) ──
interface LegAlignmentResult {
  type: LegType
  leftKneeAngle: number   // 왼쪽 관상면 무릎 편차 (°)
  rightKneeAngle: number  // 오른쪽 관상면 무릎 편차 (°)
  kneeGap: number
  ankleGap: number
}

function calculateLegAlignment(pose3D: Pose3DResult): LegAlignmentResult | null {
  const lHip = getJoint(pose3D, 'L_Hip')
  const rHip = getJoint(pose3D, 'R_Hip')
  const lKnee = getJoint(pose3D, 'L_Knee')
  const rKnee = getJoint(pose3D, 'R_Knee')
  const lAnkle = getJoint(pose3D, 'L_Ankle')
  const rAnkle = getJoint(pose3D, 'R_Ankle')

  if (!lHip || !rHip || !lKnee || !rKnee || !lAnkle || !rAnkle) return null

  // 체축 좌우 방향 (골반 기준) — 좌표계에 무관하게 좌우 벡터 정의
  const hipVec = vec3Sub(rHip, lHip)
  const hipDist = vec3Length(hipVec)
  if (hipDist === 0) return null
  const bodyLR = { x: hipVec.x / hipDist, y: hipVec.y / hipDist, z: hipVec.z / hipDist }

  // 3D 무릎 관상면 편차 (시상면 굴곡 제외)
  const leftDeviation = calculateLegLateralDeviation(lHip, lKnee, lAnkle, bodyLR)
  const rightDeviation = calculateLegLateralDeviation(rHip, rKnee, rAnkle, bodyLR)

  // 간격 비율 기반 내반슬/외반슬 판정 (좌우 방향 투영으로 좌표계 독립적)
  const kneeVec = vec3Sub(lKnee, rKnee)
  const ankleVec = vec3Sub(lAnkle, rAnkle)
  const kneeLR = Math.abs(kneeVec.x * bodyLR.x + kneeVec.y * bodyLR.y + kneeVec.z * bodyLR.z)
  const ankleLR = Math.abs(ankleVec.x * bodyLR.x + ankleVec.y * bodyLR.y + ankleVec.z * bodyLR.z)

  let type: LegType = 'normal'

  if (hipDist > 0) {
    const kneeRatio = kneeLR / hipDist
    const ankleRatio = ankleLR / hipDist
    const gapDiff = kneeRatio - ankleRatio

    if (gapDiff > 0.15) {
      type = 'o_legs' // 내반슬: 무릎이 더 벌어짐
    } else if (gapDiff < -0.15) {
      type = 'x_legs' // 외반슬: 무릎이 더 좁음
    }
  }

  return {
    type,
    leftKneeAngle: Math.round(leftDeviation * 10) / 10,
    rightKneeAngle: Math.round(rightDeviation * 10) / 10,
    kneeGap: Math.round(kneeLR * 1000) / 1000,
    ankleGap: Math.round(ankleLR * 1000) / 1000,
  }
}

// 두 벡터 사이의 각도 계산 (도 단위)
function calculate3DAngleFromVectors(v1: Vec3, v2: Vec3): number {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
  const len1 = vec3Length(v1)
  const len2 = vec3Length(v2)
  if (len1 === 0 || len2 === 0) return 180
  const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)))
  return rad2deg(Math.acos(cosAngle))
}

// ── 라운드숄더 분석 (측면 뷰) ──
interface ShoulderProtractionResult {
  angle: number
  isRoundShoulder: boolean
}

function calculateShoulderProtraction(pose3D: Pose3DResult): ShoulderProtractionResult {
  // 측면 뷰에서 어깨의 전방 돌출 정도를 측정
  // 귀(Head) - 어깨(Shoulder) - 골반(Pelvis) 수직선 기준
  const head = getJoint(pose3D, 'Head')
  const neck = getJoint(pose3D, 'Neck')
  const lShoulder = getJoint(pose3D, 'L_Shoulder')
  const rShoulder = getJoint(pose3D, 'R_Shoulder')
  const spine3 = getJoint(pose3D, 'Spine3')
  const pelvis = getJoint(pose3D, 'Pelvis')

  if (!head || !neck || !lShoulder || !rShoulder || !spine3 || !pelvis) {
    return { angle: 0, isRoundShoulder: false }
  }

  // 어깨 중심점
  const shoulderCenter: Vec3 = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2,
    z: (lShoulder.z + rShoulder.z) / 2,
  }

  // 측면에서 볼 때 수직 기준선: 귀에서 아래로 내린 수직선
  // 어깨가 이 선보다 앞(z축 양수 방향)에 있으면 라운드숄더
  // Z축 기준으로 어깨가 얼마나 앞으로 나와있는지 측정

  // 수직 기준: spine3에서 neck까지의 선을 기준으로 어깨의 z 위치 비교
  const spineVerticalZ = (spine3.z + neck.z) / 2

  // 어깨가 척추 중심선보다 얼마나 앞에 있는지 (z축 차이)
  const forwardOffset = shoulderCenter.z - spineVerticalZ

  // 상체 높이로 정규화하여 각도 계산
  const torsoHeight = Math.abs(neck.y - spine3.y)
  if (torsoHeight === 0) {
    return { angle: 0, isRoundShoulder: false }
  }

  // 전방 돌출 각도 (양수 = 앞으로 돌출)
  const protractionAngle = rad2deg(Math.atan2(forwardOffset, torsoHeight))

  // 10도 이상 앞으로 돌출되면 라운드숄더로 판정
  const isRoundShoulder = protractionAngle > 10

  return {
    angle: Math.round(Math.abs(protractionAngle) * 10) / 10,
    isRoundShoulder,
  }
}

// ── 정면 뷰 분석 ──
export function analyzeFrontView(pose3D: Pose3DResult): FrontViewMetrics {
  const shoulderTilt = calculateShoulderTiltAngle(pose3D)
  const pelvisTilt = calculatePelvisTiltAngle(pose3D)

  const lShoulder = getJoint(pose3D, 'L_Shoulder')
  const rShoulder = getJoint(pose3D, 'R_Shoulder')
  const lHip = getJoint(pose3D, 'L_Hip')
  const rHip = getJoint(pose3D, 'R_Hip')

  const shoulderDir =
    lShoulder && rShoulder
      ? Math.abs(lShoulder.y - rShoulder.y) < 0.005
        ? 'balanced' as const
        : lShoulder.y > rShoulder.y ? 'left' as const : 'right' as const
      : 'balanced' as const

  const pelvisDir =
    lHip && rHip
      ? Math.abs(lHip.y - rHip.y) < 0.005
        ? 'balanced' as const
        : lHip.y > rHip.y ? 'left' as const : 'right' as const
      : 'balanced' as const

  const shoulderLevel = determineRiskLevel(shoulderTilt, 3, 6)
  const pelvisLevel = determineRiskLevel(pelvisTilt, 5, 10)

  // 다리 정렬 분석
  const legAlignment = calculateLegAlignment(pose3D)
  let legRisk: Pose3DBodyPartRisk | undefined
  if (legAlignment) {
    // leftKneeAngle/rightKneeAngle는 정면 평면 편차 각도 (°)
    const deviationAngle = Math.round(((legAlignment.leftKneeAngle + legAlignment.rightKneeAngle) / 2) * 10) / 10

    const legLevel = determineRiskLevel(deviationAngle, 3, 7)
    const legTypeKo = legAlignment.type === 'o_legs' ? '내반슬(Varus)' : legAlignment.type === 'x_legs' ? '외반슬(Valgus)' : '정상'
    const legTypeEn = legAlignment.type === 'o_legs' ? 'Genu Varum' : legAlignment.type === 'x_legs' ? 'Genu Valgum' : 'Normal'

    legRisk = {
      name: 'Leg Alignment',
      nameKo: '다리 정렬',
      measuredValue: deviationAngle,
      unit: '°',
      threshold: { warning: 3, danger: 7 },
      level: legLevel,
      description:
        legAlignment.type === 'normal'
          ? 'Leg alignment is within normal range'
          : legAlignment.type === 'o_legs'
          ? `${legTypeEn} detected - knees bow outward`
          : `${legTypeEn} detected - knees angle inward`,
      descriptionKo:
        legAlignment.type === 'normal'
          ? '다리 정렬이 정상 범위입니다'
          : legAlignment.type === 'o_legs'
          ? `${legTypeKo} 감지 - 무릎이 바깥쪽으로 휘어있습니다`
          : `${legTypeKo} 감지 - 무릎이 안쪽으로 모여있습니다`,
    }
  }

  return {
    shoulderHeightDifference: Math.round(shoulderTilt * 10) / 10,
    shoulderTiltDirection: shoulderDir,
    pelvisHeightDifference: Math.round(pelvisTilt * 10) / 10,
    pelvisTiltDirection: pelvisDir,
    shoulderRisk: {
      name: 'Shoulder Height Difference',
      nameKo: '어깨 높이 차이',
      measuredValue: Math.round(shoulderTilt * 10) / 10,
      unit: '°',
      threshold: { warning: 3, danger: 6 },
      level: shoulderLevel,
      description:
        shoulderLevel === 'normal'
          ? 'Shoulder alignment is balanced'
          : shoulderLevel === 'warning'
          ? 'Slight shoulder imbalance detected'
          : 'Significant shoulder height difference',
      descriptionKo:
        shoulderLevel === 'normal'
          ? '어깨 높이가 균형 잡혀 있습니다'
          : shoulderLevel === 'warning'
          ? '약간의 어깨 불균형이 감지되었습니다'
          : '어깨 높이 차이가 큽니다',
    },
    pelvisRisk: {
      name: 'Pelvic Tilt',
      nameKo: '골반 틀어짐',
      measuredValue: Math.round(pelvisTilt * 10) / 10,
      unit: '°',
      threshold: { warning: 5, danger: 10 },
      level: pelvisLevel,
      description:
        pelvisLevel === 'normal'
          ? 'Pelvis alignment is within normal range'
          : pelvisLevel === 'warning'
          ? 'Slight pelvic tilt detected'
          : 'Significant pelvic misalignment',
      descriptionKo:
        pelvisLevel === 'normal'
          ? '골반 정렬이 정상 범위입니다'
          : pelvisLevel === 'warning'
          ? '약간의 골반 틀어짐이 감지되었습니다'
          : '골반 틀어짐이 심합니다',
    },
    legAlignment: legAlignment || undefined,
    legRisk,
  }
}

// ── 측면 뷰 분석 ──
export function analyzeSideView(pose3D: Pose3DResult): SideViewMetrics {
  const neckAngle = calculateNeckForwardAngle(pose3D)
  const kyphosis = calculateThoracicKyphosis(pose3D)
  const lordosis = calculateLumbarLordosis(pose3D)

  const neckLevel = determineRiskLevel(neckAngle, 15, 25)
  const kyphosisWarning = kyphosis > 10
  const lordosisWarning = lordosis > 10

  let spineClass: SideViewMetrics['spineClassification'] = 'normal'
  if (kyphosisWarning && lordosisWarning) spineClass = 'kyphosis_lordosis'
  else if (kyphosisWarning) spineClass = 'kyphosis'
  else if (lordosisWarning) spineClass = 'lordosis'
  else if (kyphosis < 3 && lordosis < 3) spineClass = 'flat_back'

  const spineValue = Math.max(kyphosis, lordosis)
  const spineLevel = determineRiskLevel(spineValue, 10, 20)

  const spineDesc = {
    normal: { en: 'Spine curvature is within normal range', ko: '척추 만곡이 정상 범위입니다' },
    kyphosis: { en: 'Increased thoracic kyphosis (rounded upper back)', ko: '흉추 후만 증가 (등이 굽음)' },
    lordosis: { en: 'Increased lumbar lordosis (excessive lower back curve)', ko: '요추 전만 증가 (허리 과도한 휨)' },
    kyphosis_lordosis: { en: 'Both thoracic kyphosis and lumbar lordosis increased', ko: '흉추 후만과 요추 전만이 모두 증가' },
    flat_back: { en: 'Decreased spinal curves (flat back)', ko: '척추 만곡 감소 (일자등)' },
  }

  // 라운드숄더 분석
  const shoulderProtraction = calculateShoulderProtraction(pose3D)
  const roundShoulderLevel = determineRiskLevel(shoulderProtraction.angle, 10, 20)
  const roundShoulderRisk: Pose3DBodyPartRisk = {
    name: 'Shoulder Protraction',
    nameKo: '어깨 전방 돌출',
    measuredValue: shoulderProtraction.angle,
    unit: '°',
    threshold: { warning: 10, danger: 20 },
    level: roundShoulderLevel,
    description:
      roundShoulderLevel === 'normal'
        ? 'Shoulder position is within normal range'
        : roundShoulderLevel === 'warning'
        ? 'Slight forward shoulder posture (round shoulder) detected'
        : 'Significant round shoulder - shoulders are protruding forward',
    descriptionKo:
      roundShoulderLevel === 'normal'
        ? '어깨 위치가 정상 범위입니다'
        : roundShoulderLevel === 'warning'
        ? '약간의 라운드숄더(어깨 전방 돌출)가 감지되었습니다'
        : '심한 라운드숄더 - 어깨가 많이 앞으로 나와있습니다',
  }

  const thoracicKyphosisLevel = determineRiskLevel(kyphosis, 25, 40)
  const lumbarLordosisLevel = determineRiskLevel(lordosis, 25, 40)

  return {
    neckForwardAngle: Math.round(neckAngle * 10) / 10,
    thoracicKyphosisAngle: Math.round(kyphosis * 10) / 10,
    lumbarLordosisAngle: Math.round(lordosis * 10) / 10,
    spineClassification: spineClass,
    neckRisk: {
      name: 'Forward Head Posture',
      nameKo: '머리 전방 이동',
      measuredValue: Math.round(neckAngle * 10) / 10,
      unit: '°',
      threshold: { warning: 15, danger: 25 },
      level: neckLevel,
      description:
        neckLevel === 'normal'
          ? 'Neck alignment is within normal range'
          : neckLevel === 'warning'
          ? 'Slight forward head posture detected'
          : 'Significant forward head posture - turtle neck risk',
      descriptionKo:
        neckLevel === 'normal'
          ? '목 정렬이 정상 범위입니다'
          : neckLevel === 'warning'
          ? '약간의 머리 전방 이동이 감지되었습니다'
          : '심한 머리 전방 이동 - 거북목 증후군 위험',
    },
    spineRisk: {
      name: 'Spine Curvature',
      nameKo: '척추 만곡',
      measuredValue: Math.round(spineValue * 10) / 10,
      unit: '°',
      threshold: { warning: 10, danger: 20 },
      level: spineLevel,
      description: spineDesc[spineClass].en,
      descriptionKo: spineDesc[spineClass].ko,
    },
    thoracicKyphosisRisk: {
      name: 'Thoracic Kyphosis',
      nameKo: '흉추 후만',
      measuredValue: Math.round(kyphosis * 10) / 10,
      unit: '°',
      threshold: { warning: 25, danger: 40 },
      level: thoracicKyphosisLevel,
      description:
        thoracicKyphosisLevel === 'normal'
          ? 'Thoracic curvature is within normal range'
          : thoracicKyphosisLevel === 'warning'
          ? 'Mild increase in thoracic kyphosis detected'
          : 'Significant thoracic kyphosis - rounded upper back',
      descriptionKo:
        thoracicKyphosisLevel === 'normal'
          ? '흉추 후만이 정상 범위입니다'
          : thoracicKyphosisLevel === 'warning'
          ? '흉추 후만이 약간 증가되었습니다'
          : '흉추 후만이 심합니다 - 등이 과도하게 굽음',
    },
    lumbarLordosisRisk: {
      name: 'Lumbar Lordosis',
      nameKo: '요추 전만',
      measuredValue: Math.round(lordosis * 10) / 10,
      unit: '°',
      threshold: { warning: 25, danger: 40 },
      level: lumbarLordosisLevel,
      description:
        lumbarLordosisLevel === 'normal'
          ? 'Lumbar curvature is within normal range'
          : lumbarLordosisLevel === 'warning'
          ? 'Mild increase in lumbar lordosis detected'
          : 'Significant lumbar lordosis - excessive lower back curve',
      descriptionKo:
        lumbarLordosisLevel === 'normal'
          ? '요추 전만이 정상 범위입니다'
          : lumbarLordosisLevel === 'warning'
          ? '요추 전만이 약간 증가되었습니다'
          : '요추 전만이 심합니다 - 허리가 과도하게 휨',
    },
    shoulderProtraction,
    roundShoulderRisk,
  }
}

// ── 후면 뷰 분석 ──
// frontShoulderTilt: 정면 뷰의 어깨 기울기 (°). 후면 ONNX 3D 좌표가 부정확하므로
// 정면에서 측정한 어깨 기울기를 견갑골 높이 차이로 대체 사용.
export function analyzeBackView(pose3D: Pose3DResult, frontShoulderTilt?: number): BackViewMetrics {
  const spineDev = calculateSpineLateralDeviation(pose3D)
  // 정면 어깨 기울기가 있으면 우선 사용 (후면 3D 좌표 부정확 회피)
  const scapulaAsym = frontShoulderTilt !== undefined ? frontShoulderTilt : calculateScapulaAsymmetry(pose3D)

  const pelvis = getJoint(pose3D, 'Pelvis')
  const spine2 = getJoint(pose3D, 'Spine2')
  const neck = getJoint(pose3D, 'Neck')

  let scoliosisDir: 'left' | 'right' | 'none' = 'none'
  if (pelvis && neck && spine2) {
    const midX = (pelvis.x + neck.x) / 2
    if (spine2.x < midX - 0.01) scoliosisDir = 'left'
    else if (spine2.x > midX + 0.01) scoliosisDir = 'right'
  }

  const spineLevel = determineRiskLevel(spineDev, 3, 7)
  const scapulaLevel = determineRiskLevel(scapulaAsym, 3, 6)

  return {
    spineLateralDeviation: Math.round(spineDev * 10) / 10,
    scoliosisDirection: scoliosisDir,
    scapulaAsymmetry: Math.round(scapulaAsym * 10) / 10,
    spineRisk: {
      name: 'Spine Lateral Deviation',
      nameKo: '척추 측면 편차',
      measuredValue: Math.round(spineDev * 10) / 10,
      unit: '°',
      threshold: { warning: 3, danger: 7 },
      level: spineLevel,
      description:
        spineLevel === 'normal'
          ? 'Spine lateral deviation is within normal range'
          : spineLevel === 'warning'
          ? 'Slight spine lateral deviation detected'
          : 'Significant spine lateral deviation',
      descriptionKo:
        spineLevel === 'normal'
          ? '척추 측면 편차가 정상 범위입니다'
          : spineLevel === 'warning'
          ? '약간의 척추 측면 편차가 감지되었습니다'
          : '척추 측면 편차가 큽니다',
    },
    scapulaRisk: {
      name: 'Scapula Height Difference',
      nameKo: '견갑골 높이 차이',
      measuredValue: Math.round(scapulaAsym * 10) / 10,
      unit: '°',
      threshold: { warning: 3, danger: 6 },
      level: scapulaLevel,
      description:
        scapulaLevel === 'normal'
          ? 'Left-right scapula height difference is within normal range'
          : scapulaLevel === 'warning'
          ? 'Slight left-right scapula height difference detected'
          : 'Significant scapula height asymmetry',
      descriptionKo:
        scapulaLevel === 'normal'
          ? '좌우 견갑골 높이 차이가 정상 범위입니다'
          : scapulaLevel === 'warning'
          ? '좌우 견갑골 높이에 약간의 차이가 감지되었습니다'
          : '좌우 견갑골 높이 차이가 큽니다',
    },
  }
}

// ── 멀티뷰 종합 분석 ──
export function analyzeMultiView(
  frontPose3D: Pose3DResult | null,
  sidePose3D: Pose3DResult | null,
  backPose3D: Pose3DResult | null,
): MultiView3DAnalysisResult {
  let frontMetrics: ReturnType<typeof analyzeFrontView> | null = null
  let sideMetrics: ReturnType<typeof analyzeSideView> | null = null
  let backMetrics: ReturnType<typeof analyzeBackView> | null = null

  if (frontPose3D) {
    try { frontMetrics = analyzeFrontView(frontPose3D) } catch (e) { console.warn('Front view analysis failed:', e) }
  }
  if (sidePose3D) {
    try { sideMetrics = analyzeSideView(sidePose3D) } catch (e) { console.warn('Side view analysis failed:', e) }
  }
  if (backPose3D) {
    try { backMetrics = analyzeBackView(backPose3D, frontMetrics?.shoulderHeightDifference) } catch (e) { console.warn('Back view analysis failed:', e) }
  }

  const frontScore = frontMetrics
    ? Math.round((riskToScore(frontMetrics.shoulderRisk.level) + riskToScore(frontMetrics.pelvisRisk.level)) / 2)
    : null
  const sideScore = sideMetrics
    ? Math.round((riskToScore(sideMetrics.neckRisk.level) + riskToScore(sideMetrics.spineRisk.level)) / 2)
    : null
  const backScore = backMetrics
    ? Math.round((riskToScore(backMetrics.spineRisk.level) + riskToScore(backMetrics.scapulaRisk.level)) / 2)
    : null

  const weights = { front: 0.30, side: 0.40, back: 0.30 }
  let totalWeight = 0
  let weightedSum = 0
  if (frontScore !== null) { weightedSum += frontScore * weights.front; totalWeight += weights.front }
  if (sideScore !== null) { weightedSum += sideScore * weights.side; totalWeight += weights.side }
  if (backScore !== null) { weightedSum += backScore * weights.back; totalWeight += weights.back }
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0

  const conditions: PredictedCondition[] = []

  if (frontMetrics) {
    if (frontMetrics.shoulderRisk.level !== 'normal') {
      const val = frontMetrics.shoulderHeightDifference
      const advice = frontMetrics.shoulderRisk.level === 'danger'
        ? 'Professional consultation recommended'
        : 'Balance improvement needed'
      const adviceKo = frontMetrics.shoulderRisk.level === 'danger'
        ? '전문가 상담을 권장합니다'
        : '좌우 균형 개선이 필요합니다'
      conditions.push({
        name: `Shoulder Tilt ${val}° (Normal: 0~3°)`,
        nameKo: `어깨 기울기 ${val}° (정상: 0~3°)`,
        probability: frontMetrics.shoulderRisk.level === 'danger' ? 80 : 50,
        severity: frontMetrics.shoulderRisk.level === 'danger' ? 'high' : 'medium',
        description: `${advice} — One shoulder is ${val}° higher than the other.`,
        descriptionKo: `${adviceKo} — 한쪽 어깨가 ${val}° 높습니다.`,
        relatedParts: ['shoulders'],
      })
    }
    if (frontMetrics.pelvisRisk.level !== 'normal') {
      const val = frontMetrics.pelvisHeightDifference
      const advice = frontMetrics.pelvisRisk.level === 'danger'
        ? 'Professional consultation recommended'
        : 'Balance improvement needed'
      const adviceKo = frontMetrics.pelvisRisk.level === 'danger'
        ? '전문가 상담을 권장합니다'
        : '좌우 균형 개선이 필요합니다'
      conditions.push({
        name: `Pelvis Tilt ${val}° (Normal: 0~3°)`,
        nameKo: `골반 기울기 ${val}° (정상: 0~3°)`,
        probability: frontMetrics.pelvisRisk.level === 'danger' ? 80 : 50,
        severity: frontMetrics.pelvisRisk.level === 'danger' ? 'high' : 'medium',
        description: `${advice} — Pelvis is tilted ${val}° from horizontal.`,
        descriptionKo: `${adviceKo} — 골반이 수평에서 ${val}° 기울어져 있습니다.`,
        relatedParts: ['pelvis'],
      })
    }
    // 다리 정렬 이상 조건 추가
    if (frontMetrics.legAlignment && frontMetrics.legAlignment.type !== 'normal') {
      const isOLegs = frontMetrics.legAlignment.type === 'o_legs'
      const deviation = ((frontMetrics.legAlignment.leftKneeAngle + frontMetrics.legAlignment.rightKneeAngle) / 2).toFixed(1)
      const normalRange = '0~3°'
      const typeKo = isOLegs ? '내반슬' : '외반슬'
      const typeEn = isOLegs ? 'Genu Varum' : 'Genu Valgum'
      const adviceKo = isOLegs ? '내전근 강화 운동이 필요합니다' : '외전근 강화 운동이 필요합니다'
      conditions.push({
        name: `Leg Alignment Deviation ${deviation}° (Normal: ${normalRange}) — ${typeEn}`,
        nameKo: `다리 정렬 편차 ${deviation}° (정상: ${normalRange}) — ${typeKo}`,
        probability: 65,
        severity: 'medium',
        description: isOLegs
          ? `${typeEn} — Knees bow outward, increasing joint stress.`
          : `${typeEn} — Knees angle inward, increasing joint stress.`,
        descriptionKo: isOLegs
          ? `${typeKo} 감지 — ${adviceKo}`
          : `${typeKo} 감지 — ${adviceKo}`,
        relatedParts: ['legs', 'knees'],
      })
    }
  }

  if (sideMetrics) {
    if (sideMetrics.neckRisk.level !== 'normal') {
      const val = sideMetrics.neckForwardAngle
      const adviceKo = sideMetrics.neckRisk.level === 'danger'
        ? '전문가 상담을 권장합니다'
        : '목 스트레칭이 필요합니다'
      conditions.push({
        name: `Neck Forward Tilt ${val}° (Normal: 0~15°)`,
        nameKo: `목 전방 기울기 ${val}° (정상: 0~15°)`,
        probability: sideMetrics.neckRisk.level === 'danger' ? 85 : 55,
        severity: sideMetrics.neckRisk.level === 'danger' ? 'high' : 'medium',
        description: sideMetrics.neckRisk.level === 'danger'
          ? 'Professional consultation recommended — Head is positioned significantly forward.'
          : 'Neck stretching needed — Head is positioned forward of the shoulder line.',
        descriptionKo: `${adviceKo} — 머리가 어깨 라인보다 앞으로 ${val}° 나와 있습니다.`,
        relatedParts: ['neck'],
      })
    }
    if (sideMetrics.spineRisk.level !== 'normal') {
      const val = sideMetrics.spineRisk.measuredValue
      const classKo = sideMetrics.spineClassification === 'kyphosis' ? '후만' :
        sideMetrics.spineClassification === 'lordosis' ? '전만' :
        sideMetrics.spineClassification === 'kyphosis_lordosis' ? '후만+전만' :
        sideMetrics.spineClassification === 'flat_back' ? '일자등' : ''
      const adviceKo = sideMetrics.spineRisk.level === 'danger'
        ? '전문가 상담을 권장합니다'
        : '정상 범위를 초과했습니다'
      conditions.push({
        name: `Spine Curvature ${val}° (Normal: 0~10°)`,
        nameKo: `척추 만곡 ${val}° (정상: 0~10°)`,
        probability: sideMetrics.spineRisk.level === 'danger' ? 75 : 45,
        severity: sideMetrics.spineRisk.level === 'danger' ? 'high' : 'medium',
        description: sideMetrics.spineRisk.level === 'danger'
          ? 'Professional consultation recommended — Significant spinal curvature detected.'
          : 'Exceeds normal range — Spinal curvature detected from side view.',
        descriptionKo: `${adviceKo} — ${classKo} 형태의 척추 만곡이 감지되었습니다.`,
        relatedParts: ['spine'],
      })
    }
    // 라운드숄더 조건 추가
    if (sideMetrics.roundShoulderRisk && sideMetrics.roundShoulderRisk.level !== 'normal') {
      const val = sideMetrics.shoulderProtraction?.angle ?? sideMetrics.roundShoulderRisk.measuredValue
      const adviceKo = sideMetrics.roundShoulderRisk.level === 'danger'
        ? '전문가 상담을 권장합니다'
        : '가슴 스트레칭이 필요합니다'
      conditions.push({
        name: `Shoulder Forward ${val}° (Normal: 0~10°)`,
        nameKo: `어깨 전방 돌출 ${val}° (정상: 0~10°)`,
        probability: sideMetrics.roundShoulderRisk.level === 'danger' ? 80 : 50,
        severity: sideMetrics.roundShoulderRisk.level === 'danger' ? 'high' : 'medium',
        description: sideMetrics.roundShoulderRisk.level === 'danger'
          ? 'Professional consultation recommended — Shoulders are significantly protruding forward.'
          : 'Chest stretching needed — Shoulders are protruding forward.',
        descriptionKo: `${adviceKo} — 어깨가 ${val}° 앞으로 돌출되어 있습니다.`,
        relatedParts: ['shoulders'],
      })
    }
  }

  if (backMetrics) {
    if (backMetrics.spineRisk.level !== 'normal') {
      const val = backMetrics.spineLateralDeviation
      const dir = backMetrics.scoliosisDirection === 'left' ? '좌측' : backMetrics.scoliosisDirection === 'right' ? '우측' : ''
      const adviceKo = backMetrics.spineRisk.level === 'danger'
        ? '전문가 상담을 권장합니다'
        : '코어 강화 운동이 필요합니다'
      conditions.push({
        name: `Spine Lateral Deviation ${val}° (Normal: 0~5°)`,
        nameKo: `척추 측면 편차 ${val}° (정상: 0~5°)`,
        probability: backMetrics.spineRisk.level === 'danger' ? 75 : 45,
        severity: backMetrics.spineRisk.level === 'danger' ? 'high' : 'medium',
        description: backMetrics.spineRisk.level === 'danger'
          ? 'Professional consultation recommended — Significant lateral curvature detected.'
          : 'Core strengthening needed — Lateral spinal curvature detected.',
        descriptionKo: `${adviceKo} — 척추가 ${dir}으로 ${val}° 휘어있습니다.`,
        relatedParts: ['spine'],
      })
    }
    if (backMetrics.scapulaRisk.level !== 'normal') {
      const val = backMetrics.scapulaAsymmetry
      const adviceKo = backMetrics.scapulaRisk.level === 'danger'
        ? '전문가 상담을 권장합니다'
        : '어깨 균형 운동이 필요합니다'
      conditions.push({
        name: `Scapula Height Difference ${val}° (Normal: 0~3°)`,
        nameKo: `견갑골 높이차 ${val}° (정상: 0~3°)`,
        probability: backMetrics.scapulaRisk.level === 'danger' ? 70 : 40,
        severity: backMetrics.scapulaRisk.level === 'danger' ? 'high' : 'medium',
        description: backMetrics.scapulaRisk.level === 'danger'
          ? 'Professional consultation recommended — Significant scapula asymmetry.'
          : 'Shoulder balance exercises needed — Scapula positions are asymmetrical.',
        descriptionKo: `${adviceKo} — 좌우 견갑골 높이 차이가 ${val}° 입니다.`,
        relatedParts: ['scapula'],
      })
    }
  }

  // 상부 복합 이상: 거북목 + (어깨 불균형 또는 라운드숄더)
  const hasForwardHead = sideMetrics?.neckRisk.level !== 'normal'
  const hasShoulderIssue = frontMetrics?.shoulderRisk.level !== 'normal'
  const hasRoundShoulder = sideMetrics?.roundShoulderRisk?.level !== 'normal'

  if (hasForwardHead && (hasShoulderIssue || hasRoundShoulder)) {
    const neckVal = sideMetrics?.neckForwardAngle ?? 0
    const shoulderVal = sideMetrics?.shoulderProtraction?.angle ?? 0
    conditions.push({
      name: `Upper Body Complex: Neck ${neckVal}° + Shoulder ${shoulderVal}°`,
      nameKo: `상부 복합 이상: 목 ${neckVal}° + 어깨 ${shoulderVal}°`,
      probability: hasForwardHead && hasRoundShoulder ? 75 : 60,
      severity: hasForwardHead && hasRoundShoulder ? 'high' : 'medium',
      description: 'Combined neck and shoulder issues detected — Professional consultation recommended.',
      descriptionKo: '목과 어깨 문제가 동반됩니다 — 전문가 상담을 권장합니다.',
      relatedParts: ['neck', 'shoulders'],
    })
  }

  if (frontMetrics?.pelvisRisk.level !== 'normal' && backMetrics?.spineRisk.level !== 'normal') {
    const pelvisVal = frontMetrics?.pelvisHeightDifference ?? 0
    const spineVal = backMetrics?.spineLateralDeviation ?? 0
    conditions.push({
      name: `Lower Body Complex: Pelvis ${pelvisVal}° + Spine ${spineVal}°`,
      nameKo: `하부 복합 이상: 골반 ${pelvisVal}° + 척추 ${spineVal}°`,
      probability: 55, severity: 'medium',
      description: 'Combined pelvis and spine issues detected — Balance improvement needed.',
      descriptionKo: '골반 기울기와 척추 만곡이 동반됩니다 — 균형 개선이 필요합니다.',
      relatedParts: ['pelvis', 'spine'],
    })
  }

  if (frontMetrics?.shoulderRisk.level !== 'normal' && backMetrics?.spineRisk.level !== 'normal') {
    const shoulderVal = frontMetrics?.shoulderHeightDifference ?? 0
    const spineVal = backMetrics?.spineLateralDeviation ?? 0
    conditions.push({
      name: `Shoulder-Spine Complex: ${shoulderVal}° + ${spineVal}°`,
      nameKo: `어깨-척추 복합 이상: 어깨 ${shoulderVal}° + 척추 ${spineVal}°`,
      probability: 50, severity: 'medium',
      description: 'Shoulder imbalance with spinal curvature detected — Professional assessment recommended.',
      descriptionKo: '어깨 불균형과 척추 측면 편차가 동반됩니다 — 전문 평가를 권장합니다.',
      relatedParts: ['shoulders', 'spine'],
    })
  }

  conditions.sort((a, b) => b.probability - a.probability)

  const recommendations: Recommendation3D[] = []

  if (sideMetrics?.neckRisk.level !== 'normal') {
    recommendations.push({
      title: 'Neck Stretching & Strengthening', titleKo: '목 스트레칭 & 강화 운동',
      description: 'Reduce forward head posture by strengthening deep neck flexors.',
      descriptionKo: '심부 목 굴곡근을 강화하여 거북목을 교정합니다.',
      exercises: [
        { id: 'chin_tuck', name: 'Chin Tucks', nameKo: '턱 당기기' },
        { id: 'neck_stretch', name: 'Neck Stretch', nameKo: '목 스트레칭' },
        { id: 'upper_trap_stretch', name: 'Upper Trapezius Stretch', nameKo: '상부 승모근 스트레칭' },
      ],
      priority: sideMetrics?.neckRisk.level === 'danger' ? 'high' : 'medium',
    })
  }

  if (frontMetrics?.shoulderRisk.level !== 'normal' || backMetrics?.scapulaRisk.level !== 'normal') {
    recommendations.push({
      title: 'Shoulder Balance Exercises', titleKo: '어깨 균형 운동',
      description: 'Correct shoulder and scapula imbalance through targeted exercises.',
      descriptionKo: '어깨와 견갑골 불균형을 교정하는 맞춤 운동입니다.',
      exercises: [
        { id: 'wall_slide', name: 'Wall Slide', nameKo: '월 슬라이드' },
        { id: 'chest_stretch', name: 'Chest Stretch', nameKo: '가슴 스트레칭' },
        { id: 'upper_trap_stretch', name: 'Upper Trapezius Stretch', nameKo: '상부 승모근 스트레칭' },
      ],
      priority:
        frontMetrics?.shoulderRisk.level === 'danger' || backMetrics?.scapulaRisk.level === 'danger'
          ? 'high' : 'medium',
    })
  }

  if (frontMetrics?.pelvisRisk.level !== 'normal') {
    recommendations.push({
      title: 'Pelvic Alignment Exercises', titleKo: '골반 교정 운동',
      description: 'Restore pelvic alignment through core stabilization.',
      descriptionKo: '코어 안정화 운동으로 골반 정렬을 회복합니다.',
      exercises: [
        { id: 'pelvic_tilt', name: 'Pelvic Tilt', nameKo: '골반 기울이기' },
        { id: 'clamshell', name: 'Clamshell', nameKo: '클램쉘' },
        { id: 'bridge', name: 'Glute Bridge', nameKo: '힙 브릿지' },
      ],
      priority: frontMetrics?.pelvisRisk.level === 'danger' ? 'high' : 'medium',
    })
  }

  if (sideMetrics?.spineRisk.level !== 'normal' || backMetrics?.spineRisk.level !== 'normal') {
    recommendations.push({
      title: 'Spinal Alignment Exercises', titleKo: '척추 정렬 운동',
      description: 'Address spinal curvature through stretching and strengthening.',
      descriptionKo: '척추 만곡을 교정하기 위한 스트레칭과 강화 운동입니다.',
      exercises: [
        { id: 'cat_cow', name: 'Cat-Cow Stretch', nameKo: '고양이-소 스트레칭' },
        { id: 'plank', name: 'Plank', nameKo: '플랭크' },
        { id: 'dead_bug', name: 'Dead Bug', nameKo: '데드버그' },
      ],
      priority:
        sideMetrics?.spineRisk.level === 'danger' || backMetrics?.spineRisk.level === 'danger'
          ? 'high' : 'medium',
    })
  }

  // 라운드숄더 추천 운동
  if (sideMetrics?.roundShoulderRisk?.level !== 'normal') {
    recommendations.push({
      title: 'Round Shoulder Correction', titleKo: '라운드숄더 교정 운동',
      description: 'Stretch tight chest muscles and strengthen upper back to correct forward shoulder posture.',
      descriptionKo: '긴장된 가슴 근육을 스트레칭하고 상부 등을 강화하여 어깨 전방 돌출을 교정합니다.',
      exercises: [
        { id: 'chest_stretch', name: 'Chest Stretch', nameKo: '가슴 스트레칭' },
        { id: 'wall_slide', name: 'Wall Slide', nameKo: '월 슬라이드' },
        { id: 'upper_trap_stretch', name: 'Upper Trapezius Stretch', nameKo: '상부 승모근 스트레칭' },
      ],
      priority: sideMetrics?.roundShoulderRisk?.level === 'danger' ? 'high' : 'medium',
    })
  }

  // 하지 정렬 교정 추천 운동
  if (frontMetrics?.legAlignment && frontMetrics.legAlignment.type !== 'normal') {
    const isOLegs = frontMetrics.legAlignment.type === 'o_legs'
    const typeKo = isOLegs ? '내반슬' : '외반슬'
    const typeEn = isOLegs ? 'Genu Varum' : 'Genu Valgum'
    recommendations.push({
      title: `Lower Limb Alignment Correction (${typeEn})`,
      titleKo: `하지 정렬 교정 운동 (${typeKo})`,
      description: isOLegs
        ? 'Strengthen inner thighs and stretch outer hip muscles to correct genu varum.'
        : 'Strengthen outer hip muscles and stretch inner thighs to correct genu valgum.',
      descriptionKo: isOLegs
        ? '내전근을 강화하고 외측 고관절 근육을 스트레칭하여 내반슬을 교정합니다.'
        : '외측 고관절 근육을 강화하고 내전근을 스트레칭하여 외반슬을 교정합니다.',
      exercises: isOLegs
        ? [
            { id: 'clamshell', name: 'Clamshell', nameKo: '클램쉘' },
            { id: 'it_band_stretch', name: 'IT Band Stretch', nameKo: 'IT밴드 스트레칭' },
            { id: 'side_lunge', name: 'Side Lunge', nameKo: '사이드 런지' },
          ]
        : [
            { id: 'hip_abduction', name: 'Hip Abduction', nameKo: '힙 어브덕션' },
            { id: 'clamshell', name: 'Clamshell', nameKo: '클램쉘' },
            { id: 'bridge', name: 'Glute Bridge', nameKo: '힙 브릿지' },
          ],
      priority: 'medium',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Maintain Good Posture', titleKo: '좋은 자세 유지',
      description: 'Your multi-view posture analysis shows good alignment.',
      descriptionKo: '멀티뷰 자세 분석 결과 좋은 정렬 상태입니다.',
      exercises: [
        { id: 'plank', name: 'Plank', nameKo: '플랭크' },
        { id: 'dead_bug', name: 'Dead Bug', nameKo: '데드버그' },
        { id: 'cat_cow', name: 'Cat-Cow Stretch', nameKo: '고양이-소 스트레칭' },
      ],
      priority: 'low',
    })
  }

  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return {
    frontMetrics,
    sideMetrics,
    backMetrics,
    overallScore,
    frontScore,
    sideScore,
    backScore,
    conditions,
    recommendations,
  }
}
