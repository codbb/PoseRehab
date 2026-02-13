import type { PostureAnalysisResult, PostureType } from '@/types/posture'

export type Timeframe = '6months' | '1year' | '2years'

export interface PostureAngles {
  headForward: number
  shoulderRound: number
  spinalCurve: number
  pelvicTilt: number
}

export interface BodyPrediction {
  timeframe: Timeframe
  timeframeLabel: string
  timeframeLabelKo: string
  currentAngles: PostureAngles
  predictedAngles: PostureAngles
  predictedScore: number
  deteriorationRate: number
  improvementPotential: number
  warning: string
  warningKo: string
}

const TIMEFRAME_LABELS: Record<Timeframe, { en: string; ko: string }> = {
  '6months': { en: '6 Months', ko: '6개월 후' },
  '1year': { en: '1 Year', ko: '1년 후' },
  '2years': { en: '2 Years', ko: '2년 후' },
}

const DETERIORATION_RATES: Record<Timeframe, number> = {
  '6months': 1.1,
  '1year': 1.25,
  '2years': 1.5,
}

const POSTURE_ANGLE_IMPACT: Record<PostureType, Partial<PostureAngles>> = {
  normal: {},
  forward_head: { headForward: 5 },
  rounded_shoulders: { shoulderRound: 8 },
  round_shoulder: { shoulderRound: 6, headForward: 2 },
  kyphosis: { spinalCurve: 10, shoulderRound: 5 },
  lordosis: { spinalCurve: 8, pelvicTilt: 6 },
  scoliosis: { spinalCurve: 12 },
  pelvic_tilt: { pelvicTilt: 8 },
  bow_legs: { pelvicTilt: 3 },
  knock_knees: { pelvicTilt: 3 },
}

function extractCurrentAngles(analysis: PostureAnalysisResult): PostureAngles {
  const bodyParts = analysis.bodyParts

  return {
    headForward: bodyParts.head?.angle ?? 0,
    shoulderRound: bodyParts.shoulders?.angle ?? 0,
    spinalCurve: bodyParts.spine?.angle ?? 0,
    pelvicTilt: bodyParts.pelvis?.angle ?? 0,
  }
}

function calculateDeterioration(
  currentAngles: PostureAngles,
  postureTypes: PostureType[],
  timeframe: Timeframe
): PostureAngles {
  const rate = DETERIORATION_RATES[timeframe]
  const predicted = { ...currentAngles }

  for (const posture of postureTypes) {
    const impact = POSTURE_ANGLE_IMPACT[posture]
    if (impact.headForward) {
      predicted.headForward += impact.headForward * rate
    }
    if (impact.shoulderRound) {
      predicted.shoulderRound += impact.shoulderRound * rate
    }
    if (impact.spinalCurve) {
      predicted.spinalCurve += impact.spinalCurve * rate
    }
    if (impact.pelvicTilt) {
      predicted.pelvicTilt += impact.pelvicTilt * rate
    }
  }

  return predicted
}

function calculatePredictedScore(
  currentScore: number,
  deteriorationRate: number
): number {
  const decrease = (100 - currentScore) * deteriorationRate * 0.3
  return Math.max(0, Math.round(currentScore - decrease))
}

function getWarning(
  predictedScore: number,
  postureTypes: PostureType[]
): { en: string; ko: string } {
  if (predictedScore < 40) {
    return {
      en: 'Critical: High risk of chronic pain and structural issues. Immediate intervention recommended.',
      ko: '심각: 만성 통증 및 구조적 문제 위험이 높습니다. 즉각적인 교정이 필요합니다.',
    }
  }

  if (predictedScore < 60) {
    if (postureTypes.includes('kyphosis') || postureTypes.includes('lordosis')) {
      return {
        en: 'Warning: Spinal curvature may worsen significantly. Regular exercise is essential.',
        ko: '경고: 척추 곡선이 크게 악화될 수 있습니다. 규칙적인 운동이 필수입니다.',
      }
    }
    return {
      en: 'Caution: Posture may deteriorate further without corrective action.',
      ko: '주의: 교정 없이는 자세가 더 악화될 수 있습니다.',
    }
  }

  if (predictedScore < 80) {
    return {
      en: 'Moderate risk: Some degradation expected. Maintain exercise routine.',
      ko: '중간 위험: 약간의 악화가 예상됩니다. 운동 루틴을 유지하세요.',
    }
  }

  return {
    en: 'Good outlook: Minor changes expected with current habits.',
    ko: '양호: 현재 습관으로 경미한 변화만 예상됩니다.',
  }
}

export function predictBodyChange(
  analysisHistory: PostureAnalysisResult[],
  currentAnalysis: PostureAnalysisResult | null,
  timeframe: Timeframe
): BodyPrediction | null {
  if (!currentAnalysis) {
    return null
  }

  const currentAngles = extractCurrentAngles(currentAnalysis)
  const postureTypes = currentAnalysis.postureTypes.filter((p) => p !== 'normal')

  const predictedAngles = calculateDeterioration(
    currentAngles,
    postureTypes,
    timeframe
  )

  const deteriorationRate = DETERIORATION_RATES[timeframe]
  const predictedScore = calculatePredictedScore(
    currentAnalysis.overallScore,
    deteriorationRate
  )

  // Calculate improvement potential based on how much could be gained with exercise
  const improvementPotential = Math.min(
    95,
    currentAnalysis.overallScore + (100 - currentAnalysis.overallScore) * 0.6
  )

  const warning = getWarning(predictedScore, postureTypes)

  return {
    timeframe,
    timeframeLabel: TIMEFRAME_LABELS[timeframe].en,
    timeframeLabelKo: TIMEFRAME_LABELS[timeframe].ko,
    currentAngles,
    predictedAngles,
    predictedScore,
    deteriorationRate: Math.round((deteriorationRate - 1) * 100),
    improvementPotential: Math.round(improvementPotential),
    warning: warning.en,
    warningKo: warning.ko,
  }
}

export function predictAllTimeframes(
  analysisHistory: PostureAnalysisResult[],
  currentAnalysis: PostureAnalysisResult | null
): BodyPrediction[] {
  const timeframes: Timeframe[] = ['6months', '1year', '2years']

  return timeframes
    .map((tf) => predictBodyChange(analysisHistory, currentAnalysis, tf))
    .filter((p): p is BodyPrediction => p !== null)
}

export function getPostureProgressionPath(
  currentScore: number
): {
  withExercise: number[]
  withoutExercise: number[]
  months: number[]
} {
  const months = [0, 1, 2, 3, 6, 9, 12]

  const withExercise = months.map((m) => {
    const improvement = Math.min(30, (100 - currentScore) * 0.05 * m)
    return Math.round(Math.min(100, currentScore + improvement))
  })

  const withoutExercise = months.map((m) => {
    const decline = currentScore * 0.02 * m
    return Math.round(Math.max(20, currentScore - decline))
  })

  return { withExercise, withoutExercise, months }
}
