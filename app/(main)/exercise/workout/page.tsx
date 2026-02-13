'use client'

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
// TODO: 3D 아바타 기능 - 필요시 주석 해제
// import dynamic from 'next/dynamic'
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
  Minus,
  Plus,
  Crosshair,
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
import { ExerciseGuideAnimation } from '@/components/exercise/exercise-guide-animation'
import { useTranslation } from '@/hooks/use-translation'
import { useCamera } from '@/hooks/use-camera'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { usePoseClassifier } from '@/hooks/use-pose-classifier'
import { useExerciseStore } from '@/stores/exercise-store'
import { useUserStore } from '@/stores/user-store'
import { createExerciseCounter, EXERCISE_CONFIGS } from '@/lib/analysis/exercise-counter'
import { calculateAngle } from '@/lib/analysis/angle-calculator'
import { EXERCISES } from '@/lib/constants'
import { formatTime, cn } from '@/lib/utils'
import type { Exercise } from '@/types/exercise'
import type { Landmark } from '@/types/posture'

// TODO: 3D 아바타 기능 - 필요시 주석 해제
// const WorkoutVrmAvatar = dynamic(
//   () => import('@/components/exercise/workout-vrm-avatar').then((m) => ({ default: m.WorkoutVrmAvatar })),
//   { ssr: false }
// )

// 페이지 exercise ID → AI 모델 exercise name 매핑
const EXERCISE_ID_TO_AI_NAME: Record<string, string[]> = {
  squat: ['Squat'],
  lunge: ['Lunge', 'Cross Lunge'],
  pushup: ['Push Up'],
  plank: ['Plank'],
  bridge: ['Hip Thrust'],  // bridge ≈ Hip Thrust
  crunch: ['Crunch'],
  lying_leg_raise: ['Lying Leg Raise'],
  good_morning: ['Good Morning'],
  side_lunge_realtime: ['Side Lunge'],
  knee_pushup: ['Knee Push Up'],
  barbell_deadlift: ['Barbell Deadlift'],
  barbell_row: ['Barbell Row'],
  dumbbell_bentover_row: ['Dumbbell Bent Over Row'],
  front_raise: ['Front Raise', 'Side Lateral Raise'],
  upright_row: ['Upright Row'],
  bicycle_crunch: ['Bicycle Crunch'],
  burpee: ['Burpee Test'],
}

// AI 검증 결과 타입
interface AIValidation {
  isPostureCorrect: boolean
  postureConfidence: number
  isExerciseMatch: boolean
  detectedExercise: string
  exerciseConfidence: number
}

// AI 검증 설정
const AI_VALIDATION_CONFIG = {
  confidenceThreshold: 0.5,        // 신뢰도 임계값
  blockOnWrongExercise: true,      // 다른 운동 감지 시 카운트 차단
  blockOnIncorrectPosture: false,  // 잘못된 자세 시 카운트 차단 (경고만)
  warnOnIncorrectPosture: true,    // 잘못된 자세 시 경고 표시
}

function WorkoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, language } = useTranslation()

  const exerciseId = searchParams.get('id') || 'squat'
  const foundExercise = EXERCISES.find((e) => e.id === exerciseId)
  // Redirect guided exercises to the correct page
  const exercise = foundExercise?.exerciseType === 'guided'
    ? (EXERCISES.find((e) => e.id === 'squat') || EXERCISES[0])
    : (foundExercise || EXERCISES[0])

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
  // TODO: 3D 아바타 기능 - 필요시 주석 해제
  // const [showAvatar, setShowAvatar] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })
  const [aiFeedback, setAiFeedback] = useState<{ isCorrect: boolean; confidence: number } | null>(null)
  const [aiValidation, setAiValidation] = useState<AIValidation | null>(null)
  const [aiBlockReason, setAiBlockReason] = useState<string | null>(null)

  // Exercise settings (sets/reps/rest)
  const [targetSets, setTargetSets] = useState(exercise.defaultSets)
  const [targetReps, setTargetReps] = useState(exercise.defaultReps)
  const [restTime, setRestTime] = useState(exercise.restBetweenSets ?? 30)
  const [isResting, setIsResting] = useState(false)
  const [restCountdown, setRestCountdown] = useState(0)

  // Calibration settings
  const [calibration, setCalibration] = useState({
    startAngle: EXERCISE_CONFIGS[exerciseId]?.startAngle || 170,
    targetAngle: EXERCISE_CONFIGS[exerciseId]?.targetAngle || 90,
    completionThreshold: EXERCISE_CONFIGS[exerciseId]?.completionThreshold || 160,
  })

  // Calibration flow state
  const [calibrationPhase, setCalibrationPhase] = useState<'idle' | 'capture_start' | 'capture_rep' | 'done'>('idle')
  const calibrationAnglesRef = useRef<number[]>([])
  const calibrationStartAngleRef = useRef<number | null>(null)

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

  // 옵션 객체를 안정적으로 유지하여 불필요한 재렌더링 방지
  const classifierOptions = useMemo(() => ({
    modelPath: '/models/posture_classifier_multitask.onnx',
    threshold: 0.5,
  }), [])

  const {
    isReady: classifierReady,
    classify,
    error: classifierError,
  } = usePoseClassifier(classifierOptions)

  const { startSession, updateSession, endSession } = useExerciseStore()
  const { addExperience, addBadge } = useUserStore()

  const counterRef = useRef(createExerciseCounter(exerciseId))
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const aiValidationRef = useRef<AIValidation | null>(null)
  const lastClassifyTime = useRef(0)
  const classifyRef = useRef(classify)
  classifyRef.current = classify
  const handleCompleteRef = useRef<() => void>(() => {})

  // landmarks를 ref로 저장하여 useEffect 의존성에서 제거
  const landmarksRef = useRef<Landmark[]>([])
  landmarksRef.current = landmarks

  // 상태값들도 ref로 저장 (interval 내부에서 최신값 접근용)
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive
  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused
  const currentSetRef = useRef(currentSet)
  currentSetRef.current = currentSet
  const exerciseRef = useRef(exercise)
  exerciseRef.current = exercise
  const targetSetsRef = useRef(targetSets)
  targetSetsRef.current = targetSets
  const targetRepsRef = useRef(targetReps)
  targetRepsRef.current = targetReps
  const restTimeRef = useRef(restTime)
  restTimeRef.current = restTime

  // Update video dimensions
  useEffect(() => {
    if (isStreaming && videoRef.current) {
      const updateDimensions = () => {
        if (videoRef.current) {
          const newWidth = videoRef.current.videoWidth || 640
          const newHeight = videoRef.current.videoHeight || 480
          setVideoDimensions((prev) => {
            if (prev.width === newWidth && prev.height === newHeight) {
              return prev
            }
            return { width: newWidth, height: newHeight }
          })
        }
      }
      videoRef.current.addEventListener('loadedmetadata', updateDimensions)
      updateDimensions()
      return () => {
        videoRef.current?.removeEventListener('loadedmetadata', updateDimensions)
      }
    }
  }, [isStreaming])

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

  // 통합 처리 루프: 규칙 기반 카운팅 + AI 분류
  // landmarks를 의존성에서 제거하고 interval 기반으로 처리 (무한 루프 방지)
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 운동이 활성화되면 처리 루프 시작
    if (!isActive || isPaused) {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
        processingIntervalRef.current = null
      }
      return
    }

    // 33ms 간격으로 처리 (약 30fps)
    processingIntervalRef.current = setInterval(() => {
      const currentLandmarks = landmarksRef.current
      if (currentLandmarks.length === 0) return

      // ===== 1. 규칙 기반 카운팅 =====
      const result = counterRef.current.update(currentLandmarks)

      setAccuracy((prev) => {
        if (prev === result.accuracy) return prev
        return result.accuracy
      })

      if (result.feedback) {
        setFeedback((prev) => {
          if (prev === result.feedback) return prev
          return result.feedback
        })
      }

      if (result.counted) {
        // AI 검증 확인
        const validation = aiValidationRef.current
        let shouldCount = true
        let blockReason: string | null = null

        if (validation) {
          const { exerciseConfidence, isExerciseMatch, isPostureCorrect, detectedExercise, postureConfidence } = validation

          // AI 신뢰도가 threshold 이상일 때만 AI 검증 적용
          if (exerciseConfidence >= AI_VALIDATION_CONFIG.confidenceThreshold) {
            if (!isExerciseMatch && AI_VALIDATION_CONFIG.blockOnWrongExercise) {
              shouldCount = false
              blockReason = `wrongExercise:${detectedExercise}`
            }
            if (shouldCount && !isPostureCorrect && AI_VALIDATION_CONFIG.blockOnIncorrectPosture) {
              shouldCount = false
              blockReason = 'incorrectPosture'
            }
          }
        }

        if (shouldCount) {
          setCurrentReps((r) => {
            const newReps = r + 1
            setAccuracyHistory((h) => [...h, result.accuracy])

            const cs = currentSetRef.current
            const tReps = targetRepsRef.current
            const tSets = targetSetsRef.current
            if (newReps >= tReps) {
              if (cs >= tSets) {
                handleCompleteRef.current()
              } else {
                // Start rest period then advance set
                const rt = restTimeRef.current
                setIsResting(true)
                setRestCountdown(rt)
                const restInterval = setInterval(() => {
                  setRestCountdown((c) => {
                    if (c <= 1) {
                      clearInterval(restInterval)
                      setIsResting(false)
                      setCurrentSet((s) => s + 1)
                      counterRef.current.reset()
                      return 0
                    }
                    return c - 1
                  })
                }, 1000)
                return 0
              }
            }
            return newReps
          })
        } else if (blockReason) {
          if (blockReason.startsWith('wrongExercise:')) {
            setFeedback(blockReason)
          } else {
            setFeedback('incorrectPosture')
          }
        }
      }

      // ===== 2. AI 분류 (500ms 간격) =====
      if (!classifierReady) return

      const now = Date.now()
      if (now - lastClassifyTime.current < 500) return
      lastClassifyTime.current = now

      classifyRef.current(currentLandmarks).then((aiResult) => {
        if (!aiResult) return

        const expectedNames = EXERCISE_ID_TO_AI_NAME[exerciseId] || []
        const isExerciseMatch = expectedNames.includes(aiResult.exerciseName)

        const validation: AIValidation = {
          isPostureCorrect: aiResult.isCorrect,
          postureConfidence: aiResult.postureConfidence,
          isExerciseMatch,
          detectedExercise: aiResult.exerciseName,
          exerciseConfidence: aiResult.exerciseConfidence,
        }

        aiValidationRef.current = validation

        setAiValidation((prev) => {
          if (prev?.isPostureCorrect === validation.isPostureCorrect &&
              prev?.isExerciseMatch === validation.isExerciseMatch &&
              prev?.detectedExercise === validation.detectedExercise) {
            return prev
          }
          return validation
        })

        setAiFeedback((prev) => {
          if (prev?.isCorrect === aiResult.isCorrect &&
              prev?.confidence === aiResult.postureConfidence) {
            return prev
          }
          return {
            isCorrect: aiResult.isCorrect,
            confidence: aiResult.postureConfidence,
          }
        })

        let newBlockReason: string | null = null
        if (AI_VALIDATION_CONFIG.confidenceThreshold <= aiResult.exerciseConfidence) {
          if (!isExerciseMatch && AI_VALIDATION_CONFIG.blockOnWrongExercise) {
            newBlockReason = `wrongExercise:${aiResult.exerciseName}`
          } else if (!aiResult.isCorrect && AI_VALIDATION_CONFIG.blockOnIncorrectPosture) {
            newBlockReason = 'incorrectPosture'
          }
        }

        setAiBlockReason((prev) => {
          if (prev === newBlockReason) return prev
          return newBlockReason
        })
      }).catch((err) => {
        console.error('AI classification error:', err)
      })
    }, 33)

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
        processingIntervalRef.current = null
      }
    }
  }, [isActive, isPaused, classifierReady, exerciseId])

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
    setAiFeedback(null)
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

  // Update ref for use in useEffect
  handleCompleteRef.current = handleComplete

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

  // --- Calibration flow ---
  const handleStartCalibration = async () => {
    if (!isStreaming) {
      await startCamera()
    }
    if (videoRef.current && !isActive) {
      startDetection(videoRef.current)
    }
    calibrationAnglesRef.current = []
    calibrationStartAngleRef.current = null
    setCalibrationPhase('capture_start')
  }

  const handleCaptureStartPose = () => {
    const lm = landmarksRef.current
    if (lm.length < 33) return
    const config = EXERCISE_CONFIGS[exerciseId] || EXERCISE_CONFIGS.squat
    const [j1, j2, j3] = config.joints
    const p1 = lm[j1], p2 = lm[j2], p3 = lm[j3]
    if (!p1 || !p2 || !p3) return
    const angle = calculateAngle(p1, p2, p3)
    calibrationStartAngleRef.current = angle
    calibrationAnglesRef.current = []
    setCalibrationPhase('capture_rep')
  }

  const handleCaptureRep = () => {
    const lm = landmarksRef.current
    if (lm.length < 33) return
    const config = EXERCISE_CONFIGS[exerciseId] || EXERCISE_CONFIGS.squat
    const [j1, j2, j3] = config.joints
    const p1 = lm[j1], p2 = lm[j2], p3 = lm[j3]
    if (!p1 || !p2 || !p3) return
    const angle = calculateAngle(p1, p2, p3)
    calibrationAnglesRef.current.push(angle)
  }

  const handleFinishCalibration = () => {
    const startAngle = calibrationStartAngleRef.current
    const angles = calibrationAnglesRef.current
    if (startAngle == null || angles.length === 0) {
      setCalibrationPhase('idle')
      return
    }
    const minAngle = Math.min(...angles)
    const maxAngle = Math.max(...angles)
    // Target is the extreme of the rep, completion threshold is near start
    const isGoingDown = (EXERCISE_CONFIGS[exerciseId]?.targetAngle ?? 90) < (EXERCISE_CONFIGS[exerciseId]?.startAngle ?? 170)
    const newCal = {
      startAngle: Math.round(startAngle),
      targetAngle: Math.round(isGoingDown ? minAngle : maxAngle),
      completionThreshold: Math.round(isGoingDown ? startAngle - 10 : startAngle + 10),
    }
    setCalibration(newCal)
    counterRef.current.setConfig(newCal)
    // Save to localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('exerciseCalibrations') || '{}')
      saved[exerciseId] = newCal
      localStorage.setItem('exerciseCalibrations', JSON.stringify(saved))
    } catch { /* ignore */ }
    setCalibrationPhase('done')
    if (!isActive) {
      stopDetection()
    }
  }

  // Load saved calibration on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('exerciseCalibrations') || '{}')
      if (saved[exerciseId]) {
        setCalibration(saved[exerciseId])
        counterRef.current.setConfig(saved[exerciseId])
      }
    } catch { /* ignore */ }
  }, [exerciseId])

  // Continuous angle sampling during capture_rep phase
  useEffect(() => {
    if (calibrationPhase !== 'capture_rep') return
    const interval = setInterval(() => {
      handleCaptureRep()
    }, 100)
    return () => clearInterval(interval)
  }, [calibrationPhase])

  const avgAccuracy =
    accuracyHistory.length > 0
      ? accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length
      : 0

  const caloriesBurned = Math.round(
    currentReps * exercise.caloriesPerRep +
      currentSet * exercise.caloriesPerRep * targetReps * 0.5
  )

  return (
    <MainLayout title={language === 'ko' ? exercise.nameKo : exercise.name}>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* TODO: 3D 아바타 기능 - 필요시 주석 해제
            <div className={cn(
              'grid gap-4',
              showAvatar && isActive ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            )}> */}
            <div className="grid grid-cols-1 gap-4">
              {/* Webcam */}
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

                  {/* Not started overlay with guide animation + settings */}
                  {!isActive && !isStreaming && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface overflow-y-auto py-4">
                      <div className="text-center space-y-4 w-full max-w-sm px-4">
                        <h3 className="text-xl font-semibold text-text-primary">
                          {language === 'ko' ? exercise.nameKo : exercise.name}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {language === 'ko' ? exercise.descriptionKo : exercise.description}
                        </p>

                        {/* Exercise guide stickman animation */}
                        <div className="flex justify-center">
                          <ExerciseGuideAnimation exerciseId={exerciseId} size="lg" />
                        </div>

                        {/* Exercise settings: sets / reps / rest */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                          {/* Sets */}
                          <div className="rounded-lg border border-border bg-background p-2">
                            <p className="text-[10px] text-text-secondary mb-1">
                              {language === 'ko' ? '세트' : 'Sets'}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setTargetSets((v) => Math.max(1, v - 1))}
                                className="rounded p-0.5 hover:bg-surface transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5 text-text-secondary" />
                              </button>
                              <span className="text-lg font-bold text-text-primary min-w-[2ch]">{targetSets}</span>
                              <button
                                onClick={() => setTargetSets((v) => Math.min(10, v + 1))}
                                className="rounded p-0.5 hover:bg-surface transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5 text-text-secondary" />
                              </button>
                            </div>
                          </div>
                          {/* Reps */}
                          <div className="rounded-lg border border-border bg-background p-2">
                            <p className="text-[10px] text-text-secondary mb-1">
                              {language === 'ko' ? '횟수' : 'Reps'}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setTargetReps((v) => Math.max(5, v - 1))}
                                className="rounded p-0.5 hover:bg-surface transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5 text-text-secondary" />
                              </button>
                              <span className="text-lg font-bold text-text-primary min-w-[2ch]">{targetReps}</span>
                              <button
                                onClick={() => setTargetReps((v) => Math.min(30, v + 1))}
                                className="rounded p-0.5 hover:bg-surface transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5 text-text-secondary" />
                              </button>
                            </div>
                          </div>
                          {/* Rest time */}
                          <div className="rounded-lg border border-border bg-background p-2">
                            <p className="text-[10px] text-text-secondary mb-1">
                              {language === 'ko' ? '휴식(초)' : 'Rest(s)'}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setRestTime((v) => Math.max(10, v - 10))}
                                className="rounded p-0.5 hover:bg-surface transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5 text-text-secondary" />
                              </button>
                              <span className="text-lg font-bold text-text-primary min-w-[2ch]">{restTime}</span>
                              <button
                                onClick={() => setRestTime((v) => Math.min(120, v + 10))}
                                className="rounded p-0.5 hover:bg-surface transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5 text-text-secondary" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Calibration button */}
                        <button
                          onClick={handleStartCalibration}
                          className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-secondary hover:bg-surface transition-colors"
                        >
                          <Crosshair className="h-4 w-4" />
                          {language === 'ko' ? '캘리브레이션 (선택)' : 'Calibration (Optional)'}
                        </button>

                        {/* Calibration flow UI */}
                        {calibrationPhase !== 'idle' && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-2">
                            {calibrationPhase === 'capture_start' && (
                              <>
                                <p className="text-text-primary font-medium">
                                  {language === 'ko'
                                    ? '시작 자세를 취한 후 버튼을 누르세요'
                                    : 'Take your starting pose and press the button'}
                                </p>
                                <Button size="sm" onClick={handleCaptureStartPose}>
                                  {language === 'ko' ? '시작 자세 캡처' : 'Capture Start Pose'}
                                </Button>
                              </>
                            )}
                            {calibrationPhase === 'capture_rep' && (
                              <>
                                <p className="text-text-primary font-medium">
                                  {language === 'ko'
                                    ? '1회 반복을 수행하세요 (자동 측정 중...)'
                                    : 'Perform one rep (auto-measuring...)'}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {language === 'ko'
                                    ? `측정된 각도: ${calibrationAnglesRef.current.length}개`
                                    : `Angles sampled: ${calibrationAnglesRef.current.length}`}
                                </p>
                                <Button size="sm" onClick={handleFinishCalibration}>
                                  {language === 'ko' ? '캘리브레이션 완료' : 'Finish Calibration'}
                                </Button>
                              </>
                            )}
                            {calibrationPhase === 'done' && (
                              <>
                                <p className="text-secondary font-medium">
                                  {language === 'ko' ? '캘리브레이션 완료!' : 'Calibration Complete!'}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {language === 'ko'
                                    ? `시작: ${calibration.startAngle}° / 목표: ${calibration.targetAngle}° / 임계: ${calibration.completionThreshold}°`
                                    : `Start: ${calibration.startAngle}° / Target: ${calibration.targetAngle}° / Threshold: ${calibration.completionThreshold}°`}
                                </p>
                                <Button size="sm" variant="outline" onClick={() => setCalibrationPhase('idle')}>
                                  {language === 'ko' ? '확인' : 'OK'}
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        <Button onClick={handleStart} size="lg" className="w-full">
                          <Play className="mr-2 h-5 w-5" />
                          {t('common.start')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rest period overlay */}
                  {isActive && isResting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm z-10">
                      <p className="text-lg font-semibold text-text-primary">
                        {language === 'ko' ? '휴식 중...' : 'Resting...'}
                      </p>
                      <p className="mt-2 text-4xl font-bold text-primary">{restCountdown}s</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {language === 'ko'
                          ? `다음 세트: ${currentSet + 1} / ${targetSets}`
                          : `Next set: ${currentSet + 1} / ${targetSets}`}
                      </p>
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

              {/* TODO: 3D 아바타 기능 - 필요시 주석 해제
              {showAvatar && isActive && (
                <WorkoutVrmAvatar
                  landmarks={landmarks}
                  enabled={showAvatar && isActive}
                  language={language as 'ko' | 'en'}
                  className="aspect-video"
                />
              )} */}
            </div>

            {/* Controls */}
            {isActive && (
              <div className="flex flex-wrap justify-center gap-4">
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
                {/* TODO: 3D 아바타 기능 - 필요시 주석 해제
                <Button
                  variant={showAvatar ? 'default' : 'outline'}
                  onClick={() => setShowAvatar((v) => !v)}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  {showAvatar
                    ? t('exercise.session.avatarOn')
                    : t('exercise.session.avatarOff')
                  }
                </Button> */}
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
              targetReps={targetReps}
              currentSet={currentSet}
              targetSets={targetSets}
            />

            {/* Exercise guide animation (small, during workout) */}
            {isActive && (
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <ExerciseGuideAnimation exerciseId={exerciseId} size="sm" />
                  <div className="text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">
                      {language === 'ko' ? exercise.nameKo : exercise.name}
                    </p>
                    <p className="text-xs mt-0.5">
                      {language === 'ko'
                        ? `세트 ${currentSet}/${targetSets} · 휴식 ${restTime}초`
                        : `Set ${currentSet}/${targetSets} · Rest ${restTime}s`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback */}
            {isActive && (
              <Card>
                <CardContent className="p-4">
                  <FeedbackDisplay
                    feedback={feedback}
                    accuracy={accuracy}
                    aiFeedback={classifierReady ? aiFeedback : null}
                    aiValidation={classifierReady ? aiValidation : null}
                  />
                  {classifierError && (
                    <p className="mt-2 text-xs text-text-secondary">
                      AI: {classifierError}
                    </p>
                  )}
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
                {currentReps + (currentSet - 1) * targetReps}
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
