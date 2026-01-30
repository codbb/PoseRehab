'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { PoseLandmark, ImageOrientation, ProblemArea } from '@/types/analysis-result'
import { POSE_LANDMARKS } from '@/hooks/use-pose-detection'

interface SkeletonRendererProps {
  landmarks: PoseLandmark[]
  orientation: ImageOrientation
  imageNaturalWidth?: number  // 이미지 원본 너비
  imageNaturalHeight?: number // 이미지 원본 높이
  containerRef?: React.RefObject<HTMLDivElement>
  problemAreas?: ProblemArea[]
  showIdealLine?: boolean
  className?: string
}

// MediaPipe Pose 연결 정의 - 정면용 전신 스켈레톤
const FRONT_SKELETON_CONNECTIONS: [number, number][] = [
  // 얼굴
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_EYE],
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_EYE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.LEFT_EYE_OUTER],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.RIGHT_EYE_OUTER],
  [POSE_LANDMARKS.LEFT_EYE_OUTER, POSE_LANDMARKS.LEFT_EAR],
  [POSE_LANDMARKS.RIGHT_EYE_OUTER, POSE_LANDMARKS.RIGHT_EAR],

  // 어깨
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],

  // 왼팔
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],

  // 오른팔
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],

  // 몸통
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],

  // 엉덩이
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],

  // 왼쪽 다리
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],

  // 오른쪽 다리
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],

  // 왼발
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],

  // 오른발
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
]

