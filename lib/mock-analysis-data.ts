import type {
  DetailedAnalysisResult,
  MuscleInfo,
  PostureTypeCategory,
  LegType,
  PoseLandmark,
  EPosePostureType,
  EPoseAnalysis,
} from '@/types/analysis-result'
import type { PostureAnalysisResult, Landmark } from '@/types/posture'
import {
  analyzeWithEPose,
  mapToEPoseKeypoints,
  measureLeftRightTilt,
  measureFrontBackTilt,
  calculateClassificationFactors,
  classifyPostureType,
} from '@/lib/analysis/epose-analyzer'

// MediaPipe 33개 랜드마크 인덱스 참조
// 0: NOSE, 1-6: 눈, 7-8: 귀, 9-10: 입, 11-12: 어깨
// 13-14: 팔꿈치, 15-16: 손목, 17-22: 손가락
// 23-24: 엉덩이, 25-26: 무릎, 27-28: 발목, 29-32: 발

// 정면 포즈 랜드마크 (33개)
const mockFrontLandmarks: PoseLandmark[] = [
  // 0: NOSE
  { x: 0.50, y: 0.12, z: 0, visibility: 1.0 },
  // 1: LEFT_EYE_INNER
  { x: 0.48, y: 0.10, z: 0, visibility: 1.0 },
  // 2: LEFT_EYE
  { x: 0.46, y: 0.10, z: 0, visibility: 1.0 },
  // 3: LEFT_EYE_OUTER
  { x: 0.44, y: 0.10, z: 0, visibility: 1.0 },
  // 4: RIGHT_EYE_INNER
  { x: 0.52, y: 0.10, z: 0, visibility: 1.0 },
  // 5: RIGHT_EYE
  { x: 0.54, y: 0.10, z: 0, visibility: 1.0 },
  // 6: RIGHT_EYE_OUTER
  { x: 0.56, y: 0.10, z: 0, visibility: 1.0 },
  // 7: LEFT_EAR
  { x: 0.40, y: 0.11, z: 0, visibility: 1.0 },
  // 8: RIGHT_EAR
  { x: 0.60, y: 0.11, z: 0, visibility: 1.0 },
  // 9: MOUTH_LEFT
  { x: 0.47, y: 0.14, z: 0, visibility: 1.0 },
  // 10: MOUTH_RIGHT
  { x: 0.53, y: 0.14, z: 0, visibility: 1.0 },
  // 11: LEFT_SHOULDER
  { x: 0.35, y: 0.22, z: 0, visibility: 1.0 },
  // 12: RIGHT_SHOULDER
  { x: 0.65, y: 0.22, z: 0, visibility: 1.0 },
  // 13: LEFT_ELBOW
  { x: 0.28, y: 0.35, z: 0, visibility: 1.0 },
  // 14: RIGHT_ELBOW
  { x: 0.72, y: 0.35, z: 0, visibility: 1.0 },
  // 15: LEFT_WRIST
  { x: 0.25, y: 0.48, z: 0, visibility: 1.0 },
  // 16: RIGHT_WRIST
  { x: 0.75, y: 0.48, z: 0, visibility: 1.0 },
  // 17: LEFT_PINKY
  { x: 0.24, y: 0.52, z: 0, visibility: 0.9 },
  // 18: RIGHT_PINKY
  { x: 0.76, y: 0.52, z: 0, visibility: 0.9 },
  // 19: LEFT_INDEX
  { x: 0.23, y: 0.51, z: 0, visibility: 0.9 },
  // 20: RIGHT_INDEX
  { x: 0.77, y: 0.51, z: 0, visibility: 0.9 },
  // 21: LEFT_THUMB
  { x: 0.26, y: 0.50, z: 0, visibility: 0.9 },
  // 22: RIGHT_THUMB
  { x: 0.74, y: 0.50, z: 0, visibility: 0.9 },
  // 23: LEFT_HIP
  { x: 0.40, y: 0.50, z: 0, visibility: 1.0 },
  // 24: RIGHT_HIP
  { x: 0.60, y: 0.50, z: 0, visibility: 1.0 },
  // 25: LEFT_KNEE
  { x: 0.42, y: 0.70, z: 0, visibility: 1.0 },
  // 26: RIGHT_KNEE
  { x: 0.58, y: 0.70, z: 0, visibility: 1.0 },
  // 27: LEFT_ANKLE
  { x: 0.42, y: 0.90, z: 0, visibility: 1.0 },
  // 28: RIGHT_ANKLE
  { x: 0.58, y: 0.90, z: 0, visibility: 1.0 },
  // 29: LEFT_HEEL
  { x: 0.41, y: 0.93, z: 0, visibility: 0.9 },
  // 30: RIGHT_HEEL
  { x: 0.59, y: 0.93, z: 0, visibility: 0.9 },
  // 31: LEFT_FOOT_INDEX
  { x: 0.40, y: 0.95, z: 0, visibility: 0.9 },
  // 32: RIGHT_FOOT_INDEX
  { x: 0.60, y: 0.95, z: 0, visibility: 0.9 },
]

