'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { Landmark } from '@/types/posture'
import { GAIT_LANDMARKS, GAIT_SKELETON_CONNECTIONS } from '@/types/gait'

interface GaitSkeletonProps {
  landmarks: Landmark[] | null
  videoWidth: number
  videoHeight: number
  containerRef?: React.RefObject<HTMLDivElement>
  showSkeleton?: boolean
  primaryColor?: string
  secondaryColor?: string
  mirrored?: boolean
}

// 신뢰도 임계값
const CONFIDENCE_THRESHOLD = 0.3

// 주요 관절 (더 큰 점으로 표시)
const MAJOR_LANDMARKS: number[] = [
  GAIT_LANDMARKS.NOSE,
  GAIT_LANDMARKS.LEFT_SHOULDER,
  GAIT_LANDMARKS.RIGHT_SHOULDER,
  GAIT_LANDMARKS.LEFT_HIP,
  GAIT_LANDMARKS.RIGHT_HIP,
  GAIT_LANDMARKS.LEFT_KNEE,
  GAIT_LANDMARKS.RIGHT_KNEE,
  GAIT_LANDMARKS.LEFT_ANKLE,
  GAIT_LANDMARKS.RIGHT_ANKLE,
  GAIT_LANDMARKS.LEFT_HEEL,
  GAIT_LANDMARKS.RIGHT_HEEL,
]

// 보행 분석에 필요한 랜드마크 인덱스 목록
const GAIT_LANDMARK_INDICES = Object.values(GAIT_LANDMARKS)

export function GaitSkeleton({
  landmarks,
  videoWidth,
  videoHeight,
  containerRef,
  showSkeleton = true,
  primaryColor = '#10B981',
  secondaryColor = '#6366F1',
  mirrored = true,
}: GaitSkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 480 })

  // 컨테이너 크기 변화 감지 및 캔버스 크기 업데이트
  const updateCanvasSize = useCallback(() => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCanvasSize({ width: rect.width, height: rect.height })
    }
  }, [containerRef])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [updateCanvasSize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!showSkeleton || !landmarks || landmarks.length < 33) {
      return
    }

    // object-contain으로 비디오가 표시될 때의 실제 렌더링 영역 계산
    const containerWidth = canvasSize.width
    const containerHeight = canvasSize.height

    // 비디오 aspect ratio
    const videoAspect = videoWidth / videoHeight
    const containerAspect = containerWidth / containerHeight

    let renderWidth: number
    let renderHeight: number
    let offsetX: number
    let offsetY: number

    if (videoAspect > containerAspect) {
      // 비디오가 더 넓음 - 위아래 여백
      renderWidth = containerWidth
      renderHeight = containerWidth / videoAspect
      offsetX = 0
      offsetY = (containerHeight - renderHeight) / 2
    } else {
      // 비디오가 더 높음 - 좌우 여백
      renderHeight = containerHeight
      renderWidth = containerHeight * videoAspect
      offsetX = (containerWidth - renderWidth) / 2
      offsetY = 0
    }

    // 좌표 변환 함수: MediaPipe 정규화 좌표 -> 캔버스 픽셀 좌표
    const toCanvasCoords = (normX: number, normY: number) => {
      const x = offsetX + normX * renderWidth
      const y = offsetY + normY * renderHeight
      return { x, y }
    }

    // 미러링 적용 (웹캠용)
    ctx.save()
    if (mirrored) {
      ctx.translate(containerWidth, 0)
      ctx.scale(-1, 1)
    }

    // 연결선 그리기
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const [startIdx, endIdx] of GAIT_SKELETON_CONNECTIONS) {
      const start = landmarks[startIdx]
      const end = landmarks[endIdx]

      if (!start || !end) continue

      const startVisibility = start.visibility ?? 0
      const endVisibility = end.visibility ?? 0

      if (
        startVisibility < CONFIDENCE_THRESHOLD ||
        endVisibility < CONFIDENCE_THRESHOLD
      ) {
        continue
      }

      const startCoords = toCanvasCoords(start.x, start.y)
      const endCoords = toCanvasCoords(end.x, end.y)

      // 그라데이션 효과
      const gradient = ctx.createLinearGradient(
        startCoords.x, startCoords.y,
        endCoords.x, endCoords.y
      )
      gradient.addColorStop(0, primaryColor)
      gradient.addColorStop(1, secondaryColor)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 4

      ctx.beginPath()
      ctx.moveTo(startCoords.x, startCoords.y)
      ctx.lineTo(endCoords.x, endCoords.y)
      ctx.stroke()
    }

    // 관절점 그리기 (보행 분석에 필요한 것만)
    for (const idx of GAIT_LANDMARK_INDICES) {
      const lm = landmarks[idx]
      if (!lm) continue

      const visibility = lm.visibility ?? 0
      if (visibility < CONFIDENCE_THRESHOLD) {
        continue
      }

      const { x, y } = toCanvasCoords(lm.x, lm.y)
      const isMajor = MAJOR_LANDMARKS.includes(idx)
      const radius = isMajor ? 10 : 6

      // 외곽선 (그림자 효과)
      ctx.beginPath()
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fill()

      // 내부
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)

      // 신뢰도에 따른 투명도
      const alpha = Math.min(1, visibility + 0.3)
      ctx.globalAlpha = alpha

      if (isMajor) {
        ctx.fillStyle = primaryColor
      } else {
        ctx.fillStyle = secondaryColor
      }

      ctx.fill()

      // 테두리
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.globalAlpha = 1
    }

    ctx.restore()
  }, [landmarks, videoWidth, videoHeight, canvasSize, showSkeleton, primaryColor, secondaryColor, mirrored])

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="pointer-events-none absolute inset-0"
    />
  )
}
