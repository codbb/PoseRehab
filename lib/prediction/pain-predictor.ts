import type { PostureAnalysisResult } from '@/types/posture'

type PainRelatedPosture =
  | 'forward_head'
  | 'rounded_shoulders'
  | 'kyphosis'
  | 'lordosis'
  | 'scoliosis'
  | 'pelvic_tilt'
  | 'bow_legs'
  | 'knock_knees'

export interface PainPrediction {
  area: string
  areaKo: string
  riskLevel: 'low' | 'medium' | 'high'
  probability: number
  contributingFactors: string[]
  contributingFactorsKo: string[]
  timeline: string
  timelineKo: string
  recommendations: string[]
  recommendationsKo: string[]
}

interface PainAreaMapping {
  area: string
  areaKo: string
  relatedPostures: PainRelatedPosture[]
  baseRisk: number
}

const PAIN_AREA_MAPPINGS: PainAreaMapping[] = [
  {
    area: 'Neck',
    areaKo: '목',
    relatedPostures: ['forward_head', 'rounded_shoulders'],
    baseRisk: 0.7,
  },
  {
    area: 'Shoulders',
    areaKo: '어깨',
    relatedPostures: ['forward_head', 'rounded_shoulders', 'kyphosis'],
    baseRisk: 0.65,
  },
  {
    area: 'Upper Back',
    areaKo: '상부 등',
    relatedPostures: ['rounded_shoulders', 'kyphosis', 'scoliosis'],
    baseRisk: 0.7,
  },
  {
    area: 'Mid Back',
    areaKo: '중부 등',
    relatedPostures: ['kyphosis', 'scoliosis'],
    baseRisk: 0.6,
  },
  {
    area: 'Lower Back',
    areaKo: '허리',
    relatedPostures: ['lordosis', 'pelvic_tilt', 'scoliosis'],
    baseRisk: 0.75,
  },
  {
    area: 'Hips',
    areaKo: '골반',
    relatedPostures: ['pelvic_tilt', 'lordosis'],
    baseRisk: 0.55,
  },
  {
    area: 'Knees',
    areaKo: '무릎',
    relatedPostures: ['bow_legs', 'knock_knees', 'pelvic_tilt'],
    baseRisk: 0.5,
  },
  {
    area: 'Ankles',
    areaKo: '발목',
    relatedPostures: ['bow_legs', 'knock_knees'],
    baseRisk: 0.4,
  },
]

const POSTURE_TRANSLATIONS: Record<PainRelatedPosture, { en: string; ko: string }> = {
  forward_head: { en: 'Forward head posture', ko: '목 전방 기울기 증가' },
  rounded_shoulders: { en: 'Shoulder forward posture', ko: '어깨 전방 돌출' },
  kyphosis: { en: 'Increased thoracic curve', ko: '흉추 만곡 증가' },
  lordosis: { en: 'Increased lumbar curve', ko: '요추 만곡 증가' },
  scoliosis: { en: 'Lateral spine deviation', ko: '척추 측면 편차' },
  pelvic_tilt: { en: 'Pelvic tilt', ko: '골반 기울기 증가' },
  bow_legs: { en: 'Outward leg alignment', ko: '다리 외측 정렬' },
  knock_knees: { en: 'Inward leg alignment', ko: '다리 내측 정렬' },
}

const EXERCISE_RECOMMENDATIONS: Record<PainRelatedPosture, { en: string[]; ko: string[] }> = {
  forward_head: {
    en: ['Chin Tucks', 'Neck Stretches', 'Shoulder Blade Squeezes'],
    ko: ['턱 당기기', '목 스트레칭', '견갑골 조이기'],
  },
  rounded_shoulders: {
    en: ['Wall Angels', 'Doorway Stretches', 'Rows'],
    ko: ['벽 천사', '문틀 스트레칭', '로우 운동'],
  },
  kyphosis: {
    en: ['Superman Exercise', 'Cat-Cow Stretch', 'Thoracic Extensions'],
    ko: ['슈퍼맨 운동', '고양이-소 스트레칭', '흉추 신전'],
  },
  lordosis: {
    en: ['Pelvic Tilts', 'Dead Bug', 'Hip Flexor Stretches'],
    ko: ['골반 기울이기', '데드버그', '고관절 굴근 스트레칭'],
  },
  scoliosis: {
    en: ['Side Planks', 'Spinal Twists', 'Core Strengthening'],
    ko: ['사이드 플랭크', '척추 비틀기', '코어 강화'],
  },
  pelvic_tilt: {
    en: ['Hip Bridges', 'Glute Strengthening', 'Piriformis Stretch'],
    ko: ['힙 브릿지', '둔근 강화', '이상근 스트레칭'],
  },
  bow_legs: {
    en: ['Hip Adductor Stretches', 'Side Lunges', 'Foam Rolling'],
    ko: ['내전근 스트레칭', '사이드 런지', '폼롤러 마사지'],
  },
  knock_knees: {
    en: ['Hip Abductor Exercises', 'Clamshells', 'Single Leg Squats'],
    ko: ['외전근 운동', '클램쉘', '한 발 스쿼트'],
  },
}