// 측면 포즈 랜드마크 (33개) - 왼쪽을 향한 자세
const mockSideLandmarks: PoseLandmark[] = [
  // 0: NOSE
  { x: 0.45, y: 0.12, z: 0, visibility: 1.0 },
  // 1: LEFT_EYE_INNER
  { x: 0.44, y: 0.10, z: 0, visibility: 0.8 },
  // 2: LEFT_EYE
  { x: 0.43, y: 0.10, z: 0, visibility: 0.8 },
  // 3: LEFT_EYE_OUTER
  { x: 0.42, y: 0.10, z: 0, visibility: 0.6 },
  // 4: RIGHT_EYE_INNER (측면에서 안 보임)
  { x: 0.46, y: 0.10, z: 0, visibility: 0.3 },
  // 5: RIGHT_EYE (측면에서 안 보임)
  { x: 0.47, y: 0.10, z: 0, visibility: 0.2 },
  // 6: RIGHT_EYE_OUTER (측면에서 안 보임)
  { x: 0.48, y: 0.10, z: 0, visibility: 0.1 },
  // 7: LEFT_EAR - 척추 라인의 시작점
  { x: 0.48, y: 0.11, z: 0, visibility: 1.0 },
  // 8: RIGHT_EAR (측면에서 안 보임)
  { x: 0.50, y: 0.11, z: 0, visibility: 0.2 },
  // 9: MOUTH_LEFT
  { x: 0.42, y: 0.14, z: 0, visibility: 0.7 },
  // 10: MOUTH_RIGHT
  { x: 0.44, y: 0.14, z: 0, visibility: 0.3 },
  // 11: LEFT_SHOULDER - 척추 라인 포인트
  { x: 0.50, y: 0.22, z: 0, visibility: 1.0 },
  // 12: RIGHT_SHOULDER (측면에서 겹침)
  { x: 0.51, y: 0.22, z: 0, visibility: 0.8 },
  // 13: LEFT_ELBOW
  { x: 0.42, y: 0.35, z: 0, visibility: 0.9 },
  // 14: RIGHT_ELBOW
  { x: 0.55, y: 0.35, z: 0, visibility: 0.7 },
  // 15: LEFT_WRIST
  { x: 0.38, y: 0.48, z: 0, visibility: 0.8 },
  // 16: RIGHT_WRIST
  { x: 0.58, y: 0.48, z: 0, visibility: 0.6 },
  // 17: LEFT_PINKY
  { x: 0.36, y: 0.52, z: 0, visibility: 0.6 },
  // 18: RIGHT_PINKY
  { x: 0.60, y: 0.52, z: 0, visibility: 0.4 },
  // 19: LEFT_INDEX
  { x: 0.35, y: 0.51, z: 0, visibility: 0.6 },
  // 20: RIGHT_INDEX
  { x: 0.61, y: 0.51, z: 0, visibility: 0.4 },
  // 21: LEFT_THUMB
  { x: 0.37, y: 0.50, z: 0, visibility: 0.6 },
  // 22: RIGHT_THUMB
  { x: 0.59, y: 0.50, z: 0, visibility: 0.4 },
  // 23: LEFT_HIP - 척추 라인 포인트
  { x: 0.52, y: 0.50, z: 0, visibility: 1.0 },
  // 24: RIGHT_HIP (측면에서 겹침)
  { x: 0.53, y: 0.50, z: 0, visibility: 0.8 },
  // 25: LEFT_KNEE - 척추 라인 포인트
  { x: 0.50, y: 0.70, z: 0, visibility: 1.0 },
  // 26: RIGHT_KNEE (측면에서 겹침)
  { x: 0.51, y: 0.70, z: 0, visibility: 0.8 },
  // 27: LEFT_ANKLE - 척추 라인 포인트
  { x: 0.50, y: 0.90, z: 0, visibility: 1.0 },
  // 28: RIGHT_ANKLE (측면에서 겹침)
  { x: 0.51, y: 0.90, z: 0, visibility: 0.8 },
  // 29: LEFT_HEEL
  { x: 0.52, y: 0.93, z: 0, visibility: 0.9 },
  // 30: RIGHT_HEEL
  { x: 0.53, y: 0.93, z: 0, visibility: 0.7 },
  // 31: LEFT_FOOT_INDEX
  { x: 0.46, y: 0.95, z: 0, visibility: 0.9 },
  // 32: RIGHT_FOOT_INDEX
  { x: 0.47, y: 0.95, z: 0, visibility: 0.7 },
]

