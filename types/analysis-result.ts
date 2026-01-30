// 자세 분석 결과 상세 타입 정의

// ePose 기반 자세 유형 (12가지)
export type EPosePostureType =
  | 'normal'                    // 정상
  | 'flat_back'                 // 일자등
  | 'flat_lumbar'               // 일자 요추
  | 'kyphosis'                  // 후만증 (굽은등)
  | 'lordosis'                  // 전만증 (오목등)
  | 'kyphosis_lordosis'         // 후만+전만
  | 'swayback'                  // 스웨이백
  | 'swayback_flat_lumbar'      // 스웨이백+일자요추
  | 'swayback_flat_back'        // 스웨이백+일자등
  | 'swayback_kyphosis'         // 스웨이백+후만
  | 'swayback_lordosis'         // 스웨이백+전만
  | 'swayback_kyphosis_lordosis'// 스웨이백+후만+전만

// 레거시 호환용 (기존 6가지)
export type PostureTypeCategory =
  | 'flat_back'
  | 'hunchback'
  | 'hunchback_swayback'
  | 'unarmed'
  | 'normal'
  | 'arched_back'

export type LegType = 'normal' | 'x_legs' | 'o_legs'

export interface PostureTypeResult {
  category: PostureTypeCategory
  xAxis: 'backward_tilt' | 'pelvic_tilt' | 'lean_forward'
  yAxis: 'normal' | 'swayback'
  confidence: number
}

export interface LegAnalysis {
  type: LegType
  leftAngle: number
  rightAngle: number
  overallAngle: number
}

export interface WeightCenter {
  left: { x: number; y: number }
  right: { x: number; y: number }
  balance: 'left' | 'right' | 'balanced'
  leftPercent: number
  rightPercent: number
}

// ePose 좌우 기울기 측정값 (9개)
export interface LeftRightTiltMeasurements {
  wholeBodyTilt: number        // 전신 좌우 기울기 (°)
  upperBodyTilt: number        // 상체 좌우 기울기 (°)
  lowerBodyTilt: number        // 하체 좌우 기울기 (°)
  headTilt: number             // 머리 좌우 기울기 (°)
  neckDeviation: number        // 목 좌우 편차 (cm)
  shoulderTilt: number         // 어깨 좌우 기울기 (°)
  chestDeviation: number       // 흉부 좌우 편차
  hipTilt: number              // 골반 좌우 기울기 (°)
  hipDeviation: number         // 골반 좌우 편차
}

// ePose 전후 기울기 측정값 (8개)
export interface FrontBackTiltMeasurements {
  wholeBodyTilt: number        // 전신 전후 기울기 (°)
  upperBodyTilt: number        // 상체 전후 기울기 (°)
  lowerBodyTilt: number        // 하체 전후 기울기 (°)
  headTilt: number             // 머리 전후 기울기 (°)
  neckDeviation: number        // 목 전후 편차 (cm)
  pelvicTilt: number           // 골반 전후 기울기 (°)
  hipDeviation: number         // 골반 전후 편차 (°)
  kneeFlexionAngle: number     // 무릎 굴곡 각도 (°)
}

// ePose 3요소 분류 기준
export interface PostureClassificationFactors {
  anteriorPelvicDisplacement: number  // 골반 전방 변위
  spinalCurvature: number             // 척추 만곡도
  anteriorPosteriorPelvicTilt: number // 골반 전후 기울기
}

// ePose 분석 결과
export interface EPoseAnalysis {
  leftRightTilt: LeftRightTiltMeasurements
  frontBackTilt: FrontBackTiltMeasurements
  classificationFactors: PostureClassificationFactors
  postureType: EPosePostureType
  confidence: number
}

export interface ClassificationResult {
  tags: string[]
  postureType: PostureTypeResult
  legAnalysis: LegAnalysis
  weightCenter: WeightCenter
  // ePose 분석 결과 추가
  epose?: EPoseAnalysis
}

// 시각화 페이지 타입
export interface MeasurementValue {
  value: number
  idealMin: number
  idealMax: number
  unit: string
  status: 'normal' | 'warning' | 'danger'
}

