'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Info } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import type { Pose3DPredictedCondition, LegType } from '@/types/analysis-result'
import { cn } from '@/lib/utils'

// ── 타입 정의 ──
type MuscleStatus = 'contracted' | 'elongated' | 'normal'

interface MuscleInfo {
  id: string
  nameEn: string
  nameKo: string
  status: MuscleStatus
  source: string[] // 어떤 질환에서 영향받는지
}

interface MuscleStatusVisualizationProps {
  conditions: Pose3DPredictedCondition[]
  legAlignmentType?: LegType
  className?: string
}

// ── 색상 정의 ──
const COLORS = {
  body: {
    fill: 'rgba(55, 65, 81, 0.3)',
    stroke: 'rgba(107, 114, 128, 0.6)',
  },
  contracted: {
    fill: 'rgba(239, 68, 68, 0.6)',
    stroke: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
  elongated: {
    fill: 'rgba(59, 130, 246, 0.6)',
    stroke: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  normal: {
    fill: 'rgba(107, 114, 128, 0.15)',
    stroke: 'transparent',
  },
}

// ── 질환별 근육 매핑 ──
interface ConditionMuscleMapping {
  contracted: string[]
  elongated: string[]
}

const CONDITION_MUSCLE_MAP: Record<string, ConditionMuscleMapping> = {
  // 거북목 (Forward Head Posture / Turtle Neck)
  'Forward Head Posture (Turtle Neck)': {
    contracted: ['scm', 'scalenes', 'upper_trapezius', 'pectoralis_major', 'suboccipitals'],
    elongated: ['deep_neck_flexors', 'lower_trapezius', 'middle_trapezius'],
  },
  // 라운드숄더 (Round Shoulder)
  'Round Shoulder': {
    contracted: ['pectoralis_major', 'pectoralis_minor', 'upper_trapezius', 'subscapularis'],
    elongated: ['middle_trapezius', 'lower_trapezius', 'rhomboids', 'serratus_anterior'],
  },
  // 어깨 불균형 (Shoulder Imbalance)
  'Shoulder Imbalance': {
    contracted: ['upper_trapezius_high'],
    elongated: ['upper_trapezius_low'],
  },
  // 상부교차증후군 (Upper Cross Syndrome)
  'Upper Cross Syndrome': {
    contracted: ['scm', 'scalenes', 'upper_trapezius', 'levator_scapulae', 'pectoralis_major', 'pectoralis_minor'],
    elongated: ['deep_neck_flexors', 'lower_trapezius', 'middle_trapezius', 'rhomboids', 'serratus_anterior'],
  },
  // 골반 틀어짐 (Pelvic Misalignment) - 전방경사로 가정
  'Pelvic Misalignment': {
    contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
    elongated: ['rectus_abdominis', 'gluteus_maximus', 'hamstrings'],
  },
  // 골반 전방경사
  'Anterior Pelvic Tilt': {
    contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
    elongated: ['rectus_abdominis', 'gluteus_maximus', 'hamstrings'],
  },
  // 골반 후방경사
  'Posterior Pelvic Tilt': {
    contracted: ['hamstrings', 'rectus_abdominis', 'gluteus_maximus'],
    elongated: ['iliopsoas', 'rectus_femoris', 'erector_spinae'],
  },
  // 하부교차증후군 (Lower Cross Syndrome)
  'Lower Cross Syndrome': {
    contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
    elongated: ['rectus_abdominis', 'gluteus_maximus', 'gluteus_medius', 'hamstrings'],
  },
  // 척추측만증 위험 (Scoliosis Risk)
  'Scoliosis Risk': {
    contracted: ['erector_spinae_convex', 'quadratus_lumborum'],
    elongated: ['erector_spinae_concave'],
  },
}

// X다리/O다리 매핑
const LEG_ALIGNMENT_MUSCLE_MAP: Record<LegType, ConditionMuscleMapping> = {
  normal: { contracted: [], elongated: [] },
  x_legs: {
    contracted: ['adductors', 'tensor_fasciae_latae'],
    elongated: ['gluteus_medius', 'vastus_lateralis'],
  },
  o_legs: {
    contracted: ['vastus_lateralis', 'biceps_femoris'],
    elongated: ['adductors', 'vastus_medialis'],
  },
}

// ── 근육 정보 데이터 ──
const MUSCLE_DATA: Record<string, { nameEn: string; nameKo: string; view: 'anterior' | 'posterior' | 'both' }> = {
  // 목/어깨 (전면)
  scm: { nameEn: 'Sternocleidomastoid', nameKo: '흉쇄유돌근', view: 'anterior' },
  scalenes: { nameEn: 'Scalenes', nameKo: '사각근', view: 'anterior' },
  deep_neck_flexors: { nameEn: 'Deep Neck Flexors', nameKo: '경추심층굴곡근', view: 'anterior' },
  pectoralis_major: { nameEn: 'Pectoralis Major', nameKo: '대흉근', view: 'anterior' },
  pectoralis_minor: { nameEn: 'Pectoralis Minor', nameKo: '소흉근', view: 'anterior' },
  deltoid: { nameEn: 'Deltoid', nameKo: '삼각근', view: 'both' },
  subscapularis: { nameEn: 'Subscapularis', nameKo: '견갑하근', view: 'anterior' },
  serratus_anterior: { nameEn: 'Serratus Anterior', nameKo: '전거근', view: 'anterior' },

  // 복부 (전면)
  rectus_abdominis: { nameEn: 'Rectus Abdominis', nameKo: '복직근', view: 'anterior' },
  obliques: { nameEn: 'Obliques', nameKo: '복사근', view: 'anterior' },

  // 고관절/대퇴 (전면)
  iliopsoas: { nameEn: 'Iliopsoas', nameKo: '장요근', view: 'anterior' },
  rectus_femoris: { nameEn: 'Rectus Femoris', nameKo: '대퇴직근', view: 'anterior' },
  vastus_lateralis: { nameEn: 'Vastus Lateralis', nameKo: '외측광근', view: 'anterior' },
  vastus_medialis: { nameEn: 'Vastus Medialis', nameKo: '내측광근', view: 'anterior' },
  tensor_fasciae_latae: { nameEn: 'Tensor Fasciae Latae', nameKo: '대퇴근막장근', view: 'anterior' },
  adductors: { nameEn: 'Adductors', nameKo: '내전근', view: 'anterior' },

  // 하퇴 (전면)
  tibialis_anterior: { nameEn: 'Tibialis Anterior', nameKo: '전경골근', view: 'anterior' },

  // 목/어깨 (후면)
  suboccipitals: { nameEn: 'Suboccipitals', nameKo: '후두하근', view: 'posterior' },
  upper_trapezius: { nameEn: 'Upper Trapezius', nameKo: '상부승모근', view: 'posterior' },
  upper_trapezius_high: { nameEn: 'Upper Trapezius (High Side)', nameKo: '상부승모근 (높은쪽)', view: 'posterior' },
  upper_trapezius_low: { nameEn: 'Upper Trapezius (Low Side)', nameKo: '상부승모근 (낮은쪽)', view: 'posterior' },
  middle_trapezius: { nameEn: 'Middle Trapezius', nameKo: '중부승모근', view: 'posterior' },
  lower_trapezius: { nameEn: 'Lower Trapezius', nameKo: '하부승모근', view: 'posterior' },
  levator_scapulae: { nameEn: 'Levator Scapulae', nameKo: '견갑거근', view: 'posterior' },
  rhomboids: { nameEn: 'Rhomboids', nameKo: '능형근', view: 'posterior' },

  // 등/허리 (후면)
  latissimus_dorsi: { nameEn: 'Latissimus Dorsi', nameKo: '광배근', view: 'posterior' },
  erector_spinae: { nameEn: 'Erector Spinae', nameKo: '척추기립근', view: 'posterior' },
  erector_spinae_convex: { nameEn: 'Erector Spinae (Convex)', nameKo: '척추기립근 (볼록면)', view: 'posterior' },
  erector_spinae_concave: { nameEn: 'Erector Spinae (Concave)', nameKo: '척추기립근 (오목면)', view: 'posterior' },
  quadratus_lumborum: { nameEn: 'Quadratus Lumborum', nameKo: '요방형근', view: 'posterior' },

  // 둔부 (후면)
  gluteus_maximus: { nameEn: 'Gluteus Maximus', nameKo: '대둔근', view: 'posterior' },
  gluteus_medius: { nameEn: 'Gluteus Medius', nameKo: '중둔근', view: 'posterior' },

  // 대퇴 후면
  hamstrings: { nameEn: 'Hamstrings', nameKo: '햄스트링', view: 'posterior' },
  biceps_femoris: { nameEn: 'Biceps Femoris', nameKo: '대퇴이두근', view: 'posterior' },

  // 하퇴 (후면)
  gastrocnemius: { nameEn: 'Gastrocnemius', nameKo: '비복근', view: 'posterior' },
}

// ── SVG 근육 경로 정의 ──
// 전면 뷰 근육 경로
const ANTERIOR_MUSCLE_PATHS: Record<string, string> = {
  // 목 (전면)
  scm: 'M42 20 Q44 18 46 20 L45 30 Q44 32 42 30 Z M54 20 Q56 18 58 20 L58 30 Q56 32 55 30 Z',
  scalenes: 'M40 22 L42 20 L42 28 L40 30 Z M58 20 L60 22 L60 30 L58 28 Z',
  deep_neck_flexors: 'M46 22 Q50 20 54 22 L53 30 Q50 29 47 30 Z',

  // 가슴
  pectoralis_major: 'M34 34 Q42 30 50 34 Q58 30 66 34 L66 48 Q58 52 50 48 Q42 52 34 48 Z',
  pectoralis_minor: 'M40 36 Q46 34 50 36 Q54 34 60 36 L58 44 Q54 46 50 44 Q46 46 42 44 Z',
  serratus_anterior: 'M30 40 L36 38 L36 54 L32 56 Q28 50 30 40 Z M64 38 L70 40 Q72 50 68 56 L64 54 Z',
  subscapularis: 'M36 36 L40 34 L40 44 L36 46 Z M60 34 L64 36 L64 46 L60 44 Z',
  deltoid: 'M28 32 Q32 28 36 32 L36 44 Q32 48 28 44 Z M64 32 Q68 28 72 32 L72 44 Q68 48 64 44 Z',

  // 복부
  rectus_abdominis: 'M44 50 L56 50 L56 74 Q50 76 44 74 Z',
  obliques: 'M34 52 L44 50 L42 72 L36 68 Q32 60 34 52 Z M56 50 L66 52 Q68 60 64 68 L58 72 Z',

  // 고관절/장요근
  iliopsoas: 'M42 72 L46 70 L44 82 L40 80 Z M54 70 L58 72 L60 80 L56 82 Z',
  tensor_fasciae_latae: 'M32 76 L38 74 L36 88 L30 86 Z M62 74 L68 76 L70 86 L64 88 Z',

  // 대퇴 (전면)
  rectus_femoris: 'M40 82 L48 80 L46 116 L38 118 Z M52 80 L60 82 L62 118 L54 116 Z',
  vastus_lateralis: 'M32 86 L40 84 L38 116 L30 118 Z M60 84 L68 86 L70 118 L62 116 Z',
  vastus_medialis: 'M46 100 L52 100 L54 118 L46 118 Z',
  adductors: 'M46 82 L54 82 L54 110 L46 110 Z',

  // 하퇴 (전면)
  tibialis_anterior: 'M38 120 L46 118 L44 144 L36 146 Z M54 118 L62 120 L64 146 L56 144 Z',
}

// 후면 뷰 근육 경로
const POSTERIOR_MUSCLE_PATHS: Record<string, string> = {
  // 후두하근
  suboccipitals: 'M44 16 Q50 14 56 16 L55 20 Q50 19 45 20 Z',

  // 승모근
  upper_trapezius: 'M36 22 L50 18 L64 22 L60 32 L50 28 L40 32 Z',
  upper_trapezius_high: 'M36 22 L50 18 L50 28 L40 32 Z',
  upper_trapezius_low: 'M50 18 L64 22 L60 32 L50 28 Z',
  middle_trapezius: 'M38 32 L62 32 L58 46 L42 46 Z',
  lower_trapezius: 'M44 46 L56 46 L52 58 L48 58 Z',

  // 견갑거근, 능형근
  levator_scapulae: 'M34 20 L40 24 L38 34 L32 30 Z M60 24 L66 20 L68 30 L62 34 Z',
  rhomboids: 'M36 36 L44 34 L44 50 L38 52 Z M56 34 L64 36 L62 52 L56 50 Z',

  // 광배근
  latissimus_dorsi: 'M26 44 L38 52 L34 70 L24 60 Z M62 52 L74 44 L76 60 L66 70 Z',

  // 척추기립근
  erector_spinae: 'M44 34 L56 34 L56 72 L44 72 Z',
  erector_spinae_convex: 'M44 34 L50 34 L50 72 L44 72 Z',
  erector_spinae_concave: 'M50 34 L56 34 L56 72 L50 72 Z',
  quadratus_lumborum: 'M40 62 L44 60 L44 72 L38 74 Z M56 60 L60 62 L62 74 L56 72 Z',

  // 삼각근 후면
  deltoid: 'M28 32 Q24 36 26 44 L32 46 L36 40 Q34 34 28 32 Z M72 32 Q76 36 74 44 L68 46 L64 40 Q66 34 72 32 Z',

  // 둔부
  gluteus_maximus: 'M34 74 L50 72 L66 74 L66 94 Q58 98 50 94 Q42 98 34 94 Z',
  gluteus_medius: 'M30 70 L38 68 L36 80 L28 78 Z M62 68 L70 70 L72 78 L64 80 Z',

  // 햄스트링
  hamstrings: 'M34 94 L48 92 L46 126 L32 128 Z M52 92 L66 94 L68 128 L54 126 Z',
  biceps_femoris: 'M32 94 L38 92 L36 126 L30 128 Z M62 92 L68 94 L70 128 L64 126 Z',

  // 비복근
  gastrocnemius: 'M34 128 L46 126 L44 150 L32 152 Z M54 126 L66 128 L68 152 L56 150 Z',
}

// 인체 실루엣
const BODY_SILHOUETTE = `
  M50 6
  C40 6 36 14 36 22
  C30 26 24 32 24 38
  L20 44
  C16 48 14 58 16 68
  L18 76
  C14 80 14 84 18 86
  L24 86
  C26 84 26 80 24 76
  L26 60
  L28 50
  L30 70
  L28 118
  L26 148
  C24 152 26 156 30 156
  L42 156
  C46 156 48 152 46 148
  L48 120
  L50 96
  L52 120
  L54 148
  C52 152 54 156 58 156
  L70 156
  C74 156 76 152 74 148
  L72 118
  L70 70
  L72 50
  L74 60
  L76 76
  C74 80 74 84 76 86
  L82 86
  C86 84 86 80 82 76
  L84 68
  C86 58 84 48 80 44
  L76 38
  C76 32 70 26 64 22
  C64 14 60 6 50 6
  Z
`

export function MuscleStatusVisualization({
  conditions,
  legAlignmentType,
  className
}: MuscleStatusVisualizationProps) {
  const { t, language } = useTranslation()
  const [activeView, setActiveView] = useState<'anterior' | 'posterior'>('anterior')
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(true)

  // 질환에 따른 영향받는 근육 계산
  const affectedMuscles = useMemo(() => {
    const muscles: Map<string, MuscleInfo> = new Map()

    // 질환별 근육 매핑 적용
    conditions.forEach((condition) => {
      const mapping = CONDITION_MUSCLE_MAP[condition.name]
      if (!mapping) return

      // 단축 근육
      mapping.contracted.forEach((muscleId) => {
        const data = MUSCLE_DATA[muscleId]
        if (!data) return

        const existing = muscles.get(muscleId)
        if (existing) {
          existing.source.push(condition.nameKo)
        } else {
          muscles.set(muscleId, {
            id: muscleId,
            nameEn: data.nameEn,
            nameKo: data.nameKo,
            status: 'contracted',
            source: [condition.nameKo],
          })
        }
      })

      // 이완 근육
      mapping.elongated.forEach((muscleId) => {
        const data = MUSCLE_DATA[muscleId]
        if (!data) return

        const existing = muscles.get(muscleId)
        if (existing) {
          // 이미 단축으로 표시된 경우 우선순위 유지
          if (existing.status !== 'contracted') {
            existing.source.push(condition.nameKo)
          }
        } else {
          muscles.set(muscleId, {
            id: muscleId,
            nameEn: data.nameEn,
            nameKo: data.nameKo,
            status: 'elongated',
            source: [condition.nameKo],
          })
        }
      })
    })

    // 다리 정렬 문제 적용
    if (legAlignmentType && legAlignmentType !== 'normal') {
      const legMapping = LEG_ALIGNMENT_MUSCLE_MAP[legAlignmentType]

      legMapping.contracted.forEach((muscleId) => {
        const data = MUSCLE_DATA[muscleId]
        if (!data) return

        const existing = muscles.get(muscleId)
        const sourceName = legAlignmentType === 'x_legs' ? 'X다리' : 'O다리'
        if (existing) {
          existing.source.push(sourceName)
        } else {
          muscles.set(muscleId, {
            id: muscleId,
            nameEn: data.nameEn,
            nameKo: data.nameKo,
            status: 'contracted',
            source: [sourceName],
          })
        }
      })

      legMapping.elongated.forEach((muscleId) => {
        const data = MUSCLE_DATA[muscleId]
        if (!data) return

        const existing = muscles.get(muscleId)
        const sourceName = legAlignmentType === 'x_legs' ? 'X다리' : 'O다리'
        if (existing) {
          if (existing.status !== 'contracted') {
            existing.source.push(sourceName)
          }
        } else {
          muscles.set(muscleId, {
            id: muscleId,
            nameEn: data.nameEn,
            nameKo: data.nameKo,
            status: 'elongated',
            source: [sourceName],
          })
        }
      })
    }

    return muscles
  }, [conditions, legAlignmentType])

  // 현재 뷰의 근육만 필터링
  const currentViewMuscles = useMemo(() => {
    const paths = activeView === 'anterior' ? ANTERIOR_MUSCLE_PATHS : POSTERIOR_MUSCLE_PATHS
    return Object.keys(paths).filter((id) => {
      const data = MUSCLE_DATA[id]
      if (!data) return false
      return data.view === activeView || data.view === 'both'
    })
  }, [activeView])

  // 통계
  const stats = useMemo(() => {
    let contracted = 0
    let elongated = 0
    affectedMuscles.forEach((m) => {
      if (m.status === 'contracted') contracted++
      else if (m.status === 'elongated') elongated++
    })
    return { contracted, elongated, total: contracted + elongated }
  }, [affectedMuscles])

  const getMuscleColor = (muscleId: string) => {
    const muscle = affectedMuscles.get(muscleId)
    if (!muscle) return COLORS.normal
    return muscle.status === 'contracted' ? COLORS.contracted : COLORS.elongated
  }

  const getTooltipContent = (muscleId: string) => {
    const muscle = affectedMuscles.get(muscleId)
    if (!muscle) return null

    return {
      name: language === 'ko' ? muscle.nameKo : muscle.nameEn,
      status: muscle.status === 'contracted'
        ? (language === 'ko' ? '단축 (짧아진 상태)' : 'Contracted (Shortened)')
        : (language === 'ko' ? '이완 (약화된 상태)' : 'Elongated (Weakened)'),
      source: muscle.source.join(', '),
    }
  }

  // 영향받는 근육이 없을 때
  if (affectedMuscles.size === 0) {
    return (
      <div className={cn('rounded-xl border border-border bg-surface p-6', className)}>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Eye className="h-3.5 w-3.5 text-primary" />
          </span>
          {t('muscleVisualization.title')}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
          <Info className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">{t('muscleVisualization.noIssues')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Eye className="h-3.5 w-3.5 text-primary" />
          </span>
          {t('muscleVisualization.title')}
        </h3>

        {/* 뷰 탭 */}
        <div className="flex rounded-lg bg-background p-1">
          <button
            onClick={() => setActiveView('anterior')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              activeView === 'anterior'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t('muscleVisualization.anterior')}
          </button>
          <button
            onClick={() => setActiveView('posterior')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              activeView === 'posterior'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t('muscleVisualization.posterior')}
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* 통계 */}
        <div className="mb-4 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-text-secondary">
              {t('muscleVisualization.contracted')}: <span className="font-semibold text-red-500">{stats.contracted}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-xs text-text-secondary">
              {t('muscleVisualization.elongated')}: <span className="font-semibold text-blue-500">{stats.elongated}</span>
            </span>
          </div>
        </div>

        {/* SVG 인체 + 근육 */}
        <div className="relative mx-auto aspect-[2/3] max-w-[280px]">
          <svg
            viewBox="0 0 100 160"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* 그라데이션 정의 */}
            <defs>
              <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="contracted-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.5)" />
              </linearGradient>
              <linearGradient id="elongated-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.5)" />
              </linearGradient>
            </defs>

            {/* 인체 실루엣 */}
            <path
              d={BODY_SILHOUETTE}
              fill={COLORS.body.fill}
              stroke={COLORS.body.stroke}
              strokeWidth="0.5"
            />

            {/* 근육 렌더링 */}
            {currentViewMuscles.map((muscleId) => {
              const paths = activeView === 'anterior' ? ANTERIOR_MUSCLE_PATHS : POSTERIOR_MUSCLE_PATHS
              const path = paths[muscleId]
              if (!path) return null

              const colors = getMuscleColor(muscleId)
              const isAffected = affectedMuscles.has(muscleId)
              const isHovered = hoveredMuscle === muscleId
              const muscle = affectedMuscles.get(muscleId)

              return (
                <g key={muscleId}>
                  <motion.path
                    d={path}
                    fill={isAffected
                      ? (muscle?.status === 'contracted' ? 'url(#contracted-gradient)' : 'url(#elongated-gradient)')
                      : colors.fill
                    }
                    stroke={colors.stroke}
                    strokeWidth={isAffected ? (isHovered ? 1.5 : 1) : 0}
                    filter={isAffected && isHovered
                      ? (muscle?.status === 'contracted' ? 'url(#glow-red)' : 'url(#glow-blue)')
                      : undefined
                    }
                    initial={{ opacity: 0.3 }}
                    animate={{
                      opacity: isAffected ? (isHovered ? 1 : 0.85) : 0.3,
                      scale: isHovered && isAffected ? 1.02 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    style={{ transformOrigin: 'center', transformBox: 'fill-box', cursor: isAffected ? 'pointer' : 'default' }}
                    onMouseEnter={() => isAffected && setHoveredMuscle(muscleId)}
                    onMouseLeave={() => setHoveredMuscle(null)}
                  />
                  {/* 펄스 효과 (영향받는 근육만) */}
                  {isAffected && (
                    <motion.path
                      d={path}
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth="1"
                      initial={{ opacity: 0.6 }}
                      animate={{
                        opacity: [0.6, 0.2, 0.6],
                        strokeWidth: [1, 2, 1],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.5,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </g>
              )
            })}
          </svg>

          {/* 툴팁 */}
          <AnimatePresence>
            {hoveredMuscle && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 shadow-lg"
              >
                {(() => {
                  const tooltip = getTooltipContent(hoveredMuscle)
                  if (!tooltip) return null
                  const muscle = affectedMuscles.get(hoveredMuscle)
                  return (
                    <div className="text-center">
                      <p className="font-semibold text-text-primary text-sm">{tooltip.name}</p>
                      <p className={cn(
                        'text-xs font-medium',
                        muscle?.status === 'contracted' ? 'text-red-500' : 'text-blue-500'
                      )}>
                        {tooltip.status}
                      </p>
                      <p className="mt-1 text-[10px] text-text-secondary">
                        {language === 'ko' ? '관련:' : 'Related:'} {tooltip.source}
                      </p>
                    </div>
                  )
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 범례 토글 */}
        <div className="mt-4">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex w-full items-center justify-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            {showLegend ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showLegend ? t('muscleVisualization.hideLegend') : t('muscleVisualization.showLegend')}
          </button>

          <AnimatePresence>
            {showLegend && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-lg border border-border bg-background/50 p-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-4 w-4 rounded bg-gradient-to-br from-red-500/80 to-red-500/50 border border-red-500/30" />
                      <div>
                        <p className="font-medium text-red-500">{t('muscleVisualization.contractedLabel')}</p>
                        <p className="text-text-secondary">{t('muscleVisualization.contractedDesc')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-4 w-4 rounded bg-gradient-to-br from-blue-500/80 to-blue-500/50 border border-blue-500/30" />
                      <div>
                        <p className="font-medium text-blue-500">{t('muscleVisualization.elongatedLabel')}</p>
                        <p className="text-text-secondary">{t('muscleVisualization.elongatedDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 영향받는 근육 목록 */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-text-secondary">{t('muscleVisualization.affectedMuscles')}</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(affectedMuscles.values())
              .filter((m) => {
                const data = MUSCLE_DATA[m.id]
                return data && (data.view === activeView || data.view === 'both')
              })
              .map((muscle) => (
                <span
                  key={muscle.id}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium border',
                    muscle.status === 'contracted'
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  )}
                  onMouseEnter={() => setHoveredMuscle(muscle.id)}
                  onMouseLeave={() => setHoveredMuscle(null)}
                >
                  {language === 'ko' ? muscle.nameKo : muscle.nameEn}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
