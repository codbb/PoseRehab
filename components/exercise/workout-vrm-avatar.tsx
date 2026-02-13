'use client'

import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { Loader2, User, RotateCcw } from 'lucide-react'
import { useVrm } from '@/hooks/use-vrm'
import { useKalidokit } from '@/hooks/use-kalidokit'
import { DEFAULT_VRM_MODELS } from '@/types/avatar'
import type { CameraPreset } from '@/types/avatar'
import type { Landmark } from '@/types/posture'
import { cn } from '@/lib/utils'

interface WorkoutVrmAvatarProps {
  landmarks: Landmark[]
  enabled: boolean
  language?: 'ko' | 'en'
  className?: string
}

const VIEW_LABELS: Record<CameraPreset, { ko: string; en: string }> = {
  front: { ko: '정면', en: 'Front' },
  back: { ko: '후면', en: 'Back' },
  left: { ko: '좌측', en: 'Left' },
  right: { ko: '우측', en: 'Right' },
}

function WorkoutVrmAvatarInner({
  landmarks,
  enabled,
  language = 'ko',
  className,
}: WorkoutVrmAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentView, setCurrentView] = useState<CameraPreset>('front')

  const {
    isLoading,
    isReady,
    error,
    vrm,
    loadVrm,
    setCameraPreset,
    startRenderLoop,
    stopRenderLoop,
    dispose,
  } = useVrm({
    containerRef,
    size: 'large',
    backgroundColor: '#1a1a2e',
  })

  const { applyPose, resetPose } = useKalidokit({
    vrm,
    mode: 'fullbody',
    smoothing: 0.5,
  })

  // Load VRM and start rendering when enabled
  useEffect(() => {
    if (!enabled) return

    const init = async () => {
      try {
        await loadVrm(DEFAULT_VRM_MODELS[0].url)
        startRenderLoop()
      } catch (err) {
        console.error('[WorkoutVRM] Failed to load:', err)
      }
    }
    init()

    return () => {
      stopRenderLoop()
    }
  }, [enabled, loadVrm, startRenderLoop, stopRenderLoop])

  // Bug 1 fix: Ensure VRM faces camera after loading.
  // useVrm.loadVrm already applies scene.rotation.y = Math.PI,
  // but re-assert here as a safety measure.
  useEffect(() => {
    if (vrm) {
      vrm.scene.rotation.y = Math.PI
    }
  }, [vrm])

  // Start render loop when VRM becomes ready
  // (handles the case where isReady changes after the load effect)
  useEffect(() => {
    if (isReady) {
      startRenderLoop()
    }
    return () => {
      stopRenderLoop()
    }
  }, [isReady, startRenderLoop, stopRenderLoop])

  // Bug 2 fix: Apply pose directly when landmarks change.
  // This matches the working avatar page pattern (avatar/page.tsx line 239)
  // which calls applyPose in a useEffect triggered by landmark changes,
  // instead of using setInterval with a potentially stale closure.
  useEffect(() => {
    if (!enabled || !isReady) return
    if (landmarks.length === 0) return
    applyPose(landmarks)
  }, [enabled, isReady, landmarks, applyPose])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose()
    }
  }, [dispose])

  const handleViewChange = useCallback((view: CameraPreset) => {
    setCurrentView(view)
    setCameraPreset(view)
  }, [setCameraPreset])

  const handleResetPose = useCallback(() => {
    resetPose()
  }, [resetPose])

  if (!enabled) return null

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border bg-surface', className)}>
      {/* Three.js container */}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ minHeight: '300px' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-text-secondary">
            {language === 'ko' ? '아바타 로딩...' : 'Loading avatar...'}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm">
          <User className="h-10 w-10 text-text-secondary/30" />
          <p className="mt-2 text-sm text-error">{error}</p>
        </div>
      )}

      {/* No landmarks */}
      {!isLoading && !error && isReady && landmarks.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
          <User className="h-10 w-10 text-text-secondary/30" />
          <p className="mt-2 text-sm text-text-secondary">
            {language === 'ko' ? '자세 데이터 대기 중...' : 'Waiting for pose data...'}
          </p>
        </div>
      )}

      {/* View buttons */}
      {!isLoading && !error && isReady && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {(['front', 'back', 'left', 'right'] as CameraPreset[]).map((view) => (
            <button
              key={view}
              onClick={() => handleViewChange(view)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all',
                currentView === view
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-background/80 text-text-secondary hover:bg-background hover:text-text-primary backdrop-blur-sm border border-border/50'
              )}
            >
              {language === 'ko' ? VIEW_LABELS[view].ko : VIEW_LABELS[view].en}
            </button>
          ))}
        </div>
      )}

      {/* Reset button */}
      {!isLoading && !error && isReady && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <button
            onClick={handleResetPose}
            className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-[10px] text-text-secondary backdrop-blur-sm hover:bg-background/80 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            {language === 'ko' ? '초기화' : 'Reset'}
          </button>
        </div>
      )}

      {/* Label */}
      <div className="absolute left-3 top-3 z-10">
        <span className="rounded-full bg-primary/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {language === 'ko' ? '3D 아바타' : '3D Avatar'}
        </span>
      </div>
    </div>
  )
}

export const WorkoutVrmAvatar = memo(WorkoutVrmAvatarInner)
