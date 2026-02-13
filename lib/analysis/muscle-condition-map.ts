import type { Pose3DPredictedCondition, LegType } from '@/types/analysis-result'

// ── Types ──
export type MuscleStatus = 'contracted' | 'elongated'

interface ConditionMuscleMapping {
  contracted: string[]
  elongated: string[]
}

// ── Condition → Muscle mappings ──
// Exact-match keys (from single-view analyzer)
const CONDITION_MUSCLE_MAP: Record<string, ConditionMuscleMapping> = {
  'Forward Head Posture (Turtle Neck)': {
    contracted: ['scm', 'scalenes', 'upper_trapezius', 'pectoralis_major', 'suboccipitals'],
    elongated: ['deep_neck_flexors', 'lower_trapezius', 'middle_trapezius'],
  },
  'Round Shoulder': {
    contracted: ['pectoralis_major', 'pectoralis_minor', 'upper_trapezius', 'subscapularis'],
    elongated: ['middle_trapezius', 'lower_trapezius', 'rhomboids', 'serratus_anterior'],
  },
  'Shoulder Imbalance': {
    contracted: ['upper_trapezius_high'],
    elongated: ['upper_trapezius_low'],
  },
  'Upper Cross Syndrome': {
    contracted: ['scm', 'scalenes', 'upper_trapezius', 'levator_scapulae', 'pectoralis_major', 'pectoralis_minor'],
    elongated: ['deep_neck_flexors', 'lower_trapezius', 'middle_trapezius', 'rhomboids', 'serratus_anterior'],
  },
  'Pelvic Misalignment': {
    contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
    elongated: ['rectus_abdominis', 'gluteus_maximus', 'hamstrings'],
  },
  'Anterior Pelvic Tilt': {
    contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
    elongated: ['rectus_abdominis', 'gluteus_maximus', 'hamstrings'],
  },
  'Posterior Pelvic Tilt': {
    contracted: ['hamstrings', 'rectus_abdominis', 'gluteus_maximus'],
    elongated: ['iliopsoas', 'rectus_femoris', 'erector_spinae'],
  },
  'Lower Cross Syndrome': {
    contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
    elongated: ['rectus_abdominis', 'gluteus_maximus', 'gluteus_medius', 'hamstrings'],
  },
  'Scoliosis Risk': {
    contracted: ['erector_spinae_convex', 'quadratus_lumborum'],
    elongated: ['erector_spinae_concave'],
  },
}

// Prefix-match patterns for dynamic condition names from multi-view analyzer
// e.g. "Neck Forward Tilt 47.8° (Normal: 0~15°)" matches prefix "Neck Forward Tilt"
const CONDITION_PREFIX_MAP: Array<{ prefix: string; mapping: ConditionMuscleMapping }> = [
  // Side view: Neck forward tilt → same as Forward Head Posture
  {
    prefix: 'Neck Forward Tilt',
    mapping: {
      contracted: ['scm', 'scalenes', 'upper_trapezius', 'pectoralis_major', 'suboccipitals'],
      elongated: ['deep_neck_flexors', 'lower_trapezius', 'middle_trapezius'],
    },
  },
  // Side view: Shoulder forward → same as Round Shoulder
  {
    prefix: 'Shoulder Forward',
    mapping: {
      contracted: ['pectoralis_major', 'pectoralis_minor', 'upper_trapezius', 'subscapularis'],
      elongated: ['middle_trapezius', 'lower_trapezius', 'rhomboids', 'serratus_anterior'],
    },
  },
  // Side view: Spine curvature (excessive kyphosis/lordosis)
  {
    prefix: 'Spine Curvature',
    mapping: {
      contracted: ['erector_spinae', 'iliopsoas', 'pectoralis_major'],
      elongated: ['rectus_abdominis', 'gluteus_maximus', 'hamstrings'],
    },
  },
  // Front view: Shoulder tilt → same as Shoulder Imbalance
  {
    prefix: 'Shoulder Tilt',
    mapping: {
      contracted: ['upper_trapezius_high', 'levator_scapulae'],
      elongated: ['upper_trapezius_low', 'middle_trapezius'],
    },
  },
  // Front view: Pelvis tilt → anterior pelvic tilt pattern
  {
    prefix: 'Pelvis Tilt',
    mapping: {
      contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
      elongated: ['rectus_abdominis', 'gluteus_maximus', 'hamstrings'],
    },
  },
  // Back view: Spine lateral deviation → same as Scoliosis Risk
  {
    prefix: 'Spine Lateral Deviation',
    mapping: {
      contracted: ['erector_spinae_convex', 'quadratus_lumborum'],
      elongated: ['erector_spinae_concave'],
    },
  },
  // Back view: Scapula height difference
  {
    prefix: 'Scapula Height Difference',
    mapping: {
      contracted: ['upper_trapezius_high', 'levator_scapulae'],
      elongated: ['upper_trapezius_low', 'lower_trapezius', 'rhomboids'],
    },
  },
  // Front view: Leg alignment deviation (handled mostly via legAlignmentType, but add basic mapping)
  {
    prefix: 'Leg Alignment Deviation',
    mapping: {
      contracted: ['tensor_fasciae_latae'],
      elongated: ['gluteus_medius'],
    },
  },
  // Complex: Upper body (neck + shoulder)
  {
    prefix: 'Upper Body Complex',
    mapping: {
      contracted: ['scm', 'scalenes', 'upper_trapezius', 'pectoralis_major', 'pectoralis_minor', 'suboccipitals'],
      elongated: ['deep_neck_flexors', 'lower_trapezius', 'middle_trapezius', 'rhomboids', 'serratus_anterior'],
    },
  },
  // Complex: Lower body (pelvis + spine)
  {
    prefix: 'Lower Body Complex',
    mapping: {
      contracted: ['iliopsoas', 'rectus_femoris', 'erector_spinae', 'tensor_fasciae_latae'],
      elongated: ['rectus_abdominis', 'gluteus_maximus', 'gluteus_medius', 'hamstrings'],
    },
  },
  // Complex: Shoulder-spine
  {
    prefix: 'Shoulder-Spine Complex',
    mapping: {
      contracted: ['upper_trapezius', 'pectoralis_major', 'erector_spinae_convex'],
      elongated: ['middle_trapezius', 'lower_trapezius', 'rhomboids', 'erector_spinae_concave'],
    },
  },
]

