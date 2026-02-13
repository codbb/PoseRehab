'use client'

import { motion } from 'framer-motion'
import { Play, Clock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'

// 운동별 SVG 아이콘 정의
const ExerciseIcons: Record<string, React.FC<{ className?: string }>> = {
  // 턱 당기기 - 목을 뒤로 당기는 동작
  chin_tuck: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="32" cy="16" r="10" />
      <path d="M32 26 L32 45" />
      <path d="M22 35 L32 30 L42 35" />
      <path d="M20 55 L32 45 L44 55" />
      <path d="M38 16 L45 14" strokeDasharray="2 2" />
      <path d="M45 14 L42 10" />
      <path d="M45 14 L42 18" />
    </svg>
  ),

  // 목 스트레칭 - 목을 옆으로 기울이는 동작
  neck_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="36" cy="16" rx="10" ry="8" transform="rotate(20 36 16)" />
      <path d="M32 24 L32 45" />
      <path d="M22 35 L32 30 L42 35" />
      <path d="M20 55 L32 45 L44 55" />
      <path d="M42 20 L52 28" strokeDasharray="2 2" />
    </svg>
  ),

  // 상부 승모근 스트레칭
  upper_trap_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="32" cy="14" r="8" />
      <path d="M32 22 L32 40" />
      <path d="M20 32 L32 26 L44 32" />
      <path d="M18 50 L32 40 L46 50" />
      <path d="M44 32 L54 22" />
      <path d="M54 22 L48 22" />
      <path d="M54 22 L54 28" />
      <path d="M36 14 L28 8" strokeDasharray="2 2" />
    </svg>
  ),

  // 월 슬라이드 - 벽에 기대어 팔 올리기
  wall_slide: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="50" y="5" width="4" height="54" fill="currentColor" opacity="0.2" />
      <circle cx="32" cy="14" r="8" />
      <path d="M32 22 L32 42" />
      <path d="M24 30 L32 24 L40 30" />
      <path d="M40 30 L48 18" />
      <path d="M24 30 L16 18" />
      <path d="M24 52 L32 42 L40 52" />
      <path d="M45 20 L45 12" strokeDasharray="2 2" />
      <path d="M19 20 L19 12" strokeDasharray="2 2" />
    </svg>
  ),

  // 가슴 스트레칭 - 문틀에서 가슴 펴기
  chest_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="5" width="4" height="54" fill="currentColor" opacity="0.2" />
      <rect x="52" y="5" width="4" height="54" fill="currentColor" opacity="0.2" />
      <circle cx="32" cy="18" r="8" />
      <path d="M32 26 L32 42" />
      <path d="M24 52 L32 42 L40 52" />
      <path d="M24 34 L12 24" />
      <path d="M40 34 L52 24" />
      <path d="M28 30 L36 30" strokeDasharray="2 2" />
    </svg>
  ),

  // 골반 틸트 - 누워서 골반 기울이기
  pelvic_tilt: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="14" cy="44" r="6" />
      <path d="M20 44 L36 44" />
      <path d="M36 44 L42 38" />
      <path d="M42 38 L54 44" />
      <path d="M36 48 L36 38" strokeDasharray="2 2" />
      <path d="M33 38 L39 38" />
    </svg>
  ),

  // 클램쉘 - 옆으로 누워 다리 들기
  clamshell: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="14" cy="40" r="6" />
      <path d="M20 40 L34 40" />
      <path d="M34 40 L40 44" />
      <path d="M40 44 L52 44" />
      <path d="M34 40 L42 28" />
      <path d="M42 28 L54 28" />
      <path d="M38 36 L38 32" strokeDasharray="2 2" />
    </svg>
  ),

  // 힙 브릿지 - 누워서 엉덩이 들기
  bridge: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="12" cy="44" r="5" />
      <path d="M17 44 L24 44" />
      <path d="M24 44 L32 30" />
      <path d="M32 30 L40 44" />
      <path d="M40 44 L50 50" />
      <path d="M50 50 L56 50" />
      <path d="M32 34 L32 26" strokeDasharray="2 2" />
      <path d="M29 26 L35 26" />
    </svg>
  ),

  // 플랭크 - 엎드려 버티기
  plank: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="12" cy="34" r="5" />
      <path d="M17 36 L52 42" />
      <path d="M20 42 L20 50" />
      <path d="M48 46 L48 50" />
      <path d="M30 36 L30 42" strokeDasharray="2 2" />
    </svg>
  ),

  // 고양이-소 스트레칭
  cat_cow: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="55" x2="59" y2="55" strokeWidth="3" />
      {/* Cat pose (arched back) */}
      <circle cx="12" cy="30" r="4" />
      <path d="M16 32 L22 32" />
      <path d="M22 32 Q32 20 42 32" />
      <path d="M42 32 L48 32" />
      <path d="M22 36 L22 55" />
      <path d="M42 36 L42 55" />
      {/* Arrow indicating movement */}
      <path d="M32 22 L32 14" strokeDasharray="2 2" />
      <path d="M29 17 L32 14 L35 17" />
    </svg>
  ),

  // 데드버그 - 누워서 팔다리 교차
  dead_bug: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="32" cy="44" r="5" />
      <path d="M27 44 L12 44" />
      <path d="M37 44 L52 44" />
      {/* Raised arm and leg */}
      <path d="M12 44 L8 30" />
      <path d="M52 44 L56 30" />
      {/* Bent limbs */}
      <path d="M22 48 L22 55" />
      <path d="M42 48 L42 55" />
      <path d="M8 30 L4 26" />
      <path d="M56 30 L60 26" />
    </svg>
  ),

  // 힙 어브덕션 - 옆으로 다리 들기
  hip_abduction: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="50" x2="59" y2="50" strokeWidth="3" />
      <circle cx="14" cy="38" r="6" />
      <path d="M20 38 L34 38" />
      <path d="M34 38 L34 50" />
      <path d="M34 38 L50 20" />
      <path d="M44 28 L44 22" strokeDasharray="2 2" />
      <path d="M41 25 L47 25" />
    </svg>
  ),

  // IT밴드 스트레칭
  it_band_stretch: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="32" cy="12" r="6" />
      <path d="M32 18 L32 32" />
      <path d="M24 26 L32 22 L40 26" />
      <path d="M32 32 L24 50" />
      <path d="M32 32 L48 50" />
      <path d="M24 50 L18 54" />
      <path d="M48 50 L54 46" />
      {/* Stretch indicator */}
      <path d="M36 42 L44 36" strokeDasharray="2 2" />
    </svg>
  ),

  // 사이드 런지
  side_lunge: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="55" x2="59" y2="55" strokeWidth="3" />
      <circle cx="24" cy="14" r="6" />
      <path d="M24 20 L24 32" />
      <path d="M16 28 L24 24 L32 28" />
      <path d="M24 32 L14 55" />
      <path d="M24 32 L44 45" />
      <path d="M44 45 L52 55" />
      <path d="M38 48 L38 42" strokeDasharray="2 2" />
    </svg>
  ),

  // 스쿼트
  squat: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="55" x2="59" y2="55" strokeWidth="3" />
      <circle cx="32" cy="14" r="6" />
      <path d="M32 20 L32 30" />
      <path d="M24 26 L32 22 L40 26" />
      <path d="M32 30 L24 45" />
      <path d="M32 30 L40 45" />
      <path d="M24 45 L20 55" />
      <path d="M40 45 L44 55" />
      <path d="M28 38 L28 32" strokeDasharray="2 2" />
    </svg>
  ),

  // 기본 아이콘 (매핑되지 않은 운동용)
  default: ({ className }) => (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="32" cy="14" r="8" />
      <path d="M32 22 L32 40" />
      <path d="M22 32 L32 26 L42 32" />
      <path d="M24 55 L32 40 L40 55" />
    </svg>
  ),
}

