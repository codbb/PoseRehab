'use client'

import { useRef, useEffect } from 'react'
import type { PoseLandmark, ViewAngle, FrontViewMetrics, SideViewMetrics, BackViewMetrics } from '@/types/analysis-result'

interface ViewOverlayCanvasProps {
  viewAngle: ViewAngle
  landmarks2D: PoseLandmark[]
  containerWidth: number
  containerHeight: number
  originalImageWidth?: number
  originalImageHeight?: number
  metrics: FrontViewMetrics | SideViewMetrics | BackViewMetrics
  className?: string
}

// MediaPipe 랜드마크 인덱스
const MP = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const

// 색상 정의
const COLORS = {
  GREEN: '#10B981',
  YELLOW: '#F59E0B',
  RED: '#EF4444',
  GRAY: '#6B7280',
  BLUE: '#3B82F6',
  PURPLE: '#8B5CF6',
  WHITE: '#FFFFFF',
}

function riskColorHex(level: string): string {
  switch (level) {
    case 'danger': return COLORS.RED
    case 'warning': return COLORS.YELLOW
    default: return COLORS.GREEN
  }
}

// object-contain 변환 계산 (전신 표시용)
function calculateObjectContainTransform(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  const containerAspect = containerWidth / containerHeight
  const imageAspect = imageWidth / imageHeight

  let scale: number
  let offsetX: number
  let offsetY: number

  if (imageAspect > containerAspect) {
    // 이미지가 더 넓음 - 너비에 맞춤
    scale = containerWidth / imageWidth
    offsetX = 0
    offsetY = (containerHeight - imageHeight * scale) / 2
  } else {
    // 이미지가 더 높음 - 높이에 맞춤
    scale = containerHeight / imageHeight
    offsetX = (containerWidth - imageWidth * scale) / 2
    offsetY = 0
  }

  return { scale, offsetX, offsetY }
}

// 정규화된 좌표를 캔버스 좌표로 변환 (object-contain 기준)
function transformLandmark(
  normalizedX: number,
  normalizedY: number,
  containerWidth: number,
  containerHeight: number,
  imageWidth?: number,
  imageHeight?: number,
): { x: number; y: number } {
  if (!imageWidth || !imageHeight) {
    return {
      x: normalizedX * containerWidth,
      y: normalizedY * containerHeight,
    }
  }

  const { scale, offsetX, offsetY } = calculateObjectContainTransform(
    containerWidth,
    containerHeight,
    imageWidth,
    imageHeight,
  )

  return {
    x: normalizedX * imageWidth * scale + offsetX,
    y: normalizedY * imageHeight * scale + offsetY,
  }
}

// 랜드마크 가져오기 (visibility 체크 포함)
function getLandmark(
  landmarks: PoseLandmark[],
  index: number,
  containerW: number,
  containerH: number,
  imageW?: number,
  imageH?: number,
  minVisibility: number = 0.1,
): { x: number; y: number } | null {
  const lm = landmarks[index]
  if (!lm) return null
  if (lm.visibility !== undefined && lm.visibility < minVisibility) return null
  return transformLandmark(lm.x, lm.y, containerW, containerH, imageW, imageH)
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  width: number = 3,
  dashed: boolean = false,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.globalAlpha = 0.9
  if (dashed) ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  color: string,
  fill: boolean = true,
) {
  ctx.save()
  ctx.globalAlpha = 0.95
  if (fill) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  color: string,
  fontSize: number = 14,
  bgOpacity: number = 0.85,
) {
  ctx.save()
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.globalAlpha = 1

  const metrics = ctx.measureText(text)
  const padX = 10
  const padY = 5
  const boxWidth = metrics.width + padX * 2
  const boxHeight = fontSize + padY * 2

  // 배경 (더 진하게)
  ctx.fillStyle = `rgba(0,0,0,${bgOpacity})`
  ctx.beginPath()
  ctx.roundRect(x - boxWidth / 2, y - boxHeight / 2 - 2, boxWidth, boxHeight, 6)
  ctx.fill()

  // 테두리
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x - boxWidth / 2, y - boxHeight / 2 - 2, boxWidth, boxHeight, 6)
  ctx.stroke()

  // 텍스트
  ctx.fillStyle = color
  ctx.fillText(text, x, y + fontSize / 3)
  ctx.restore()
}

// 각도 호 그리기
function drawAngleArc(
  ctx: CanvasRenderingContext2D,
  centerX: number, centerY: number,
  startAngle: number, endAngle: number,
  radius: number,
  color: string,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, startAngle, endAngle)
  ctx.stroke()
  ctx.restore()
}

