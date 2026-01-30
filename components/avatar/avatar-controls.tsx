'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Palette,
  Camera,
  User,
  Upload,
  Check,
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'
import type { AvatarControlsProps, CameraPreset } from '@/types/avatar'
import { BACKGROUND_COLORS } from '@/types/avatar'

const CAMERA_PRESETS: { preset: CameraPreset; label: string }[] = [
  { preset: 'front', label: 'F' },
  { preset: 'left', label: 'L' },
  { preset: 'right', label: 'R' },
  { preset: 'back', label: 'B' },
]

export function AvatarControls({
  isCollapsed = false,
  onToggleCollapse,
  backgroundColor,
  onBackgroundChange,
  lightingIntensity,
  onLightingChange,
  cameraPreset,
  onCameraPresetChange,
  selectedVrm,
  onVrmChange,
  availableVrms,
  onFileUpload,
}: AvatarControlsProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileUpload) {
      onFileUpload(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 48 : 280 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-xl border border-border bg-surface"
    >
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute right-2 top-2 z-10 rounded-lg p-2 text-text-secondary hover:bg-background hover:text-text-primary"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5 p-4 pt-12"
          >
            {/* VRM Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <User className="h-4 w-4" />
                {t('avatar.settings.model')}
              </div>
              <div className="space-y-2">
                {availableVrms.map((vrm) => (
                  <button
                    key={vrm.url}
                    onClick={() => onVrmChange(vrm.url)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selectedVrm === vrm.url
                        ? 'bg-primary/10 text-primary'
                        : 'bg-background text-text-secondary hover:bg-background/80'
                    )}
                  >
                    <span className="truncate">{vrm.name}</span>
                    {selectedVrm === vrm.url && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                ))}
                {/* Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-background/80"
                >
                  <Upload className="h-4 w-4" />
                  {t('avatar.uploadModel')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vrm"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Palette className="h-4 w-4" />
                {t('avatar.settings.background')}
              </div>
              <div className="flex flex-wrap gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => onBackgroundChange(color.value)}
                    className={cn(
                      'h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110',
                      backgroundColor === color.value
                        ? 'border-primary'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Lighting Intensity */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Sun className="h-4 w-4" />
                {t('avatar.settings.lighting')}
              </div>
              <Slider
                value={Math.round(lightingIntensity * 100)}
                onChange={(value) => onLightingChange(value / 100)}
                min={0}
                max={200}
                step={10}
                showValue
              />
            </div>

            {/* Camera Angle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Camera className="h-4 w-4" />
                {t('avatar.settings.camera')}
              </div>
              <div className="flex gap-2">
                {CAMERA_PRESETS.map(({ preset, label }) => (
                  <button
                    key={preset}
                    onClick={() => onCameraPresetChange(preset)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                      cameraPreset === preset
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-background/80'
                    )}
                    title={t(`avatar.cameraPreset.${preset}`)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary">
                {t(`avatar.cameraPreset.${cameraPreset}`)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State Icons */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-4 py-14">
          <div
            className="h-6 w-6 rounded-full"
            style={{ backgroundColor }}
            title={t('avatar.settings.background')}
          />
          <div title={t('avatar.settings.lighting')}>
            <Sun className="h-5 w-5 text-text-secondary" />
          </div>
          <div title={t('avatar.settings.camera')}>
            <Camera className="h-5 w-5 text-text-secondary" />
          </div>
        </div>
      )}
    </motion.div>
  )
}
