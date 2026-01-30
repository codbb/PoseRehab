'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Save,
  Settings2,
  Volume2,
  VolumeX,
  RotateCcw,
  ChevronDown,
  History,
  ArrowLeftRight,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CameraView } from '@/components/posture/camera-view'
import { PoseOverlay } from '@/components/posture/pose-overlay'
import { RomGauge, RomCompareGauge } from '@/components/rom/rom-gauge'
import { useCamera } from '@/hooks/use-camera'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useTranslation } from '@/hooks/use-translation'
import { useRomStore } from '@/stores/rom-store'
import {
  JOINT_CATEGORIES,
  getMovementById,
  getMovementsByCategory,
  getCategoryInfo,
} from '@/lib/rom-constants'
import { getJointAngle, AngleStabilizer } from '@/lib/analysis/joint-angle-calculator'
import { cn } from '@/lib/utils'
import type { JointCategory, MovementType, JointSide, MeasurementRecord } from '@/types/rom'

export default function RomMeasurementPage() {
  const { t, language } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showMovementDropdown, setShowMovementDropdown] = useState(false)
  const [maxAngleReached, setMaxAngleReached] = useState(0)
  const [isCalibrationMode, setIsCalibrationMode] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState<'min' | 'max' | null>(null)
  const [tempCalibration, setTempCalibration] = useState<{ min: number; max: number } | null>(null)

  const stabilizer = useRef(new AngleStabilizer(5))
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Hydration 처리 - 클라이언트에서 캐시된 데이터 로드
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    isActive,
    selectedCategory,
    selectedMovement,
    selectedSide,
    currentAngle,
    voiceEnabled,
    measurementMode,
    calibrations,
    setIsActive,
    setSelectedCategory,
    setSelectedMovement,
    setSelectedSide,
    setCurrentAngle,
    setVoiceEnabled,
    setMeasurementMode,
    saveCalibration,
    getCalibration,
    addMeasurement,
    saveSession,
  } = useRomStore()

  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useCamera({ width: 640, height: 480 })

  const {
    isLoading: poseLoading,
    landmarks,
    startDetection,
    stopDetection,
  } = usePoseDetection()

  // 현재 선택된 움직임 정보
  const currentMovement = selectedMovement ? getMovementById(selectedMovement) : null
  const currentCalibration = selectedMovement
    ? getCalibration(selectedMovement, selectedSide)
    : null
  const categoryInfo = getCategoryInfo(selectedCategory)
  const categoryMovements = getMovementsByCategory(selectedCategory)

  // 페이지 로드 시 자동으로 카메라 시작
  useEffect(() => {
    if (mounted && !isStreaming) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Update video dimensions when streaming
  useEffect(() => {
    if (isStreaming && videoRef.current) {
      const updateDimensions = () => {
        if (videoRef.current) {
          setVideoDimensions({
            width: videoRef.current.videoWidth || 640,
            height: videoRef.current.videoHeight || 480,
          })
        }
      }
      videoRef.current.addEventListener('loadedmetadata', updateDimensions)
      updateDimensions()
    }
  }, [isStreaming, videoRef])

  // Start pose detection when camera is streaming and active
  useEffect(() => {
    if (isStreaming && videoRef.current && isActive) {
      startDetection(videoRef.current)
    }
    return () => {
      if (!isActive) stopDetection()
    }
  }, [isStreaming, isActive, videoRef, startDetection, stopDetection])

  // 각도 계산 및 업데이트
  useEffect(() => {
    if (!isActive || !selectedMovement || landmarks.length === 0) return

    const angle = getJointAngle(landmarks, selectedMovement, selectedSide)
    if (angle !== null) {
      const stabilizedAngle = stabilizer.current.stabilize(angle)
      setCurrentAngle(Math.round(stabilizedAngle))

      // 최대 각도 추적
      if (stabilizedAngle > maxAngleReached) {
        setMaxAngleReached(Math.round(stabilizedAngle))
      }
    }
  }, [landmarks, isActive, selectedMovement, selectedSide, setCurrentAngle, maxAngleReached])

  // TTS 음성 안내
  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === 'undefined') return

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language === 'ko' ? 'ko-KR' : 'en-US'
      utterance.rate = 0.9
      speechRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [voiceEnabled, language]
  )

  // 측정 시작/중지
  const handleToggleActive = useCallback(async () => {
    if (!isActive) {
      if (!isStreaming) {
        await startCamera()
      }
      setIsActive(true)
      setMaxAngleReached(0)
      stabilizer.current.reset()

      if (currentMovement) {
        speak(
          language === 'ko'
            ? `${currentMovement.nameKo} 측정을 시작합니다. ${currentMovement.guideKo}`
            : `Starting ${currentMovement.nameEn} measurement. ${currentMovement.guideEn}`
        )
      }
    } else {
      setIsActive(false)
      stopDetection()
      speak(language === 'ko' ? '측정이 중지되었습니다' : 'Measurement stopped')
    }
  }, [isActive, isStreaming, startCamera, setIsActive, stopDetection, currentMovement, speak, language])

  // 측정 저장
  const handleSaveMeasurement = useCallback(() => {
    if (!selectedMovement || !currentMovement) return

    const record: MeasurementRecord = {
      id: `rom-${Date.now()}`,
      movementId: selectedMovement,
      side: selectedSide,
      angle: maxAngleReached > 0 ? maxAngleReached : currentAngle,
      normalRange: currentMovement.normalRange,
      calibration: currentCalibration || undefined,
      timestamp: new Date().toISOString(),
    }

    addMeasurement(record)
    speak(
      language === 'ko'
        ? `${maxAngleReached || currentAngle}도로 저장되었습니다`
        : `Saved at ${maxAngleReached || currentAngle} degrees`
    )

    // 리셋
    setMaxAngleReached(0)
  }, [
    selectedMovement,
    currentMovement,
    selectedSide,
    currentAngle,
    maxAngleReached,
    currentCalibration,
    addMeasurement,
    speak,
    language,
  ])

  // 카테고리 변경
  const handleCategoryChange = (category: JointCategory) => {
    setSelectedCategory(category)
    setSelectedMovement(null)
    setShowCategoryDropdown(false)
    setMaxAngleReached(0)
    stabilizer.current.reset()
  }

  // 움직임 변경
  const handleMovementChange = (movement: MovementType) => {
    setSelectedMovement(movement)
    setShowMovementDropdown(false)
    setMaxAngleReached(0)
    stabilizer.current.reset()

    const movementInfo = getMovementById(movement)
    if (movementInfo) {
      speak(
        language === 'ko'
          ? `${movementInfo.nameKo}을 선택했습니다. ${movementInfo.guideKo}`
          : `Selected ${movementInfo.nameEn}. ${movementInfo.guideEn}`
      )
    }
  }

  // 캘리브레이션 시작
  const handleStartCalibration = () => {
    if (!selectedMovement) return
    setIsCalibrationMode(true)
    setCalibrationStep('min')
    setTempCalibration(null)
    speak(
      language === 'ko'
        ? '캘리브레이션을 시작합니다. 먼저 최소 범위 자세를 취해주세요.'
        : 'Starting calibration. First, assume the minimum range position.'
    )
  }

  // 캘리브레이션 단계 저장
  const handleSaveCalibrationStep = () => {
    if (calibrationStep === 'min') {
      setTempCalibration({ min: currentAngle, max: 0 })
      setCalibrationStep('max')
      speak(
        language === 'ko'
          ? '최소 범위가 저장되었습니다. 이제 최대 범위 자세를 취해주세요.'
          : 'Minimum range saved. Now assume the maximum range position.'
      )
    } else if (calibrationStep === 'max' && tempCalibration && selectedMovement) {
      const calibrationData = {
        movementId: selectedMovement,
        side: selectedSide,
        minAngle: tempCalibration.min,
        maxAngle: currentAngle,
        calibratedAt: new Date().toISOString(),
      }
      saveCalibration(calibrationData)
      setIsCalibrationMode(false)
      setCalibrationStep(null)
      setTempCalibration(null)
      speak(
        language === 'ko'
          ? '캘리브레이션이 완료되었습니다.'
          : 'Calibration completed.'
      )
    }
  }

  // 캘리브레이션 취소
  const handleCancelCalibration = () => {
    setIsCalibrationMode(false)
    setCalibrationStep(null)
    setTempCalibration(null)
  }

  // 세션 저장
  const handleSaveSession = () => {
    saveSession()
    speak(
      language === 'ko'
        ? '세션이 저장되었습니다.'
        : 'Session saved.'
    )
  }

  // 로딩 상태 표시 (캐시된 데이터 로드 대기)
  if (!mounted) {
    return (
      <MainLayout title={language === 'ko' ? 'ROM 측정' : 'ROM Measurement'}>
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="aspect-[4/3] w-full rounded-lg bg-background animate-pulse flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-text-secondary">
                        {language === 'ko' ? '데이터 로딩 중...' : 'Loading data...'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="h-8 bg-background rounded animate-pulse mb-4" />
                  <div className="h-12 bg-background rounded animate-pulse" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="h-4 w-24 bg-background rounded animate-pulse mx-auto mb-2" />
                  <div className="h-16 w-32 bg-background rounded animate-pulse mx-auto" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title={language === 'ko' ? 'ROM 측정' : 'ROM Measurement'}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 왼쪽: 카메라 뷰 */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <CameraView
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isStreaming={isStreaming}
                    showGuide={false}
                    className="aspect-[4/3] w-full rounded-lg overflow-hidden"
                  >
                    {/* Pose overlay */}
                    {landmarks.length > 0 && (
                      <PoseOverlay
                        landmarks={landmarks}
                        width={videoDimensions.width}
                        height={videoDimensions.height}
                        className="absolute inset-0 h-full w-full"
                      />
                    )}

                    {/* 각도 오버레이 */}
                    {isActive && currentMovement && (
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div className="bg-black/70 rounded-lg px-4 py-2">
                          <span className="text-white text-sm">
                            {language === 'ko' ? currentMovement.nameKo : currentMovement.nameEn}
                          </span>
                        </div>
                        <div className="bg-primary/90 rounded-lg px-6 py-3">
                          <span className="text-white text-4xl font-bold">
                            {currentAngle}°
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 캘리브레이션 모드 오버레이 */}
                    {isCalibrationMode && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-surface rounded-xl p-6 text-center max-w-sm mx-4">
                          <h3 className="text-lg font-bold text-text-primary mb-2">
                            {language === 'ko' ? '캘리브레이션' : 'Calibration'}
                          </h3>
                          <p className="text-text-secondary mb-4">
                            {calibrationStep === 'min'
                              ? language === 'ko'
                                ? '최소 범위 자세를 취하고 저장하세요'
                                : 'Assume minimum range position and save'
                              : language === 'ko'
                              ? '최대 범위 자세를 취하고 저장하세요'
                              : 'Assume maximum range position and save'}
                          </p>
                          <div className="text-5xl font-bold text-primary mb-4">
                            {currentAngle}°
                          </div>
                          {tempCalibration && (
                            <p className="text-sm text-text-secondary mb-4">
                              {language === 'ko' ? '최소' : 'Min'}: {tempCalibration.min}°
                            </p>
                          )}
                          <div className="flex gap-2 justify-center">
                            <Button variant="outline" onClick={handleCancelCalibration}>
                              {language === 'ko' ? '취소' : 'Cancel'}
                            </Button>
                            <Button onClick={handleSaveCalibrationStep}>
                              {calibrationStep === 'min'
                                ? language === 'ko'
                                  ? '최소 저장'
                                  : 'Save Min'
                                : language === 'ko'
                                ? '완료'
                                : 'Complete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CameraView>

                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface rounded-lg">
                      <div className="text-center text-error">
                        <p>{cameraError}</p>
                        <Button onClick={startCamera} className="mt-4">
                          {language === 'ko' ? '다시 시도' : 'Retry'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 컨트롤 버튼 */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-2">
                    <Button
                      variant={voiceEnabled ? 'secondary' : 'outline'}
                      size="icon"
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      title={voiceEnabled ? 'Voice On' : 'Voice Off'}
                    >
                      {voiceEnabled ? (
                        <Volume2 className="h-5 w-5" />
                      ) : (
                        <VolumeX className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setMaxAngleReached(0)
                        stabilizer.current.reset()
                      }}
                      title={language === 'ko' ? '리셋' : 'Reset'}
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={isActive ? 'destructive' : 'default'}
                      size="lg"
                      onClick={handleToggleActive}
                      disabled={!selectedMovement}
                    >
                      {isActive ? (
                        <>
                          <Pause className="mr-2 h-5 w-5" />
                          {language === 'ko' ? '중지' : 'Stop'}
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          {language === 'ko' ? '시작' : 'Start'}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSaveMeasurement}
                      disabled={!selectedMovement || currentAngle === 0}
                    >
                      <Save className="mr-2 h-5 w-5" />
                      {language === 'ko' ? '저장' : 'Save'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 가이드 */}
            {currentMovement && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-text-primary mb-2">
                    {language === 'ko' ? '측정 가이드' : 'Measurement Guide'}
                  </h4>
                  <p className="text-text-secondary">
                    {language === 'ko' ? currentMovement.guideKo : currentMovement.guideEn}
                  </p>
                  <p className="text-sm text-text-secondary mt-2">
                    {language === 'ko' ? currentMovement.descriptionKo : currentMovement.descriptionEn}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 오른쪽: 측정 패널 */}
          <div className="space-y-4">
            {/* 관절 선택 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-text-secondary">
                  {language === 'ko' ? '관절 선택' : 'Select Joint'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 카테고리 드롭다운 */}
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-background rounded-lg border border-border hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryInfo?.icon}</span>
                      <span className="font-medium text-text-primary">
                        {language === 'ko' ? categoryInfo?.nameKo : categoryInfo?.nameEn}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-text-secondary transition-transform',
                        showCategoryDropdown && 'rotate-180'
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {showCategoryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
                      >
                        {JOINT_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            className={cn(
                              'w-full flex items-center gap-2 px-4 py-3 hover:bg-background transition-colors',
                              selectedCategory === cat.id && 'bg-primary/10'
                            )}
                          >
                            <span className="text-xl">{cat.icon}</span>
                            <span className="text-text-primary">
                              {language === 'ko' ? cat.nameKo : cat.nameEn}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 움직임 드롭다운 */}
                <div className="relative">
                  <button
                    onClick={() => setShowMovementDropdown(!showMovementDropdown)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-background rounded-lg border border-border hover:border-primary transition-colors"
                  >
                    <span className={cn(
                      'font-medium',
                      selectedMovement ? 'text-text-primary' : 'text-text-secondary'
                    )}>
                      {currentMovement
                        ? language === 'ko'
                          ? currentMovement.nameKo
                          : currentMovement.nameEn
                        : language === 'ko'
                        ? '움직임 선택'
                        : 'Select Movement'}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-text-secondary transition-transform',
                        showMovementDropdown && 'rotate-180'
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {showMovementDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
                      >
                        {categoryMovements.map((movement) => (
                          <button
                            key={movement.id}
                            onClick={() => handleMovementChange(movement.id)}
                            className={cn(
                              'w-full text-left px-4 py-3 hover:bg-background transition-colors',
                              selectedMovement === movement.id && 'bg-primary/10'
                            )}
                          >
                            <div className="font-medium text-text-primary">
                              {language === 'ko' ? movement.nameKo : movement.nameEn}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {language === 'ko' ? '정상' : 'Normal'}: {movement.normalRange.min}° - {movement.normalRange.max}°
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 좌우 선택 */}
                {currentMovement && currentMovement.side !== 'center' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedSide('left')}
                      className={cn(
                        'flex-1 py-2 px-4 rounded-lg border transition-colors',
                        selectedSide === 'left'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-text-secondary hover:border-primary'
                      )}
                    >
                      {language === 'ko' ? '왼쪽' : 'Left'}
                    </button>
                    <button
                      onClick={() => setSelectedSide('right')}
                      className={cn(
                        'flex-1 py-2 px-4 rounded-lg border transition-colors',
                        selectedSide === 'right'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-text-secondary hover:border-primary'
                      )}
                    >
                      {language === 'ko' ? '오른쪽' : 'Right'}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 현재 각도 표시 */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-text-secondary text-sm mb-2">
                  {language === 'ko' ? '현재 각도' : 'Current Angle'}
                </div>
                <div className="text-6xl font-bold text-primary mb-2">
                  {currentAngle}°
                </div>
                {maxAngleReached > 0 && (
                  <div className="text-sm text-text-secondary">
                    {language === 'ko' ? '최대' : 'Max'}: {maxAngleReached}°
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ROM 게이지 */}
            {currentMovement && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-secondary">
                    {language === 'ko' ? '가동 범위' : 'Range of Motion'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RomGauge
                    currentAngle={currentAngle}
                    normalRange={currentMovement.normalRange}
                    calibration={currentCalibration}
                    maxDisplayAngle={currentMovement.normalRange.max > 100 ? 180 : 90}
                    language={language as 'ko' | 'en'}
                  />
                </CardContent>
              </Card>
            )}

            {/* 캘리브레이션 버튼 */}
            <Card>
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleStartCalibration}
                  disabled={!selectedMovement || isActive}
                >
                  <Settings2 className="mr-2 h-5 w-5" />
                  {currentCalibration
                    ? language === 'ko'
                      ? '캘리브레이션 재설정'
                      : 'Recalibrate'
                    : language === 'ko'
                    ? '캘리브레이션'
                    : 'Calibrate'}
                </Button>
                {currentCalibration && (
                  <p className="text-xs text-text-secondary text-center mt-2">
                    {language === 'ko' ? '내 범위' : 'My Range'}: {Math.round(currentCalibration.minAngle)}° - {Math.round(currentCalibration.maxAngle)}°
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 세션 저장 */}
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSaveSession}
            >
              <History className="mr-2 h-5 w-5" />
              {language === 'ko' ? '세션 저장' : 'Save Session'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