// 측면 척추 라인 연결 (귀 -> 어깨 -> 엉덩이 -> 무릎 -> 발목)
const SIDE_SPINE_CONNECTIONS_LEFT: [number, number][] = [
  [POSE_LANDMARKS.LEFT_EAR, POSE_LANDMARKS.LEFT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
]

const SIDE_SPINE_CONNECTIONS_RIGHT: [number, number][] = [
  [POSE_LANDMARKS.RIGHT_EAR, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
]

const SIDE_SPINE_LANDMARKS_LEFT = [
  POSE_LANDMARKS.LEFT_EAR,
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
]

const SIDE_SPINE_LANDMARKS_RIGHT = [
  POSE_LANDMARKS.RIGHT_EAR,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.RIGHT_ANKLE,
]

// 사진 방향 자동 감지
export function detectOrientation(landmarks: PoseLandmark[]): ImageOrientation {
  if (landmarks.length < 33) return 'front'

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 'front'

  const shoulderDistance = Math.abs(rightShoulder.x - leftShoulder.x)
  const hipDistance = Math.abs(rightHip.x - leftHip.x)
  const avgDistance = (shoulderDistance + hipDistance) / 2

  if (avgDistance < 0.08) {
    return 'side'
  }

  return 'front'
}

// 측면에서 어느 쪽을 보고 있는지 감지
function detectSideDirection(landmarks: PoseLandmark[]): 'left' | 'right' {
  if (landmarks.length < 33) return 'left'

  const nose = landmarks[POSE_LANDMARKS.NOSE]
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]

  if (!nose || !leftShoulder || !rightShoulder) return 'left'

  const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2
  return nose.x < shoulderCenter ? 'left' : 'right'
}

// 랜드마크가 문제 영역에 있는지 확인
function isLandmarkInProblemArea(index: number, problemAreas?: ProblemArea[]): ProblemArea | undefined {
  if (!problemAreas) return undefined
  return problemAreas.find(area => area.landmarkIndices.includes(index))
}

// 연결선이 문제 영역에 있는지 확인
function isConnectionInProblemArea(
  connIndex: number,
  start: number,
  end: number,
  problemAreas?: ProblemArea[]
): ProblemArea | undefined {
  if (!problemAreas) return undefined
  return problemAreas.find(area =>
    area.connectionIndices?.includes(connIndex) ||
    (area.landmarkIndices.includes(start) && area.landmarkIndices.includes(end))
  )
}

/**
 * object-contain으로 표시된 이미지의 실제 렌더링 영역 계산
 */
function calculateContainedImageArea(
  containerWidth: number,
  containerHeight: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number
): { offsetX: number; offsetY: number; renderWidth: number; renderHeight: number } {
  const containerAspect = containerWidth / containerHeight
  const imageAspect = imageNaturalWidth / imageNaturalHeight

  let renderWidth: number
  let renderHeight: number
  let offsetX: number
  let offsetY: number

  if (imageAspect > containerAspect) {
    // 이미지가 더 넓음 - 위아래 여백 (letterbox)
    renderWidth = containerWidth
    renderHeight = containerWidth / imageAspect
    offsetX = 0
    offsetY = (containerHeight - renderHeight) / 2
  } else {
    // 이미지가 더 높음 - 좌우 여백 (pillarbox)
    renderHeight = containerHeight
    renderWidth = containerHeight * imageAspect
    offsetX = (containerWidth - renderWidth) / 2
    offsetY = 0
  }

  return { offsetX, offsetY, renderWidth, renderHeight }
}

export function SkeletonRenderer({
  landmarks,
  orientation,
  imageNaturalWidth = 1,
  imageNaturalHeight = 1,
  containerRef,
  problemAreas,
  showIdealLine = true,
  className,
}: SkeletonRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 400 })

  // 컨테이너 크기 변화 감지
  const updateCanvasSize = useCallback(() => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCanvasSize({ width: rect.width, height: rect.height })
    }
  }, [containerRef])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    // ResizeObserver로 더 정확하게 감지
    const observer = new ResizeObserver(updateCanvasSize)
    if (containerRef?.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      observer.disconnect()
    }
  }, [updateCanvasSize, containerRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !landmarks || landmarks.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (landmarks.length < 33) return

    const isSideView = orientation === 'side'
    const sideDirection = isSideView ? detectSideDirection(landmarks) : 'left'

    // 연결선과 랜드마크 선택
    const connections = isSideView
      ? (sideDirection === 'left' ? SIDE_SPINE_CONNECTIONS_LEFT : SIDE_SPINE_CONNECTIONS_RIGHT)
      : FRONT_SKELETON_CONNECTIONS

    const visibleLandmarkIndices: readonly number[] | null = isSideView
      ? (sideDirection === 'left' ? SIDE_SPINE_LANDMARKS_LEFT : SIDE_SPINE_LANDMARKS_RIGHT)
      : null

    // 스타일 상수
    const LINE_WIDTH = 2
    const POINT_RADIUS = 2.5
    const NORMAL_COLOR = '#10B981'
    const WARNING_COLOR = '#F59E0B'
    const DANGER_COLOR = '#EF4444'
    const IDEAL_LINE_COLOR = 'rgba(59, 130, 246, 0.5)'

    // object-contain으로 표시된 이미지의 실제 렌더링 영역 계산
    const { offsetX, offsetY, renderWidth, renderHeight } = calculateContainedImageArea(
      canvasSize.width,
      canvasSize.height,
      imageNaturalWidth,
      imageNaturalHeight
    )

    // 좌표 변환 함수: 정규화된 좌표(0~1) → 캔버스 픽셀 좌표
    const toCanvasCoords = (normX: number, normY: number) => ({
      x: offsetX + normX * renderWidth,
      y: offsetY + normY * renderHeight,
    })

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 이상적인 수직선 (측면용)
    if (isSideView && showIdealLine) {
      const earIndex = sideDirection === 'left' ? POSE_LANDMARKS.LEFT_EAR : POSE_LANDMARKS.RIGHT_EAR
      const ankleIndex = sideDirection === 'left' ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE
      const ear = landmarks[earIndex]
      const ankle = landmarks[ankleIndex]

      if (ear && ankle) {
        const ankleCoords = toCanvasCoords(ankle.x, ankle.y)
        const earCoords = toCanvasCoords(ear.x, ear.y)

        ctx.strokeStyle = IDEAL_LINE_COLOR
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(ankleCoords.x, earCoords.y - 10)
        ctx.lineTo(ankleCoords.x, ankleCoords.y + 10)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // 연결선 그리기
    ctx.lineWidth = LINE_WIDTH
    for (const [start, end] of connections) {
      const startLm = landmarks[start]
      const endLm = landmarks[end]

      if (!startLm || !endLm) continue
      if ((startLm.visibility ?? 1) < 0.5 || (endLm.visibility ?? 1) < 0.5) continue

      const problemArea = isConnectionInProblemArea(connections.indexOf([start, end] as [number, number]), start, end, problemAreas)
      const color = problemArea
        ? (problemArea.severity === 'danger' ? DANGER_COLOR : WARNING_COLOR)
        : NORMAL_COLOR

      const startCoords = toCanvasCoords(startLm.x, startLm.y)
      const endCoords = toCanvasCoords(endLm.x, endLm.y)

      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.moveTo(startCoords.x, startCoords.y)
      ctx.lineTo(endCoords.x, endCoords.y)
      ctx.stroke()
    }

    // 랜드마크 포인트 그리기
    for (let index = 0; index < landmarks.length; index++) {
      // 측면에서는 척추 라인 랜드마크만 표시
      if (visibleLandmarkIndices && !visibleLandmarkIndices.includes(index)) {
        continue
      }

      const lm = landmarks[index]
      if (!lm || (lm.visibility ?? 1) < 0.5) continue

      const problemArea = isLandmarkInProblemArea(index, problemAreas)
      const color = problemArea
        ? (problemArea.severity === 'danger' ? DANGER_COLOR : WARNING_COLOR)
        : NORMAL_COLOR

      const coords = toCanvasCoords(lm.x, lm.y)

      // 외곽선 (그림자)
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, POINT_RADIUS + 1, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fill()

      // 포인트
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, POINT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }, [landmarks, orientation, canvasSize, imageNaturalWidth, imageNaturalHeight, problemAreas, showIdealLine])

  if (!landmarks || landmarks.length === 0) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className={className}
      style={{ pointerEvents: 'none' }}
    />
  )
}