// 기본 수축된 근육 목록
const defaultContractedMuscles: MuscleInfo[] = [
  { id: 'neck_extensors', name: 'Neck extensor muscles', nameKo: '목 신전근', position: { x: 50, y: 12 }, visible: true },
  { id: 'upper_trapezius', name: 'Upper trapezius', nameKo: '상부 승모근', position: { x: 50, y: 18 }, visible: true },
  { id: 'levator_scapulae', name: 'Levator scapulae', nameKo: '견갑거근', position: { x: 35, y: 20 }, visible: true },
  { id: 'pectoralis', name: 'Pectoral major and pectoralis minor', nameKo: '대흉근 & 소흉근', position: { x: 50, y: 28 }, visible: true },
  { id: 'serratus_anterior', name: 'Serratus anterior', nameKo: '전거근', position: { x: 30, y: 35 }, visible: true },
  { id: 'lumbar_muscles', name: 'Lumbar muscles', nameKo: '요근', position: { x: 50, y: 45 }, visible: true },
  { id: 'lumbar_erector', name: 'Lumbar erector spinae muscles', nameKo: '요추 척추기립근', position: { x: 50, y: 50 }, visible: true },
  { id: 'iliopsoas', name: 'Iliopsoas', nameKo: '장요근', position: { x: 45, y: 55 }, visible: true },
  { id: 'hip_flexors', name: 'Hip flexors', nameKo: '고관절 굴곡근', position: { x: 40, y: 60 }, visible: true },
  { id: 'tensor_fasciae', name: 'Tensor fasciae latae', nameKo: '대퇴근막장근', position: { x: 35, y: 65 }, visible: true },
  { id: 'rectus_femoris', name: 'Rectus femoris', nameKo: '대퇴직근', position: { x: 45, y: 70 }, visible: true },
]

