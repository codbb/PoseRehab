'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { HandLandmark, HandResult } from '@/hooks/use-hand-detection'
import { HAND_LANDMARKS } from '@/hooks/use-hand-detection'

interface HandOverlayProps {
  hands: HandResult[]
  width: number
  height: number
  className?: string
  showConnections?: boolean
  showLabels?: boolean
  color?: string
}

// 손 랜드마크 연결선 정의
const HAND_CONNECTIONS = [
  // 손목 -> 손바닥
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.THUMB_CMC],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.INDEX_MCP],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.MIDDLE_MCP],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.RING_MCP],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.PINKY_MCP],
  // 손바닥 연결
  [HAND_LANDMARKS.INDEX_MCP, HAND_LANDMARKS.MIDDLE_MCP],
  [HAND_LANDMARKS.MIDDLE_MCP, HAND_LANDMARKS.RING_MCP],
  [HAND_LANDMARKS.RING_MCP, HAND_LANDMARKS.PINKY_MCP],
  // 엄지
  [HAND_LANDMARKS.THUMB_CMC, HAND_LANDMARKS.THUMB_MCP],
  [HAND_LANDMARKS.THUMB_MCP, HAND_LANDMARKS.THUMB_IP],
  [HAND_LANDMARKS.THUMB_IP, HAND_LANDMARKS.THUMB_TIP],
  // 검지
  [HAND_LANDMARKS.INDEX_MCP, HAND_LANDMARKS.INDEX_PIP],
  [HAND_LANDMARKS.INDEX_PIP, HAND_LANDMARKS.INDEX_DIP],
  [HAND_LANDMARKS.INDEX_DIP, HAND_LANDMARKS.INDEX_TIP],
  // 중지
  [HAND_LANDMARKS.MIDDLE_MCP, HAND_LANDMARKS.MIDDLE_PIP],
  [HAND_LANDMARKS.MIDDLE_PIP, HAND_LANDMARKS.MIDDLE_DIP],
  [HAND_LANDMARKS.MIDDLE_DIP, HAND_LANDMARKS.MIDDLE_TIP],
  // 약지
  [HAND_LANDMARKS.RING_MCP, HAND_LANDMARKS.RING_PIP],
  [HAND_LANDMARKS.RING_PIP, HAND_LANDMARKS.RING_DIP],
  [HAND_LANDMARKS.RING_DIP, HAND_LANDMARKS.RING_TIP],
  // 소지
  [HAND_LANDMARKS.PINKY_MCP, HAND_LANDMARKS.PINKY_PIP],
  [HAND_LANDMARKS.PINKY_PIP, HAND_LANDMARKS.PINKY_DIP],
  [HAND_LANDMARKS.PINKY_DIP, HAND_LANDMARKS.PINKY_TIP],
]

// 손가락 끝 인덱스
const FINGER_TIPS: number[] = [
  HAND_LANDMARKS.THUMB_TIP,
  HAND_LANDMARKS.INDEX_TIP,
  HAND_LANDMARKS.MIDDLE_TIP,
  HAND_LANDMARKS.RING_TIP,
  HAND_LANDMARKS.PINKY_TIP,
]

export function HandOverlay({
  hands,
  width,
  height,
  className = '',
  showConnections = true,
  showLabels = false,
  color = '#10B981', // secondary green
}: HandOverlayProps) {
  const handColors = useMemo(() => ['#10B981', '#6366F1'], []) // green, indigo

  if (hands.length === 0) return null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`pointer-events-none ${className}`}
      style={{ transform: 'scaleX(-1)' }} // 미러링 (카메라와 일치)
    >
      {hands.map((hand, handIndex) => {
        const handColor = handColors[handIndex % handColors.length]
        const landmarks = hand.landmarks

        return (
          <g key={handIndex}>
            {/* 연결선 그리기 */}
            {showConnections &&
              HAND_CONNECTIONS.map(([start, end], connIndex) => {
                const startPoint = landmarks[start]
                const endPoint = landmarks[end]
                if (!startPoint || !endPoint) return null

                return (
                  <motion.line
                    key={`conn-${handIndex}-${connIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    x1={startPoint.x * width}
                    y1={startPoint.y * height}
                    x2={endPoint.x * width}
                    y2={endPoint.y * height}
                    stroke={handColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                )
              })}

            {/* 랜드마크 점 그리기 */}
            {landmarks.map((landmark, landmarkIndex) => {
              const isTip = FINGER_TIPS.includes(landmarkIndex)
              const isWrist = landmarkIndex === HAND_LANDMARKS.WRIST
              const radius = isTip ? 6 : isWrist ? 5 : 4

              return (
                <motion.circle
                  key={`point-${handIndex}-${landmarkIndex}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  cx={landmark.x * width}
                  cy={landmark.y * height}
                  r={radius}
                  fill={isTip ? '#FFFFFF' : handColor}
                  stroke={handColor}
                  strokeWidth="2"
                />
              )
            })}

            {/* 손 라벨 */}
            {showLabels && (
              <text
                x={landmarks[HAND_LANDMARKS.WRIST].x * width}
                y={landmarks[HAND_LANDMARKS.WRIST].y * height + 25}
                fill={handColor}
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
              >
                {hand.handedness}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
