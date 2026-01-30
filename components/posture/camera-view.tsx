'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef?: React.RefObject<HTMLCanvasElement>
  isStreaming: boolean
  showGuide?: boolean
  direction?: 'front' | 'side' | 'back'
  className?: string
  children?: React.ReactNode
}

export function CameraView({
  videoRef,
  canvasRef,
  isStreaming,
  showGuide = true,
  direction = 'front',
  className,
  children,
}: CameraViewProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-card bg-black', className)}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'h-full w-full object-cover',
          !isStreaming && 'hidden'
        )}
        style={{ transform: 'scaleX(-1)' }} // Mirror for user-facing camera
      />

      {/* Canvas for captures (hidden) */}
      {canvasRef && <canvas ref={canvasRef} className="hidden" />}

      {/* Placeholder when not streaming */}
      {!isStreaming && (
        <div className="flex h-full min-h-[400px] items-center justify-center bg-surface">
          <div className="text-center text-text-secondary">
            <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-full bg-border" />
            <p>Camera loading...</p>
          </div>
        </div>
      )}

      {/* Guide overlay */}
      {showGuide && isStreaming && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Body outline guide */}
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {direction === 'front' && (
              <>
                {/* Head */}
                <ellipse
                  cx="50"
                  cy="15"
                  rx="8"
                  ry="10"
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                {/* Body */}
                <rect
                  x="35"
                  y="25"
                  width="30"
                  height="35"
                  rx="5"
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                {/* Legs */}
                <line
                  x1="42"
                  y1="60"
                  x2="42"
                  y2="95"
                  stroke="rgba(99, 102, 241, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <line
                  x1="58"
                  y1="60"
                  x2="58"
                  y2="95"
                  stroke="rgba(99, 102, 241, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              </>
            )}

            {direction === 'side' && (
              <>
                {/* Head */}
                <ellipse
                  cx="50"
                  cy="15"
                  rx="6"
                  ry="10"
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                {/* Body */}
                <rect
                  x="42"
                  y="25"
                  width="16"
                  height="35"
                  rx="3"
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                {/* Legs */}
                <line
                  x1="50"
                  y1="60"
                  x2="50"
                  y2="95"
                  stroke="rgba(99, 102, 241, 0.5)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              </>
            )}

            {/* Center line */}
            <line
              x1="50"
              y1="5"
              x2="50"
              y2="95"
              stroke="rgba(99, 102, 241, 0.3)"
              strokeWidth="0.3"
              strokeDasharray="1,3"
            />
          </svg>
        </div>
      )}

      {/* Children (overlay content) */}
      {children}
    </div>
  )
}