/**
 * Find the muscle mapping for a condition name.
 * First tries exact match, then prefix match for dynamic names with measurements.
 */
function findConditionMapping(conditionName: string): ConditionMuscleMapping | null {
  // 1. Exact match
  const exact = CONDITION_MUSCLE_MAP[conditionName]
  if (exact) return exact

  // 2. Prefix match (for dynamic names like "Neck Forward Tilt 47.8° (Normal: 0~15°)")
  for (const entry of CONDITION_PREFIX_MAP) {
    if (conditionName.startsWith(entry.prefix)) {
      return entry.mapping
    }
  }

  return null
}

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

// ── Muscle → Region mapping ──
// Maps muscle keys to region keys in muscle-mapping.json
const MUSCLE_TO_REGION_MAP: Record<string, string[]> = {
  // Neck
  scm: ['neck_l', 'neck_r'],
  scalenes: ['neck_l', 'neck_r'],
  deep_neck_flexors: ['neck_l', 'neck_r'],
  suboccipitals: ['neck_l', 'neck_r'],

  // Shoulder
  upper_trapezius: ['shoulder_l', 'shoulder_r'],
  upper_trapezius_high: ['shoulder_l'],
  upper_trapezius_low: ['shoulder_r'],
  levator_scapulae: ['shoulder_l', 'shoulder_r'],
  middle_trapezius: ['shoulder_l', 'shoulder_r'],
  lower_trapezius: ['shoulder_l', 'shoulder_r'],
  deltoid: ['shoulder_l', 'shoulder_r'],
  subscapularis: ['shoulder_l', 'shoulder_r'],
  rhomboids: ['shoulder_l', 'shoulder_r'],
  serratus_anterior: ['shoulder_l', 'shoulder_r'],

  // Chest
  pectoralis_major: ['chest_l', 'chest_r'],
  pectoralis_minor: ['chest_l', 'chest_r'],

  // Back
  latissimus_dorsi: ['upper_back_l', 'upper_back_r'],
  erector_spinae: ['upper_back_l', 'upper_back_r'],
  erector_spinae_convex: ['upper_back_l'],
  erector_spinae_concave: ['upper_back_r'],

  // Lower back
  quadratus_lumborum: ['lower_back_l', 'lower_back_r'],

  // Abdomen
  rectus_abdominis: ['abdomen_l', 'abdomen_r'],
  obliques: ['abdomen_l', 'abdomen_r'],

  // Hip
  iliopsoas: ['hip_l', 'hip_r'],
  tensor_fasciae_latae: ['hip_l', 'hip_r'],
  gluteus_maximus: ['hip_l', 'hip_r'],
  gluteus_medius: ['hip_l', 'hip_r'],

  // Thigh
  rectus_femoris: ['thigh_l', 'thigh_r'],
  vastus_lateralis: ['thigh_l', 'thigh_r'],
  vastus_medialis: ['thigh_l', 'thigh_r'],
  adductors: ['thigh_l', 'thigh_r'],
  hamstrings: ['thigh_l', 'thigh_r'],
  biceps_femoris: ['thigh_l', 'thigh_r'],

  // Shin
  gastrocnemius: ['shin_l', 'shin_r'],
  tibialis_anterior: ['shin_l', 'shin_r'],
}

