'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, User } from 'lucide-react'
import { useVrm } from '@/hooks/use-vrm'
import { useKalidokit } from '@/hooks/use-kalidokit'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/use-translation'
import type { VrmViewerProps, CameraPreset } from '@/types/avatar'
import { SIZE_CONFIG, DEFAULT_VRM_MODELS } from '@/types/avatar'

export interface VrmViewerRef {
  loadVrm: (url: string) => Promise<void>
  loadVrmFromFile: (file: File) => Promise<void>
  setCameraPreset: (preset: CameraPreset) => void
  setBackgroundColor: (color: string) => void
  setLightingIntensity: (intensity: number) => void
  applyPose: (landmarks: { x: number; y: number; z: number; visibility?: number }[]) => void
  applyHands: (leftHand: { x: number; y: number; z: number }[] | null, rightHand: { x: number; y: number; z: number }[] | null) => void
  resetPose: () => void
}

export const VrmViewer = forwardRef<VrmViewerRef, VrmViewerProps>(function VrmViewer(
  {
    mode,
    size = 'medium',
    showControls = true,
    className,
    vrmUrl,
    onLoad,
    onError,
  },
  ref
) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    isLoading,
    isReady,
    error,
    vrm,
    loadVrm,
    loadVrmFromFile,
    setCameraPreset,
    setBackgroundColor,
    setLightingIntensity,
    startRenderLoop,
    stopRenderLoop,
  } = useVrm({
    containerRef,
    size,
    onLoad,
    onError,
  })

  const { applyPose, applyHands, resetPose } = useKalidokit({
    vrm,
    mode,
    smoothing: 0.5,
  })

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    loadVrm,
    loadVrmFromFile,
    setCameraPreset,
    setBackgroundColor,
    setLightingIntensity,
    applyPose,
    applyHands,
    resetPose,
  }), [loadVrm, loadVrmFromFile, setCameraPreset, setBackgroundColor, setLightingIntensity, applyPose, applyHands, resetPose])

  // Load default or provided VRM on mount
  useEffect(() => {
    const urlToLoad = vrmUrl || DEFAULT_VRM_MODELS[0].url
    loadVrm(urlToLoad)
  }, []) // Only run on mount

  // Load new VRM when URL changes (after initial load)
  useEffect(() => {
    if (vrmUrl && isReady) {
      loadVrm(vrmUrl)
    }
  }, [vrmUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start/stop render loop based on ready state
  useEffect(() => {
    if (isReady) {
      startRenderLoop()
    }
    return () => {
      stopRenderLoop()
    }
  }, [isReady, startRenderLoop, stopRenderLoop])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-black',
        SIZE_CONFIG[size].className,
        className
      )}
    >
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="h-full w-full"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-sm text-text-secondary">
            {t('avatar.loading')}
          </p>
        </motion.div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm"
        >
          <AlertCircle className="h-10 w-10 text-error" />
          <p className="mt-3 text-sm text-error">
            {t('avatar.error.loadFailed')}
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-text-secondary">
            {error}
          </p>
        </motion.div>
      )}

      {/* Empty State (no VRM loaded) */}
      {!isLoading && !error && !vrm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-surface"
        >
          <User className="h-16 w-16 text-text-secondary/30" />
          <p className="mt-3 text-sm text-text-secondary">
            {t('avatar.selectModel')}
          </p>
        </motion.div>
      )}

      {/* Mode Indicator */}
      {showControls && isReady && (
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {mode === 'fullbody' && t('avatar.mode.fullbody')}
            {mode === 'hands' && t('avatar.mode.hands')}
            {mode === 'game' && t('avatar.mode.game')}
          </span>
        </div>
      )}
    </div>
  )
})
