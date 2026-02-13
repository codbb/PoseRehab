import type { Landmark, PostureAnalysisResult, BodyPartAnalysis, PostureType } from '@/types/posture'
import {
  calculateHeadForwardAngle,
  calculateShoulderAlignment,
  calculateSpineCurvature,
  calculatePelvisTilt,
  calculateKneeAlignment,
  calculateBodyBalance,
  calculateLegAlignment,
  calculateRoundShoulder,
  type LegAlignmentSeverity,
} from './angle-calculator'
import { generateId } from '@/lib/utils'

// 심각도별 점수 감점
const SEVERITY_DEDUCTION: Record<LegAlignmentSeverity, number> = {
  none: 0,
  mild: 15,
  moderate: 30,
  severe: 50,
}

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

  // Knee analysis with improved O-leg / X-leg detection
  const legAlignment = calculateLegAlignment(landmarks)
  const kneeAngleScore = normalizeAngle(legAlignment.overallAngle, 175, 20)
  const kneeScore = Math.max(0, kneeAngleScore - SEVERITY_DEDUCTION[legAlignment.severity])

  // O다리 / X다리 판정
  if (legAlignment.type === 'o_legs') {
    postureTypes.push('bow_legs')
  } else if (legAlignment.type === 'x_legs') {
    postureTypes.push('knock_knees')
  }

  // 피드백 메시지 생성
  let kneeFeedback = 'Knee alignment is good'
  let kneeFeedbackKo = '무릎 정렬이 좋습니다'
  if (legAlignment.type === 'o_legs') {
    const severityText = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe', none: '' }
    const severityTextKo = { mild: '경미한', moderate: '중간 정도의', severe: '심한', none: '' }
    kneeFeedback = `${severityText[legAlignment.severity]} bow legs detected (O-legs) - Hip-Knee-Ankle angle: ${legAlignment.overallAngle.toFixed(1)}°`
    kneeFeedbackKo = `${severityTextKo[legAlignment.severity]} O다리(내반슬)가 감지되었습니다 - 각도: ${legAlignment.overallAngle.toFixed(1)}°`
  } else if (legAlignment.type === 'x_legs') {
    const severityText = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe', none: '' }
    const severityTextKo = { mild: '경미한', moderate: '중간 정도의', severe: '심한', none: '' }
    kneeFeedback = `${severityText[legAlignment.severity]} knock knees detected (X-legs) - Hip-Knee-Ankle angle: ${legAlignment.overallAngle.toFixed(1)}°`
    kneeFeedbackKo = `${severityTextKo[legAlignment.severity]} X다리(외반슬)가 감지되었습니다 - 각도: ${legAlignment.overallAngle.toFixed(1)}°`
  }

  const kneeAnalysis: BodyPartAnalysis = {
    name: 'Knees',
    nameKo: '무릎',
    score: kneeScore,
    angle: legAlignment.overallAngle,
    idealAngle: 175,
    deviation: Math.abs(175 - legAlignment.overallAngle),
    status: scoreToStatus(kneeScore),
    feedback: kneeFeedback,
    feedbackKo: kneeFeedbackKo,
  }

  // Round Shoulder analysis (측면 뷰에서 더 정확하지만, 정면에서도 어깨 전방 돌출 감지 가능)
  const roundShoulderData = calculateRoundShoulder(landmarks, 'left')
  if (roundShoulderData.isRoundShoulder) {
    postureTypes.push('round_shoulder')
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
          nameKo: 'X다리 (외반슬)',
          description: 'Knees angle inward when standing',
          descriptionKo: '서 있을 때 무릎이 안쪽으로 모입니다',
        },
        round_shoulder: {
          name: 'Round Shoulder',
          nameKo: '라운드숄더 (둥근 어깨)',
          description: 'Shoulders are positioned forward of the ears',
          descriptionKo: '어깨가 귀보다 앞으로 나와 있는 자세입니다',
        },
      }
      // Calculate probability based on deviation severity
      let probability = 75
      if (type === 'forward_head') {
        probability = Math.min(95, Math.round(50 + headForwardAngle * 2))
      } else if (type === 'rounded_shoulders') {
        probability = Math.min(95, Math.round(50 + (90 - shoulderData.forwardAngle) * 2))
      } else if (type === 'kyphosis') {
        probability = Math.min(95, Math.round(50 + (170 - spineData.kyphosisAngle)))
      } else if (type === 'lordosis') {
        probability = Math.min(95, Math.round(50 + (170 - spineData.lordosisAngle)))
      } else if (type === 'scoliosis') {
        probability = Math.min(95, Math.round(50 + Math.abs(spineData.lateralDeviation) * 500))
      } else if (type === 'pelvic_tilt') {
        probability = Math.min(95, Math.round(50 + Math.abs(pelvisData.lateralTilt) * 500))
      } else if (type === 'round_shoulder') {
        const severityProbability = { none: 50, mild: 65, moderate: 80, severe: 95 }
        probability = severityProbability[roundShoulderData.severity]
      }
      if (type === 'bow_legs' && legAlignment.type === 'o_legs') {
        const severityProbability = { none: 50, mild: 65, moderate: 80, severe: 95 }
        probability = severityProbability[legAlignment.severity]
      } else if (type === 'knock_knees' && legAlignment.type === 'x_legs') {
        const severityProbability = { none: 50, mild: 65, moderate: 80, severe: 95 }
        probability = severityProbability[legAlignment.severity]
      } else if (type === 'round_shoulder' && roundShoulderData.isRoundShoulder) {
        const severityProbability = { none: 50, mild: 65, moderate: 80, severe: 95 }
        probability = severityProbability[roundShoulderData.severity]
      }
      return {
        ...conditions[type],
        probability,
      }
    })

  // Generate recommendations with exercise IDs for linking
  interface Recommendation {
    title: string
    titleKo: string
    description: string
    descriptionKo: string
    exercises: string[]
    exerciseIds: string[]
  }

  const recommendations = postureTypes
    .filter((type) => type !== 'normal')
    .slice(0, 3)
    .map((type) => {
      const recs: Record<string, Recommendation> = {
        forward_head: {
          title: 'Neck Exercises',
          titleKo: '목 운동',
          description: 'Strengthen neck muscles and improve head position',
          descriptionKo: '목 근육을 강화하고 머리 위치를 개선합니다',
          exercises: ['Chin Tucks', 'Neck Stretches', 'Upper Trap Stretch'],
          exerciseIds: ['chin_tuck', 'neck_stretch', 'upper_trap_stretch'],
        },
        rounded_shoulders: {
          title: 'Shoulder Exercises',
          titleKo: '어깨 운동',
          description: 'Open up chest and strengthen upper back',
          descriptionKo: '가슴을 열고 상부 등을 강화합니다',
          exercises: ['Wall Slide', 'Chest Stretch', 'Rows'],
          exerciseIds: ['wall_slide', 'chest_stretch', 'barbell_row'],
        },
        kyphosis: {
          title: 'Upper Back Exercises',
          titleKo: '상부 등 운동',
          description: 'Strengthen upper back muscles',
          descriptionKo: '상부 등 근육을 강화합니다',
          exercises: ['Cat-Cow Stretch', 'Wall Slide', 'Chest Stretch'],
          exerciseIds: ['cat_cow', 'wall_slide', 'chest_stretch'],
        },
        lordosis: {
          title: 'Core & Hip Exercises',
          titleKo: '코어 & 골반 운동',
          description: 'Strengthen core and stretch hip flexors',
          descriptionKo: '코어를 강화하고 고관절 굴근을 스트레칭합니다',
          exercises: ['Pelvic Tilts', 'Dead Bug', 'Hamstring Stretch'],
          exerciseIds: ['pelvic_tilt', 'dead_bug', 'hamstring_stretch'],
        },
        scoliosis: {
          title: 'Spine Alignment Exercises',
          titleKo: '척추 정렬 운동',
          description: 'Improve spine alignment and core stability',
          descriptionKo: '척추 정렬과 코어 안정성을 향상시킵니다',
          exercises: ['Cat-Cow Stretch', 'Side Lunge', 'Dead Bug'],
          exerciseIds: ['cat_cow', 'side_lunge', 'dead_bug'],
        },
        pelvic_tilt: {
          title: 'Pelvis & Hip Exercises',
          titleKo: '골반 & 고관절 운동',
          description: 'Correct pelvis alignment and strengthen hip muscles',
          descriptionKo: '골반 정렬을 교정하고 고관절 근육을 강화합니다',
          exercises: ['Pelvic Tilt', 'Clamshell', 'Hip Abduction'],
          exerciseIds: ['pelvic_tilt', 'clamshell', 'hip_abduction'],
        },
        bow_legs: {
          title: 'Inner Thigh & Hip Exercises',
          titleKo: '내전근 & 고관절 운동',
          description: 'Strengthen inner thigh muscles and improve hip alignment',
          descriptionKo: '내전근을 강화하고 고관절 정렬을 개선합니다',
          exercises: ['Side Lunge', 'Clamshell', 'IT Band Stretch'],
          exerciseIds: ['side_lunge', 'clamshell', 'it_band_stretch'],
        },
        knock_knees: {
          title: 'Hip Abductor Exercises',
          titleKo: '고관절 외전근 운동',
          description: 'Strengthen outer hip and glute muscles',
          descriptionKo: '고관절 외측과 둔근을 강화합니다',
          exercises: ['Hip Abduction', 'Clamshell', 'Side Lunge'],
          exerciseIds: ['hip_abduction', 'clamshell', 'side_lunge'],
        },
        round_shoulder: {
          title: 'Chest & Upper Back Exercises',
          titleKo: '가슴 & 상부 등 운동',
          description: 'Open chest and strengthen upper back muscles',
          descriptionKo: '가슴을 열고 상부 등 근육을 강화합니다',
          exercises: ['Chest Stretch', 'Wall Slide', 'Barbell Row'],
          exerciseIds: ['chest_stretch', 'wall_slide', 'barbell_row'],
        },
        default: {
          title: 'General Posture Exercises',
          titleKo: '일반 자세 운동',
          description: 'Improve overall posture',
          descriptionKo: '전반적인 자세를 개선합니다',
          exercises: ['Plank', 'Bridge', 'Squat'],
          exerciseIds: ['plank', 'bridge', 'squat'],
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