// 기본 늘어난 근육 목록
const defaultStretchedMuscles: MuscleInfo[] = [
  { id: 'neck_flexors', name: 'Neck flexors', nameKo: '목 굴곡근', position: { x: 50, y: 15 }, visible: true },
  { id: 'middle_trapezius', name: 'Middle trapezius', nameKo: '중부 승모근', position: { x: 50, y: 22 }, visible: true },
  { id: 'lower_trapezius', name: 'Lower trapezius', nameKo: '하부 승모근', position: { x: 50, y: 28 }, visible: true },
  { id: 'thoracic_erector', name: 'Thoracic erector spinae', nameKo: '흉추 척추기립근', position: { x: 50, y: 35 }, visible: true },
  { id: 'serratus_anterior_stretch', name: 'Serratus anterior muscle', nameKo: '전거근', position: { x: 30, y: 38 }, visible: true },
  { id: 'rhomboids', name: 'Rhomboid muscles', nameKo: '능형근', position: { x: 50, y: 25 }, visible: true },
  { id: 'external_oblique', name: 'External oblique muscle', nameKo: '외복사근', position: { x: 35, y: 45 }, visible: true },
  { id: 'internal_oblique', name: 'Internal oblique muscle', nameKo: '내복사근', position: { x: 40, y: 48 }, visible: true },
  { id: 'transverse_abdominis', name: 'Transverse abdominis', nameKo: '복횡근', position: { x: 50, y: 52 }, visible: true },
  { id: 'gluteus_maximus', name: 'Gluteus Maximus', nameKo: '대둔근', position: { x: 50, y: 60 }, visible: true },
  { id: 'hamstrings', name: 'Hamstrings', nameKo: '햄스트링', position: { x: 50, y: 75 }, visible: true },
]

/**
 * ePose 분석 결과 생성
 * 랜드마크가 있으면 실제 분석, 없으면 기본값 생성
 */
function generateEPoseAnalysis(
  landmarks?: Landmark[],
  frontLandmarks?: Landmark[],
  sideLandmarks?: Landmark[],
  deviation: number = 5
): EPoseAnalysis {
  // 정면 랜드마크로 좌우 기울기 분석
  let leftRightTilt = {
    wholeBodyTilt: deviation * 0.2,
    upperBodyTilt: deviation * 0.35,
    lowerBodyTilt: deviation * 0.15,
    headTilt: deviation * 0.4,
    neckDeviation: deviation * 0.1,
    shoulderTilt: deviation * 0.25,
    chestDeviation: deviation * 0.08,
    hipTilt: deviation * 0.2,
    hipDeviation: deviation * 0.05,
  }

  // 측면 랜드마크로 전후 기울기 분석
  let frontBackTilt = {
    wholeBodyTilt: deviation * 0.3,
    upperBodyTilt: deviation * 0.5,
    lowerBodyTilt: deviation * 0.2,
    headTilt: deviation * 0.8,
    neckDeviation: deviation * 0.4,
    pelvicTilt: 10 + deviation * 0.3,
    hipDeviation: deviation * 0.35,
    kneeFlexionAngle: deviation * 0.5,
  }

  // 실제 랜드마크가 있으면 ePose 분석 실행
  if (frontLandmarks && frontLandmarks.length >= 33) {
    try {
      const frontResult = analyzeWithEPose(frontLandmarks as Landmark[], 'front')
      leftRightTilt = frontResult.leftRightTilt
    } catch (e) {
      // 에러 시 기본값 사용
    }
  }

  if (sideLandmarks && sideLandmarks.length >= 33) {
    try {
      const sideResult = analyzeWithEPose(sideLandmarks as Landmark[], 'side')
      frontBackTilt = sideResult.frontBackTilt
    } catch (e) {
      // 에러 시 기본값 사용
    }
  }

  // 3요소 분류 기준 계산
  const classificationFactors = {
    anteriorPelvicDisplacement: deviation * 0.5,
    spinalCurvature: frontBackTilt.upperBodyTilt,
    anteriorPosteriorPelvicTilt: frontBackTilt.pelvicTilt,
  }

  // 자세 유형 분류
  const { type: postureType, confidence } = classifyPostureType(classificationFactors)

  return {
    leftRightTilt,
    frontBackTilt,
    classificationFactors,
    postureType,
    confidence,
  }
}

