import { GaitPhase, GaitAnomalyType } from '@/types/gait'

// 측정 항목 라벨 및 정상 범위
export const GAIT_MEASUREMENT_LABELS = {
  strideLength: {
    en: 'Stride Length',
    ko: '보폭',
    idealMin: 1.2,
    idealMax: 1.6,
    unit: 'm',
    warningThreshold: 0.2,
    description: {
      en: 'Distance between consecutive heel strikes of the same foot',
      ko: '같은 발의 연속적인 발뒤꿈치 착지 간 거리',
    },
  },
  gaitSpeed: {
    en: 'Gait Speed',
    ko: '보행 속도',
    idealMin: 1.1,
    idealMax: 1.4,
    unit: 'm/s',
    warningThreshold: 0.3,
    description: {
      en: 'Walking speed based on center of mass displacement',
      ko: '무게중심 이동 기반 보행 속도',
    },
  },
  gaitCycle: {
    en: 'Gait Cycle',
    ko: '보행 주기',
    idealMin: 900,
    idealMax: 1200,
    unit: 'ms',
    warningThreshold: 200,
    description: {
      en: 'Time for one complete stride (heel strike to heel strike)',
      ko: '한 보폭 완료 시간 (발뒤꿈치 착지 간 시간)',
    },
  },
  leftRightSymmetry: {
    en: 'Left-Right Symmetry',
    ko: '좌우 대칭성',
    idealMin: 0.95,
    idealMax: 1.05,
    unit: '',
    warningThreshold: 0.1,
    description: {
      en: 'Ratio of left stride to right stride (1.0 = perfect symmetry)',
      ko: '왼쪽/오른쪽 보폭 비율 (1.0 = 완벽한 대칭)',
    },
  },
  kneeFlexionLeft: {
    en: 'Left Knee Flexion',
    ko: '왼쪽 무릎 굴곡',
    idealMin: 55,
    idealMax: 70,
    unit: '°',
    warningThreshold: 10,
    description: {
      en: 'Maximum knee bend angle during swing phase',
      ko: '유각기 중 최대 무릎 굽힘 각도',
    },
  },
  kneeFlexionRight: {
    en: 'Right Knee Flexion',
    ko: '오른쪽 무릎 굴곡',
    idealMin: 55,
    idealMax: 70,
    unit: '°',
    warningThreshold: 10,
    description: {
      en: 'Maximum knee bend angle during swing phase',
      ko: '유각기 중 최대 무릎 굽힘 각도',
    },
  },
  hipFlexionLeft: {
    en: 'Left Hip Flexion',
    ko: '왼쪽 엉덩이 굴곡',
    idealMin: 25,
    idealMax: 35,
    unit: '°',
    warningThreshold: 10,
    description: {
      en: 'Hip flexion angle during walking',
      ko: '보행 중 엉덩이 굴곡 각도',
    },
  },
  hipFlexionRight: {
    en: 'Right Hip Flexion',
    ko: '오른쪽 엉덩이 굴곡',
    idealMin: 25,
    idealMax: 35,
    unit: '°',
    warningThreshold: 10,
    description: {
      en: 'Hip flexion angle during walking',
      ko: '보행 중 엉덩이 굴곡 각도',
    },
  },
  trunkInclination: {
    en: 'Trunk Inclination',
    ko: '몸통 기울기',
    idealMin: -5,
    idealMax: 5,
    unit: '°',
    warningThreshold: 5,
    description: {
      en: 'Forward/backward lean of the upper body',
      ko: '상체의 앞/뒤 기울기',
    },
  },
  footClearance: {
    en: 'Foot Clearance',
    ko: '발 들어올림',
    idealMin: 1.5,
    idealMax: 3.0,
    unit: 'cm',
    warningThreshold: 1.0,
    description: {
      en: 'Height of foot above ground during swing phase',
      ko: '유각기 중 발의 지면 위 높이',
    },
  },
} as const

// 보행 단계 라벨
export const GAIT_PHASE_LABELS: Record<GaitPhase, { en: string; ko: string; percent: number }> = {
  // 입각기 (약 60%)
  initial_contact: {
    en: 'Initial Contact',
    ko: '초기 접촉',
    percent: 0,
  },
  loading_response: {
    en: 'Loading Response',
    ko: '하중 반응',
    percent: 10,
  },
  mid_stance: {
    en: 'Mid Stance',
    ko: '중간 입각기',
    percent: 30,
  },
  terminal_stance: {
    en: 'Terminal Stance',
    ko: '말기 입각기',
    percent: 50,
  },
  // 유각기 (약 40%)
  pre_swing: {
    en: 'Pre-Swing',
    ko: '전유각기',
    percent: 60,
  },
  initial_swing: {
    en: 'Initial Swing',
    ko: '초기 유각기',
    percent: 70,
  },
  mid_swing: {
    en: 'Mid Swing',
    ko: '중간 유각기',
    percent: 85,
  },
  terminal_swing: {
    en: 'Terminal Swing',
    ko: '말기 유각기',
    percent: 95,
  },
}