// Catmull-Rom 스플라인 보간: 제어점들을 부드러운 곡선으로 연결
function catmullRomSpline(
  points: { x: number; y: number }[],
  numOutput: number,
): { x: number; y: number }[] {
  if (points.length < 2) return points
  const result: { x: number; y: number }[] = []
  const totalLength = numOutput - 1

  for (let i = 0; i <= totalLength; i++) {
    const t = (i / totalLength) * (points.length - 1)
    const segment = Math.min(Math.floor(t), points.length - 2)
    const localT = t - segment

    // 제어점 4개 (양 끝은 미러링)
    const p0 = points[Math.max(0, segment - 1)]
    const p1 = points[segment]
    const p2 = points[Math.min(points.length - 1, segment + 1)]
    const p3 = points[Math.min(points.length - 1, segment + 2)]

    const t2 = localT * localT
    const t3 = t2 * localT

    // Catmull-Rom 공식 (tau = 0.5)
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * localT +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    )
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * localT +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    )

    result.push({ x, y })
  }

  return result
}

// 리스크 레벨에 따른 척추뼈 fill/stroke 색상 반환
function vertebraColors(level: string): { fill: string; stroke: string } {
  switch (level) {
    case 'danger':  return { fill: 'rgba(255,80,80,0.7)',  stroke: 'rgba(255,80,80,0.45)' }
    case 'warning': return { fill: 'rgba(255,200,0,0.6)',  stroke: 'rgba(255,200,0,0.35)' }
    default:        return { fill: 'rgba(255,255,255,0.55)', stroke: 'rgba(255,255,255,0.3)' }
  }
}

// 개별 척추뼈 렌더링 (캡슐형 타원)
// rotation: 척추 접선 방향 (라디안). 내부에서 -π/2 보정하여 넓은 면이 접선에 수직이 되도록 함
function drawVertebra(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  rotation: number,
  fillColor: string,
  strokeColor: string,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation - Math.PI / 2)
  // 캡슐형: border-radius를 height/2로 설정하여 양 끝이 완전 둥근 형태
  const radius = height / 2
  ctx.beginPath()
  ctx.roundRect(-width / 2, -height / 2, width, height, radius)
  ctx.fillStyle = fillColor
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