// ── Muscle name data (ko/en) ──
export const MUSCLE_DATA: Record<string, { nameEn: string; nameKo: string }> = {
  scm: { nameEn: 'Sternocleidomastoid', nameKo: '흉쇄유돌근' },
  scalenes: { nameEn: 'Scalenes', nameKo: '사각근' },
  deep_neck_flexors: { nameEn: 'Deep Neck Flexors', nameKo: '경추심층굴곡근' },
  pectoralis_major: { nameEn: 'Pectoralis Major', nameKo: '대흉근' },
  pectoralis_minor: { nameEn: 'Pectoralis Minor', nameKo: '소흉근' },
  deltoid: { nameEn: 'Deltoid', nameKo: '삼각근' },
  subscapularis: { nameEn: 'Subscapularis', nameKo: '견갑하근' },
  serratus_anterior: { nameEn: 'Serratus Anterior', nameKo: '전거근' },
  rectus_abdominis: { nameEn: 'Rectus Abdominis', nameKo: '복직근' },
  obliques: { nameEn: 'Obliques', nameKo: '복사근' },
  iliopsoas: { nameEn: 'Iliopsoas', nameKo: '장요근' },
  rectus_femoris: { nameEn: 'Rectus Femoris', nameKo: '대퇴직근' },
  vastus_lateralis: { nameEn: 'Vastus Lateralis', nameKo: '외측광근' },
  vastus_medialis: { nameEn: 'Vastus Medialis', nameKo: '내측광근' },
  tensor_fasciae_latae: { nameEn: 'Tensor Fasciae Latae', nameKo: '대퇴근막장근' },
  adductors: { nameEn: 'Adductors', nameKo: '내전근' },
  tibialis_anterior: { nameEn: 'Tibialis Anterior', nameKo: '전경골근' },
  suboccipitals: { nameEn: 'Suboccipitals', nameKo: '후두하근' },
  upper_trapezius: { nameEn: 'Upper Trapezius', nameKo: '상부승모근' },
  upper_trapezius_high: { nameEn: 'Upper Trapezius (High Side)', nameKo: '상부승모근 (높은쪽)' },
  upper_trapezius_low: { nameEn: 'Upper Trapezius (Low Side)', nameKo: '상부승모근 (낮은쪽)' },
  middle_trapezius: { nameEn: 'Middle Trapezius', nameKo: '중부승모근' },
  lower_trapezius: { nameEn: 'Lower Trapezius', nameKo: '하부승모근' },
  levator_scapulae: { nameEn: 'Levator Scapulae', nameKo: '견갑거근' },
  rhomboids: { nameEn: 'Rhomboids', nameKo: '능형근' },
  latissimus_dorsi: { nameEn: 'Latissimus Dorsi', nameKo: '광배근' },
  erector_spinae: { nameEn: 'Erector Spinae', nameKo: '척추기립근' },
  erector_spinae_convex: { nameEn: 'Erector Spinae (Convex)', nameKo: '척추기립근 (볼록면)' },
  erector_spinae_concave: { nameEn: 'Erector Spinae (Concave)', nameKo: '척추기립근 (오목면)' },
  quadratus_lumborum: { nameEn: 'Quadratus Lumborum', nameKo: '요방형근' },
  gluteus_maximus: { nameEn: 'Gluteus Maximus', nameKo: '대둔근' },
  gluteus_medius: { nameEn: 'Gluteus Medius', nameKo: '중둔근' },
  hamstrings: { nameEn: 'Hamstrings', nameKo: '햄스트링' },
  biceps_femoris: { nameEn: 'Biceps Femoris', nameKo: '대퇴이두근' },
  gastrocnemius: { nameEn: 'Gastrocnemius', nameKo: '비복근' },
}