export const mockAnalysisResult: DetailedAnalysisResult = {
  id: 'analysis-001',
  timestamp: new Date().toISOString(),
  sideImage: undefined,
  frontImage: undefined,
  rearImage: undefined,
  // 레거시 호환성을 위한 필드 (33개 MediaPipe 랜드마크)
  sideLandmarks: mockSideLandmarks,
  frontLandmarks: mockFrontLandmarks,
  // 새로운 구조
  images: {
    front: {
      imageData: undefined,
      landmarks: mockFrontLandmarks,
      orientation: 'front',
      detectedOrientation: 'front',
    },
    side: {
      imageData: undefined,
      landmarks: mockSideLandmarks,
      orientation: 'side',
      detectedOrientation: 'side',
    },
  },
  // 문제 부위 하이라이트 (어깨, 목 등)
  problemAreas: [
    {
      landmarkIndices: [0, 7, 8], // 코, 귀 - 거북목 관련
      severity: 'warning',
    },
    {
      landmarkIndices: [11, 12], // 어깨 - 굽은 어깨 관련
      connectionIndices: [4], // 어깨 연결선
      severity: 'danger',
    },
  ],
  classification: {
    tags: ['거북목', '굽은등', '골반전방경사'],
    postureType: {
      category: 'hunchback',
      xAxis: 'lean_forward',
      yAxis: 'normal',
      confidence: 0.85,
    },
    legAnalysis: {
      type: 'x_legs',
      leftAngle: 176.5,
      rightAngle: 175.8,
      overallAngle: 168.2,
    },
    weightCenter: {
      left: { x: 0.3, y: 0.5 },
      right: { x: 0.7, y: 0.5 },
      balance: 'left',
      leftPercent: 55,
      rightPercent: 45,
    },
    // ePose 분석 결과
    epose: {
      leftRightTilt: {
        wholeBodyTilt: 2.1,
        upperBodyTilt: 3.5,
        lowerBodyTilt: 1.2,
        headTilt: 4.8,
        neckDeviation: 0.8,
        shoulderTilt: -2.3,
        chestDeviation: 0.5,
        hipTilt: 1.8,
        hipDeviation: 0.3,
      },
      frontBackTilt: {
        wholeBodyTilt: 3.2,
        upperBodyTilt: 5.1,
        lowerBodyTilt: 1.5,
        headTilt: 8.3,
        neckDeviation: 4.2,
        pelvicTilt: 12,
        hipDeviation: 3.5,
        kneeFlexionAngle: 5,
      },
      classificationFactors: {
        anteriorPelvicDisplacement: 4.5,
        spinalCurvature: 5.1,
        anteriorPosteriorPelvicTilt: 12,
      },
      postureType: 'swayback_kyphosis',
      confidence: 78,
    },
  },
  visualization: {
    sagittalPlane: {
      fullBodyTilt: { value: 3.2, idealMin: -2, idealMax: 2, unit: '°', status: 'warning' },
      upperBodyTilt: { value: 5.1, idealMin: -3, idealMax: 3, unit: '°', status: 'danger' },
      lowerBodyTilt: { value: 1.5, idealMin: -2, idealMax: 2, unit: '°', status: 'normal' },
      headTilt: { value: 8.3, idealMin: -5, idealMax: 5, unit: '°', status: 'danger' },
      headDeviation: { value: 4.2, idealMin: 0, idealMax: 3, unit: 'cm', status: 'warning' },
      spinalCurvature: { value: 42, idealMin: 30, idealMax: 40, unit: '°', status: 'warning' },
      pelvicTilt: { value: 12, idealMin: 5, idealMax: 15, unit: '°', status: 'normal' },
      pelvicDisplacement: { value: 1.8, idealMin: 0, idealMax: 2, unit: 'cm', status: 'normal' },
      kneeFlexion: { value: 5, idealMin: 0, idealMax: 10, unit: '°', status: 'normal' },
    },
    frontalPlane: {
      fullBodyTilt: { value: 2.1, idealMin: -2, idealMax: 2, unit: '°', status: 'warning' },
      upperBodyTilt: { value: 3.5, idealMin: -3, idealMax: 3, unit: '°', status: 'warning' },
      lowerBodyTilt: { value: 1.2, idealMin: -2, idealMax: 2, unit: '°', status: 'normal' },
      headTilt: { value: 4.8, idealMin: -4, idealMax: 4, unit: '°', status: 'warning' },
    },
  },
  muscleAnalysis: {
    contracted: defaultContractedMuscles,
    stretched: defaultStretchedMuscles,
  },
}