// 운동별 상세 정보
interface ExerciseGuideInfo {
  description: string
  descriptionKo: string
  sets: number
  reps: number | string
  duration?: number // seconds, for holds
}

const EXERCISE_GUIDE_INFO: Record<string, ExerciseGuideInfo> = {
  chin_tuck: {
    description: 'Pull chin back while keeping eyes forward',
    descriptionKo: '시선은 정면을 유지하며 턱을 뒤로 당기세요',
    sets: 3,
    reps: 15,
  },
  neck_stretch: {
    description: 'Gently tilt head to stretch neck muscles',
    descriptionKo: '머리를 옆으로 기울여 목 근육을 스트레칭하세요',
    sets: 3,
    reps: '30초',
  },
  upper_trap_stretch: {
    description: 'Lower shoulder while tilting head away',
    descriptionKo: '어깨를 내리고 반대쪽으로 머리를 기울이세요',
    sets: 3,
    reps: '30초',
  },
  wall_slide: {
    description: 'Slide arms up and down against wall',
    descriptionKo: '등을 벽에 붙이고 팔을 위아래로 움직이세요',
    sets: 3,
    reps: 12,
  },
  chest_stretch: {
    description: 'Place arms on doorframe and lean forward',
    descriptionKo: '팔을 문틀에 대고 앞으로 기울이세요',
    sets: 3,
    reps: '30초',
  },
  pelvic_tilt: {
    description: 'Flatten lower back against floor by tilting pelvis',
    descriptionKo: '골반을 기울여 허리를 바닥에 붙이세요',
    sets: 3,
    reps: 15,
  },
  clamshell: {
    description: 'Open knees like a clamshell while keeping feet together',
    descriptionKo: '발을 붙인 채 무릎을 조개처럼 열어주세요',
    sets: 3,
    reps: 15,
  },
  bridge: {
    description: 'Lift hips toward ceiling and squeeze glutes',
    descriptionKo: '엉덩이를 천장 방향으로 들어올리세요',
    sets: 3,
    reps: 12,
  },
  plank: {
    description: 'Hold body in a straight line from head to heels',
    descriptionKo: '머리부터 발뒤꿈치까지 일직선을 유지하세요',
    sets: 3,
    reps: '30초',
    duration: 30,
  },
  cat_cow: {
    description: 'Alternate between arching and rounding spine',
    descriptionKo: '등을 둥글게 말았다가 아래로 젖혀주세요',
    sets: 3,
    reps: 10,
  },
  dead_bug: {
    description: 'Lower opposite arm and leg while keeping core stable',
    descriptionKo: '코어를 안정시키며 반대쪽 팔다리를 내리세요',
    sets: 3,
    reps: 10,
  },
  hip_abduction: {
    description: 'Lift leg to the side while lying down',
    descriptionKo: '옆으로 누워 다리를 옆으로 들어올리세요',
    sets: 3,
    reps: 15,
  },
  it_band_stretch: {
    description: 'Cross leg behind and lean to stretch outer thigh',
    descriptionKo: '다리를 뒤로 교차하고 기울여 스트레칭하세요',
    sets: 3,
    reps: '30초',
  },
  side_lunge: {
    description: 'Step to the side and lower into a lunge',
    descriptionKo: '옆으로 걸어가며 런지 자세를 취하세요',
    sets: 3,
    reps: 12,
  },
  squat: {
    description: 'Lower body by bending knees, keep back straight',
    descriptionKo: '무릎을 굽혀 몸을 낮추고 등은 곧게 유지하세요',
    sets: 3,
    reps: 15,
  },
}