function calculateTrendFactor(
  analysisHistory: PostureAnalysisResult[],
  currentAnalysis: PostureAnalysisResult
): number {
  if (analysisHistory.length < 3) return 1.0

  const recentHistory = analysisHistory.slice(-5)
  const avgHistoryScore =
    recentHistory.reduce((sum, a) => sum + a.overallScore, 0) / recentHistory.length

  if (currentAnalysis.overallScore < avgHistoryScore - 10) {
    return 1.3 // Worsening trend
  } else if (currentAnalysis.overallScore > avgHistoryScore + 10) {
    return 0.7 // Improving trend
  }
  return 1.0 // Stable
}

function getRiskLevel(probability: number): 'low' | 'medium' | 'high' {
  if (probability >= 70) return 'high'
  if (probability >= 40) return 'medium'
  return 'low'
}

function getTimeline(riskLevel: 'low' | 'medium' | 'high'): { en: string; ko: string } {
  switch (riskLevel) {
    case 'high':
      return { en: 'Within 1-2 weeks', ko: '1-2주 이내' }
    case 'medium':
      return { en: 'Within 1-3 months', ko: '1-3개월 이내' }
    case 'low':
      return { en: '6+ months (if uncorrected)', ko: '6개월 이상 (미교정 시)' }
  }
}

export function predictPain(
  analysisHistory: PostureAnalysisResult[],
  currentAnalysis: PostureAnalysisResult | null
): PainPrediction[] {
  if (!currentAnalysis) {
    return []
  }

  const detectedPostures = currentAnalysis.postureTypes.filter((p) => p !== 'normal')
  const trendFactor = calculateTrendFactor(analysisHistory, currentAnalysis)
  const predictions: PainPrediction[] = []

  for (const mapping of PAIN_AREA_MAPPINGS) {
    const matchingPostures = mapping.relatedPostures.filter((p) =>
      detectedPostures.includes(p)
    )

    if (matchingPostures.length === 0) continue

    // Calculate probability based on:
    // 1. Number of related posture issues
    // 2. Base risk for the area
    // 3. Trend factor (worsening/improving)
    // 4. Body part scores from current analysis
    const postureCountFactor = Math.min(1, matchingPostures.length / 2) * 0.3
    const bodyPartScores = getRelevantBodyPartScores(currentAnalysis, mapping.area)
    const scoreFactor = (100 - bodyPartScores) / 100 * 0.4

    let probability =
      (mapping.baseRisk * 0.3 + postureCountFactor + scoreFactor) * 100 * trendFactor

    probability = Math.min(95, Math.max(5, probability))

    const riskLevel = getRiskLevel(probability)
    const timeline = getTimeline(riskLevel)

    // Collect recommendations
    const recommendationsEn: string[] = []
    const recommendationsKo: string[] = []
    for (const posture of matchingPostures) {
      const rec = EXERCISE_RECOMMENDATIONS[posture]
      recommendationsEn.push(...rec.en)
      recommendationsKo.push(...rec.ko)
    }

    predictions.push({
      area: mapping.area,
      areaKo: mapping.areaKo,
      riskLevel,
      probability: Math.round(probability),
      contributingFactors: matchingPostures.map((p) => POSTURE_TRANSLATIONS[p].en),
      contributingFactorsKo: matchingPostures.map((p) => POSTURE_TRANSLATIONS[p].ko),
      timeline: timeline.en,
      timelineKo: timeline.ko,
      recommendations: Array.from(new Set(recommendationsEn)).slice(0, 4),
      recommendationsKo: Array.from(new Set(recommendationsKo)).slice(0, 4),
    })
  }

  return predictions.sort((a, b) => b.probability - a.probability)
}

function getRelevantBodyPartScores(
  analysis: PostureAnalysisResult,
  area: string
): number {
  const bodyParts = analysis.bodyParts

  switch (area) {
    case 'Neck':
      return bodyParts.head?.score ?? 70
    case 'Shoulders':
      return bodyParts.shoulders?.score ?? 70
    case 'Upper Back':
    case 'Mid Back':
      return bodyParts.spine?.score ?? 70
    case 'Lower Back':
      return (
        ((bodyParts.spine?.score ?? 70) + (bodyParts.pelvis?.score ?? 70)) / 2
      )
    case 'Hips':
      return bodyParts.pelvis?.score ?? 70
    case 'Knees':
    case 'Ankles':
      return bodyParts.knees?.score ?? 70
    default:
      return 70
  }
}

export function getOverallPainRisk(predictions: PainPrediction[]): {
  level: 'low' | 'medium' | 'high'
  score: number
  areasAtRisk: number
} {
  if (predictions.length === 0) {
    return { level: 'low', score: 0, areasAtRisk: 0 }
  }

  const highRiskCount = predictions.filter((p) => p.riskLevel === 'high').length
  const mediumRiskCount = predictions.filter((p) => p.riskLevel === 'medium').length

  const avgProbability =
    predictions.reduce((sum, p) => sum + p.probability, 0) / predictions.length

  let level: 'low' | 'medium' | 'high' = 'low'
  if (highRiskCount >= 2 || avgProbability >= 70) {
    level = 'high'
  } else if (highRiskCount >= 1 || mediumRiskCount >= 2 || avgProbability >= 40) {
    level = 'medium'
  }

  return {
    level,
    score: Math.round(avgProbability),
    areasAtRisk: predictions.length,
  }
}
