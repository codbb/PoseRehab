'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface MuscleState {
  id: string
  visible: boolean
  type: 'contracted' | 'stretched' | 'normal'
}

interface AnatomicalBodyProps {
  view: 'front' | 'rear'
  muscles: MuscleState[]
  className?: string
}

// 색상 정의
const COLORS = {
  bodyOutline: 'rgba(100, 100, 100, 0.4)',
  bodyFill: 'rgba(60, 60, 60, 0.15)',
  muscleDefault: 'rgba(100, 100, 100, 0.2)',
  contracted: {
    fill: 'rgba(239, 68, 68, 0.7)',
    stroke: '#EF4444',
  },
  stretched: {
    fill: 'rgba(59, 130, 246, 0.7)',
    stroke: '#3B82F6',
  },
}

// 전면 근육 경로 정의
const FRONT_MUSCLES: Record<string, { path: string; label: string }> = {
  // 목 굴곡근
  neck_flexors: {
    path: 'M46 22 Q50 20 54 22 L53 27 Q50 26 47 27 Z',
    label: '목 굴곡근',
  },
  // 대흉근 (좌우)
  pectoralis_left: {
    path: 'M38 32 Q42 30 48 32 L48 40 Q45 42 38 40 Z',
    label: '대흉근 (좌)',
  },
  pectoralis_right: {
    path: 'M52 32 Q58 30 62 32 L62 40 Q55 42 52 40 Z',
    label: '대흉근 (우)',
  },
  // 전거근 (좌우)
  serratus_anterior_left: {
    path: 'M32 38 L38 36 L38 48 L34 50 Q30 46 32 38 Z',
    label: '전거근 (좌)',
  },
  serratus_anterior_right: {
    path: 'M62 36 L68 38 Q70 46 66 50 L62 48 Z',
    label: '전거근 (우)',
  },
  // 복직근
  rectus_abdominis: {
    path: 'M46 42 L54 42 L54 68 Q50 70 46 68 Z',
    label: '복직근',
  },
  // 외복사근 (좌우)
  external_oblique_left: {
    path: 'M34 50 L44 46 L42 65 L36 60 Q32 55 34 50 Z',
    label: '외복사근 (좌)',
  },
  external_oblique_right: {
    path: 'M56 46 L66 50 Q68 55 64 60 L58 65 Z',
    label: '외복사근 (우)',
  },
  // 내복사근 (좌우)
  internal_oblique_left: {
    path: 'M40 52 L44 50 L43 62 L38 58 Z',
    label: '내복사근 (좌)',
  },
  internal_oblique_right: {
    path: 'M56 50 L60 52 L62 58 L57 62 Z',
    label: '내복사근 (우)',
  },
  // 횡복근
  transverse_abdominis: {
    path: 'M44 56 L56 56 L56 66 L44 66 Z',
    label: '횡복근',
  },
  // 장요근 (좌우)
  iliopsoas_left: {
    path: 'M42 68 L46 66 L44 78 L40 76 Z',
    label: '장요근 (좌)',
  },
  iliopsoas_right: {
    path: 'M54 66 L58 68 L60 76 L56 78 Z',
    label: '장요근 (우)',
  },
  // 고관절 굴곡근 (좌우)
  hip_flexors_left: {
    path: 'M36 72 L42 70 L40 82 L34 80 Z',
    label: '고관절 굴곡근 (좌)',
  },
  hip_flexors_right: {
    path: 'M58 70 L64 72 L66 80 L60 82 Z',
    label: '고관절 굴곡근 (우)',
  },
  // 대퇴근막장근 (좌우)
  tensor_fasciae_left: {
    path: 'M32 78 L38 76 L36 90 L30 88 Z',
    label: '대퇴근막장근 (좌)',
  },
  tensor_fasciae_right: {
    path: 'M62 76 L68 78 L70 88 L64 90 Z',
    label: '대퇴근막장근 (우)',
  },
  // 대퇴직근 (좌우)
  rectus_femoris_left: {
    path: 'M38 82 L46 80 L44 110 L36 112 Z',
    label: '대퇴직근 (좌)',
  },
  rectus_femoris_right: {
    path: 'M54 80 L62 82 L64 112 L56 110 Z',
    label: '대퇴직근 (우)',
  },
  // 내전근 (좌우)
  adductors_left: {
    path: 'M44 82 L50 80 L50 105 L44 108 Z',
    label: '내전근 (좌)',
  },
  adductors_right: {
    path: 'M50 80 L56 82 L56 108 L50 105 Z',
    label: '내전근 (우)',
  },
  // 전경골근 (좌우)
  tibialis_anterior_left: {
    path: 'M38 115 L44 113 L43 138 L37 140 Z',
    label: '전경골근 (좌)',
  },
  tibialis_anterior_right: {
    path: 'M56 113 L62 115 L63 140 L57 138 Z',
    label: '전경골근 (우)',
  },
}