export interface SagittalPlaneAnalysis {
  fullBodyTilt: MeasurementValue
  upperBodyTilt: MeasurementValue
  lowerBodyTilt: MeasurementValue
  headTilt: MeasurementValue
  headDeviation: MeasurementValue
  spinalCurvature: MeasurementValue
  pelvicTilt: MeasurementValue
  pelvicDisplacement: MeasurementValue
  kneeFlexion: MeasurementValue
}

export interface FrontalPlaneAnalysis {
  fullBodyTilt: MeasurementValue
  upperBodyTilt: MeasurementValue
  lowerBodyTilt: MeasurementValue
  headTilt: MeasurementValue
}

export interface VisualizationResult {
  sagittalPlane: SagittalPlaneAnalysis
  frontalPlane: FrontalPlaneAnalysis
}

// 근육 분석 페이지 타입
export interface MuscleInfo {
  id: string
  name: string
  nameKo: string
  position: { x: number; y: number }
  visible: boolean
}

export interface MuscleAnalysisResult {
  contracted: MuscleInfo[]
  stretched: MuscleInfo[]
}

// MediaPipe Pose 랜드마크 (33개 포인트)
export interface PoseLandmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

// 사진 방향 타입
export type ImageOrientation = 'front' | 'side' | 'rear'

// 이미지 데이터와 랜드마크
export interface AnalysisImage {
  imageData?: string
  landmarks?: PoseLandmark[]
  orientation: ImageOrientation
  detectedOrientation?: ImageOrientation // 자동 감지된 방향
}

// 문제 부위 하이라이트
export interface ProblemArea {
  landmarkIndices: number[] // 문제 있는 랜드마크 인덱스
  connectionIndices?: number[] // 문제 있는 연결선 인덱스
  severity: 'warning' | 'danger'
}

// 전체 결과 타입
export interface DetailedAnalysisResult {
  id: string
  timestamp: string
  sideImage?: string
  frontImage?: string
  rearImage?: string
  // 레거시 호환성을 위해 유지 (deprecated)
  sideLandmarks?: { x: number; y: number }[]
  frontLandmarks?: { x: number; y: number }[]
  // 새로운 구조
  images?: {
    front?: AnalysisImage
    side?: AnalysisImage
    rear?: AnalysisImage
  }
  problemAreas?: ProblemArea[]
  classification: ClassificationResult
  visualization: VisualizationResult
  muscleAnalysis: MuscleAnalysisResult
}

// 번역 라벨
export const POSTURE_TYPE_LABELS: Record<PostureTypeCategory, { en: string; ko: string }> = {
  flat_back: { en: 'Flat Back', ko: '일자등' },
  hunchback: { en: 'Hunchback', ko: '굽은등' },
  hunchback_swayback: { en: 'Hunchback/Swayback', ko: '굽은등/스웨이백' },
  unarmed: { en: 'Unarmed', ko: '무장해제형' },
  normal: { en: 'Normal', ko: '정상' },
  arched_back: { en: 'Arched Back', ko: '활등' },
}

export const LEG_TYPE_LABELS: Record<LegType, { en: string; ko: string }> = {
  normal: { en: 'Normal', ko: '정상' },
  x_legs: { en: 'X-Legs (Knock Knees)', ko: 'X다리 (안짱다리)' },
  o_legs: { en: 'O-Legs (Bow Legs)', ko: 'O다리 (휜다리)' },
}

