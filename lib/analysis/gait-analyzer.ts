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
  GaitChartData,
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
 * 배열을 이동 평균으로 smoothing합니다.
 */
function smoothSignal(arr: number[], windowSize: number = 5): number[] {
  if (arr.length < windowSize) return [...arr]
  const result: number[] = []
  const half = Math.floor(windowSize / 2)
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - half)
    const end = Math.min(arr.length - 1, i + half)
    let sum = 0
    for (let j = start; j <= end; j++) {
      sum += arr[j]
    }
    result.push(sum / (end - start + 1))
  }
  return result
}

/**
 * 보행 분석기 클래스
 */
export class GaitAnalyzer {
  private frameBuffer: GaitFrame[] = []
  private maxBufferSize: number

  // 전체 프레임 데이터 (차트용, rolling 하지 않음)
  private allFrameData: Array<{
    timestamp: number
    leftKneeAngle: number
    rightKneeAngle: number
    leftHipAngle: number
    rightHipAngle: number
    leftAnkleY: number
    rightAnkleY: number
  }> = []

  // 발목 Y 위치 히스토리 (보행 단계 감지용)
  private leftAnkleYHistory: number[] = []
  private rightAnkleYHistory: number[] = []
  private leftAnkleYTimestamps: number[] = []
  private rightAnkleYTimestamps: number[] = []

  // 무릎 각도 히스토리 (stride 감지 - primary method)
  private leftKneeAngleHistory: number[] = []
  private rightKneeAngleHistory: number[] = []
  private kneeAngleTimestamps: number[] = []

  // 마지막 무릎 peak 시간
  private lastKneePeakTime = { left: 0, right: 0 }

  // Heel strike/Toe off 타이밍
  private lastHeelStrike = { left: 0, right: 0 }
  private lastToeOff = { left: 0, right: 0 }

  // 보폭 측정 (정규화 좌표 단위)
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
  private groundLevel = { left: 0, right: 0 }
  private groundLevelInitialized = false

  // 정규화 좌표 → 실제 거리(m) 변환 스케일
  private pixelToMeterScale = 1
  private legLengthSamples: number[] = []

  // 사용자 키 (cm), 설정 가능
  private userHeightCm = 170

  // 측면 촬영 감지
  private isSideView = false
  private viewDirection: 'left' | 'right' | 'front' = 'front'
  private shoulderSpreadSamples: number[] = []

  // 디버그용 프레임 카운터
  private frameCount = 0

  constructor() {
    this.maxBufferSize = GAIT_ANALYSIS_CONFIG.maxFrameBufferSize
  }

  /**
   * 사용자 키를 설정합니다 (보폭 변환에 사용).
   */
  setUserHeight(heightCm: number): void {
    if (heightCm > 0) {
      this.userHeightCm = heightCm
    }
  }

