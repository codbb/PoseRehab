'use client'

import { useEffect, useRef } from 'react'
import type { Landmark } from '@/types/posture'
import { POSE_LANDMARKS } from '@/hooks/use-pose-detection'

interface PoseOverlayProps {
  landmarks: Landmark[]
  width: number
  height: number
  showConnections?: boolean
  showPoints?: boolean
  pointColor?: string
  connectionColor?: string
  className?: string
}

// Define connections between landmarks
const POSE_CONNECTIONS = [
  // Face
  [POSE_LANDMARKS.LEFT_EAR, POSE_LANDMARKS.LEFT_EYE],
  [POSE_LANDMARKS.RIGHT_EAR, POSE_LANDMARKS.RIGHT_EYE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.NOSE],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.NOSE],

  // Upper body
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],

  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],

  // Lower body
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
]

export function PoseOverlay({
  landmarks,
  width,
  height,
  showConnections = true,
  showPoints = true,
  pointColor = '#6366F1',
  connectionColor = '#10B981',
  className,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || landmarks.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw connections
    if (showConnections) {
      ctx.strokeStyle = connectionColor
      ctx.lineWidth = 2
      ctx.lineCap = 'round'

      POSE_CONNECTIONS.forEach(([start, end]) => {
        const startLandmark = landmarks[start]
        const endLandmark = landmarks[end]

        if (
          startLandmark &&
          endLandmark &&
          (startLandmark.visibility ?? 1) > 0.5 &&
          (endLandmark.visibility ?? 1) > 0.5
        ) {
          ctx.beginPath()
          ctx.moveTo(startLandmark.x * width, startLandmark.y * height)
          ctx.lineTo(endLandmark.x * width, endLandmark.y * height)
          ctx.stroke()
        }
      })
    }

    // Draw points
    if (showPoints) {
      landmarks.forEach((landmark, index) => {
        if ((landmark.visibility ?? 1) > 0.5) {
          const x = landmark.x * width
          const y = landmark.y * height

          // Larger points for major landmarks
          const majorLandmarks: number[] = [
            POSE_LANDMARKS.NOSE,
            POSE_LANDMARKS.LEFT_SHOULDER,
            POSE_LANDMARKS.RIGHT_SHOULDER,
            POSE_LANDMARKS.LEFT_HIP,
            POSE_LANDMARKS.RIGHT_HIP,
            POSE_LANDMARKS.LEFT_KNEE,
            POSE_LANDMARKS.RIGHT_KNEE,
            POSE_LANDMARKS.LEFT_ANKLE,
            POSE_LANDMARKS.RIGHT_ANKLE,
          ]

          const radius = majorLandmarks.includes(index) ? 6 : 4

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, 2 * Math.PI)
          ctx.fillStyle = pointColor
          ctx.fill()

          // White border
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      })
    }
  }, [landmarks, width, height, showConnections, showPoints, pointColor, connectionColor])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ transform: 'scaleX(-1)' }} // Mirror to match video
    />
  )
}