// 간단한 척추 라인만 그리는 컴포넌트 (측면 전용)
interface SpineLineRendererProps {
  landmarks: PoseLandmark[]
  imageNaturalWidth?: number
  imageNaturalHeight?: number
  containerRef?: React.RefObject<HTMLDivElement>
  showIdealLine?: boolean
  problemAreas?: ProblemArea[]
  className?: string
}

export function SpineLineRenderer({
  landmarks,
  imageNaturalWidth = 1,
  imageNaturalHeight = 1,
  containerRef,
  showIdealLine = true,
  problemAreas,
  className,
}: SpineLineRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 400 })

  // 컨테이너 크기 변화 감지
  const updateCanvasSize = useCallback(() => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCanvasSize({ width: rect.width, height: rect.height })
    }
  }, [containerRef])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    const observer = new ResizeObserver(updateCanvasSize)
    if (containerRef?.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      observer.disconnect()
    }
  }, [updateCanvasSize, containerRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !landmarks || landmarks.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (landmarks.length < 33) return

    const sideDirection = detectSideDirection(landmarks)
    const spineLandmarks = sideDirection === 'left'
      ? SIDE_SPINE_LANDMARKS_LEFT
      : SIDE_SPINE_LANDMARKS_RIGHT

    const LINE_WIDTH = 2
    const POINT_RADIUS = 2.5
    const SPINE_COLOR = '#10B981'
    const DANGER_COLOR = '#EF4444'
    const IDEAL_LINE_COLOR = 'rgba(59, 130, 246, 0.5)'

    // object-contain으로 표시된 이미지의 실제 렌더링 영역 계산
    const { offsetX, offsetY, renderWidth, renderHeight } = calculateContainedImageArea(
      canvasSize.width,
      canvasSize.height,
      imageNaturalWidth,
      imageNaturalHeight
    )

    // 좌표 변환 함수
    const toCanvasCoords = (normX: number, normY: number) => ({
      x: offsetX + normX * renderWidth,
      y: offsetY + normY * renderHeight,
    })

    // 척추 라인 포인트들
    const spinePoints = spineLandmarks
      .map(idx => landmarks[idx])
      .filter(lm => lm && (lm.visibility ?? 1) > 0.5)

    if (spinePoints.length < 2) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 이상적인 수직선
    if (showIdealLine) {
      const anklePoint = spinePoints[spinePoints.length - 1]
      const earPoint = spinePoints[0]

      if (anklePoint && earPoint) {
        const ankleCoords = toCanvasCoords(anklePoint.x, anklePoint.y)
        const earCoords = toCanvasCoords(earPoint.x, earPoint.y)

        ctx.strokeStyle = IDEAL_LINE_COLOR
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(ankleCoords.x, earCoords.y - 5)
        ctx.lineTo(ankleCoords.x, ankleCoords.y + 5)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // 척추 라인
    ctx.strokeStyle = SPINE_COLOR
    ctx.lineWidth = LINE_WIDTH
    ctx.beginPath()
    spinePoints.forEach((pt, i) => {
      const coords = toCanvasCoords(pt.x, pt.y)
      if (i === 0) {
        ctx.moveTo(coords.x, coords.y)
      } else {
        ctx.lineTo(coords.x, coords.y)
      }
    })
    ctx.stroke()

    // 척추 포인트
    spinePoints.forEach((pt, index) => {
      const actualIndex = spineLandmarks[index]
      const problemArea = problemAreas?.find(area => area.landmarkIndices.includes(actualIndex))
      const color = problemArea
        ? (problemArea.severity === 'danger' ? DANGER_COLOR : '#F59E0B')
        : SPINE_COLOR

      const coords = toCanvasCoords(pt.x, pt.y)

      // 외곽선
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, POINT_RADIUS + 1, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.fill()

      // 포인트
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, POINT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.stroke()
    })
  }, [landmarks, canvasSize, imageNaturalWidth, imageNaturalHeight, showIdealLine, problemAreas])

  if (!landmarks || landmarks.length === 0) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className={className}
      style={{ pointerEvents: 'none' }}
    />
  )
}