  /**
   * 분석기를 리셋합니다.
   */
  reset(): void {
    this.frameBuffer = []
    this.allFrameData = []
    this.leftAnkleYHistory = []
    this.rightAnkleYHistory = []
    this.leftAnkleYTimestamps = []
    this.rightAnkleYTimestamps = []
    this.leftKneeAngleHistory = []
    this.rightKneeAngleHistory = []
    this.kneeAngleTimestamps = []
    this.lastKneePeakTime = { left: 0, right: 0 }
    this.lastHeelStrike = { left: 0, right: 0 }
    this.lastToeOff = { left: 0, right: 0 }
    this.leftStrides = []
    this.rightStrides = []
    this.gaitCycles = []
    this.groundLevel = { left: 0, right: 0 }
    this.groundLevelInitialized = false
    this.pixelToMeterScale = 1
    this.legLengthSamples = []
    this.isSideView = false
    this.viewDirection = 'front'
    this.shoulderSpreadSamples = []
    this.frameCount = 0
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
    this.frameCount++

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

    // 발 위치 (heel과 ankle 중 더 낮은 것 사용 - Y가 클수록 화면 아래)
    const leftFootY = Math.max(leftAnkle.y, leftHeel?.y ?? leftAnkle.y)
    const rightFootY = Math.max(rightAnkle.y, rightHeel?.y ?? rightAnkle.y)

    // 발목 Y 위치 히스토리 업데이트
    this.leftAnkleYHistory.push(leftFootY)
    this.rightAnkleYHistory.push(rightFootY)
    this.leftAnkleYTimestamps.push(timestamp)
    this.rightAnkleYTimestamps.push(timestamp)

    // 무릎 각도 히스토리 업데이트
    this.leftKneeAngleHistory.push(leftKneeAngle)
    this.rightKneeAngleHistory.push(rightKneeAngle)
    this.kneeAngleTimestamps.push(timestamp)

    // 히스토리 크기 제한 (peak detection에 충분한 윈도우 확보)
    const historyLimit = 90
    if (this.leftAnkleYHistory.length > historyLimit) {
      this.leftAnkleYHistory.shift()
      this.leftAnkleYTimestamps.shift()
    }
    if (this.rightAnkleYHistory.length > historyLimit) {
      this.rightAnkleYHistory.shift()
      this.rightAnkleYTimestamps.shift()
    }
    if (this.leftKneeAngleHistory.length > historyLimit) {
      this.leftKneeAngleHistory.shift()
      this.rightKneeAngleHistory.shift()
      this.kneeAngleTimestamps.shift()
    }

    // 지면 레벨 업데이트 (가장 낮은 발 위치 = 가장 높은 Y값)
    if (!this.groundLevelInitialized) {
      this.groundLevel.left = leftFootY
      this.groundLevel.right = rightFootY
      this.groundLevelInitialized = true
    } else {
      const alpha = 0.05
      this.groundLevel.left = Math.max(this.groundLevel.left, leftFootY * alpha + this.groundLevel.left * (1 - alpha))
      this.groundLevel.right = Math.max(this.groundLevel.right, rightFootY * alpha + this.groundLevel.right * (1 - alpha))
    }

    // pixel→meter 스케일 업데이트 (다리 길이 기반)
    this.updatePixelToMeterScale(leftHip, leftAnkle, rightHip, rightAnkle)

    // 측면 촬영 감지
    this.detectSideView(leftShoulder, rightShoulder, leftHip, rightHip)

    // 보행 단계 감지 (무릎 각도 primary + 발목 Y secondary)
    this.detectGaitPhase(
      leftAnkle, rightAnkle, leftHeel, rightHeel,
      timestamp, leftKneeAngle, rightKneeAngle
    )

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

    // 차트용 전체 데이터 축적
    this.allFrameData.push({
      timestamp,
      leftKneeAngle,
      rightKneeAngle,
      leftHipAngle,
      rightHipAngle,
      leftAnkleY: leftFootY,
      rightAnkleY: rightFootY,
    })

    // [DEBUG] 매 30프레임마다 상태 출력
    if (this.frameCount % 30 === 0) {
      const lAYH = this.leftAnkleYHistory
      const ankleYRange = lAYH.length > 1 ? Math.max(...lAYH) - Math.min(...lAYH) : 0
      const lKAH = this.leftKneeAngleHistory
      const kneeRange = lKAH.length > 1 ? Math.max(...lKAH) - Math.min(...lKAH) : 0
      const hipAnkleDist = (calculateDistance(leftHip, leftAnkle) + calculateDistance(rightHip, rightAnkle)) / 2
      console.log(`[GaitDebug] frame=${this.frameCount}`, {
        ankleY: { L: leftFootY.toFixed(4), R: rightFootY.toFixed(4) },
        ankleYRange: ankleYRange.toFixed(4),
        kneeAngle: { L: leftKneeAngle.toFixed(1), R: rightKneeAngle.toFixed(1) },
        kneeAngleRange: kneeRange.toFixed(1),
        scale: this.pixelToMeterScale.toFixed(3),
        hipAnkleDist: hipAnkleDist.toFixed(4),
        isSideView: this.isSideView,
        viewDir: this.viewDirection,
        strides: this.currentPhaseState.cycleCount,
        cycles: this.gaitCycles.length,
        phase: `L:${this.currentPhaseState.leftLeg} R:${this.currentPhaseState.rightLeg}`,
        leftStrides: this.leftStrides.length,
        rightStrides: this.rightStrides.length,
      })
    }

    return frame
  }

