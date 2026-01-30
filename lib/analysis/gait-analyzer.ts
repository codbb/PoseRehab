/**
 * 보행 분석 알고리즘
 *
 * MediaPipe Pose 키포인트를 사용하여 보행 특성을 분석합니다.
 */

import type { Landmark } from '@/types/posture'
import type {
  GaitFrame,
  GaitPhaseState,
  GaitMeasurements,
  MeasurementValue,
  GaitAnomaly,
  GaitAnalysisResult,
  GaitRecommendation,
} from '@/types/gait'
import { GAIT_LANDMARKS } from '@/types/gait'
import {
  GAIT_MEASUREMENT_LABELS,
  GAIT_ANALYSIS_CONFIG,
  GAIT_SCORE_WEIGHTS,
  getMeasurementStatus,
  calculateMeasurementScore,
  GAIT_ANOMALY_LABELS,
} from '@/lib/gait-constants'

// 2D 점 타입
interface Point2D {
  x: number
  y: number
}

/**
 * 두 점 사이의 거리를 계산합니다.
 */
function calculateDistance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

/**
 * 세 점으로 이루어진 각도를 계산합니다 (p2가 꼭짓점).
 */
function calculateAngle(p1: Point2D, p2: Point2D, p3: Point2D): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }

  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x

  const angle = Math.atan2(Math.abs(cross), dot)
  return (angle * 180) / Math.PI
}

/**
 * 수직선과의 각도를 계산합니다.
 */
function calculateAngleFromVertical(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const angle = Math.atan2(dx, -dy) // Y축이 아래로 증가하므로 -dy
  return (angle * 180) / Math.PI
}

/**
 * 이동 평균을 계산합니다.
 */
function movingAverage(values: number[], windowSize: number): number {
  if (values.length === 0) return 0
  const window = values.slice(-windowSize)
  return window.reduce((a, b) => a + b, 0) / window.length
}

/**
 * 랜드마크의 visibility가 충분한지 확인합니다.
 */
function isLandmarkVisible(landmark: Landmark, threshold: number = 0.5): boolean {
  return (landmark.visibility ?? 0) >= threshold
}

/**
 * 보행 분석기 클래스
 */
export class GaitAnalyzer {
  private frameBuffer: GaitFrame[] = []
  private maxBufferSize: number

  // 발목 Y 위치 히스토리 (보행 단계 감지용)
  private leftAnkleYHistory: number[] = []
  private rightAnkleYHistory: number[] = []

  // Heel strike/Toe off 타이밍
  private lastHeelStrike = { left: 0, right: 0 }
  private lastToeOff = { left: 0, right: 0 }

  // 보폭 측정
  private leftStrides: number[] = []
  private rightStrides: number[] = []

  // 보행 주기 측정
  private gaitCycles: number[] = []

  // 현재 보행 상태
  private currentPhaseState: GaitPhaseState = {
    leftLeg: 'stance',
    rightLeg: 'stance',
    leftPhase: 'mid_stance',
    rightPhase: 'mid_stance',
    cycleCount: 0,
    lastHeelStrike: { left: 0, right: 0 },
    lastToeOff: { left: 0, right: 0 },
  }

  // 발목 최저점 (지면 기준선)
  private groundLevel = { left: 1, right: 1 }

  constructor() {
    this.maxBufferSize = GAIT_ANALYSIS_CONFIG.maxFrameBufferSize
  }

  /**
   * 분석기를 리셋합니다.
   */
  reset(): void {
    this.frameBuffer = []
    this.leftAnkleYHistory = []
    this.rightAnkleYHistory = []
    this.lastHeelStrike = { left: 0, right: 0 }
    this.lastToeOff = { left: 0, right: 0 }
    this.leftStrides = []
    this.rightStrides = []
    this.gaitCycles = []
    this.groundLevel = { left: 1, right: 1 }
    this.currentPhaseState = {
      leftLeg: 'stance',
      rightLeg: 'stance',
      leftPhase: 'mid_stance',
      rightPhase: 'mid_stance',
      cycleCount: 0,
      lastHeelStrike: { left: 0, right: 0 },
      lastToeOff: { left: 0, right: 0 },
    }
  }

