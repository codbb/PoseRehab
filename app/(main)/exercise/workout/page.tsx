'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  X,
  Trophy,
  Clock,
  Target,
  Flame,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Slider } from '@/components/ui/slider'
import { CameraView } from '@/components/posture/camera-view'
import { PoseOverlay } from '@/components/posture/pose-overlay'
import { FeedbackDisplay } from '@/components/exercise/feedback-display'
import { RepCounter } from '@/components/exercise/rep-counter'
import { useTranslation } from '@/hooks/use-translation'
import { useCamera } from '@/hooks/use-camera'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { useExerciseStore } from '@/stores/exercise-store'
import { useUserStore } from '@/stores/user-store'
import { createExerciseCounter, EXERCISE_CONFIGS } from '@/lib/analysis/exercise-counter'
import { EXERCISES } from '@/lib/constants'
import { formatTime, cn } from '@/lib/utils'
import type { Exercise } from '@/types/exercise'
import type { Landmark } from '@/types/posture'

function WorkoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, language } = useTranslation()

  const exerciseId = searchParams.get('id') || 'squat'
  const exercise = EXERCISES.find((e) => e.id === exerciseId) || EXERCISES[0]

  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentReps, setCurrentReps] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [accuracy, setAccuracy] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [accuracyHistory, setAccuracyHistory] = useState<number[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })

  // Calibration settings
  const [calibration, setCalibration] = useState({
    startAngle: EXERCISE_CONFIGS[exerciseId]?.startAngle || 170,
    targetAngle: EXERCISE_CONFIGS[exerciseId]?.targetAngle || 90,
    completionThreshold: EXERCISE_CONFIGS[exerciseId]?.completionThreshold || 160,
  })

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

  const { startSession, updateSession, endSession } = useExerciseStore()
  const { addExperience, addBadge } = useUserStore()

  const counterRef = useRef(createExerciseCounter(exerciseId))
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Update video dimensions
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

  // Start pose detection when camera is streaming
  useEffect(() => {
    if (isStreaming && videoRef.current && isActive && !isPaused) {
      startDetection(videoRef.current)
    } else {
      stopDetection()
    }
    return () => stopDetection()
  }, [isStreaming, isActive, isPaused, videoRef, startDetection, stopDetection])

  // Timer
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isActive, isPaused])

  // Process landmarks
  useEffect(() => {
    if (!isActive || isPaused || landmarks.length === 0) return

    const result = counterRef.current.update(landmarks)

    setAccuracy(result.accuracy)
    if (result.feedback) {
      setFeedback(result.feedback)
    }

    if (result.counted) {
      setCurrentReps((r) => {
        const newReps = r + 1
        setAccuracyHistory((h) => [...h, result.accuracy])

        if (newReps >= exercise.defaultReps) {
          if (currentSet >= exercise.defaultSets) {
            // Exercise complete
            handleComplete()
          } else {
            // Next set
            setCurrentSet((s) => s + 1)
            counterRef.current.reset()
            return 0
          }
        }
        return newReps
      })
    }
  }, [landmarks, isActive, isPaused, exercise, currentSet])

  const handleStart = async () => {
    await startCamera()
    startSession(exercise)
    setIsActive(true)
    counterRef.current.reset()
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleReset = () => {
    setCurrentReps(0)
    setCurrentSet(1)
    setElapsedTime(0)
    setAccuracyHistory([])
    setFeedback('')
    counterRef.current.reset()
  }

  const handleComplete = useCallback(() => {
    setIsActive(false)
    stopDetection()
    stopCamera()

    const record = endSession()

    if (record) {
      // Add experience
      const exp = Math.round(record.averageAccuracy / 2) + record.reps
      addExperience(exp)

      // Check for badges
      if (record.reps >= 100) {
        addBadge('hundred_reps')
      }
    }

    setShowResult(true)
  }, [endSession, addExperience, addBadge, stopDetection, stopCamera])

  const handleExit = () => {
    setIsActive(false)
    stopDetection()
    stopCamera()
    router.push('/exercise/list')
  }

  const handleSaveSettings = () => {
    counterRef.current.setConfig(calibration)
    setShowSettings(false)
  }

  const avgAccuracy =
    accuracyHistory.length > 0
      ? accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length
      : 0

  const caloriesBurned = Math.round(
    currentReps * exercise.caloriesPerRep +
      currentSet * exercise.caloriesPerRep * exercise.defaultReps * 0.5
  )

  return (
    <MainLayout title={language === 'ko' ? exercise.nameKo : exercise.name}>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <CameraView
                videoRef={videoRef}
                canvasRef={canvasRef}
                isStreaming={isStreaming}
                showGuide={false}
                className="aspect-video w-full"
              >
                {/* Pose overlay */}
                {isActive && landmarks.length > 0 && (
                  <PoseOverlay
                    landmarks={landmarks}
                    width={videoDimensions.width}
                    height={videoDimensions.height}
                    className="absolute inset-0 h-full w-full"
                  />
                )}

                {/* Not started overlay */}
                {!isActive && !isStreaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-text-primary">
                        {t('exercise.session.ready')}
                      </h3>
                      <p className="mt-2 text-text-secondary">
                        {language === 'ko' ? exercise.descriptionKo : exercise.description}
                      </p>
                      <Button onClick={handleStart} size="lg" className="mt-6">
                        <Play className="mr-2 h-5 w-5" />
                        {t('common.start')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Timer overlay */}
                {isActive && (
                  <div className="absolute left-4 top-4 rounded-lg bg-black/50 px-3 py-2 text-white">
                    <Clock className="mr-2 inline h-4 w-4" />
                    {formatTime(elapsedTime)}
                  </div>
                )}
              </CameraView>

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface rounded-card">
                  <div className="text-center text-error">
                    <p>{cameraError}</p>
                    <Button onClick={handleStart} className="mt-4">
                      {t('common.retry')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            {isActive && (
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handlePause}>
                  {isPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {t('common.resume')}
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      {t('common.pause')}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('common.retry')}
                </Button>
                <Button variant="outline" onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('exercise.session.calibration')}
                </Button>
                <Button variant="destructive" onClick={handleComplete}>
                  <X className="mr-2 h-4 w-4" />
                  {t('common.complete')}
                </Button>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Rep Counter */}
            <RepCounter
              currentReps={currentReps}
              targetReps={exercise.defaultReps}
              currentSet={currentSet}
              targetSets={exercise.defaultSets}
            />

            {/* Feedback */}
            {isActive && (
              <Card>
                <CardContent className="p-4">
                  <FeedbackDisplay feedback={feedback} accuracy={accuracy} />
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t('exercise.session.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {(language === 'ko'
                    ? exercise.instructionsKo
                    : exercise.instructions
                  ).map((instruction, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-medium text-primary">{index + 1}.</span>
                      {instruction}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Calibration Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title={t('exercise.session.calibration')}
      >
        <div className="space-y-6">
          <Slider
            label={t('exercise.session.startAngle')}
            value={calibration.startAngle}
            onChange={(v) => setCalibration((c) => ({ ...c, startAngle: v }))}
            min={90}
            max={180}
          />
          <Slider
            label={t('exercise.session.targetAngle')}
            value={calibration.targetAngle}
            onChange={(v) => setCalibration((c) => ({ ...c, targetAngle: v }))}
            min={45}
            max={150}
          />
          <Slider
            label={t('exercise.session.threshold')}
            value={calibration.completionThreshold}
            onChange={(v) => setCalibration((c) => ({ ...c, completionThreshold: v }))}
            min={90}
            max={180}
          />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setCalibration({
                startAngle: EXERCISE_CONFIGS[exerciseId]?.startAngle || 170,
                targetAngle: EXERCISE_CONFIGS[exerciseId]?.targetAngle || 90,
                completionThreshold: EXERCISE_CONFIGS[exerciseId]?.completionThreshold || 160,
              })
            }}
          >
            {t('exercise.session.resetDefault')}
          </Button>
          <Button onClick={handleSaveSettings}>{t('common.save')}</Button>
        </ModalFooter>
      </Modal>

      {/* Result Modal */}
      <Modal
        isOpen={showResult}
        onClose={() => {}}
        title={t('exercise.result.title')}
        showCloseButton={false}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/20">
              <Trophy className="h-10 w-10 text-secondary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-background p-4 text-center">
              <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="text-2xl font-bold text-text-primary">
                {formatTime(elapsedTime)}
              </p>
              <p className="text-sm text-text-secondary">
                {t('exercise.result.totalTime')}
              </p>
            </div>

            <div className="rounded-lg bg-background p-4 text-center">
              <Target className="mx-auto mb-2 h-6 w-6 text-secondary" />
              <p className="text-2xl font-bold text-text-primary">
                {currentReps + (currentSet - 1) * exercise.defaultReps}
              </p>
              <p className="text-sm text-text-secondary">
                {t('exercise.result.completedReps')}
              </p>
            </div>

            <div className="rounded-lg bg-background p-4 text-center">
              <div className="mx-auto mb-2 h-6 w-6 text-warning">%</div>
              <p className="text-2xl font-bold text-text-primary">
                {avgAccuracy.toFixed(1)}%
              </p>
              <p className="text-sm text-text-secondary">
                {t('exercise.result.avgAccuracy')}
              </p>
            </div>

            <div className="rounded-lg bg-background p-4 text-center">
              <Flame className="mx-auto mb-2 h-6 w-6 text-error" />
              <p className="text-2xl font-bold text-text-primary">
                {caloriesBurned}
              </p>
              <p className="text-sm text-text-secondary">
                {t('exercise.result.caloriesBurned')}
              </p>
            </div>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button variant="outline" onClick={handleReset}>
            {t('exercise.result.doAgain')}
          </Button>
          <Button onClick={handleExit}>{t('exercise.result.saveAndExit')}</Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  )
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkoutContent />
    </Suspense>
  )
}