export function getAnalysisResultFromStorage(): DetailedAnalysisResult {
  if (typeof window === 'undefined') return mockAnalysisResult

  const stored = localStorage.getItem('detailed-analysis-result')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return mockAnalysisResult
    }
  }
  return mockAnalysisResult
}

export function saveAnalysisResultToStorage(result: DetailedAnalysisResult) {
  if (typeof window === 'undefined') return
  localStorage.setItem('detailed-analysis-result', JSON.stringify(result))
}

// 업로드된 이미지 정보 타입
export interface UploadedImageInfo {
  direction: 'front' | 'side' | 'back'
  imageData: string
  landmarks: { x: number; y: number; z?: number; visibility?: number }[]
}

// 기본 분석 결과에서 상세 결과 생성
export function generateDetailedResult(
  basicResult: PostureAnalysisResult,
  uploadedImages?: UploadedImageInfo[]
): DetailedAnalysisResult {
  // 자세 유형 매핑
  const postureTypeMap: Record<string, PostureTypeCategory> = {
    forward_head: 'hunchback',
    rounded_shoulders: 'hunchback',
    kyphosis: 'hunchback',
    lordosis: 'arched_back',
    scoliosis: 'hunchback_swayback',
    pelvic_tilt: 'unarmed',
    normal: 'normal',
  }

  // 다리 유형 매핑
  const legTypeMap: Record<string, LegType> = {
    bow_legs: 'o_legs',
    knock_knees: 'x_legs',
    normal: 'normal',
  }

  // 자세 유형 결정
  const mainPostureType = basicResult.postureTypes[0] || 'normal'
  const category = postureTypeMap[mainPostureType] || 'normal'

  // 다리 유형 결정
  const legPosture = basicResult.postureTypes.find(
    (t) => t === 'bow_legs' || t === 'knock_knees'
  )
  const legType = legPosture ? legTypeMap[legPosture] : 'normal'

  // 태그 생성
  const tagMap: Record<string, string> = {
    forward_head: '거북목',
    rounded_shoulders: '굽은어깨',
    kyphosis: '굽은등',
    lordosis: '활등',
    scoliosis: '측만',
    pelvic_tilt: '골반전방경사',
    bow_legs: 'O다리',
    knock_knees: 'X다리',
  }
  const tags = basicResult.postureTypes
    .filter((t) => t !== 'normal')
    .map((t) => tagMap[t] || t)

  // 점수 기반 측정값 생성
  const score = basicResult.overallScore
  const deviation = ((100 - score) / 100) * 10 // 점수가 낮을수록 편차가 큼

  // 수축/늘어난 근육 필터링 (기본 분석의 근육 상태 기반)
  const contractedIds = basicResult.muscles
    .filter((m) => m.status === 'contracted')
    .map((m) => m.name.toLowerCase().replace(/\s+/g, '_'))
  const stretchedIds = basicResult.muscles
    .filter((m) => m.status === 'stretched')
    .map((m) => m.name.toLowerCase().replace(/\s+/g, '_'))

  // 기본 근육 목록에서 visible 상태 설정
  const contracted = defaultContractedMuscles.map((m) => ({
    ...m,
    visible: contractedIds.length > 0 ? contractedIds.some((id) => m.id.includes(id)) : true,
  }))

  const stretched = defaultStretchedMuscles.map((m) => ({
    ...m,
    visible: stretchedIds.length > 0 ? stretchedIds.some((id) => m.id.includes(id)) : true,
  }))

  // 업로드된 이미지에서 방향별 이미지 추출
  const frontImg = uploadedImages?.find(img => img.direction === 'front')
  const sideImg = uploadedImages?.find(img => img.direction === 'side')
  const backImg = uploadedImages?.find(img => img.direction === 'back')

  // 이미지가 없는 경우 기본 이미지 사용 (정면/측면 구분)
  // basicResult.direction이 'side'이면 측면 이미지로, 그 외에는 정면으로 간주
  const defaultDirection = (basicResult as any).direction || 'front'
  const defaultImage = basicResult.imageData
  const defaultLandmarks = basicResult.landmarks?.map((l) => ({
    x: l.x,
    y: l.y,
    z: l.z,
    visibility: l.visibility,
  }))

  return {
    id: basicResult.id,
    timestamp: basicResult.timestamp,
    // 레거시 필드 - 각 방향별 이미지 사용
    sideImage: sideImg?.imageData || (defaultDirection === 'side' ? defaultImage : undefined),
    frontImage: frontImg?.imageData || (defaultDirection === 'front' ? defaultImage : undefined),
    rearImage: backImg?.imageData || (defaultDirection === 'back' ? defaultImage : undefined),
    // 레거시 랜드마크 - 각 방향별 랜드마크 사용
    sideLandmarks: sideImg?.landmarks || (defaultDirection === 'side' ? defaultLandmarks : undefined),
    frontLandmarks: frontImg?.landmarks || (defaultDirection === 'front' ? defaultLandmarks : undefined),
    // 새로운 구조 - images 객체
    images: {
      front: frontImg ? {
        imageData: frontImg.imageData,
        landmarks: frontImg.landmarks as PoseLandmark[],
        orientation: 'front' as const,
        detectedOrientation: 'front' as const,
      } : (defaultDirection === 'front' ? {
        imageData: defaultImage,
        landmarks: defaultLandmarks as PoseLandmark[],
        orientation: 'front' as const,
        detectedOrientation: 'front' as const,
      } : undefined),
      side: sideImg ? {
        imageData: sideImg.imageData,
        landmarks: sideImg.landmarks as PoseLandmark[],
        orientation: 'side' as const,
        detectedOrientation: 'side' as const,
      } : (defaultDirection === 'side' ? {
        imageData: defaultImage,
        landmarks: defaultLandmarks as PoseLandmark[],
        orientation: 'side' as const,
        detectedOrientation: 'side' as const,
      } : undefined),
      rear: backImg ? {
        imageData: backImg.imageData,
        landmarks: backImg.landmarks as PoseLandmark[],
        orientation: 'rear' as const,
        detectedOrientation: 'rear' as const,
      } : (defaultDirection === 'back' ? {
        imageData: defaultImage,
        landmarks: defaultLandmarks as PoseLandmark[],
        orientation: 'rear' as const,
        detectedOrientation: 'rear' as const,
      } : undefined),
    },
    // 문제 영역 (추후 분석 결과에 따라 설정)
    problemAreas: [],
    classification: {
      tags: tags.length > 0 ? tags : ['정상'],
      postureType: {
        category,
        xAxis: deviation > 5 ? 'lean_forward' : deviation > 3 ? 'pelvic_tilt' : 'backward_tilt',
        yAxis: deviation > 7 ? 'swayback' : 'normal',
        confidence: score / 100,
      },
      legAnalysis: {
        type: legType,
        leftAngle: 180 - deviation * 0.5,
        rightAngle: 180 - deviation * 0.4,
        overallAngle: legType === 'normal' ? 178 : legType === 'x_legs' ? 168 : 172,
      },
      weightCenter: {
        left: { x: 0.3 + deviation * 0.01, y: 0.5 },
        right: { x: 0.7 - deviation * 0.01, y: 0.5 },
        balance: deviation > 5 ? 'left' : deviation > 3 ? 'right' : 'balanced',
        leftPercent: 50 + Math.round(deviation * 0.5),
        rightPercent: 50 - Math.round(deviation * 0.5),
      },
      // ePose 분석 결과 추가
      epose: generateEPoseAnalysis(
        basicResult.landmarks as Landmark[] | undefined,
        frontImg?.landmarks as Landmark[] | undefined,
        sideImg?.landmarks as Landmark[] | undefined,
        deviation
      ),
    },
    visualization: {
      sagittalPlane: {
        fullBodyTilt: {
          value: deviation * 0.3,
          idealMin: -2,
          idealMax: 2,
          unit: '°',
          status: deviation > 7 ? 'danger' : deviation > 4 ? 'warning' : 'normal',
        },
        upperBodyTilt: {
          value: deviation * 0.5,
          idealMin: -3,
          idealMax: 3,
          unit: '°',
          status: deviation > 6 ? 'danger' : deviation > 3 ? 'warning' : 'normal',
        },
        lowerBodyTilt: {
          value: deviation * 0.2,
          idealMin: -2,
          idealMax: 2,
          unit: '°',
          status: deviation > 8 ? 'danger' : deviation > 5 ? 'warning' : 'normal',
        },
        headTilt: {
          value: deviation * 0.8,
          idealMin: -5,
          idealMax: 5,
          unit: '°',
          status: deviation > 5 ? 'danger' : deviation > 3 ? 'warning' : 'normal',
        },
        headDeviation: {
          value: deviation * 0.4,
          idealMin: 0,
          idealMax: 3,
          unit: 'cm',
          status: deviation > 6 ? 'danger' : deviation > 3 ? 'warning' : 'normal',
        },
        spinalCurvature: {
          value: 35 + deviation,
          idealMin: 30,
          idealMax: 40,
          unit: '°',
          status: deviation > 5 ? 'warning' : 'normal',
        },
        pelvicTilt: {
          value: 10 + deviation * 0.3,
          idealMin: 5,
          idealMax: 15,
          unit: '°',
          status: deviation > 7 ? 'warning' : 'normal',
        },
        pelvicDisplacement: {
          value: deviation * 0.2,
          idealMin: 0,
          idealMax: 2,
          unit: 'cm',
          status: deviation > 8 ? 'warning' : 'normal',
        },
        kneeFlexion: {
          value: deviation * 0.5,
          idealMin: 0,
          idealMax: 10,
          unit: '°',
          status: 'normal',
        },
      },
      frontalPlane: {
        fullBodyTilt: {
          value: deviation * 0.2,
          idealMin: -2,
          idealMax: 2,
          unit: '°',
          status: deviation > 8 ? 'danger' : deviation > 5 ? 'warning' : 'normal',
        },
        upperBodyTilt: {
          value: deviation * 0.35,
          idealMin: -3,
          idealMax: 3,
          unit: '°',
          status: deviation > 7 ? 'danger' : deviation > 4 ? 'warning' : 'normal',
        },
        lowerBodyTilt: {
          value: deviation * 0.15,
          idealMin: -2,
          idealMax: 2,
          unit: '°',
          status: deviation > 9 ? 'warning' : 'normal',
        },
        headTilt: {
          value: deviation * 0.4,
          idealMin: -4,
          idealMax: 4,
          unit: '°',
          status: deviation > 6 ? 'danger' : deviation > 3 ? 'warning' : 'normal',
        },
      },
    },
    muscleAnalysis: {
      contracted,
      stretched,
    },
  }
}