// ============================================
// 정면 오버레이: 어깨/골반 수평선 + 각도 라벨
// ============================================
function drawFrontOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  containerW: number, containerH: number,
  imageW: number | undefined, imageH: number | undefined,
  metrics: FrontViewMetrics,
) {
  const lsPos = getLandmark(landmarks, MP.LEFT_SHOULDER, containerW, containerH, imageW, imageH)
  const rsPos = getLandmark(landmarks, MP.RIGHT_SHOULDER, containerW, containerH, imageW, imageH)
  const lhPos = getLandmark(landmarks, MP.LEFT_HIP, containerW, containerH, imageW, imageH)
  const rhPos = getLandmark(landmarks, MP.RIGHT_HIP, containerW, containerH, imageW, imageH)

  if (!lsPos || !rsPos || !lhPos || !rhPos) return

  const shoulderColor = riskColorHex(metrics.shoulderRisk.level)
  const pelvisColor = riskColorHex(metrics.pelvisRisk.level)

  // === 어깨 수평선 ===
  const shoulderPad = 35

  // 실제 어깨 라인 (기울어진 상태) - 실선
  drawLine(ctx, lsPos.x - shoulderPad, lsPos.y, rsPos.x + shoulderPad, rsPos.y, shoulderColor, 5)

  // 이상적 수평 기준선 - 점선
  const shoulderRefY = (lsPos.y + rsPos.y) / 2
  drawLine(ctx, lsPos.x - shoulderPad, shoulderRefY, rsPos.x + shoulderPad, shoulderRefY, COLORS.GRAY, 2, true)

  // 어깨 관절점
  drawCircle(ctx, lsPos.x, lsPos.y, 12, shoulderColor)
  drawCircle(ctx, rsPos.x, rsPos.y, 12, shoulderColor)

  // 어깨 기울기 라벨 (항상 표시)
  const shoulderMidX = (lsPos.x + rsPos.x) / 2
  const shoulderLabelY = Math.min(lsPos.y, rsPos.y) - 35
  drawLabel(ctx, `어깨 ${Math.abs(metrics.shoulderHeightDifference).toFixed(1)}°`, shoulderMidX, shoulderLabelY, shoulderColor, 15)

  // === 골반 수평선 ===
  const pelvisPad = 30

  // 실제 골반 라인 (기울어진 상태) - 실선
  drawLine(ctx, lhPos.x - pelvisPad, lhPos.y, rhPos.x + pelvisPad, rhPos.y, pelvisColor, 5)

  // 이상적 수평 기준선 - 점선
  const pelvisRefY = (lhPos.y + rhPos.y) / 2
  drawLine(ctx, lhPos.x - pelvisPad, pelvisRefY, rhPos.x + pelvisPad, pelvisRefY, COLORS.GRAY, 2, true)

  // 골반 관절점
  drawCircle(ctx, lhPos.x, lhPos.y, 12, pelvisColor)
  drawCircle(ctx, rhPos.x, rhPos.y, 12, pelvisColor)

  // 골반 기울기 라벨 (항상 표시)
  const pelvisMidX = (lhPos.x + rhPos.x) / 2
  const pelvisLabelY = Math.max(lhPos.y, rhPos.y) + 40
  drawLabel(ctx, `골반 ${Math.abs(metrics.pelvisHeightDifference).toFixed(1)}°`, pelvisMidX, pelvisLabelY, pelvisColor, 15)

  // === 수직 중심선 ===
  const centerTopX = (lsPos.x + rsPos.x) / 2
  const centerBottomX = (lhPos.x + rhPos.x) / 2
  drawLine(ctx, centerTopX, Math.min(lsPos.y, rsPos.y) - 60, centerBottomX, Math.max(lhPos.y, rhPos.y) + 60, COLORS.GRAY, 1, true)

  // 어깨-골반 연결선 (좌우)
  drawLine(ctx, lsPos.x, lsPos.y, lhPos.x, lhPos.y, COLORS.GRAY, 2)
  drawLine(ctx, rsPos.x, rsPos.y, rhPos.x, rhPos.y, COLORS.GRAY, 2)

  // === O다리/X다리 분석 시각화 ===
  const lKneePos = getLandmark(landmarks, MP.LEFT_KNEE, containerW, containerH, imageW, imageH)
  const rKneePos = getLandmark(landmarks, MP.RIGHT_KNEE, containerW, containerH, imageW, imageH)
  const lAnklePos = getLandmark(landmarks, MP.LEFT_ANKLE, containerW, containerH, imageW, imageH)
  const rAnklePos = getLandmark(landmarks, MP.RIGHT_ANKLE, containerW, containerH, imageW, imageH)

  if (lKneePos && rKneePos && lAnklePos && rAnklePos && metrics.legAlignment) {
    const legRisk = metrics.legRisk
    const legColor = legRisk ? riskColorHex(legRisk.level) : COLORS.GREEN

    // 왼쪽 다리 라인 (골반-무릎-발목)
    drawLine(ctx, lhPos.x, lhPos.y, lKneePos.x, lKneePos.y, legColor, 4)
    drawLine(ctx, lKneePos.x, lKneePos.y, lAnklePos.x, lAnklePos.y, legColor, 4)

    // 오른쪽 다리 라인 (골반-무릎-발목)
    drawLine(ctx, rhPos.x, rhPos.y, rKneePos.x, rKneePos.y, legColor, 4)
    drawLine(ctx, rKneePos.x, rKneePos.y, rAnklePos.x, rAnklePos.y, legColor, 4)

    // 무릎 관절점
    drawCircle(ctx, lKneePos.x, lKneePos.y, 10, legColor)
    drawCircle(ctx, rKneePos.x, rKneePos.y, 10, legColor)

    // 발목 관절점
    drawCircle(ctx, lAnklePos.x, lAnklePos.y, 8, legColor)
    drawCircle(ctx, rAnklePos.x, rAnklePos.y, 8, legColor)

    // 이상적 수직선 (점선) - 골반에서 발목까지
    drawLine(ctx, lhPos.x, lhPos.y, lhPos.x, lAnklePos.y, COLORS.GRAY, 2, true)
    drawLine(ctx, rhPos.x, rhPos.y, rhPos.x, rAnklePos.y, COLORS.GRAY, 2, true)

    // 다리 정렬 라벨
    const legMidX = (lKneePos.x + rKneePos.x) / 2
    const legLabelY = Math.max(lKneePos.y, rKneePos.y) + 30
    const legTypeLabel = metrics.legAlignment.type === 'o_legs' ? '내반슬(Varus)'
      : metrics.legAlignment.type === 'x_legs' ? '외반슬(Valgus)'
      : '정상'
    const legAngle = ((metrics.legAlignment.leftKneeAngle + metrics.legAlignment.rightKneeAngle) / 2).toFixed(1)
    drawLabel(ctx, `${legTypeLabel} ${legAngle}°`, legMidX, legLabelY, legColor, 14)
  }
}

