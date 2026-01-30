'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  Hand,
  ChevronRight,
  Clock,
  Target,
  CheckCircle,
  Volume2,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CameraView } from '@/components/posture/camera-view'
import { HandOverlay } from '@/components/hand-rehab/hand-overlay'
import { useTranslation } from '@/hooks/use-translation'
import { useCamera } from '@/hooks/use-camera'
import {
  useHandDetection,
  isHandOpen,
  isHandClosed,
  isFingersSpread,
  getThumbToFingerTouching,
  type HandResult,
} from '@/hooks/use-hand-detection'
import { HAND_EXERCISES } from '@/lib/constants'
import { formatTime, cn } from '@/lib/utils'

type ExercisePhase = 'idle' | 'open' | 'closed' | 'spread' | 'touching' | 'hold'
type SessionState = 'idle' | 'active' | 'paused' | 'completed'

interface HandExercise {
  id: string
  name: string
  nameKo: string
  description: string
  descriptionKo: string
  defaultReps: number
  defaultSets: number
  guide: string[]
  guideKo: string[]
}

export default function HandRehabPage() {
  const { t, language } = useTranslation()
  const [selectedExercise, setSelectedExercise] = useState<HandExercise | null>(null)
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [currentReps, setCurrentReps] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [phase, setPhase] = useState<ExercisePhase>('idle')
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })
  const [touchingFinger, setTouchingFinger] = useState<number | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const completionSoundRef = useRef<HTMLAudioElement | null>(null)

  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useCamera({ width: 640, height: 480 })

  const { hands, startDetection, stopDetection } = useHandDetection()

  // 완료 효과음 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      completionSoundRef.current = new Audio('/sounds/complete.mp3')
      completionSoundRef.current.volume = 0.5
    }
  }, [])

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

  // Start hand detection when camera is streaming
  useEffect(() => {
    if (isStreaming && videoRef.current && sessionState === 'active') {
      startDetection(videoRef.current)
    } else {
      stopDetection()
    }
    return () => stopDetection()
  }, [isStreaming, sessionState, videoRef, startDetection, stopDetection])

  // Timer
  useEffect(() => {
    if (sessionState === 'active') {
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
  }, [sessionState])

  // 완료 처리
  const handleExerciseComplete = useCallback(() => {
    setSessionState('completed')
    stopDetection()

    // 완료 효과음 재생
    if (completionSoundRef.current) {
      completionSoundRef.current.play().catch(() => {})
    }

    // 진동 피드백 (지원되는 경우)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
  }, [stopDetection])

  // Process hand detection for exercise counting
  useEffect(() => {
    if (sessionState !== 'active' || hands.length === 0 || !selectedExercise) return

    // 이미 목표 횟수에 도달했으면 처리하지 않음
    if (currentReps >= selectedExercise.defaultReps) {
      handleExerciseComplete()
      return
    }

    const hand = hands[0]

    if (selectedExercise.id === 'finger_flexion' || selectedExercise.id === 'tendon_glide') {
      // Finger Flexion/Extension & Tendon Glide - detect open/close cycle
      if (isHandOpen(hand.landmarks)) {
        if (phase === 'closed') {
          const newReps = currentReps + 1
          setCurrentReps(newReps)
          if (newReps >= selectedExercise.defaultReps) {
            handleExerciseComplete()
            return
          }
        }
        setPhase('open')
      } else if (isHandClosed(hand.landmarks)) {
        setPhase('closed')
      }
    } else if (selectedExercise.id === 'finger_spread') {
      // Finger Spread - detect spread/close cycle
      if (isFingersSpread(hand.landmarks) && isHandOpen(hand.landmarks)) {
        if (phase === 'closed') {
          const newReps = currentReps + 1
          setCurrentReps(newReps)
          if (newReps >= selectedExercise.defaultReps) {
            handleExerciseComplete()
            return
          }
        }
        setPhase('spread')
      } else if (!isFingersSpread(hand.landmarks)) {
        setPhase('closed')
      }
    } else if (selectedExercise.id === 'thumb_touch') {
      // Thumb-to-Finger Touch
      const touching = getThumbToFingerTouching(hand.landmarks)
      if (touching !== null && touching !== touchingFinger) {
        setTouchingFinger(touching)
        if (touching === 4) {
          // Completed cycle (touched all fingers)
          const newReps = currentReps + 1
          setCurrentReps(newReps)
          if (newReps >= selectedExercise.defaultReps) {
            handleExerciseComplete()
            return
          }
        }
        setPhase('touching')
      } else if (touching === null && touchingFinger !== null) {
        if (touchingFinger === 1) {
          setTouchingFinger(null)
        }
      }
    } else if (selectedExercise.id === 'grip_squeeze') {
      // Grip Squeeze - hold fist
      if (isHandClosed(hand.landmarks)) {
        if (phase !== 'hold') {
          setPhase('hold')
          holdTimerRef.current = setTimeout(() => {
            const newReps = currentReps + 1
            setCurrentReps(newReps)
            setPhase('idle')
            if (newReps >= selectedExercise.defaultReps) {
              handleExerciseComplete()
            }
          }, 3000)
        }
      } else {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current)
          holdTimerRef.current = null
        }
        setPhase('idle')
      }
    } else if (selectedExercise.id === 'wrist_rotation') {
      // Wrist Rotation - simplified detection based on hand position changes
      // For now, count based on open/close cycles as proxy
      if (isHandClosed(hand.landmarks)) {
        if (phase === 'open') {
          const newReps = currentReps + 1
          setCurrentReps(newReps)
          if (newReps >= selectedExercise.defaultReps) {
            handleExerciseComplete()
            return
          }
        }
        setPhase('closed')
      } else if (isHandOpen(hand.landmarks)) {
        setPhase('open')
      }
    }
  }, [hands, sessionState, selectedExercise, phase, touchingFinger, currentReps, handleExerciseComplete])

  const handleSelectExercise = (exercise: HandExercise) => {
    setSelectedExercise(exercise)
    setCurrentExerciseIndex(HAND_EXERCISES.findIndex(e => e.id === exercise.id))
  }

  const handleStart = async () => {
    await startCamera()
    setSessionState('active')
    setCurrentReps(0)
    setElapsedTime(0)
    setPhase('idle')
    setTouchingFinger(null)
  }

  const handlePause = () => {
    if (sessionState === 'active') {
      setSessionState('paused')
    } else if (sessionState === 'paused') {
      setSessionState('active')
    }
  }

  const handleReset = () => {
    setCurrentReps(0)
    setElapsedTime(0)
    setPhase('idle')
    setTouchingFinger(null)
    if (sessionState === 'completed') {
      setSessionState('active')
    }
  }

  const handleBack = () => {
    setSessionState('idle')
    setSelectedExercise(null)
    stopDetection()
    stopCamera()
  }

  const handleNextExercise = () => {
    const nextIndex = currentExerciseIndex + 1
    if (nextIndex < HAND_EXERCISES.length) {
      setSelectedExercise(HAND_EXERCISES[nextIndex] as HandExercise)
      setCurrentExerciseIndex(nextIndex)
      setCurrentReps(0)
      setElapsedTime(0)
      setPhase('idle')
      setTouchingFinger(null)
      setSessionState('active')
    } else {
      // 모든 운동 완료 - 목록으로 돌아가기
      handleBack()
    }
  }

  const getPhaseText = () => {
    if (!selectedExercise) return ''

    if (selectedExercise.id === 'finger_flexion' || selectedExercise.id === 'tendon_glide') {
      const guide = language === 'ko' ? selectedExercise.guideKo : selectedExercise.guide
      return phase === 'open' ? guide[0] : phase === 'closed' ? guide[1] : guide[0]
    }
    if (selectedExercise.id === 'thumb_touch') {
      if (touchingFinger !== null) {
        const fingerNames = language === 'ko'
          ? ['', '검지', '중지', '약지', '소지']
          : ['', 'Index', 'Middle', 'Ring', 'Pinky']
        return `${language === 'ko' ? '터치됨' : 'Touched'}: ${fingerNames[touchingFinger]}`
      }
      return language === 'ko' ? '엄지로 검지를 터치하세요' : 'Touch index finger with thumb'
    }
    if (selectedExercise.id === 'grip_squeeze') {
      const guide = language === 'ko' ? selectedExercise.guideKo : selectedExercise.guide
      return phase === 'hold' ? guide[2] : guide[1]
    }
    if (selectedExercise.id === 'finger_spread') {
      const guide = language === 'ko' ? selectedExercise.guideKo : selectedExercise.guide
      return phase === 'spread' ? guide[1] : guide[0]
    }
    if (selectedExercise.id === 'wrist_rotation') {
      const guide = language === 'ko' ? selectedExercise.guideKo : selectedExercise.guide
      return phase === 'closed' ? guide[1] : guide[0]
    }
    return ''
  }

  const isCompleted = sessionState === 'completed'
  const isActive = sessionState === 'active'
  const isPaused = sessionState === 'paused'

  return (
    <MainLayout title={t('handRehab.title')}>
      <AnimatePresence mode="wait">
        {!selectedExercise ? (
          // Exercise Selection
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {HAND_EXERCISES.map((exercise, index) => (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleSelectExercise(exercise as HandExercise)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Hand className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">
                          {language === 'ko' ? exercise.nameKo : exercise.name}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {exercise.defaultReps} {t('exercise.list.reps')} x {exercise.defaultSets} {t('exercise.list.sets')}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-secondary" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // Exercise Session
          <motion.div
            key="session"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Camera View */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative">
                    <CameraView
                      videoRef={videoRef}
                      canvasRef={canvasRef}
                      isStreaming={isStreaming}
                      showGuide={false}
                      className="aspect-video w-full"
                    >
                      {/* Hand Overlay - 손 랜드마크 표시 */}
                      {isStreaming && hands.length > 0 && (
                        <HandOverlay
                          hands={hands}
                          width={videoDimensions.width}
                          height={videoDimensions.height}
                          className="absolute inset-0 h-full w-full"
                          showConnections={true}
                          showLabels={true}
                        />
                      )}

                      {/* Hand detection indicator */}
                      {isStreaming && hands.length > 0 && (
                        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-secondary/20 px-3 py-2">
                          <Hand className="h-4 w-4 text-secondary" />
                          <span className="text-sm font-medium text-secondary">
                            {hands.length} {hands.length === 1 ? 'hand' : 'hands'}
                          </span>
                        </div>
                      )}

                      {/* Not started overlay */}
                      {sessionState === 'idle' && !isStreaming && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface">
                          <div className="text-center">
                            <Hand className="mx-auto mb-4 h-16 w-16 text-primary" />
                            <h3 className="text-xl font-semibold text-text-primary">
                              {language === 'ko' ? selectedExercise.nameKo : selectedExercise.name}
                            </h3>
                            <p className="mt-2 text-text-secondary">
                              {language === 'ko' ? selectedExercise.descriptionKo : selectedExercise.description}
                            </p>
                            <Button onClick={handleStart} size="lg" className="mt-6">
                              <Play className="mr-2 h-5 w-5" />
                              {t('common.start')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Completed overlay */}
                      {isCompleted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-center"
                          >
                            <CheckCircle className="mx-auto mb-4 h-20 w-20 text-secondary" />
                            <h3 className="text-2xl font-bold text-white">
                              {language === 'ko' ? '운동 완료!' : 'Exercise Complete!'}
                            </h3>
                            <p className="mt-2 text-white/80">
                              {language === 'ko'
                                ? `${selectedExercise.defaultReps}회 완료`
                                : `${selectedExercise.defaultReps} reps completed`}
                            </p>
                            <p className="text-white/60">
                              {language === 'ko' ? '소요 시간' : 'Time'}: {formatTime(elapsedTime)}
                            </p>
                          </motion.div>
                        </div>
                      )}

                      {/* Timer */}
                      {(isActive || isPaused) && (
                        <div className="absolute left-4 top-4 rounded-lg bg-black/50 px-3 py-2 text-white">
                          <Clock className="mr-2 inline h-4 w-4" />
                          {formatTime(elapsedTime)}
                        </div>
                      )}

                      {/* Paused overlay */}
                      {isPaused && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-center text-white">
                            <Pause className="mx-auto mb-2 h-12 w-12" />
                            <p className="text-xl font-semibold">
                              {language === 'ko' ? '일시정지' : 'Paused'}
                            </p>
                          </div>
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
                  {(isActive || isPaused) && (
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
                      <Button variant="outline" onClick={handleBack}>
                        {t('common.back')}
                      </Button>
                    </div>
                  )}

                  {/* Completed Controls */}
                  {isCompleted && (
                    <div className="flex justify-center gap-4">
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {language === 'ko' ? '다시 하기' : 'Do Again'}
                      </Button>
                      {currentExerciseIndex < HAND_EXERCISES.length - 1 ? (
                        <Button onClick={handleNextExercise}>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          {language === 'ko' ? '다음 운동' : 'Next Exercise'}
                        </Button>
                      ) : (
                        <Button onClick={handleBack}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {language === 'ko' ? '완료' : 'Finish'}
                        </Button>
                      )}
                    </div>
                  )}

                  {sessionState === 'idle' && (
                    <div className="flex justify-center">
                      <Button variant="outline" onClick={handleBack}>
                        {t('common.back')}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Side Panel */}
                <div className="space-y-4">
                  {/* Rep Counter */}
                  <Card className={isCompleted ? 'border-secondary' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center gap-4">
                        <motion.div
                          key={currentReps}
                          initial={{ scale: 1.2, opacity: 0.5 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "text-6xl font-bold",
                            isCompleted ? "text-secondary" : "text-primary"
                          )}
                        >
                          {Math.min(currentReps, selectedExercise.defaultReps)}
                        </motion.div>
                        <div className="text-2xl text-text-secondary">/</div>
                        <div className="text-3xl font-medium text-text-secondary">
                          {selectedExercise.defaultReps}
                        </div>
                      </div>
                      <p className="mt-2 text-center text-sm text-text-secondary">
                        {isCompleted
                          ? (language === 'ko' ? '완료!' : 'Complete!')
                          : t('exercise.session.repsCompleted')}
                      </p>
                      <Progress
                        value={Math.min((currentReps / selectedExercise.defaultReps) * 100, 100)}
                        className="mt-4"
                      />
                    </CardContent>
                  </Card>

                  {/* Current Phase Guide */}
                  {(isActive || isPaused) && !isCompleted && (
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Target className="mx-auto mb-2 h-8 w-8 text-primary" />
                          <p className="font-medium text-text-primary">
                            {getPhaseText()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Guide - 운동별 맞춤 설명 */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {language === 'ko' ? '운동 가이드' : 'Exercise Guide'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-text-secondary">
                        {(language === 'ko' ? selectedExercise.guideKo : selectedExercise.guide).map(
                          (step, index) => (
                            <li key={index} className="flex gap-2">
                              <span className="font-medium text-primary">{index + 1}.</span>
                              {step}
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  )
}