export const MUSCLE_NAMES: Record<string, { en: string; ko: string }> = {
  // 수축된 근육
  neck_extensors: { en: 'Neck extensor muscles', ko: '목 신전근' },
  upper_trapezius: { en: 'Upper trapezius', ko: '상부 승모근' },
  levator_scapulae: { en: 'Levator scapulae', ko: '견갑거근' },
  pectoralis: { en: 'Pectoral major and pectoralis minor', ko: '대흉근 & 소흉근' },
  serratus_anterior: { en: 'Serratus anterior', ko: '전거근' },
  lumbar_muscles: { en: 'Lumbar muscles', ko: '요근' },
  lumbar_erector: { en: 'Lumbar erector spinae muscles', ko: '요추 척추기립근' },
  iliopsoas: { en: 'Iliopsoas', ko: '장요근' },
  hip_flexors: { en: 'Hip flexors', ko: '고관절 굴곡근' },
  tensor_fasciae: { en: 'Tensor fasciae latae', ko: '대퇴근막장근' },
  rectus_femoris: { en: 'Rectus femoris', ko: '대퇴직근' },
  // 늘어난 근육
  neck_flexors: { en: 'Neck flexors', ko: '목 굴곡근' },
  middle_trapezius: { en: 'Middle trapezius', ko: '중부 승모근' },
  lower_trapezius: { en: 'Lower trapezius', ko: '하부 승모근' },
  thoracic_erector: { en: 'Thoracic erector spinae', ko: '흉추 척추기립근' },
  serratus_anterior_stretch: { en: 'Serratus anterior muscle', ko: '전거근' },
  rhomboids: { en: 'Rhomboid muscles', ko: '능형근' },
  external_oblique: { en: 'External oblique muscle', ko: '외복사근' },
  internal_oblique: { en: 'Internal oblique muscle', ko: '내복사근' },
  transverse_abdominis: { en: 'Transverse abdominis', ko: '복횡근' },
  gluteus_maximus: { en: 'Gluteus Maximus', ko: '대둔근' },
  hamstrings: { en: 'Hamstrings', ko: '햄스트링' },
}

// ePose 자세 유형 라벨 (12가지)
export const EPOSE_TYPE_LABELS: Record<EPosePostureType, { en: string; ko: string; description: string; descriptionKo: string }> = {
  normal: {
    en: 'Normal',
    ko: '정상',
    description: 'Good posture alignment with balanced muscle activation',
    descriptionKo: '균형 잡힌 근육 활성화와 올바른 자세 정렬'
  },
  flat_back: {
    en: 'Flat Back',
    ko: '일자등',
    description: 'Decreased thoracic kyphosis and lumbar lordosis',
    descriptionKo: '흉추 후만과 요추 전만이 감소한 상태'
  },
  flat_lumbar: {
    en: 'Flat Lumbar',
    ko: '일자 요추',
    description: 'Decreased lumbar lordosis with normal thoracic curve',
    descriptionKo: '요추 전만만 감소하고 흉추는 정상인 상태'
  },
  kyphosis: {
    en: 'Kyphosis',
    ko: '후만증 (굽은등)',
    description: 'Increased thoracic kyphosis (rounded upper back)',
    descriptionKo: '흉추 후만이 증가한 상태 (등이 굽음)'
  },
  lordosis: {
    en: 'Lordosis',
    ko: '전만증 (오목등)',
    description: 'Increased lumbar lordosis (excessive lower back curve)',
    descriptionKo: '요추 전만이 증가한 상태 (허리가 과도하게 휨)'
  },
  kyphosis_lordosis: {
    en: 'Kyphosis-Lordosis',
    ko: '후만+전만',
    description: 'Both thoracic kyphosis and lumbar lordosis increased',
    descriptionKo: '흉추 후만과 요추 전만이 모두 증가한 상태'
  },
  swayback: {
    en: 'Swayback',
    ko: '스웨이백',
    description: 'Pelvis shifted forward with upper body leaning backward',
    descriptionKo: '골반이 앞으로 밀리고 상체가 뒤로 기운 상태'
  },
  swayback_flat_lumbar: {
    en: 'Swayback + Flat Lumbar',
    ko: '스웨이백+일자요추',
    description: 'Swayback posture combined with decreased lumbar curve',
    descriptionKo: '스웨이백 자세에 요추 전만 감소가 동반된 상태'
  },
  swayback_flat_back: {
    en: 'Swayback + Flat Back',
    ko: '스웨이백+일자등',
    description: 'Swayback posture combined with flattened spinal curves',
    descriptionKo: '스웨이백 자세에 척추 만곡 감소가 동반된 상태'
  },
  swayback_kyphosis: {
    en: 'Swayback + Kyphosis',
    ko: '스웨이백+후만',
    description: 'Swayback posture combined with increased thoracic kyphosis',
    descriptionKo: '스웨이백 자세에 흉추 후만이 동반된 상태'
  },
  swayback_lordosis: {
    en: 'Swayback + Lordosis',
    ko: '스웨이백+전만',
    description: 'Swayback posture combined with increased lumbar lordosis',
    descriptionKo: '스웨이백 자세에 요추 전만이 동반된 상태'
  },
  swayback_kyphosis_lordosis: {
    en: 'Swayback + Kyphosis-Lordosis',
    ko: '스웨이백+후만+전만',
    description: 'Swayback with both increased kyphosis and lordosis',
    descriptionKo: '스웨이백에 흉추 후만과 요추 전만이 모두 동반된 상태'
  },
}