  /**
   * 프레임을 처리하고 분석 결과를 반환합니다.
   */
  processFrame(landmarks: Landmark[], timestamp: number): GaitFrame {
    // 키포인트 추출 (MediaPipe 인덱스 사용)
    const leftHip = landmarks[GAIT_LANDMARKS.LEFT_HIP]
    const rightHip = landmarks[GAIT_LANDMARKS.RIGHT_HIP]
    const leftKnee = landmarks[GAIT_LANDMARKS.LEFT_KNEE]
    const rightKnee = landmarks[GAIT_LANDMARKS.RIGHT_KNEE]
    const leftAnkle = landmarks[GAIT_LANDMARKS.LEFT_ANKLE]
    const rightAnkle = landmarks[GAIT_LANDMARKS.RIGHT_ANKLE]
    const leftShoulder = landmarks[GAIT_LANDMARKS.LEFT_SHOULDER]
    const rightShoulder = landmarks[GAIT_LANDMARKS.RIGHT_SHOULDER]
    const leftHeel = landmarks[GAIT_LANDMARKS.LEFT_HEEL]
    const rightHeel = landmarks[GAIT_LANDMARKS.RIGHT_HEEL]

    // 각도 계산
    const leftKneeAngle = this.calculateKneeFlexion(leftHip, leftKnee, leftAnkle)
    const rightKneeAngle = this.calculateKneeFlexion(rightHip, rightKnee, rightAnkle)
    const leftHipAngle = this.calculateHipFlexion(leftShoulder, leftHip, leftKnee)
    const rightHipAngle = this.calculateHipFlexion(rightShoulder, rightHip, rightKnee)
    const trunkAngle = this.calculateTrunkInclination(
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip
    )

    // 발 위치 (heel과 ankle 중 더 낮은 것 사용)
    const leftFootY = Math.max(leftAnkle.y, leftHeel?.y ?? leftAnkle.y)
    const rightFootY = Math.max(rightAnkle.y, rightHeel?.y ?? rightAnkle.y)

    // 발목 Y 위치 히스토리 업데이트
    this.leftAnkleYHistory.push(leftFootY)
    this.rightAnkleYHistory.push(rightFootY)

    // 히스토리 크기 제한
    const historyLimit = 30
    if (this.leftAnkleYHistory.length > historyLimit) {
      this.leftAnkleYHistory.shift()
    }
    if (this.rightAnkleYHistory.length > historyLimit) {
      this.rightAnkleYHistory.shift()
    }

    // 지면 레벨 업데이트 (최저점)
    this.groundLevel.left = Math.max(this.groundLevel.left, leftFootY)
    this.groundLevel.right = Math.max(this.groundLevel.right, rightFootY)

    // 보행 단계 감지
    this.detectGaitPhase(leftAnkle, rightAnkle, leftHeel, rightHeel, timestamp)

    // 측정값 계산
    const measurements = this.calculateMeasurements(landmarks, timestamp)

    // 프레임 생성
    const frame: GaitFrame = {
      timestamp,
      landmarks,
      phase: { ...this.currentPhaseState },
      measurements,
      leftAnkleY: leftFootY,
      rightAnkleY: rightFootY,
      leftKneeAngle,
      rightKneeAngle,
      leftHipAngle,
      rightHipAngle,
      trunkAngle,
    }

    // 버퍼에 추가
    this.frameBuffer.push(frame)
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift()
    }