// 보행 이상 라벨
export const GAIT_ANOMALY_LABELS: Record<
  GaitAnomalyType,
  { en: string; ko: string; description: { en: string; ko: string } }
> = {
  asymmetry: {
    en: 'Gait Asymmetry',
    ko: '보행 비대칭',
    description: {
      en: 'Significant difference between left and right leg movement patterns',
      ko: '좌우 다리 움직임 패턴의 현저한 차이',
    },
  },
  limping: {
    en: 'Limping',
    ko: '절뚝거림',
    description: {
      en: 'Uneven walking pattern with shortened stance on one side',
      ko: '한쪽 입각기가 짧아진 불균형한 보행 패턴',
    },
  },
  shuffling: {
    en: 'Shuffling Gait',
    ko: '끌기 보행',
    description: {
      en: 'Short steps with feet barely leaving the ground',
      ko: '발이 지면에서 거의 떨어지지 않는 짧은 걸음',
    },
  },
  reduced_clearance: {
    en: 'Reduced Foot Clearance',
    ko: '발 들어올림 감소',
    description: {
      en: 'Foot does not lift high enough during swing phase',
      ko: '유각기 중 발이 충분히 높이 들리지 않음',
    },
  },
  excessive_trunk_lean: {
    en: 'Excessive Trunk Lean',
    ko: '과도한 몸통 기울기',
    description: {
      en: 'Upper body leans excessively forward or to the side',
      ko: '상체가 앞이나 옆으로 과도하게 기울어짐',
    },
  },
  reduced_knee_flexion: {
    en: 'Reduced Knee Flexion',
    ko: '무릎 굴곡 감소',
    description: {
      en: 'Knee does not bend enough during swing phase',
      ko: '유각기 중 무릎이 충분히 구부러지지 않음',
    },
  },
  reduced_hip_flexion: {
    en: 'Reduced Hip Flexion',
    ko: '엉덩이 굴곡 감소',
    description: {
      en: 'Hip joint does not flex enough during walking',
      ko: '보행 중 엉덩이 관절이 충분히 구부러지지 않음',
    },
  },
}

// 정상 보행 비율
export const NORMAL_GAIT_PERCENTAGES = {
  stancePhase: 60, // 입각기 비율 (%)
  swingPhase: 40, // 유각기 비율 (%)
  doubleSupportPhase: 20, // 양하지 지지기 비율 (%)
  singleSupportPhase: 40, // 단하지 지지기 비율 (%)
}

// 키포인트 신뢰도 임계값
export const KEYPOINT_CONFIDENCE_THRESHOLD = 0.5

// 분석 설정
export const GAIT_ANALYSIS_CONFIG = {
  // 프레임 버퍼 크기 (차트용)
  maxFrameBufferSize: 90, // 약 3초 (30fps 기준)

  // 분석 기록 최대 개수
  maxHistoryCount: 50,

  // 이동 평균 윈도우 크기 (노이즈 제거)
  smoothingWindowSize: 5,

  // 최소 분석 시간 (초)
  minAnalysisDuration: 5,

  // heel strike 감지 임계값
  heelStrikeThreshold: 0.02, // Y 좌표 변화량

  // 최소 보폭 수 (분석 유효성)
  minStridesRequired: 3,
}

// 점수 계산 가중치
export const GAIT_SCORE_WEIGHTS = {
  strideLength: 0.1,
  gaitSpeed: 0.1,
  gaitCycle: 0.1,
  leftRightSymmetry: 0.2,
  kneeFlexion: 0.15, // 좌우 평균
  hipFlexion: 0.15, // 좌우 평균
  trunkInclination: 0.1,
  footClearance: 0.1,
}

// 상태 판정 함수
export function getMeasurementStatus(
  value: number,
  idealMin: number,
  idealMax: number,
  warningThreshold: number
): 'normal' | 'warning' | 'danger' {
  if (value >= idealMin && value <= idealMax) {
    return 'normal'
  }

  const deviation = value < idealMin ? idealMin - value : value - idealMax

  if (deviation <= warningThreshold) {
    return 'warning'
  }

  return 'danger'
}

// 점수 계산 함수
export function calculateMeasurementScore(
  value: number,
  idealMin: number,
  idealMax: number
): number {
  // 정상 범위 내: 100점
  if (value >= idealMin && value <= idealMax) {
    return 100
  }

  // 범위 밖: 거리에 따라 감점
  const midpoint = (idealMin + idealMax) / 2
  const range = (idealMax - idealMin) / 2
  const deviation = Math.abs(value - midpoint) - range
  const maxDeviation = range * 2 // 정상 범위의 2배 벗어나면 0점

  const score = Math.max(0, 100 - (deviation / maxDeviation) * 100)
  return Math.round(score)
}