// 후면 근육 경로 정의
const REAR_MUSCLES: Record<string, { path: string; label: string }> = {
  // 목 신전근
  neck_extensors: {
    path: 'M46 18 Q50 16 54 18 L54 24 Q50 23 46 24 Z',
    label: '목 신전근',
  },
  // 상부 승모근 (좌우)
  upper_trapezius_left: {
    path: 'M38 24 L48 22 L48 30 L40 32 Z',
    label: '상부 승모근 (좌)',
  },
  upper_trapezius_right: {
    path: 'M52 22 L62 24 L60 32 L52 30 Z',
    label: '상부 승모근 (우)',
  },
  // 견갑거근 (좌우)
  levator_scapulae_left: {
    path: 'M34 22 L40 24 L38 32 L32 30 Z',
    label: '견갑거근 (좌)',
  },
  levator_scapulae_right: {
    path: 'M60 24 L66 22 L68 30 L62 32 Z',
    label: '견갑거근 (우)',
  },
  // 중부 승모근
  middle_trapezius: {
    path: 'M36 32 L64 32 L60 42 L40 42 Z',
    label: '중부 승모근',
  },
  // 하부 승모근
  lower_trapezius: {
    path: 'M42 42 L58 42 L54 54 L46 54 Z',
    label: '하부 승모근',
  },
  // 능형근 (좌우)
  rhomboids_left: {
    path: 'M36 34 L44 32 L44 46 L38 48 Z',
    label: '능형근 (좌)',
  },
  rhomboids_right: {
    path: 'M56 32 L64 34 L62 48 L56 46 Z',
    label: '능형근 (우)',
  },
  // 극하근 (좌우)
  infraspinatus_left: {
    path: 'M30 32 L38 34 L36 44 L28 42 Z',
    label: '극하근 (좌)',
  },
  infraspinatus_right: {
    path: 'M62 34 L70 32 L72 42 L64 44 Z',
    label: '극하근 (우)',
  },
  // 광배근 (좌우)
  latissimus_dorsi_left: {
    path: 'M28 42 L42 48 L38 65 L26 58 Z',
    label: '광배근 (좌)',
  },
  latissimus_dorsi_right: {
    path: 'M58 48 L72 42 L74 58 L62 65 Z',
    label: '광배근 (우)',
  },
  // 흉추 기립근
  thoracic_erector: {
    path: 'M44 46 L56 46 L56 60 L44 60 Z',
    label: '흉추 기립근',
  },
  // 요추 근육
  lumbar_muscles: {
    path: 'M44 60 L56 60 L56 72 L44 72 Z',
    label: '요추 근육',
  },
  // 요추 기립근
  lumbar_erector: {
    path: 'M42 62 L44 60 L44 74 L40 76 Z M56 60 L58 62 L60 76 L56 74 Z',
    label: '요추 기립근',
  },
  // 대둔근 (좌우)
  gluteus_maximus_left: {
    path: 'M36 74 L50 72 L48 90 L34 88 Q32 82 36 74 Z',
    label: '대둔근 (좌)',
  },
  gluteus_maximus_right: {
    path: 'M50 72 L64 74 Q68 82 66 88 L52 90 Z',
    label: '대둔근 (우)',
  },
  // 중둔근 (좌우)
  gluteus_medius_left: {
    path: 'M32 70 L40 68 L38 78 L30 76 Z',
    label: '중둔근 (좌)',
  },
  gluteus_medius_right: {
    path: 'M60 68 L68 70 L70 76 L62 78 Z',
    label: '중둔근 (우)',
  },
  // 햄스트링 (좌우)
  hamstrings_left: {
    path: 'M36 90 L48 88 L46 120 L34 122 Z',
    label: '햄스트링 (좌)',
  },
  hamstrings_right: {
    path: 'M52 88 L64 90 L66 122 L54 120 Z',
    label: '햄스트링 (우)',
  },
  // 비복근 (좌우)
  gastrocnemius_left: {
    path: 'M36 122 L46 120 L44 142 L34 144 Z',
    label: '비복근 (좌)',
  },
  gastrocnemius_right: {
    path: 'M54 120 L64 122 L66 144 L56 142 Z',
    label: '비복근 (우)',
  },
}