    return frame
  }

  /**
   * 무릎 굴곡 각도를 계산합니다.
   */
  private calculateKneeFlexion(
    hip: Landmark,
    knee: Landmark,
    ankle: Landmark
  ): number {
    const angle = calculateAngle(hip, knee, ankle)
    // 완전 펴진 상태가 180도이므로, 굴곡 각도 = 180 - 각도
    return 180 - angle
  }

  /**
   * 엉덩이 굴곡 각도를 계산합니다.
   */
  private calculateHipFlexion(
    shoulder: Landmark,
    hip: Landmark,
    knee: Landmark
  ): number {
    const angle = calculateAngle(shoulder, hip, knee)
    // 직립 상태가 약 180도이므로
    return Math.abs(180 - angle)
  }

  /**
   * 몸통 기울기를 계산합니다.
   */
  private calculateTrunkInclination(
    leftShoulder: Landmark,
    rightShoulder: Landmark,
    leftHip: Landmark,
    rightHip: Landmark
  ): number {
    // 어깨 중점
    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    }

    // 엉덩이 중점
    const hipMid = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    }

    // 수직선과의 각도 (양수: 앞으로 기울임, 음수: 뒤로 기울임)
    return calculateAngleFromVertical(hipMid, shoulderMid)
  }

  /**
   * 보행 단계를 감지합니다.
   */
  private detectGaitPhase(
    leftAnkle: Landmark,
    rightAnkle: Landmark,
    leftHeel: Landmark | undefined,
    rightHeel: Landmark | undefined,
    timestamp: number
  ): void {
    const threshold = GAIT_ANALYSIS_CONFIG.heelStrikeThreshold

    // 발목 Y 속도 계산 (위로 이동: 음수, 아래로 이동: 양수)
    const leftVelocity = this.calculateVelocity(this.leftAnkleYHistory)
    const rightVelocity = this.calculateVelocity(this.rightAnkleYHistory)

    // 발 높이 (지면에서의 거리) - heel 또는 ankle 사용
    const leftFootY = leftHeel ? Math.max(leftAnkle.y, leftHeel.y) : leftAnkle.y
    const rightFootY = rightHeel ? Math.max(rightAnkle.y, rightHeel.y) : rightAnkle.y
    const leftHeight = this.groundLevel.left - leftFootY
    const rightHeight = this.groundLevel.right - rightFootY

    // 왼발 단계 감지
    const prevLeftLeg = this.currentPhaseState.leftLeg
    if (prevLeftLeg === 'swing' && leftVelocity > threshold && leftHeight < 0.02) {
      // Heel Strike 감지
      this.currentPhaseState.leftLeg = 'stance'
      this.currentPhaseState.leftPhase = 'initial_contact'

      // 보행 주기 계산
      if (this.lastHeelStrike.left > 0) {
        const cycle = timestamp - this.lastHeelStrike.left
        this.gaitCycles.push(cycle)
      }
      this.lastHeelStrike.left = timestamp
      this.currentPhaseState.lastHeelStrike.left = timestamp
      this.currentPhaseState.cycleCount++
    } else if (prevLeftLeg === 'stance' && leftVelocity < -threshold) {
      // Toe Off 감지
      this.currentPhaseState.leftLeg = 'swing'
      this.currentPhaseState.leftPhase = 'pre_swing'
      this.lastToeOff.left = timestamp
      this.currentPhaseState.lastToeOff.left = timestamp

      // 보폭 계산 (toe off 시점의 발목 간 거리)
      const stride = Math.abs(leftAnkle.x - rightAnkle.x)
      this.leftStrides.push(stride)
    }

    // 오른발 단계 감지
    const prevRightLeg = this.currentPhaseState.rightLeg
    if (prevRightLeg === 'swing' && rightVelocity > threshold && rightHeight < 0.02) {
      this.currentPhaseState.rightLeg = 'stance'
      this.currentPhaseState.rightPhase = 'initial_contact'

      if (this.lastHeelStrike.right > 0) {
        const cycle = timestamp - this.lastHeelStrike.right
        this.gaitCycles.push(cycle)
      }
      this.lastHeelStrike.right = timestamp
      this.currentPhaseState.lastHeelStrike.right = timestamp
    } else if (prevRightLeg === 'stance' && rightVelocity < -threshold) {
      this.currentPhaseState.rightLeg = 'swing'
      this.currentPhaseState.rightPhase = 'pre_swing'
      this.lastToeOff.right = timestamp
      this.currentPhaseState.lastToeOff.right = timestamp

      const stride = Math.abs(rightAnkle.x - leftAnkle.x)
      this.rightStrides.push(stride)
    }

    // 세부 단계 업데이트
    this.updateDetailedPhase(timestamp)
  }

  /**
   * 세부 보행 단계를 업데이트합니다.
   */
  private updateDetailedPhase(timestamp: number): void {
    // 왼발 세부 단계
    if (this.currentPhaseState.leftLeg === 'stance') {
      const elapsed = timestamp - this.currentPhaseState.lastHeelStrike.left
      const stancePercent = elapsed / (this.getAverageGaitCycle() * 0.6)

      if (stancePercent < 0.15) {
        this.currentPhaseState.leftPhase = 'initial_contact'
      } else if (stancePercent < 0.35) {
        this.currentPhaseState.leftPhase = 'loading_response'
      } else if (stancePercent < 0.7) {
        this.currentPhaseState.leftPhase = 'mid_stance'
      } else {
        this.currentPhaseState.leftPhase = 'terminal_stance'
      }
    } else {
      const elapsed = timestamp - this.currentPhaseState.lastToeOff.left
      const swingPercent = elapsed / (this.getAverageGaitCycle() * 0.4)

      if (swingPercent < 0.1) {
        this.currentPhaseState.leftPhase = 'pre_swing'
      } else if (swingPercent < 0.4) {
        this.currentPhaseState.leftPhase = 'initial_swing'
      } else if (swingPercent < 0.7) {
        this.currentPhaseState.leftPhase = 'mid_swing'
      } else {
        this.currentPhaseState.leftPhase = 'terminal_swing'
      }
    }

    // 오른발 세부 단계 (동일한 로직)
    if (this.currentPhaseState.rightLeg === 'stance') {
      const elapsed = timestamp - this.currentPhaseState.lastHeelStrike.right
      const stancePercent = elapsed / (this.getAverageGaitCycle() * 0.6)

      if (stancePercent < 0.15) {
        this.currentPhaseState.rightPhase = 'initial_contact'
      } else if (stancePercent < 0.35) {
        this.currentPhaseState.rightPhase = 'loading_response'
      } else if (stancePercent < 0.7) {
        this.currentPhaseState.rightPhase = 'mid_stance'
      } else {
        this.currentPhaseState.rightPhase = 'terminal_stance'
      }
    } else {
      const elapsed = timestamp - this.currentPhaseState.lastToeOff.right
      const swingPercent = elapsed / (this.getAverageGaitCycle() * 0.4)

      if (swingPercent < 0.1) {
        this.currentPhaseState.rightPhase = 'pre_swing'
      } else if (swingPercent < 0.4) {
        this.currentPhaseState.rightPhase = 'initial_swing'
      } else if (swingPercent < 0.7) {
        this.currentPhaseState.rightPhase = 'mid_swing'
      } else {
        this.currentPhaseState.rightPhase = 'terminal_swing'
      }
    }
  }

  /**
   * Y 위치 변화 속도를 계산합니다.
   */
  private calculateVelocity(history: number[]): number {
    if (history.length < 2) return 0

    const recent = history.slice(-5)
    if (recent.length < 2) return 0

    // 이동 평균 차이
    const older = recent.slice(0, Math.floor(recent.length / 2))
    const newer = recent.slice(Math.floor(recent.length / 2))

    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    const newerAvg = newer.reduce((a, b) => a + b, 0) / newer.length

    return newerAvg - olderAvg
  }

  /**
   * 측정값을 계산합니다.
   */
  private calculateMeasurements(
    landmarks: Landmark[],
    timestamp: number
  ): Partial<GaitMeasurements> {
    const windowSize = GAIT_ANALYSIS_CONFIG.smoothingWindowSize

    // 보폭 (정규화된 좌표이므로 화면 비율 기준)
    const avgLeftStride = movingAverage(this.leftStrides, windowSize)
    const avgRightStride = movingAverage(this.rightStrides, windowSize)
    const avgStride = (avgLeftStride + avgRightStride) / 2

    // 보행 주기
    const avgCycle = movingAverage(this.gaitCycles, windowSize)

    // 좌우 대칭성
    const symmetry =
      avgRightStride > 0 ? avgLeftStride / avgRightStride : 1

    // 보행 속도 (프레임 간 이동 거리 기반 추정)
    const speed = avgCycle > 0 ? avgStride / (avgCycle / 1000) : 0

    // 최근 프레임에서 각도 추출
    const recentFrames = this.frameBuffer.slice(-windowSize)
    const avgLeftKnee = movingAverage(
      recentFrames.map((f) => f.leftKneeAngle),
      windowSize
    )
    const avgRightKnee = movingAverage(
      recentFrames.map((f) => f.rightKneeAngle),
      windowSize
    )
    const avgLeftHip = movingAverage(
      recentFrames.map((f) => f.leftHipAngle),
      windowSize
    )
    const avgRightHip = movingAverage(
      recentFrames.map((f) => f.rightHipAngle),
      windowSize
    )
    const avgTrunk = movingAverage(
      recentFrames.map((f) => f.trunkAngle),
      windowSize
    )

    // 발 들어올림 높이 (유각기 중 최대 높이)
    const leftSwingFrames = recentFrames.filter(
      (f) => f.phase.leftLeg === 'swing'
    )
    const rightSwingFrames = recentFrames.filter(
      (f) => f.phase.rightLeg === 'swing'
    )
    const maxLeftClearance =
      leftSwingFrames.length > 0
        ? Math.max(
            ...leftSwingFrames.map((f) => this.groundLevel.left - f.leftAnkleY)
          )
        : 0
    const maxRightClearance =
      rightSwingFrames.length > 0
        ? Math.max(
            ...rightSwingFrames.map((f) => this.groundLevel.right - f.rightAnkleY)
          )
        : 0
    const avgClearance = (maxLeftClearance + maxRightClearance) / 2

    return {
      strideLength: this.createMeasurementValue(
        avgStride * 100, // 정규화된 값을 스케일링 (근사치)
        'strideLength'
      ),
      gaitSpeed: this.createMeasurementValue(speed, 'gaitSpeed'),
      gaitCycle: this.createMeasurementValue(avgCycle, 'gaitCycle'),
      leftRightSymmetry: this.createMeasurementValue(symmetry, 'leftRightSymmetry'),
      kneeFlexionLeft: this.createMeasurementValue(avgLeftKnee, 'kneeFlexionLeft'),
      kneeFlexionRight: this.createMeasurementValue(avgRightKnee, 'kneeFlexionRight'),
      hipFlexionLeft: this.createMeasurementValue(avgLeftHip, 'hipFlexionLeft'),
      hipFlexionRight: this.createMeasurementValue(avgRightHip, 'hipFlexionRight'),
      trunkInclination: this.createMeasurementValue(avgTrunk, 'trunkInclination'),
      footClearance: this.createMeasurementValue(
        avgClearance * 100, // 스케일링
        'footClearance'
      ),
    }
  }

  /**
   * MeasurementValue 객체를 생성합니다.
   */
  private createMeasurementValue(
    value: number,
    key: keyof typeof GAIT_MEASUREMENT_LABELS
  ): MeasurementValue {
    const config = GAIT_MEASUREMENT_LABELS[key]

    return {
      value: Math.round(value * 100) / 100,
      idealMin: config.idealMin,
      idealMax: config.idealMax,
      unit: config.unit,
      status: getMeasurementStatus(
        value,
        config.idealMin,
        config.idealMax,
        config.warningThreshold
      ),
    }
  }

  /**
   * 평균 보행 주기를 반환합니다.
   */
  private getAverageGaitCycle(): number {
    if (this.gaitCycles.length === 0) {
      return 1000 // 기본값 1초
    }
    return movingAverage(this.gaitCycles, 5)
  }

  /**
   * 현재 보행 상태를 반환합니다.
   */
  getCurrentPhaseState(): GaitPhaseState {
    return { ...this.currentPhaseState }
  }

  /**
   * 프레임 버퍼를 반환합니다.
   */
  getFrameBuffer(): GaitFrame[] {
    return [...this.frameBuffer]
  }

  /**
   * 현재 측정값을 반환합니다.
   */
  getCurrentMeasurements(): GaitMeasurements | null {
    if (this.frameBuffer.length < 5) {
      return null
    }

    const lastFrame = this.frameBuffer[this.frameBuffer.length - 1]
    if (!lastFrame.measurements) {
      return null
    }

    // 전체 측정값 반환 (Partial이지만 대부분 채워져 있음)
    return lastFrame.measurements as GaitMeasurements
  }

  /**
   * 전체 분석 결과를 생성합니다.
   */
  generateAnalysisResult(): GaitAnalysisResult | null {
    if (this.frameBuffer.length < 30) {
      return null
    }

    const frames = this.frameBuffer
    const duration = (frames[frames.length - 1].timestamp - frames[0].timestamp) / 1000

    // 평균 측정값 계산
    const measurementKeys = [
      'strideLength',
      'gaitSpeed',
      'gaitCycle',
      'leftRightSymmetry',
      'kneeFlexionLeft',
      'kneeFlexionRight',
      'hipFlexionLeft',
      'hipFlexionRight',
      'trunkInclination',
      'footClearance',
    ] as const

    const avgMeasurements: Record<string, MeasurementValue> = {}

    for (const key of measurementKeys) {
      const values = frames
        .map((f) => f.measurements[key]?.value)
        .filter((v): v is number => v !== undefined && !isNaN(v))

      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        avgMeasurements[key] = this.createMeasurementValue(avg, key)
      }
    }

    // 이상 징후 감지
    const anomalies = this.detectAnomalies(avgMeasurements as unknown as GaitMeasurements)

    // 전체 점수 계산
    const overallScore = this.calculateOverallScore(
      avgMeasurements as unknown as GaitMeasurements
    )

    // 권장사항 생성
    const recommendations = this.generateRecommendations(anomalies)

    // 보행 단계 비율 계산
    const stanceFrames = frames.filter(
      (f) => f.phase.leftLeg === 'stance' || f.phase.rightLeg === 'stance'
    ).length
    const swingFrames = frames.filter(
      (f) => f.phase.leftLeg === 'swing' || f.phase.rightLeg === 'swing'
    ).length
    const totalPhaseFrames = stanceFrames + swingFrames

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      duration,
      totalStrides: this.currentPhaseState.cycleCount,
      averageMeasurements: avgMeasurements as unknown as GaitMeasurements,
      minMeasurements: {},
      maxMeasurements: {},
      phaseBreakdown: {
        stancePercent:
          totalPhaseFrames > 0 ? (stanceFrames / totalPhaseFrames) * 100 : 60,
        swingPercent:
          totalPhaseFrames > 0 ? (swingFrames / totalPhaseFrames) * 100 : 40,
        doubleSupport: 20,
      },
      anomalies,
      overallScore,
      recommendations,
    }
  }

  /**
   * 이상 징후를 감지합니다.
   */
  private detectAnomalies(measurements: GaitMeasurements): GaitAnomaly[] {
    const anomalies: GaitAnomaly[] = []

    // 좌우 비대칭
    if (measurements.leftRightSymmetry?.status === 'danger') {
      const isLeftLonger = measurements.leftRightSymmetry.value > 1
      anomalies.push({
        type: 'asymmetry',
        severity:
          Math.abs(measurements.leftRightSymmetry.value - 1) > 0.2
            ? 'severe'
            : 'moderate',
        description: GAIT_ANOMALY_LABELS.asymmetry.description.en,
        descriptionKo: GAIT_ANOMALY_LABELS.asymmetry.description.ko,
        affectedSide: isLeftLonger ? 'left' : 'right',
      })
    }

    // 발 들어올림 감소
    if (measurements.footClearance?.status === 'danger') {
      anomalies.push({
        type: 'reduced_clearance',
        severity: measurements.footClearance.value < 1 ? 'severe' : 'moderate',
        description: GAIT_ANOMALY_LABELS.reduced_clearance.description.en,
        descriptionKo: GAIT_ANOMALY_LABELS.reduced_clearance.description.ko,
        affectedSide: 'both',
      })
    }

    // 과도한 몸통 기울기
    if (measurements.trunkInclination?.status === 'danger') {
      anomalies.push({
        type: 'excessive_trunk_lean',
        severity:
          Math.abs(measurements.trunkInclination.value) > 15 ? 'severe' : 'moderate',
        description: GAIT_ANOMALY_LABELS.excessive_trunk_lean.description.en,
        descriptionKo: GAIT_ANOMALY_LABELS.excessive_trunk_lean.description.ko,
      })
    }

    // 무릎 굴곡 감소
    const leftKnee = measurements.kneeFlexionLeft?.value ?? 60
    const rightKnee = measurements.kneeFlexionRight?.value ?? 60
    if (leftKnee < 45 || rightKnee < 45) {
      anomalies.push({
        type: 'reduced_knee_flexion',
        severity: Math.min(leftKnee, rightKnee) < 30 ? 'severe' : 'moderate',
        description: GAIT_ANOMALY_LABELS.reduced_knee_flexion.description.en,
        descriptionKo: GAIT_ANOMALY_LABELS.reduced_knee_flexion.description.ko,
        affectedSide:
          leftKnee < rightKnee ? 'left' : rightKnee < leftKnee ? 'right' : 'both',
      })
    }

    return anomalies
  }

  /**
   * 전체 점수를 계산합니다.
   */
  private calculateOverallScore(measurements: GaitMeasurements): number {
    let totalScore = 0
    let totalWeight = 0

    // 보폭
    if (measurements.strideLength) {
      const score = calculateMeasurementScore(
        measurements.strideLength.value,
        measurements.strideLength.idealMin,
        measurements.strideLength.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.strideLength
      totalWeight += GAIT_SCORE_WEIGHTS.strideLength
    }

    // 보행 속도
    if (measurements.gaitSpeed) {
      const score = calculateMeasurementScore(
        measurements.gaitSpeed.value,
        measurements.gaitSpeed.idealMin,
        measurements.gaitSpeed.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.gaitSpeed
      totalWeight += GAIT_SCORE_WEIGHTS.gaitSpeed
    }

    // 좌우 대칭성
    if (measurements.leftRightSymmetry) {
      const score = calculateMeasurementScore(
        measurements.leftRightSymmetry.value,
        measurements.leftRightSymmetry.idealMin,
        measurements.leftRightSymmetry.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.leftRightSymmetry
      totalWeight += GAIT_SCORE_WEIGHTS.leftRightSymmetry
    }

    // 무릎 굴곡 (평균)
    if (measurements.kneeFlexionLeft && measurements.kneeFlexionRight) {
      const avgKnee =
        (measurements.kneeFlexionLeft.value + measurements.kneeFlexionRight.value) / 2
      const score = calculateMeasurementScore(
        avgKnee,
        measurements.kneeFlexionLeft.idealMin,
        measurements.kneeFlexionLeft.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.kneeFlexion
      totalWeight += GAIT_SCORE_WEIGHTS.kneeFlexion
    }

    // 엉덩이 굴곡 (평균)
    if (measurements.hipFlexionLeft && measurements.hipFlexionRight) {
      const avgHip =
        (measurements.hipFlexionLeft.value + measurements.hipFlexionRight.value) / 2
      const score = calculateMeasurementScore(
        avgHip,
        measurements.hipFlexionLeft.idealMin,
        measurements.hipFlexionLeft.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.hipFlexion
      totalWeight += GAIT_SCORE_WEIGHTS.hipFlexion
    }

    // 몸통 기울기
    if (measurements.trunkInclination) {
      const score = calculateMeasurementScore(
        measurements.trunkInclination.value,
        measurements.trunkInclination.idealMin,
        measurements.trunkInclination.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.trunkInclination
      totalWeight += GAIT_SCORE_WEIGHTS.trunkInclination
    }

    // 발 들어올림
    if (measurements.footClearance) {
      const score = calculateMeasurementScore(
        measurements.footClearance.value,
        measurements.footClearance.idealMin,
        measurements.footClearance.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.footClearance
      totalWeight += GAIT_SCORE_WEIGHTS.footClearance
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0
  }

  /**
   * 권장사항을 생성합니다.
   */
  private generateRecommendations(anomalies: GaitAnomaly[]): GaitRecommendation[] {
    const recommendations: GaitRecommendation[] = []

    for (const anomaly of anomalies) {
      switch (anomaly.type) {
        case 'asymmetry':
          recommendations.push({
            type: 'exercise',
            title: 'Balance Training',
            titleKo: '균형 훈련',
            description:
              'Practice single-leg standing and walking exercises to improve symmetry.',
            descriptionKo:
              '한 발 서기와 걷기 운동으로 대칭성을 개선하세요.',
            priority: anomaly.severity === 'severe' ? 'high' : 'medium',
          })
          break

        case 'reduced_clearance':
          recommendations.push({
            type: 'exercise',
            title: 'Hip Flexor Strengthening',
            titleKo: '고관절 굴곡근 강화',
            description:
              'Strengthen hip flexors to improve foot lift during walking.',
            descriptionKo:
              '보행 시 발 들어올림을 개선하기 위해 고관절 굴곡근을 강화하세요.',
            priority: 'high',
          })
          break

        case 'excessive_trunk_lean':
          recommendations.push({
            type: 'posture',
            title: 'Core Strengthening',
            titleKo: '코어 근력 강화',
            description:
              'Focus on core exercises to maintain upright posture during walking.',
            descriptionKo:
              '보행 중 바른 자세를 유지하기 위해 코어 운동에 집중하세요.',
            priority: 'medium',
          })
          break

        case 'reduced_knee_flexion':
          recommendations.push({
            type: 'exercise',
            title: 'Knee Mobility Exercises',
            titleKo: '무릎 가동성 운동',
            description:
              'Perform knee stretching and strengthening exercises.',
            descriptionKo: '무릎 스트레칭과 강화 운동을 수행하세요.',
            priority: 'medium',
          })
          break

        case 'reduced_hip_flexion':
          recommendations.push({
            type: 'exercise',
            title: 'Hip Mobility Exercises',
            titleKo: '고관절 가동성 운동',
            description:
              'Improve hip flexibility with stretching and mobility exercises.',
            descriptionKo:
              '스트레칭과 가동성 운동으로 고관절 유연성을 개선하세요.',
            priority: 'medium',
          })
          break
      }
    }

    // 일반 권장사항
    if (anomalies.some((a) => a.severity === 'severe')) {
      recommendations.push({
        type: 'medical',
        title: 'Consult a Specialist',
        titleKo: '전문가 상담',
        description:
          'Consider consulting a physical therapist for a detailed assessment.',
        descriptionKo: '자세한 평가를 위해 물리치료사 상담을 고려하세요.',
        priority: 'high',
      })
    }

    return recommendations
  }
}

// 싱글톤 인스턴스
let analyzerInstance: GaitAnalyzer | null = null

/**
 * 보행 분석기 인스턴스를 반환합니다.
 */
export function getGaitAnalyzer(): GaitAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new GaitAnalyzer()
  }
  return analyzerInstance
}

/**
 * 보행 분석기를 리셋합니다.
 */
export function resetGaitAnalyzer(): void {
  if (analyzerInstance) {
    analyzerInstance.reset()
  }
}