// ── Region name data (ko/en) for tooltip display ──
export const REGION_NAMES: Record<string, { nameEn: string; nameKo: string }> = {
  neck_l: { nameEn: 'Neck (Left)', nameKo: '목 (좌)' },
  neck_r: { nameEn: 'Neck (Right)', nameKo: '목 (우)' },
  shoulder_l: { nameEn: 'Shoulder (Left)', nameKo: '어깨 (좌)' },
  shoulder_r: { nameEn: 'Shoulder (Right)', nameKo: '어깨 (우)' },
  chest_l: { nameEn: 'Chest (Left)', nameKo: '가슴 (좌)' },
  chest_r: { nameEn: 'Chest (Right)', nameKo: '가슴 (우)' },
  upper_back_l: { nameEn: 'Upper Back (Left)', nameKo: '상부 등 (좌)' },
  upper_back_r: { nameEn: 'Upper Back (Right)', nameKo: '상부 등 (우)' },
  lower_back_l: { nameEn: 'Lower Back (Left)', nameKo: '하부 등 (좌)' },
  lower_back_r: { nameEn: 'Lower Back (Right)', nameKo: '하부 등 (우)' },
  abdomen_l: { nameEn: 'Abdomen (Left)', nameKo: '복부 (좌)' },
  abdomen_r: { nameEn: 'Abdomen (Right)', nameKo: '복부 (우)' },
  hip_l: { nameEn: 'Hip (Left)', nameKo: '골반 (좌)' },
  hip_r: { nameEn: 'Hip (Right)', nameKo: '골반 (우)' },
  thigh_l: { nameEn: 'Thigh (Left)', nameKo: '허벅지 (좌)' },
  thigh_r: { nameEn: 'Thigh (Right)', nameKo: '허벅지 (우)' },
  shin_l: { nameEn: 'Shin (Left)', nameKo: '종아리 (좌)' },
  shin_r: { nameEn: 'Shin (Right)', nameKo: '종아리 (우)' },
}

/**
 * Given a list of conditions and optional leg alignment type,
 * returns a Map of regionKey → MuscleStatus ('contracted' | 'elongated')
 * for all affected body regions in the muscle-mapping.json.
 */
export function getAffectedRegions(
  conditions: Pose3DPredictedCondition[],
  legAlignmentType?: LegType
): Map<string, MuscleStatus> {
  const muscleStatuses = new Map<string, MuscleStatus>()

  // Collect muscle statuses from conditions
  conditions.forEach((condition) => {
    const mapping = findConditionMapping(condition.name)
    if (!mapping) return

    mapping.contracted.forEach((muscleId) => {
      // contracted takes priority over elongated
      muscleStatuses.set(muscleId, 'contracted')
    })
    mapping.elongated.forEach((muscleId) => {
      if (!muscleStatuses.has(muscleId)) {
        muscleStatuses.set(muscleId, 'elongated')
      }
    })
  })

  // Add leg alignment muscles
  if (legAlignmentType && legAlignmentType !== 'normal') {
    const legMapping = LEG_ALIGNMENT_MUSCLE_MAP[legAlignmentType]
    legMapping.contracted.forEach((muscleId) => {
      muscleStatuses.set(muscleId, 'contracted')
    })
    legMapping.elongated.forEach((muscleId) => {
      if (!muscleStatuses.has(muscleId)) {
        muscleStatuses.set(muscleId, 'elongated')
      }
    })
  }

  // Map muscles → regions
  const regionStatuses = new Map<string, MuscleStatus>()
  muscleStatuses.forEach((status, muscleId) => {
    const regions = MUSCLE_TO_REGION_MAP[muscleId]
    if (!regions) return

    regions.forEach((regionKey) => {
      const existing = regionStatuses.get(regionKey)
      // contracted takes priority
      if (!existing || (status === 'contracted' && existing === 'elongated')) {
        regionStatuses.set(regionKey, status)
      }
    })
  })

  return regionStatuses
}

/**
 * Returns the list of affected muscle names for a given region,
 * useful for tooltips.
 */
export function getRegionMuscles(
  regionKey: string,
  conditions: Pose3DPredictedCondition[],
  legAlignmentType?: LegType
): Array<{ muscleId: string; status: MuscleStatus }> {
  const muscleStatuses = new Map<string, MuscleStatus>()

  conditions.forEach((condition) => {
    const mapping = findConditionMapping(condition.name)
    if (!mapping) return
    mapping.contracted.forEach((id) => muscleStatuses.set(id, 'contracted'))
    mapping.elongated.forEach((id) => {
      if (!muscleStatuses.has(id)) muscleStatuses.set(id, 'elongated')
    })
  })

  if (legAlignmentType && legAlignmentType !== 'normal') {
    const legMapping = LEG_ALIGNMENT_MUSCLE_MAP[legAlignmentType]
    legMapping.contracted.forEach((id) => muscleStatuses.set(id, 'contracted'))
    legMapping.elongated.forEach((id) => {
      if (!muscleStatuses.has(id)) muscleStatuses.set(id, 'elongated')
    })
  }

  const result: Array<{ muscleId: string; status: MuscleStatus }> = []
  muscleStatuses.forEach((status, muscleId) => {
    const regions = MUSCLE_TO_REGION_MAP[muscleId]
    if (regions?.includes(regionKey)) {
      result.push({ muscleId, status })
    }
  })

  return result
}