// 근육 ID 매핑 (통합 ID -> 실제 근육 경로)
const MUSCLE_ID_TO_PATHS: Record<string, { front?: string[]; rear?: string[] }> = {
  neck_flexors: { front: ['neck_flexors'] },
  neck_extensors: { rear: ['neck_extensors'] },
  pectoralis: { front: ['pectoralis_left', 'pectoralis_right'] },
  serratus_anterior: { front: ['serratus_anterior_left', 'serratus_anterior_right'] },
  external_oblique: { front: ['external_oblique_left', 'external_oblique_right'] },
  internal_oblique: { front: ['internal_oblique_left', 'internal_oblique_right'] },
  transverse_abdominis: { front: ['transverse_abdominis'] },
  rectus_abdominis: { front: ['rectus_abdominis'] },
  iliopsoas: { front: ['iliopsoas_left', 'iliopsoas_right'] },
  hip_flexors: { front: ['hip_flexors_left', 'hip_flexors_right'] },
  tensor_fasciae: { front: ['tensor_fasciae_left', 'tensor_fasciae_right'] },
  rectus_femoris: { front: ['rectus_femoris_left', 'rectus_femoris_right'] },
  adductors: { front: ['adductors_left', 'adductors_right'] },
  tibialis_anterior: { front: ['tibialis_anterior_left', 'tibialis_anterior_right'] },
  upper_trapezius: { rear: ['upper_trapezius_left', 'upper_trapezius_right'] },
  levator_scapulae: { rear: ['levator_scapulae_left', 'levator_scapulae_right'] },
  middle_trapezius: { rear: ['middle_trapezius'] },
  lower_trapezius: { rear: ['lower_trapezius'] },
  rhomboids: { rear: ['rhomboids_left', 'rhomboids_right'] },
  infraspinatus: { rear: ['infraspinatus_left', 'infraspinatus_right'] },
  latissimus_dorsi: { rear: ['latissimus_dorsi_left', 'latissimus_dorsi_right'] },
  thoracic_erector: { rear: ['thoracic_erector'] },
  lumbar_muscles: { rear: ['lumbar_muscles'] },
  lumbar_erector: { rear: ['lumbar_erector'] },
  gluteus_maximus: { rear: ['gluteus_maximus_left', 'gluteus_maximus_right'] },
  gluteus_medius: { rear: ['gluteus_medius_left', 'gluteus_medius_right'] },
  hamstrings: { rear: ['hamstrings_left', 'hamstrings_right'] },
  gastrocnemius: { rear: ['gastrocnemius_left', 'gastrocnemius_right'] },
}

// 인체 실루엣 경로
const BODY_SILHOUETTE_FRONT = `
  M50 8
  C42 8 38 14 38 20
  L38 22
  C32 24 28 28 28 32
  L30 35
  C28 38 20 42 18 50
  L16 70
  C14 75 15 80 18 82
  L22 82
  C24 80 25 78 24 75
  L28 55
  L30 50
  L32 68
  L34 75
  L32 110
  L30 140
  C29 144 30 146 32 147
  L40 147
  C42 146 43 144 42 140
  L44 115
  L46 90
  L50 88
  L54 90
  L56 115
  L58 140
  C57 144 58 146 60 147
  L68 147
  C70 146 71 144 70 140
  L68 110
  L66 75
  L68 68
  L70 50
  L72 55
  L76 75
  C75 78 76 80 78 82
  L82 82
  C85 80 86 75 84 70
  L82 50
  C80 42 72 38 70 35
  L72 32
  C72 28 68 24 62 22
  L62 20
  C62 14 58 8 50 8
  Z
`