interface ExerciseGuideCardProps {
  exerciseId: string
  name: string
  nameKo: string
  onStartExercise?: () => void
  compact?: boolean
}

export function ExerciseGuideCard({
  exerciseId,
  name,
  nameKo,
  onStartExercise,
  compact = false,
}: ExerciseGuideCardProps) {
  const { language } = useTranslation()

  const Icon = ExerciseIcons[exerciseId] || ExerciseIcons.default
  const info = EXERCISE_GUIDE_INFO[exerciseId] || {
    description: 'Follow the exercise instructions',
    descriptionKo: '운동 지침을 따라하세요',
    sets: 3,
    reps: 10,
  }

  const displayName = language === 'ko' ? nameKo : name
  const displayDescription = language === 'ko' ? info.descriptionKo : info.description
  const repsLabel = typeof info.reps === 'number'
    ? `${info.sets}${language === 'ko' ? '세트' : ' sets'} × ${info.reps}${language === 'ko' ? '회' : ' reps'}`
    : `${info.sets}${language === 'ko' ? '세트' : ' sets'} × ${info.reps}`

  if (compact) {
    return (
      <motion.button
        onClick={onStartExercise}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-surface hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-text-primary truncate">{displayName}</p>
          <p className="text-xs text-text-secondary">{repsLabel}</p>
        </div>
        <Play className="w-4 h-4 text-primary flex-shrink-0" />
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface overflow-hidden"
    >
      <div className="p-4">
        <div className="flex gap-4">
          {/* Exercise Icon */}
          <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20">
            <Icon className="w-14 h-14 text-primary" />
          </div>

          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-text-primary">{displayName}</h4>
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{displayDescription}</p>

            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{repsLabel}</span>
              </div>
              {info.duration && (
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{info.duration}s</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button
          size="sm"
          className="w-full mt-3"
          onClick={onStartExercise}
        >
          <Play className="w-3.5 h-3.5 mr-1.5" />
          {language === 'ko' ? '운동 시작' : 'Start Exercise'}
        </Button>
      </div>
    </motion.div>
  )
}

// 운동 카드 그리드 컴포넌트
interface ExerciseGuideGridProps {
  exercises: { id: string; name: string; nameKo: string }[]
  onStartExercise: (exerciseId: string) => void
  compact?: boolean
}

export function ExerciseGuideGrid({
  exercises,
  onStartExercise,
  compact = false,
}: ExerciseGuideGridProps) {
  return (
    <div className={compact
      ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    }>
      {exercises.map((ex) => (
        <ExerciseGuideCard
          key={ex.id}
          exerciseId={ex.id}
          name={ex.name}
          nameKo={ex.nameKo}
          onStartExercise={() => onStartExercise(ex.id)}
          compact={compact}
        />
      ))}
    </div>
  )
}