// ePose 측정 항목 라벨 및 이상 범위
export const EPOSE_MEASUREMENT_LABELS = {
  leftRight: {
    wholeBodyTilt: {
      en: 'Whole Body Left-Right Tilt',
      ko: '전신 좌우 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    upperBodyTilt: {
      en: 'Upper Body Left-Right Tilt',
      ko: '상체 좌우 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 10
    },
    lowerBodyTilt: {
      en: 'Lower Body Left-Right Tilt',
      ko: '하체 좌우 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    headTilt: {
      en: 'Head Left-Right Tilt',
      ko: '머리 좌우 기울기',
      idealMin: -4, idealMax: 4, unit: '°', maxDeviation: 15
    },
    neckDeviation: {
      en: 'Neck Left-Right Deviation',
      ko: '목 좌우 편차',
      idealMin: -1, idealMax: 1, unit: 'cm', maxDeviation: 5
    },
    shoulderTilt: {
      en: 'Shoulder Left-Right Tilt',
      ko: '어깨 좌우 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 10
    },
    chestDeviation: {
      en: 'Chest Left-Right Deviation',
      ko: '흉부 좌우 편차',
      idealMin: -1, idealMax: 1, unit: 'cm', maxDeviation: 5
    },
    hipTilt: {
      en: 'Hip Left-Right Tilt',
      ko: '골반 좌우 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 10
    },
    hipDeviation: {
      en: 'Hip Left-Right Deviation',
      ko: '골반 좌우 편차',
      idealMin: -1, idealMax: 1, unit: 'cm', maxDeviation: 5
    },
  },
  frontBack: {
    wholeBodyTilt: {
      en: 'Whole Body Front-Back Tilt',
      ko: '전신 전후 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    upperBodyTilt: {
      en: 'Upper Body Front-Back Tilt',
      ko: '상체 전후 기울기',
      idealMin: -3, idealMax: 3, unit: '°', maxDeviation: 15
    },
    lowerBodyTilt: {
      en: 'Lower Body Front-Back Tilt',
      ko: '하체 전후 기울기',
      idealMin: -2, idealMax: 2, unit: '°', maxDeviation: 10
    },
    headTilt: {
      en: 'Head Front-Back Tilt',
      ko: '머리 전후 기울기',
      idealMin: -5, idealMax: 5, unit: '°', maxDeviation: 20
    },
    neckDeviation: {
      en: 'Neck Front-Back Deviation',
      ko: '목 전후 편차',
      idealMin: 0, idealMax: 3, unit: 'cm', maxDeviation: 8
    },
    pelvicTilt: {
      en: 'Pelvic Tilt (Front-Back)',
      ko: '골반 전후 기울기',
      idealMin: 5, idealMax: 15, unit: '°', maxDeviation: 15
    },
    hipDeviation: {
      en: 'Hip Front-Back Deviation',
      ko: '골반 전후 편차',
      idealMin: -5, idealMax: 5, unit: '°', maxDeviation: 15
    },
    kneeFlexionAngle: {
      en: 'Knee Flexion Angle',
      ko: '무릎 굴곡 각도',
      idealMin: 0, idealMax: 10, unit: '°', maxDeviation: 20
    },
  },
}