const BODY_SILHOUETTE_REAR = `
  M50 8
  C42 8 38 14 38 20
  L38 22
  C32 24 28 28 28 32
  L30 35
  C28 38 20 42 18 50
  L16 70
  C14 75 15 80 18 82
  L22 82
  C24 80 25 78 24 75
  L28 55
  L30 50
  L32 68
  L34 75
  L32 110
  L30 140
  C29 144 30 146 32 147
  L40 147
  C42 146 43 144 42 140
  L44 115
  L46 90
  L50 88
  L54 90
  L56 115
  L58 140
  C57 144 58 146 60 147
  L68 147
  C70 146 71 144 70 140
  L68 110
  L66 75
  L68 68
  L70 50
  L72 55
  L76 75
  C75 78 76 80 78 82
  L82 82
  C85 80 86 75 84 70
  L82 50
  C80 42 72 38 70 35
  L72 32
  C72 28 68 24 62 22
  L62 20
  C62 14 58 8 50 8
  Z
`

export function AnatomicalBody({ view, muscles, className }: AnatomicalBodyProps) {
  const muscleDefinitions = view === 'front' ? FRONT_MUSCLES : REAR_MUSCLES

  // 근육 상태를 path ID로 변환
  const getMuscleState = (pathId: string): MuscleState | undefined => {
    for (const muscle of muscles) {
      const mapping = MUSCLE_ID_TO_PATHS[muscle.id]
      if (mapping) {
        const paths = view === 'front' ? mapping.front : mapping.rear
        if (paths?.includes(pathId)) {
          return muscle
        }
      }
    }
    return undefined
  }

  const getMuscleColor = (state: MuscleState | undefined) => {
    if (!state || !state.visible) {
      return { fill: COLORS.muscleDefault, stroke: 'transparent' }
    }
    if (state.type === 'contracted') {
      return COLORS.contracted
    }
    if (state.type === 'stretched') {
      return COLORS.stretched
    }
    return { fill: COLORS.muscleDefault, stroke: 'transparent' }
  }

  return (
    <svg
      viewBox="0 0 100 155"
      className={cn('w-full h-full', className)}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 인체 실루엣 */}
      <path
        d={view === 'front' ? BODY_SILHOUETTE_FRONT : BODY_SILHOUETTE_REAR}
        fill={COLORS.bodyFill}
        stroke={COLORS.bodyOutline}
        strokeWidth="0.5"
      />

      {/* 근육 렌더링 */}
      {Object.entries(muscleDefinitions).map(([id, muscle]) => {
        const state = getMuscleState(id)
        const colors = getMuscleColor(state)
        const isVisible = state?.visible

        return (
          <motion.path
            key={id}
            id={id}
            d={muscle.path}
            initial={{ opacity: 0.3, scale: 0.95 }}
            animate={{
              opacity: isVisible ? 1 : 0.3,
              scale: isVisible ? 1 : 0.95,
              fill: colors.fill,
            }}
            transition={{ duration: 0.3 }}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={isVisible ? '1' : '0'}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
          >
            <title>{muscle.label}</title>
          </motion.path>
        )
      })}

      {/* 활성 근육 펄스 효과 */}
      {Object.entries(muscleDefinitions).map(([id, muscle]) => {
        const state = getMuscleState(id)
        if (!state?.visible) return null

        const colors = getMuscleColor(state)

        return (
          <motion.path
            key={`pulse-${id}`}
            d={muscle.path}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="1.5"
            initial={{ opacity: 0.8 }}
            animate={{
              opacity: [0.8, 0.3, 0.8],
              strokeWidth: [1.5, 2.5, 1.5],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </svg>
  )
}

// 근육 ID가 현재 뷰에서 표시 가능한지 확인
export function isMuscleVisibleInView(muscleId: string, view: 'front' | 'rear'): boolean {
  const mapping = MUSCLE_ID_TO_PATHS[muscleId]
  if (!mapping) return false
  return view === 'front' ? !!mapping.front : !!mapping.rear
}

// 뷰별 근육 목록 가져오기
export function getMusclesForView(view: 'front' | 'rear'): string[] {
  return Object.entries(MUSCLE_ID_TO_PATHS)
    .filter(([_, mapping]) => (view === 'front' ? mapping.front : mapping.rear))
    .map(([id]) => id)
}
