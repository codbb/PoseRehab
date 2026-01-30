import type { Landmark, PostureAnalysisResult, BodyPartAnalysis, PostureType } from '@/types/posture'
import {
  calculateHeadForwardAngle,
  calculateShoulderAlignment,
  calculateSpineCurvature,
  calculatePelvisTilt,
  calculateKneeAlignment,
  calculateBodyBalance,
} from './angle-calculator'
import { generateId } from '@/lib/utils'

function scoreToStatus(score: number): 'good' | 'warning' | 'poor' {
  if (score >= 80) return 'good'
  if (score >= 60) return 'warning'
  return 'poor'
}

function normalizeAngle(angle: number, ideal: number, tolerance: number): number {
  const deviation = Math.abs(angle - ideal)
  const score = Math.max(0, 100 - (deviation / tolerance) * 100)
  return Math.min(100, score)
}

export function analyzePosture(
  landmarks: Landmark[],
  direction: 'front' | 'side' | 'back' = 'front'
): PostureAnalysisResult {
  const postureTypes: PostureType[] = []

  // Head analysis
  const headForwardAngle = calculateHeadForwardAngle(landmarks)
  const headScore = normalizeAngle(headForwardAngle, 0, 30)
  if (headForwardAngle > 15) {
    postureTypes.push('forward_head')
  }

  const headAnalysis: BodyPartAnalysis = {
    name: 'Head',
    nameKo: '머리',
    score: headScore,
    angle: headForwardAngle,
    idealAngle: 0,
    deviation: headForwardAngle,
    status: scoreToStatus(headScore),
    feedback: headScore >= 80
      ? 'Head position is good'
      : headScore >= 60
      ? 'Slight forward head posture detected'
      : 'Significant forward head posture - consider neck exercises',
    feedbackKo: headScore >= 80
      ? '머리 위치가 좋습니다'
      : headScore >= 60
      ? '약간의 거북목 자세가 감지되었습니다'
      : '심한 거북목 자세 - 목 운동을 권장합니다',
  }

  // Shoulder analysis
  const shoulderData = calculateShoulderAlignment(landmarks)
  const shoulderHeightScore = normalizeAngle(shoulderData.heightDiff * 100, 0, 10)
  const shoulderForwardScore = normalizeAngle(shoulderData.forwardAngle, 90, 30)
  const shoulderScore = (shoulderHeightScore + shoulderForwardScore) / 2

  if (shoulderData.forwardAngle < 80) {
    postureTypes.push('rounded_shoulders')
  }

  const shoulderAnalysis: BodyPartAnalysis = {
    name: 'Shoulders',
    nameKo: '어깨',
    score: shoulderScore,
    angle: shoulderData.forwardAngle,
    idealAngle: 90,
    deviation: Math.abs(shoulderData.heightDiff * 100),
    status: scoreToStatus(shoulderScore),
    feedback: shoulderScore >= 80
      ? 'Shoulder alignment is good'
      : shoulderScore >= 60
      ? 'Slight shoulder imbalance detected'
      : 'Significant shoulder issues - consider shoulder exercises',
    feedbackKo: shoulderScore >= 80
      ? '어깨 정렬이 좋습니다'
      : shoulderScore >= 60
      ? '약간의 어깨 불균형이 감지되었습니다'
      : '어깨 문제가 심각함 - 어깨 운동을 권장합니다',
  }

  // Spine analysis
  const spineData = calculateSpineCurvature(landmarks)
  const lateralScore = normalizeAngle(Math.abs(spineData.lateralDeviation) * 100, 0, 5)
  const kyphosisScore = normalizeAngle(spineData.kyphosisAngle, 170, 30)
  const lordosisScore = normalizeAngle(spineData.lordosisAngle, 170, 30)
  const spineScore = (lateralScore + kyphosisScore + lordosisScore) / 3

  if (Math.abs(spineData.lateralDeviation) > 0.05) {
    postureTypes.push('scoliosis')
  }
  if (spineData.kyphosisAngle < 150) {
    postureTypes.push('kyphosis')
  }
  if (spineData.lordosisAngle < 150) {
    postureTypes.push('lordosis')
  }

  const spineAnalysis: BodyPartAnalysis = {
    name: 'Spine',
    nameKo: '척추',
    score: spineScore,
    angle: spineData.kyphosisAngle,
    idealAngle: 170,
    deviation: Math.abs(spineData.lateralDeviation) * 100,
    status: scoreToStatus(spineScore),
    feedback: spineScore >= 80
      ? 'Spine alignment is good'
      : spineScore >= 60
      ? 'Slight spine curvature detected'
      : 'Spine alignment needs attention',
    feedbackKo: spineScore >= 80
      ? '척추 정렬이 좋습니다'
      : spineScore >= 60
      ? '약간의 척추 만곡이 감지되었습니다'
      : '척추 정렬에 주의가 필요합니다',
  }

  // Pelvis analysis
  const pelvisData = calculatePelvisTilt(landmarks)
  const pelvisLateralScore = normalizeAngle(Math.abs(pelvisData.lateralTilt) * 100, 0, 5)
  const pelvisAnteriorScore = normalizeAngle(pelvisData.anteriorTilt, 170, 30)
  const pelvisScore = (pelvisLateralScore + pelvisAnteriorScore) / 2

  if (Math.abs(pelvisData.lateralTilt) > 0.05 || pelvisData.anteriorTilt < 150) {
    postureTypes.push('pelvic_tilt')
  }

  const pelvisAnalysis: BodyPartAnalysis = {
    name: 'Pelvis',
    nameKo: '골반',
    score: pelvisScore,
    angle: pelvisData.anteriorTilt,
    idealAngle: 170,
    deviation: Math.abs(pelvisData.lateralTilt) * 100,
    status: scoreToStatus(pelvisScore),
    feedback: pelvisScore >= 80
      ? 'Pelvis alignment is good'
      : pelvisScore >= 60
      ? 'Slight pelvis tilt detected'
      : 'Pelvis alignment needs attention',
    feedbackKo: pelvisScore >= 80
      ? '골반 정렬이 좋습니다'
      : pelvisScore >= 60
      ? '약간의 골반 기울기가 감지되었습니다'
      : '골반 정렬에 주의가 필요합니다',
  }

  // Knee analysis
  const kneeData = calculateKneeAlignment(landmarks)
  const kneeAngleScore = (normalizeAngle(kneeData.leftKneeAngle, 180, 20) +
    normalizeAngle(kneeData.rightKneeAngle, 180, 20)) / 2
  const valgusScore = normalizeAngle(Math.abs(kneeData.valgusAngle) * 100, 0, 5)
  const kneeScore = (kneeAngleScore + valgusScore) / 2

  if (kneeData.valgusAngle < -0.03) {
    postureTypes.push('bow_legs')
  } else if (kneeData.valgusAngle > 0.03) {
    postureTypes.push('knock_knees')
  }

  const kneeAnalysis: BodyPartAnalysis = {
    name: 'Knees',
    nameKo: '무릎',
    score: kneeScore,
    angle: (kneeData.leftKneeAngle + kneeData.rightKneeAngle) / 2,
    idealAngle: 180,
    deviation: Math.abs(kneeData.valgusAngle) * 100,
    status: scoreToStatus(kneeScore),
    feedback: kneeScore >= 80
      ? 'Knee alignment is good'
      : kneeScore >= 60
      ? 'Slight knee misalignment detected'
      : 'Knee alignment needs attention',
    feedbackKo: kneeScore >= 80
      ? '무릎 정렬이 좋습니다'
      : kneeScore >= 60
      ? '약간의 무릎 불균형이 감지되었습니다'
      : '무릎 정렬에 주의가 필요합니다',
  }

  // Calculate overall score
  const overallScore = Math.round(
    (headScore * 0.2 +
      shoulderScore * 0.2 +
      spineScore * 0.25 +
      pelvisScore * 0.2 +
      kneeScore * 0.15)
  )

  // Determine posture type if normal
  if (postureTypes.length === 0) {
    postureTypes.push('normal')
  }

  // Generate potential conditions based on posture types
  const potentialConditions = postureTypes
    .filter((type) => type !== 'normal')
    .map((type) => {
      const conditions: Record<PostureType, { name: string; nameKo: string; description: string; descriptionKo: string }> = {
        normal: { name: '', nameKo: '', description: '', descriptionKo: '' },
        forward_head: {
          name: 'Forward Head Posture',
          nameKo: '거북목 증후군',
          description: 'The head is positioned forward relative to the shoulders',
          descriptionKo: '머리가 어깨보다 앞으로 나와 있는 자세입니다',
        },
        rounded_shoulders: {
          name: 'Rounded Shoulders',
          nameKo: '굽은 어깨',
          description: 'Shoulders are rolled forward',
          descriptionKo: '어깨가 앞으로 말려 있습니다',
        },
        kyphosis: {
          name: 'Kyphosis',
          nameKo: '흉추후만증',
          description: 'Excessive outward curvature of the upper back',
          descriptionKo: '상부 척추의 과도한 후방 만곡입니다',
        },
        lordosis: {
          name: 'Lordosis',
          nameKo: '요추전만증',
          description: 'Excessive inward curvature of the lower back',
          descriptionKo: '하부 척추의 과도한 전방 만곡입니다',
        },
        scoliosis: {
          name: 'Scoliosis',
          nameKo: '척추측만증',
          description: 'Lateral curvature of the spine',
          descriptionKo: '척추의 측면 만곡입니다',
        },
        pelvic_tilt: {
          name: 'Pelvic Tilt',
          nameKo: '골반 불균형',
          description: 'Pelvis is tilted from its neutral position',
          descriptionKo: '골반이 중립 위치에서 기울어져 있습니다',
        },
        bow_legs: {
          name: 'Bow Legs (Genu Varum)',
          nameKo: 'O다리',
          description: 'Knees bow outward when standing',
          descriptionKo: '서 있을 때 무릎이 바깥쪽으로 벌어집니다',
        },
        knock_knees: {
          name: 'Knock Knees (Genu Valgum)',
          nameKo: 'X다리',
          description: 'Knees angle inward when standing',
          descriptionKo: '서 있을 때 무릎이 안쪽으로 기울어집니다',
        },
      }
      return {
        ...conditions[type],
        probability: Math.round(70 + Math.random() * 20),
      }
    })

  // Generate recommendations
  const recommendations = postureTypes
    .filter((type) => type !== 'normal')
    .slice(0, 3)
    .map((type) => {
      const recs: Record<string, { title: string; titleKo: string; description: string; descriptionKo: string; exercises: string[] }> = {
        forward_head: {
          title: 'Neck Exercises',
          titleKo: '목 운동',
          description: 'Strengthen neck muscles and improve head position',
          descriptionKo: '목 근육을 강화하고 머리 위치를 개선합니다',
          exercises: ['Chin Tucks', 'Neck Stretches', 'Shoulder Blade Squeezes'],
        },
        rounded_shoulders: {
          title: 'Shoulder Exercises',
          titleKo: '어깨 운동',
          description: 'Open up chest and strengthen upper back',
          descriptionKo: '가슴을 열고 상부 등을 강화합니다',
          exercises: ['Wall Angels', 'Doorway Stretches', 'Rows'],
        },
        kyphosis: {
          title: 'Upper Back Exercises',
          titleKo: '상부 등 운동',
          description: 'Strengthen upper back muscles',
          descriptionKo: '상부 등 근육을 강화합니다',
          exercises: ['Superman Exercise', 'Cat-Cow Stretch', 'Thoracic Extensions'],
        },
        lordosis: {
          title: 'Core & Hip Exercises',
          titleKo: '코어 & 골반 운동',
          description: 'Strengthen core and stretch hip flexors',
          descriptionKo: '코어를 강화하고 고관절 굴근을 스트레칭합니다',
          exercises: ['Pelvic Tilts', 'Dead Bug', 'Hip Flexor Stretches'],
        },
        default: {
          title: 'General Posture Exercises',
          titleKo: '일반 자세 운동',
          description: 'Improve overall posture',
          descriptionKo: '전반적인 자세를 개선합니다',
          exercises: ['Plank', 'Bridge', 'Wall Sits'],
        },
      }
      return recs[type] || recs.default
    })

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    direction,
    overallScore,
    postureTypes,
    bodyParts: {
      head: headAnalysis,
      shoulders: shoulderAnalysis,
      spine: spineAnalysis,
      pelvis: pelvisAnalysis,
      knees: kneeAnalysis,
    },
    muscles: [],
    potentialConditions,
    recommendations,
    landmarks,
  }
}