// ============================================
// 측면 오버레이: 귀-어깨-골반 정렬 + 거북목/척추 각도
// ============================================
function drawSideOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  containerW: number, containerH: number,
  imageW: number | undefined, imageH: number | undefined,
  metrics: SideViewMetrics,
) {
  const nosePos = getLandmark(landmarks, MP.NOSE, containerW, containerH, imageW, imageH)
  const lEarPos = getLandmark(landmarks, MP.LEFT_EAR, containerW, containerH, imageW, imageH)
  const rEarPos = getLandmark(landmarks, MP.RIGHT_EAR, containerW, containerH, imageW, imageH)
  const lsPos = getLandmark(landmarks, MP.LEFT_SHOULDER, containerW, containerH, imageW, imageH)
  const rsPos = getLandmark(landmarks, MP.RIGHT_SHOULDER, containerW, containerH, imageW, imageH)
  const lhPos = getLandmark(landmarks, MP.LEFT_HIP, containerW, containerH, imageW, imageH)
  const rhPos = getLandmark(landmarks, MP.RIGHT_HIP, containerW, containerH, imageW, imageH)
  const lkPos = getLandmark(landmarks, MP.LEFT_KNEE, containerW, containerH, imageW, imageH)
  const rkPos = getLandmark(landmarks, MP.RIGHT_KNEE, containerW, containerH, imageW, imageH)
  const laPos = getLandmark(landmarks, MP.LEFT_ANKLE, containerW, containerH, imageW, imageH)
  const raPos = getLandmark(landmarks, MP.RIGHT_ANKLE, containerW, containerH, imageW, imageH)

  // 어깨와 골반은 최소한 있어야 함 (한쪽이라도)
  const shoulderPos = lsPos || rsPos
  const hipPos = lhPos || rhPos

  if (!shoulderPos || !hipPos) return

  // 귀 위치 (한쪽만 있어도 됨)
  const earPos = lEarPos || rEarPos

  // 머리 위치 결정 (귀 > 코 > 어깨 위 추정)
  let headPos: { x: number; y: number }
  if (earPos) {
    headPos = earPos
  } else if (nosePos) {
    headPos = { x: nosePos.x, y: nosePos.y - 15 }
  } else {
    headPos = { x: shoulderPos.x, y: shoulderPos.y - 60 }
  }

  // 무릎, 발목 (한쪽만 있어도 됨)
  const kneePos = lkPos || rkPos
  const anklePos = laPos || raPos

  const spineColor = riskColorHex(metrics.spineRisk.level)
  const thoracicColor = metrics.thoracicKyphosisRisk ? riskColorHex(metrics.thoracicKyphosisRisk.level) : spineColor
  const lumbarColor = metrics.lumbarLordosisRisk ? riskColorHex(metrics.lumbarLordosisRisk.level) : spineColor
  const neckColor = riskColorHex(metrics.neckRisk.level)

  // === 이상적 수직 정렬선 (점선, 초록색) ===
  const idealX = anklePos ? anklePos.x : hipPos.x
  const topY = headPos.y - 50
  const bottomY = anklePos ? anklePos.y + 40 : hipPos.y + 120
  drawLine(ctx, idealX, topY, idealX, bottomY, COLORS.GREEN, 3, true)

  // === 실제 신체 정렬선 (실선) ===
  // 어깨→골반 구간은 척추뼈로 대체하므로 제외: 머리→어깨 / 골반→무릎→발목만 연결
  drawLine(ctx, headPos.x, headPos.y, shoulderPos.x, shoulderPos.y, neckColor, 5)
  if (kneePos) {
    drawLine(ctx, hipPos.x, hipPos.y, kneePos.x, kneePos.y, COLORS.GRAY, 4)
    if (anklePos) drawLine(ctx, kneePos.x, kneePos.y, anklePos.x, anklePos.y, COLORS.GRAY, 4)
  } else if (anklePos) {
    drawLine(ctx, hipPos.x, hipPos.y, anklePos.x, anklePos.y, COLORS.GRAY, 4)
  }

  // 각 관절점 그리기
  drawCircle(ctx, headPos.x, headPos.y, 12, neckColor)
  drawCircle(ctx, shoulderPos.x, shoulderPos.y, 12, COLORS.BLUE)
  drawCircle(ctx, hipPos.x, hipPos.y, 12, COLORS.PURPLE)
  if (kneePos) drawCircle(ctx, kneePos.x, kneePos.y, 10, COLORS.GRAY)
  if (anklePos) drawCircle(ctx, anklePos.x, anklePos.y, 10, COLORS.GRAY)

  // === 거북목 각도 시각화 ===
  const neckAngleRad = Math.atan2(headPos.x - shoulderPos.x, shoulderPos.y - headPos.y)

  // 수직 기준선 (어깨에서 위로)
  drawLine(ctx, shoulderPos.x, shoulderPos.y, shoulderPos.x, shoulderPos.y - 80, COLORS.GRAY, 2, true)

  // 각도 호 그리기
  if (Math.abs(metrics.neckForwardAngle) > 3) {
    const arcRadius = 45
    const startAngle = -Math.PI / 2
    const endAngle = -Math.PI / 2 + neckAngleRad
    drawAngleArc(ctx, shoulderPos.x, shoulderPos.y, startAngle, endAngle, arcRadius, neckColor)
  }

  // 머리 전방 이동 각도 라벨 (항상 표시, 더 눈에 띄게)
  const neckLabelX = headPos.x + (headPos.x > shoulderPos.x ? 55 : -55)
  drawLabel(ctx, `머리 전방 이동 ${Math.abs(metrics.neckForwardAngle).toFixed(1)}°`, neckLabelX, headPos.y - 10, neckColor, 14)

  // === 척추뼈 개별 렌더링 (Moti Physio 스타일) ===
  const VERTEBRAE_COUNT = 17 // C7 + T1~T12 + L1~L4 = 17

  // S-커브 보정을 위한 오프셋 (후만/전만 각도에 비례, 강화된 계수)
  const kyphosisAngle = metrics.thoracicKyphosisAngle ?? 0
  const lordosisAngle = metrics.lumbarLordosisAngle ?? 0
  // 기본 S-커브 + 각도 비례 오프셋 (최소 8px 커브 보장)
  const kyphosisOffset = Math.max(8, kyphosisAngle * 0.5)
  const lordosisOffset = Math.max(5, lordosisAngle * 0.4)

  // 7개 제어점으로 세밀한 S-커브 생성
  const dx = hipPos.x - shoulderPos.x
  const dy = hipPos.y - shoulderPos.y
  const controlPoints = [
    shoulderPos,
    { // C7-T2 구간: 약간 뒤로(우측)
      x: shoulderPos.x + dx * 0.12 + kyphosisOffset * 0.4,
      y: shoulderPos.y + dy * 0.14,
    },
    { // T3-T6: 후만 최대점 (뒤로 볼록)
      x: shoulderPos.x + dx * 0.3 + kyphosisOffset,
      y: shoulderPos.y + dy * 0.35,
    },
    { // T9-T10: 흉추→요추 전환점
      x: shoulderPos.x + dx * 0.55 + kyphosisOffset * 0.2 - lordosisOffset * 0.2,
      y: shoulderPos.y + dy * 0.55,
    },
    { // L1-L2: 전만 시작 (앞으로 볼록)
      x: shoulderPos.x + dx * 0.72 - lordosisOffset * 0.7,
      y: shoulderPos.y + dy * 0.72,
    },
    { // L3-L4: 전만 최대점
      x: shoulderPos.x + dx * 0.85 - lordosisOffset,
      y: shoulderPos.y + dy * 0.87,
    },
    hipPos,
  ]

  // Catmull-Rom 스플라인으로 17개 척추뼈 포인트 생성
  const vertebraePoints = catmullRomSpline(controlPoints, VERTEBRAE_COUNT)

  // 척추 길이 기반 뼈 크기 계산
  const spineLength = Math.sqrt(dx * dx + dy * dy)
  const baseW = Math.max(spineLength * 0.08, 16) // 뼈 너비
  const baseH = Math.max(spineLength * 0.02, 4)  // 뼈 높이 (얇게 — 간격 확보)

  // 리스크 레벨로 색상 결정
  const thoracicLevel = metrics.thoracicKyphosisRisk?.level ?? metrics.spineRisk.level
  const lumbarLevel = metrics.lumbarLordosisRisk?.level ?? metrics.spineRisk.level
  const thoracicVC = vertebraColors(thoracicLevel)
  const lumbarVC = vertebraColors(lumbarLevel)

  // 각 척추뼈 렌더링
  for (let i = 0; i < vertebraePoints.length; i++) {
    const pt = vertebraePoints[i]

    // 접선 방향 계산
    let tangent: number
    if (i === 0) {
      tangent = Math.atan2(
        vertebraePoints[1].y - pt.y,
        vertebraePoints[1].x - pt.x,
      )
    } else if (i === vertebraePoints.length - 1) {
      tangent = Math.atan2(
        pt.y - vertebraePoints[i - 1].y,
        pt.x - vertebraePoints[i - 1].x,
      )
    } else {
      tangent = Math.atan2(
        vertebraePoints[i + 1].y - vertebraePoints[i - 1].y,
        vertebraePoints[i + 1].x - vertebraePoints[i - 1].x,
      )
    }

    // 뼈 크기: 흉추는 위에서 아래로 점진적 확대, 요추는 약간 더 큼
    const isThoracic = i <= 12
    const w = isThoracic
      ? baseW * (0.85 + i * 0.012)
      : baseW * 1.08
    const h = baseH

    // 색상: 흉추 vs 요추 (리스크 레벨 기반)
    const vc = isThoracic ? thoracicVC : lumbarVC

    drawVertebra(ctx, pt.x, pt.y, w, h, tangent, vc.fill, vc.stroke)
  }

  // === 척추 유형 라벨 (항상 표시) ===
  const classLabels: Record<string, string> = {
    kyphosis: '후만증',
    lordosis: '전만증',
    kyphosis_lordosis: '후만+전만',
    flat_back: '일자등',
    normal: '정상',
  }
  const classLabel = classLabels[metrics.spineClassification] || '정상'
  const spineMidPt = vertebraePoints[Math.floor(VERTEBRAE_COUNT / 2)]
  drawLabel(ctx, classLabel, spineMidPt.x + 65, spineMidPt.y, spineColor, 13)

  // === 라운드숄더 시각화 ===
  if (metrics.roundShoulderRisk && metrics.shoulderProtraction) {
    const rsColor = riskColorHex(metrics.roundShoulderRisk.level)

    // 귀에서 수직으로 내린 기준선 (점선)
    const earVerticalX = headPos.x
    drawLine(ctx, earVerticalX, headPos.y - 20, earVerticalX, shoulderPos.y + 30, COLORS.GRAY, 2, true)

    // 어깨가 귀보다 앞에 있으면 (라운드숄더) 수평 거리 표시
    if (metrics.shoulderProtraction.isRoundShoulder) {
      // 수평 화살표 (귀 수직선 ~ 어깨)
      const arrowY = (headPos.y + shoulderPos.y) / 2
      drawLine(ctx, earVerticalX, arrowY, shoulderPos.x, arrowY, rsColor, 3)

      // 화살표 끝
      const arrowDir = shoulderPos.x > earVerticalX ? 1 : -1
      drawLine(ctx, shoulderPos.x, arrowY, shoulderPos.x - 8 * arrowDir, arrowY - 6, rsColor, 3)
      drawLine(ctx, shoulderPos.x, arrowY, shoulderPos.x - 8 * arrowDir, arrowY + 6, rsColor, 3)

      // 어깨 전방 돌출 라벨
      const rsLabelX = (earVerticalX + shoulderPos.x) / 2
      const rsLabelY = arrowY - 25
      drawLabel(ctx, `어깨 전방 돌출 ${metrics.shoulderProtraction.angle.toFixed(1)}°`, rsLabelX, rsLabelY, rsColor, 13)
    }
  }

  // === 관절 라벨 (흰색 배경으로 가독성 향상) ===
  const labelStyle = (text: string, x: number, y: number) => {
    ctx.save()
    ctx.font = 'bold 11px sans-serif'
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    const m = ctx.measureText(text)
    ctx.fillRect(x - 2, y - 10, m.width + 4, 14)
    ctx.fillStyle = COLORS.WHITE
    ctx.textAlign = 'left'
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  labelStyle('귀', headPos.x + 18, headPos.y + 4)
  labelStyle('어깨', shoulderPos.x + 18, shoulderPos.y + 4)
  labelStyle('골반', hipPos.x + 18, hipPos.y + 4)
  if (kneePos) labelStyle('무릎', kneePos.x + 15, kneePos.y + 4)
  if (anklePos) labelStyle('발목', anklePos.x + 15, anklePos.y + 4)
}

// ============================================
// 후면 오버레이: 어깨/골반 수평선 + 척추 중심선
// ============================================
function drawBackOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  containerW: number, containerH: number,
  imageW: number | undefined, imageH: number | undefined,
  metrics: BackViewMetrics,
) {
  const lsPos = getLandmark(landmarks, MP.LEFT_SHOULDER, containerW, containerH, imageW, imageH)
  const rsPos = getLandmark(landmarks, MP.RIGHT_SHOULDER, containerW, containerH, imageW, imageH)
  const lhPos = getLandmark(landmarks, MP.LEFT_HIP, containerW, containerH, imageW, imageH)
  const rhPos = getLandmark(landmarks, MP.RIGHT_HIP, containerW, containerH, imageW, imageH)

  if (!lsPos || !rsPos || !lhPos || !rhPos) return

  const spineColor = riskColorHex(metrics.spineRisk.level)
  const scapulaColor = riskColorHex(metrics.scapulaRisk.level)

  // 골반 기울기 계산 (좌우 골반 높이 차이로 각도 계산)
  const pelvisAngle = Math.atan2(rhPos.y - lhPos.y, rhPos.x - lhPos.x) * (180 / Math.PI)

  // === 어깨 수평선 ===
  const shoulderPad = 40

  // 실제 어깨 라인
  drawLine(ctx, lsPos.x - shoulderPad, lsPos.y, rsPos.x + shoulderPad, rsPos.y, scapulaColor, 5)

  // 이상적 수평 기준선
  const shoulderRefY = (lsPos.y + rsPos.y) / 2
  drawLine(ctx, lsPos.x - shoulderPad, shoulderRefY, rsPos.x + shoulderPad, shoulderRefY, COLORS.GRAY, 2, true)

  // 어깨 관절점
  drawCircle(ctx, lsPos.x, lsPos.y, 12, scapulaColor)
  drawCircle(ctx, rsPos.x, rsPos.y, 12, scapulaColor)

  // 어깨/견갑골 라벨 (항상 표시)
  const shoulderMidX = (lsPos.x + rsPos.x) / 2
  const shoulderLabelY = Math.min(lsPos.y, rsPos.y) - 35
  drawLabel(ctx, `견갑골 ${Math.abs(metrics.scapulaAsymmetry).toFixed(1)}°`, shoulderMidX, shoulderLabelY, scapulaColor, 14)

  // === 골반 수평선 ===
  const pelvisPad = 35

  // 실제 골반 라인
  drawLine(ctx, lhPos.x - pelvisPad, lhPos.y, rhPos.x + pelvisPad, rhPos.y, COLORS.PURPLE, 5)

  // 이상적 수평 기준선
  const pelvisRefY = (lhPos.y + rhPos.y) / 2
  drawLine(ctx, lhPos.x - pelvisPad, pelvisRefY, rhPos.x + pelvisPad, pelvisRefY, COLORS.GRAY, 2, true)

  // 골반 관절점
  drawCircle(ctx, lhPos.x, lhPos.y, 12, COLORS.PURPLE)
  drawCircle(ctx, rhPos.x, rhPos.y, 12, COLORS.PURPLE)

  // 골반 기울기 라벨 (항상 표시)
  const pelvisMidX = (lhPos.x + rhPos.x) / 2
  const pelvisLabelY = Math.max(lhPos.y, rhPos.y) + 40
  drawLabel(ctx, `골반 ${Math.abs(pelvisAngle).toFixed(1)}°`, pelvisMidX, pelvisLabelY, COLORS.PURPLE, 14)

  // === 척추 중심선 (실제 랜드마크 기반 S자/C자 커브) ===
  // 어깨와 골반의 실제 비대칭을 반영하여 척추 커브 생성

  // 어깨 중점 (실제 위치 - 비대칭 포함)
  const spineShoulder = { x: (lsPos.x + rsPos.x) / 2, y: (lsPos.y + rsPos.y) / 2 }
  const spineNeckY = spineShoulder.y - 30

  // 골반 중점 (실제 위치 - 비대칭 포함)
  const spinePelvis = { x: (lhPos.x + rhPos.x) / 2, y: (lhPos.y + rhPos.y) / 2 }

  // 어깨와 골반의 좌우 높이 차이 계산
  const shoulderHeightDiff = rsPos.y - lsPos.y  // 양수: 오른쪽이 낮음
  const hipHeightDiff = rhPos.y - lhPos.y        // 양수: 오른쪽이 낮음

  // 어깨-골반 중심선의 수평 편차 (측만 지표)
  const lateralShift = spineShoulder.x - spinePelvis.x

  // 이상적 수직 기준선 (점선) - 골반 중심에서 수직으로
  drawLine(ctx, spinePelvis.x, spineNeckY - 50, spinePelvis.x, spinePelvis.y + 50, COLORS.GRAY, 2, true)

  // 척추 포인트들 (실제 비대칭 기반 커브)
  const vertebraeCount = 12
  const spinePoints: { x: number; y: number }[] = []

  for (let i = 0; i <= vertebraeCount; i++) {
    const t = i / vertebraeCount

    // 기본 Y 위치 (목에서 골반까지)
    const baseY = spineNeckY + (spinePelvis.y - spineNeckY) * t

    // X 위치: 실제 랜드마크 비대칭을 반영한 S자/C자 커브
    // 상단(어깨)에서 하단(골반)으로 갈수록 실제 위치 변화를 반영
    let curveX: number

    if (metrics.spineLateralDeviation > 2 || Math.abs(lateralShift) > 5) {
      // 측만이 있는 경우: 어깨-흉추-요추-골반의 S자 또는 C자 커브
      // 어깨 높이 차이와 골반 높이 차이가 반대 방향이면 S자
      // 같은 방향이면 C자

      const isSCurve = (shoulderHeightDiff > 0 && hipHeightDiff < 0) ||
                       (shoulderHeightDiff < 0 && hipHeightDiff > 0)

      if (isSCurve) {
        // S자 커브: 흉추와 요추가 반대 방향으로 휨
        // 상부 (0~0.4): 어깨 쪽으로 휨
        // 중부 (0.4~0.6): 전환점
        // 하부 (0.6~1): 골반 쪽으로 휨
        const upperCurve = Math.sin(t * Math.PI) * (lateralShift * 0.5)
        const lowerCurve = -Math.sin((t - 0.5) * Math.PI) * (lateralShift * 0.3)

        if (t < 0.4) {
          curveX = spinePelvis.x + lateralShift * (1 - t) + upperCurve
        } else if (t > 0.6) {
          curveX = spinePelvis.x + lowerCurve
        } else {
          // 전환점: 부드럽게 연결
          const blend = (t - 0.4) / 0.2
          curveX = spinePelvis.x + lateralShift * (1 - t) * (1 - blend)
        }
      } else {
        // C자 커브: 한쪽으로 일관되게 휨
        const curveAmount = Math.sin(t * Math.PI) * Math.max(Math.abs(lateralShift), metrics.spineLateralDeviation * 2)
        const direction = lateralShift > 0 ? 1 : (metrics.scoliosisDirection === 'right' ? 1 : -1)
        curveX = spinePelvis.x + (spineShoulder.x - spinePelvis.x) * (1 - t) + curveAmount * direction * 0.3
      }
    } else {
      // 정상: 어깨에서 골반으로 직선 (약간의 자연스러운 편차 포함)
      curveX = spineShoulder.x + (spinePelvis.x - spineShoulder.x) * t
    }

    spinePoints.push({ x: curveX, y: baseY })
  }

  // 척추선 그리기
  ctx.save()
  ctx.strokeStyle = spineColor
  ctx.lineWidth = 6
  ctx.globalAlpha = 0.9
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(spinePoints[0].x, spinePoints[0].y)
  for (let i = 1; i < spinePoints.length; i++) {
    ctx.lineTo(spinePoints[i].x, spinePoints[i].y)
  }
  ctx.stroke()
  ctx.restore()

  // 척추뼈 표시
  for (let i = 0; i < spinePoints.length; i++) {
    const pt = spinePoints[i]
    const radius = i === 0 || i === vertebraeCount ? 8 : 6
    drawCircle(ctx, pt.x, pt.y, radius, spineColor)

    if (i > 0 && i < vertebraeCount) {
      const barWidth = 14 - Math.abs(i - vertebraeCount / 2) * 0.7
      drawLine(ctx, pt.x - barWidth, pt.y, pt.x + barWidth, pt.y, spineColor, 2)
    }
  }

  // 척추 구간 라벨
  const sections = [
    { label: 'C', index: 1 },
    { label: 'T', index: 5 },
    { label: 'L', index: 9 },
  ]
  for (const sec of sections) {
    if (sec.index < spinePoints.length) {
      const pt = spinePoints[sec.index]
      ctx.save()
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = COLORS.WHITE
      ctx.globalAlpha = 0.9
      ctx.textAlign = 'left'
      ctx.fillText(sec.label, pt.x + 22, pt.y + 4)
      ctx.restore()
    }
  }

  // 측만 각도 라벨 (항상 표시)
  const midIdx = Math.floor(vertebraeCount / 2)
  const midPt = spinePoints[midIdx]
  if (metrics.spineLateralDeviation > 0) {
    const labelX = metrics.scoliosisDirection === 'left' ? midPt.x - 60 : midPt.x + 60
    drawLabel(ctx, `측만 ${metrics.spineLateralDeviation.toFixed(1)}°`, labelX, midPt.y, spineColor, 14)
  } else {
    drawLabel(ctx, '측만 0.0°', midPt.x + 60, midPt.y, COLORS.GREEN, 14)
  }

  // 어깨-골반 연결선 (좌우)
  drawLine(ctx, lsPos.x, lsPos.y, lhPos.x, lhPos.y, COLORS.GRAY, 2)
  drawLine(ctx, rsPos.x, rsPos.y, rhPos.x, rhPos.y, COLORS.GRAY, 2)
}

export function ViewOverlayCanvas({
  viewAngle,
  landmarks2D,
  containerWidth,
  containerHeight,
  originalImageWidth,
  originalImageHeight,
  metrics,
  className = '',
}: ViewOverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 고해상도 디스플레이 지원
    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, containerWidth, containerHeight)

    if (landmarks2D.length < 25) return

    switch (viewAngle) {
      case 'front':
        drawFrontOverlay(ctx, landmarks2D, containerWidth, containerHeight, originalImageWidth, originalImageHeight, metrics as FrontViewMetrics)
        break
      case 'side':
        drawSideOverlay(ctx, landmarks2D, containerWidth, containerHeight, originalImageWidth, originalImageHeight, metrics as SideViewMetrics)
        break
      case 'back':
        drawBackOverlay(ctx, landmarks2D, containerWidth, containerHeight, originalImageWidth, originalImageHeight, metrics as BackViewMetrics)
        break
    }
  }, [viewAngle, landmarks2D, containerWidth, containerHeight, originalImageWidth, originalImageHeight, metrics])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  )
}