  /**
   * 정규화 좌표에서 실제 미터로 변환하는 스케일을 업데이트합니다.
   */
  private updatePixelToMeterScale(
    leftHip: Landmark,
    leftAnkle: Landmark,
    rightHip: Landmark,
    rightAnkle: Landmark
  ): void {
    const leftLegLen = calculateDistance(leftHip, leftAnkle)
    const rightLegLen = calculateDistance(rightHip, rightAnkle)
    const avgLegLen = (leftLegLen + rightLegLen) / 2

    if (avgLegLen > 0.01) {
      this.legLengthSamples.push(avgLegLen)
      if (this.legLengthSamples.length > 30) {
        this.legLengthSamples.shift()
      }

      // 실제 다리 길이 (키의 약 47%)
      const realLegLengthM = (this.userHeightCm * 0.47) / 100
      const avgNormalizedLeg = this.legLengthSamples.reduce((a, b) => a + b, 0) / this.legLengthSamples.length
      this.pixelToMeterScale = realLegLengthM / avgNormalizedLeg
    }
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
    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    }
    const hipMid = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    }
    return calculateAngleFromVertical(hipMid, shoulderMid)
  }

  /**
   * 측면 촬영 여부를 감지합니다.
   */
  private detectSideView(
    leftShoulder: Landmark,
    rightShoulder: Landmark,
    leftHip: Landmark,
    rightHip: Landmark
  ): void {
    const shoulderSpread = Math.abs(leftShoulder.x - rightShoulder.x)
    const hipSpread = Math.abs(leftHip.x - rightHip.x)
    const avgSpread = (shoulderSpread + hipSpread) / 2

    this.shoulderSpreadSamples.push(avgSpread)
    if (this.shoulderSpreadSamples.length > 30) {
      this.shoulderSpreadSamples.shift()
    }

    const avgSample = this.shoulderSpreadSamples.reduce((a, b) => a + b, 0) / this.shoulderSpreadSamples.length

    // 어깨/엉덩이 X좌표 차이가 작으면 측면 촬영 (겹쳐 보임)
    this.isSideView = avgSample < 0.08

    if (this.isSideView) {
      // 방향 감지: 어깨 중점 기준으로 왼쪽/오른쪽 판단
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
      if (leftShoulder.x < rightShoulder.x) {
        // 왼쪽 어깨가 더 왼쪽에 → 사람이 오른쪽을 향함
        this.viewDirection = shoulderMidX < 0.5 ? 'right' : 'left'
      } else {
        this.viewDirection = shoulderMidX < 0.5 ? 'left' : 'right'
      }
    } else {
      this.viewDirection = 'front'
    }
  }

  /**
   * smoothed 신호에서 local maximum을 감지합니다.
   * halfWindow 프레임 전의 값이 양쪽 이웃보다 큰지 확인합니다.
   */
  private detectSignalPeak(
    smoothed: number[],
    timestamps: number[],
    halfWindow: number,
    minRange: number,
    peakThresholdRatio: number
  ): { index: number; timestamp: number; value: number } | null {
    if (smoothed.length < halfWindow * 2 + 1) return null

    const checkIdx = smoothed.length - 1 - halfWindow
    if (checkIdx < halfWindow) return null

    const val = smoothed[checkIdx]

    // local maximum 확인
    let isPeak = true
    for (let i = 1; i <= halfWindow; i++) {
      if (smoothed[checkIdx - i] >= val || smoothed[checkIdx + i] >= val) {
        isPeak = false
        break
      }
    }
    if (!isPeak) return null

    // 동적 임계값: 최근 데이터의 범위 확인
    const windowSize = Math.min(60, smoothed.length)
    const recent = smoothed.slice(-windowSize)
    const minVal = Math.min(...recent)
    const maxVal = Math.max(...recent)
    const range = maxVal - minVal

    if (range < minRange) return null

    // peak가 범위의 상위 부분에 있어야 함
    if (val < minVal + range * peakThresholdRatio) return null

    return { index: checkIdx, timestamp: timestamps[checkIdx], value: val }
  }

  /**
   * smoothed 신호에서 local minimum을 감지합니다.
   */
  private detectSignalValley(
    smoothed: number[],
    timestamps: number[],
    halfWindow: number,
    minRange: number,
    valleyThresholdRatio: number
  ): { index: number; timestamp: number; value: number } | null {
    if (smoothed.length < halfWindow * 2 + 1) return null

    const checkIdx = smoothed.length - 1 - halfWindow
    if (checkIdx < halfWindow) return null

    const val = smoothed[checkIdx]

    // local minimum 확인
    let isValley = true
    for (let i = 1; i <= halfWindow; i++) {
      if (smoothed[checkIdx - i] <= val || smoothed[checkIdx + i] <= val) {
        isValley = false
        break
      }
    }
    if (!isValley) return null

    const windowSize = Math.min(60, smoothed.length)
    const recent = smoothed.slice(-windowSize)
    const minVal = Math.min(...recent)
    const maxVal = Math.max(...recent)
    const range = maxVal - minVal

    if (range < minRange) return null

    // valley가 범위의 하위 부분에 있어야 함
    if (val > minVal + range * valleyThresholdRatio) return null

    return { index: checkIdx, timestamp: timestamps[checkIdx], value: val }
  }

  /**
   * 보행 단계를 감지합니다.
   * Primary: 무릎 각도 peak (대진폭, 더 robust)
   * Secondary: 발목 Y peak (fallback)
   */
  private detectGaitPhase(
    leftAnkle: Landmark,
    rightAnkle: Landmark,
    _leftHeel: Landmark | undefined,
    _rightHeel: Landmark | undefined,
    timestamp: number,
    leftKneeAngle: number,
    rightKneeAngle: number
  ): void {
    const minPeakInterval = 333 // 최소 peak 간격 (ms) - 빠른 걸음 0.33초

    // === Primary: 무릎 각도 peak detection ===
    // 무릎 굴곡 최대값 = mid-swing (발이 뒤에서 앞으로 이동 중 무릎 최대 굽힘)
    const smoothedLeftKnee = smoothSignal(this.leftKneeAngleHistory, 5)
    const smoothedRightKnee = smoothSignal(this.rightKneeAngleHistory, 5)

    // halfWindow=6, minRange=15° (걷기 시 최소 15° 이상 무릎 각도 변화), threshold=0.3 (상위 70%)
    const leftKneePeak = this.detectSignalPeak(
      smoothedLeftKnee, this.kneeAngleTimestamps, 6, 15, 0.3
    )
    const rightKneePeak = this.detectSignalPeak(
      smoothedRightKnee, this.kneeAngleTimestamps, 6, 15, 0.3
    )

    let kneeDetectionUsed = false

    // 왼쪽 무릎 peak → 왼발 swing 중 최대 굴곡 → 곧 heel strike
    if (leftKneePeak) {
      const elapsed = leftKneePeak.timestamp - this.lastKneePeakTime.left
      if (elapsed > minPeakInterval || this.lastKneePeakTime.left === 0) {
        console.log(`[GaitDebug] LEFT knee peak detected`, {
          time: leftKneePeak.timestamp.toFixed(0),
          angle: leftKneePeak.value.toFixed(1),
          elapsed: elapsed.toFixed(0),
          ankleXsep: Math.abs(leftAnkle.x - rightAnkle.x).toFixed(4),
        })
        kneeDetectionUsed = true

        // 보행 주기: 같은 발의 연속 peak 간 시간
        if (this.lastKneePeakTime.left > 0) {
          const cycle = leftKneePeak.timestamp - this.lastKneePeakTime.left
          if (cycle > 400 && cycle < 3000) {
            this.gaitCycles.push(cycle)
          }
        }
        this.lastKneePeakTime.left = leftKneePeak.timestamp

        // 보폭: 이 시점에서 양 발목 X 좌표 차이
        const stridePx = Math.abs(leftAnkle.x - rightAnkle.x)
        if (stridePx > 0.005) {
          this.leftStrides.push(stridePx)
        }

        // 보행 상태 전환
        this.currentPhaseState.leftLeg = 'stance'
        this.currentPhaseState.leftPhase = 'initial_contact'
        this.lastHeelStrike.left = leftKneePeak.timestamp
        this.currentPhaseState.lastHeelStrike.left = leftKneePeak.timestamp
        this.currentPhaseState.cycleCount++
      }
    }

    // 오른쪽 무릎 peak
    if (rightKneePeak) {
      const elapsed = rightKneePeak.timestamp - this.lastKneePeakTime.right
      if (elapsed > minPeakInterval || this.lastKneePeakTime.right === 0) {
        console.log(`[GaitDebug] RIGHT knee peak detected`, {
          time: rightKneePeak.timestamp.toFixed(0),
          angle: rightKneePeak.value.toFixed(1),
          elapsed: elapsed.toFixed(0),
          ankleXsep: Math.abs(leftAnkle.x - rightAnkle.x).toFixed(4),
        })
        kneeDetectionUsed = true

        if (this.lastKneePeakTime.right > 0) {
          const cycle = rightKneePeak.timestamp - this.lastKneePeakTime.right
          if (cycle > 400 && cycle < 3000) {
            this.gaitCycles.push(cycle)
          }
        }
        this.lastKneePeakTime.right = rightKneePeak.timestamp

        const stridePx = Math.abs(rightAnkle.x - leftAnkle.x)
        if (stridePx > 0.005) {
          this.rightStrides.push(stridePx)
        }

        this.currentPhaseState.rightLeg = 'stance'
        this.currentPhaseState.rightPhase = 'initial_contact'
        this.lastHeelStrike.right = rightKneePeak.timestamp
        this.currentPhaseState.lastHeelStrike.right = rightKneePeak.timestamp
      }
    }

    // === 무릎 각도 valley → 무릎 최대 신전 = mid-stance → swing 전환 ===
    const leftKneeValley = this.detectSignalValley(
      smoothedLeftKnee, this.kneeAngleTimestamps, 6, 15, 0.4
    )
    if (leftKneeValley && this.currentPhaseState.leftLeg === 'stance') {
      const elapsed = leftKneeValley.timestamp - this.lastToeOff.left
      if (elapsed > 200 || this.lastToeOff.left === 0) {
        this.currentPhaseState.leftLeg = 'swing'
        this.currentPhaseState.leftPhase = 'pre_swing'
        this.lastToeOff.left = leftKneeValley.timestamp
        this.currentPhaseState.lastToeOff.left = leftKneeValley.timestamp
      }
    }

    const rightKneeValley = this.detectSignalValley(
      smoothedRightKnee, this.kneeAngleTimestamps, 6, 15, 0.4
    )
    if (rightKneeValley && this.currentPhaseState.rightLeg === 'stance') {
      const elapsed = rightKneeValley.timestamp - this.lastToeOff.right
      if (elapsed > 200 || this.lastToeOff.right === 0) {
        this.currentPhaseState.rightLeg = 'swing'
        this.currentPhaseState.rightPhase = 'pre_swing'
        this.lastToeOff.right = rightKneeValley.timestamp
        this.currentPhaseState.lastToeOff.right = rightKneeValley.timestamp
      }
    }

    // === Secondary/Fallback: 발목 Y 기반 감지 ===
    // 무릎 각도로 감지 안 될 때 (60프레임 이상 경과, 아직 cycle 없음)
    if (!kneeDetectionUsed && this.frameCount > 60 && this.gaitCycles.length === 0) {
      const smoothedLeftAnkleY = smoothSignal(this.leftAnkleYHistory, 5)
      const smoothedRightAnkleY = smoothSignal(this.rightAnkleYHistory, 5)

      // 발목 Y local maxima = heel strike (Y 클수록 아래 = 지면)
      // halfWindow=5, minRange=0.002 (매우 작은 변화도 감지), threshold=0.5
      const leftAnklePeak = this.detectSignalPeak(
        smoothedLeftAnkleY, this.leftAnkleYTimestamps, 5, 0.002, 0.5
      )
      if (leftAnklePeak) {
        const elapsed = leftAnklePeak.timestamp - this.lastHeelStrike.left
        if (elapsed > minPeakInterval || this.lastHeelStrike.left === 0) {
          console.log(`[GaitDebug] LEFT ankle Y peak (fallback)`, {
            time: leftAnklePeak.timestamp.toFixed(0),
            value: leftAnklePeak.value.toFixed(4),
          })

          if (this.lastHeelStrike.left > 0) {
            const cycle = leftAnklePeak.timestamp - this.lastHeelStrike.left
            if (cycle > 400 && cycle < 3000) {
              this.gaitCycles.push(cycle)
            }
          }
          this.lastHeelStrike.left = leftAnklePeak.timestamp
          this.currentPhaseState.lastHeelStrike.left = leftAnklePeak.timestamp
          this.currentPhaseState.leftLeg = 'stance'
          this.currentPhaseState.leftPhase = 'initial_contact'
          this.currentPhaseState.cycleCount++

          const stridePx = Math.abs(leftAnkle.x - rightAnkle.x)
          if (stridePx > 0.005) {
            this.leftStrides.push(stridePx)
          }
        }
      }

      const rightAnklePeak = this.detectSignalPeak(
        smoothedRightAnkleY, this.rightAnkleYTimestamps, 5, 0.002, 0.5
      )
      if (rightAnklePeak) {
        const elapsed = rightAnklePeak.timestamp - this.lastHeelStrike.right
        if (elapsed > minPeakInterval || this.lastHeelStrike.right === 0) {
          console.log(`[GaitDebug] RIGHT ankle Y peak (fallback)`, {
            time: rightAnklePeak.timestamp.toFixed(0),
            value: rightAnklePeak.value.toFixed(4),
          })

          if (this.lastHeelStrike.right > 0) {
            const cycle = rightAnklePeak.timestamp - this.lastHeelStrike.right
            if (cycle > 400 && cycle < 3000) {
              this.gaitCycles.push(cycle)
            }
          }
          this.lastHeelStrike.right = rightAnklePeak.timestamp
          this.currentPhaseState.lastHeelStrike.right = rightAnklePeak.timestamp
          this.currentPhaseState.rightLeg = 'stance'
          this.currentPhaseState.rightPhase = 'initial_contact'

          const stridePx = Math.abs(rightAnkle.x - leftAnkle.x)
          if (stridePx > 0.005) {
            this.rightStrides.push(stridePx)
          }
        }
      }

      // 발목 Y local minima = toe off (Y 작을수록 위)
      const leftAnkleValley = this.detectSignalValley(
        smoothedLeftAnkleY, this.leftAnkleYTimestamps, 5, 0.002, 0.5
      )
      if (leftAnkleValley && this.currentPhaseState.leftLeg === 'stance') {
        const elapsed = leftAnkleValley.timestamp - this.lastToeOff.left
        if (elapsed > 200 || this.lastToeOff.left === 0) {
          this.currentPhaseState.leftLeg = 'swing'
          this.currentPhaseState.leftPhase = 'pre_swing'
          this.lastToeOff.left = leftAnkleValley.timestamp
          this.currentPhaseState.lastToeOff.left = leftAnkleValley.timestamp
        }
      }

      const rightAnkleValley = this.detectSignalValley(
        smoothedRightAnkleY, this.rightAnkleYTimestamps, 5, 0.002, 0.5
      )
      if (rightAnkleValley && this.currentPhaseState.rightLeg === 'stance') {
        const elapsed = rightAnkleValley.timestamp - this.lastToeOff.right
        if (elapsed > 200 || this.lastToeOff.right === 0) {
          this.currentPhaseState.rightLeg = 'swing'
          this.currentPhaseState.rightPhase = 'pre_swing'
          this.lastToeOff.right = rightAnkleValley.timestamp
          this.currentPhaseState.lastToeOff.right = rightAnkleValley.timestamp
        }
      }
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

    // 오른발 세부 단계
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
   * 측정값을 계산합니다.
   */
  private calculateMeasurements(
    landmarks: Landmark[],
    _timestamp: number
  ): Partial<GaitMeasurements> {
    const windowSize = GAIT_ANALYSIS_CONFIG.smoothingWindowSize

    // 보폭 (정규화 좌표 → 실제 미터 변환)
    const avgLeftStride = movingAverage(this.leftStrides, windowSize)
    const avgRightStride = movingAverage(this.rightStrides, windowSize)
    const avgStrideNorm = (avgLeftStride + avgRightStride) / 2
    // step length (양 발목 간 거리) → stride length ≈ 2 * step length
    const avgStrideMeters = avgStrideNorm * this.pixelToMeterScale * 2

    // 보행 주기
    const avgCycle = movingAverage(this.gaitCycles, windowSize)

    // 좌우 대칭성
    const symmetry =
      avgRightStride > 0 ? avgLeftStride / avgRightStride : 1

    // 보행 속도 (m/s) = 보폭(m) / 보행주기(s)
    const speed = avgCycle > 0 ? avgStrideMeters / (avgCycle / 1000) : 0

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

    // 발 들어올림 높이 (정규화 좌표 → cm 변환)
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
    const clearanceCm = avgClearance * this.pixelToMeterScale * 100

    return {
      strideLength: this.createMeasurementValue(avgStrideMeters, 'strideLength'),
      gaitSpeed: this.createMeasurementValue(speed, 'gaitSpeed'),
      gaitCycle: this.createMeasurementValue(avgCycle, 'gaitCycle'),
      leftRightSymmetry: this.createMeasurementValue(symmetry, 'leftRightSymmetry'),
      kneeFlexionLeft: this.createMeasurementValue(avgLeftKnee, 'kneeFlexionLeft'),
      kneeFlexionRight: this.createMeasurementValue(avgRightKnee, 'kneeFlexionRight'),
      hipFlexionLeft: this.createMeasurementValue(avgLeftHip, 'hipFlexionLeft'),
      hipFlexionRight: this.createMeasurementValue(avgRightHip, 'hipFlexionRight'),
      trunkInclination: this.createMeasurementValue(avgTrunk, 'trunkInclination'),
      footClearance: this.createMeasurementValue(clearanceCm, 'footClearance'),
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

    return lastFrame.measurements as GaitMeasurements
  }

  /**
   * allFrameData를 최대 maxPoints 개로 다운샘플링하여 차트 데이터를 생성합니다.
   */
  private buildChartData(maxPoints: number = 500): GaitChartData {
    const data = this.allFrameData
    if (data.length === 0) {
      return {
        timestamps: [],
        leftKneeAngles: [],
        rightKneeAngles: [],
        leftHipAngles: [],
        rightHipAngles: [],
        leftAnkleHeights: [],
        rightAnkleHeights: [],
      }
    }

    let sampled = data
    if (data.length > maxPoints) {
      sampled = []
      const step = data.length / maxPoints
      for (let i = 0; i < maxPoints; i++) {
        sampled.push(data[Math.floor(i * step)])
      }
    }

    const startTime = sampled[0].timestamp
    return {
      timestamps: sampled.map((d) => Math.round(d.timestamp - startTime)),
      leftKneeAngles: sampled.map((d) => Math.round(d.leftKneeAngle)),
      rightKneeAngles: sampled.map((d) => Math.round(d.rightKneeAngle)),
      leftHipAngles: sampled.map((d) => Math.round(d.leftHipAngle)),
      rightHipAngles: sampled.map((d) => Math.round(d.rightHipAngle)),
      leftAnkleHeights: sampled.map((d) => Math.round((1 - d.leftAnkleY) * 100)),
      rightAnkleHeights: sampled.map((d) => Math.round((1 - d.rightAnkleY) * 100)),
    }
  }

  /**
   * 전체 분석 결과를 생성합니다.
   */
  generateAnalysisResult(): GaitAnalysisResult | null {
    if (this.frameBuffer.length < 10) {
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

    // [DEBUG] 최종 결과 요약
    console.log(`[GaitDebug] === FINAL RESULT ===`, {
      duration: duration.toFixed(1),
      totalStrides: this.currentPhaseState.cycleCount,
      gaitCycles: this.gaitCycles.length,
      leftStrides: this.leftStrides.length,
      rightStrides: this.rightStrides.length,
      avgLeftStride: this.leftStrides.length > 0
        ? (this.leftStrides.reduce((a, b) => a + b, 0) / this.leftStrides.length).toFixed(4)
        : 'none',
      avgRightStride: this.rightStrides.length > 0
        ? (this.rightStrides.reduce((a, b) => a + b, 0) / this.rightStrides.length).toFixed(4)
        : 'none',
      pixelToMeterScale: this.pixelToMeterScale.toFixed(3),
      isSideView: this.isSideView,
      viewDirection: this.viewDirection,
      overallScore,
    })

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
      chartData: this.buildChartData(),
      isSideView: this.isSideView,
    }
  }

  /**
   * 이상 징후를 감지합니다.
   */
  private detectAnomalies(measurements: GaitMeasurements): GaitAnomaly[] {
    const anomalies: GaitAnomaly[] = []

    // 좌우 비대칭 (측면 촬영 시 제외)
    if (!this.isSideView && measurements.leftRightSymmetry?.status === 'danger') {
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

    if (measurements.strideLength) {
      const score = calculateMeasurementScore(
        measurements.strideLength.value,
        measurements.strideLength.idealMin,
        measurements.strideLength.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.strideLength
      totalWeight += GAIT_SCORE_WEIGHTS.strideLength
    }

    if (measurements.gaitSpeed) {
      const score = calculateMeasurementScore(
        measurements.gaitSpeed.value,
        measurements.gaitSpeed.idealMin,
        measurements.gaitSpeed.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.gaitSpeed
      totalWeight += GAIT_SCORE_WEIGHTS.gaitSpeed
    }

    if (measurements.leftRightSymmetry) {
      const score = calculateMeasurementScore(
        measurements.leftRightSymmetry.value,
        measurements.leftRightSymmetry.idealMin,
        measurements.leftRightSymmetry.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.leftRightSymmetry
      totalWeight += GAIT_SCORE_WEIGHTS.leftRightSymmetry
    }

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

    if (measurements.trunkInclination) {
      const score = calculateMeasurementScore(
        measurements.trunkInclination.value,
        measurements.trunkInclination.idealMin,
        measurements.trunkInclination.idealMax
      )
      totalScore += score * GAIT_SCORE_WEIGHTS.trunkInclination
      totalWeight += GAIT_SCORE_WEIGHTS.trunkInclination
    }

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
