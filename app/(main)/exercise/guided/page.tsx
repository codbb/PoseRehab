'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Trophy,
  Clock,
  Target,
  Flame,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  CheckCircle2,
  Circle,
  Wind,
} from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/use-translation'
import { useExerciseStore } from '@/stores/exercise-store'
import { useUserStore } from '@/stores/user-store'
import { EXERCISES } from '@/lib/constants'
import { formatTime, cn } from '@/lib/utils'

type SessionState = 'ready' | 'countdown' | 'exercise' | 'rest' | 'complete'

function GuidedWorkoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, language } = useTranslation()

  const exerciseId = searchParams.get('id') || 'chin_tuck'
  const exercise = EXERCISES.find((e) => e.id === exerciseId) || EXERCISES.find((e) => e.exerciseType === 'guided') || EXERCISES[0]

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('ready')
  const [currentRep, setCurrentRep] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [currentStep, setCurrentStep] = useState(0)
  const [holdTimer, setHoldTimer] = useState(0)
  const [restTimer, setRestTimer] = useState(0)
  const [countdownTimer, setCountdownTimer] = useState(3)
  const [totalElapsedTime, setTotalElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const { startSession, endSession } = useExerciseStore()
  const { addExperience, addBadge } = useUserStore()

  const holdDuration = exercise.holdDuration || 10
  const restDuration = exercise.restBetweenSets || 30
  const targetReps = exercise.defaultReps
  const targetSets = exercise.defaultSets
  const instructions = language === 'ko' ? exercise.instructionsKo : exercise.instructions
  const benefits = language === 'ko' ? exercise.benefitsKo : exercise.benefits
  const precautions = language === 'ko' ? exercise.precautionsKo : exercise.precautions
  const breathingTip = language === 'ko' ? exercise.breathingTipKo : exercise.breathingTip

  // 사운드 재생
  const playSound = useCallback((type: 'beep' | 'complete' | 'rest') => {
    if (isMuted) return
    // 간단한 비프음 (실제 구현에서는 오디오 파일 사용)
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = type === 'complete' ? 880 : type === 'rest' ? 440 : 660
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      oscillator.stop(audioContext.currentTime + (type === 'complete' ? 0.3 : 0.15))
    } catch {
      // Audio not supported
    }
  }, [isMuted])

  // 타이머 로직
  useEffect(() => {
    if (isPaused) return

    if (sessionState === 'countdown') {
      timerRef.current = setInterval(() => {
        setCountdownTimer((prev) => {
          if (prev <= 1) {
            playSound('beep')
            setSessionState('exercise')
            setHoldTimer(holdDuration)
            return 3
          }
          playSound('beep')
          return prev - 1
        })
      }, 1000)
    } else if (sessionState === 'exercise') {
      timerRef.current = setInterval(() => {
        setTotalElapsedTime((t) => t + 1)
        setHoldTimer((prev) => {
          if (prev <= 1) {
            // 홀드 완료 - 1회 완료
            playSound('complete')
            setCurrentRep((r) => {
              const newRep = r + 1
              if (newRep >= targetReps) {
                // 세트 완료
                if (currentSet >= targetSets) {
                  // 운동 완료
                  setSessionState('complete')
                  return newRep
                } else {
                  // 휴식 시간
                  setSessionState('rest')
                  setRestTimer(restDuration)
                  return 0
                }
              }
              // 다음 반복
              return newRep
            })
            return holdDuration
          }
          return prev - 1
        })
      }, 1000)
    } else if (sessionState === 'rest') {
      timerRef.current = setInterval(() => {
        setTotalElapsedTime((t) => t + 1)
        setRestTimer((prev) => {
          if (prev <= 1) {
            // 휴식 완료 - 다음 세트
            playSound('beep')
            setCurrentSet((s) => s + 1)
            setSessionState('countdown')
            setCountdownTimer(3)
            return restDuration
          }
          if (prev === 4) {
            playSound('beep')
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [sessionState, isPaused, holdDuration, restDuration, targetReps, targetSets, currentSet, playSound])

  // 세션 완료 처리
  useEffect(() => {
    if (sessionState === 'complete') {
      const record = endSession()
      if (record) {
        const exp = 50 + (targetReps * targetSets * 2)
        addExperience(exp)

        if (record.reps >= 50) {
          addBadge('fifty_reps')
        }
      }
      setShowResult(true)
    }
  }, [sessionState, endSession, addExperience, addBadge, targetReps, targetSets])

  const handleStart = () => {
    startSession(exercise)
    setSessionState('countdown')
    setCountdownTimer(3)
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleReset = () => {
    setSessionState('ready')
    setCurrentRep(0)
    setCurrentSet(1)
    setCurrentStep(0)
    setHoldTimer(0)
    setRestTimer(0)
    setTotalElapsedTime(0)
    setIsPaused(false)
    setShowResult(false)
  }

  const handleComplete = useCallback(() => {
    setSessionState('complete')
  }, [])

  const handleExit = () => {
    router.push('/exercise/list')
  }

  const totalCompletedReps = (currentSet - 1) * targetReps + currentRep
  const caloriesBurned = Math.round(totalCompletedReps * exercise.caloriesPerRep)
  const progress = (totalCompletedReps / (targetReps * targetSets)) * 100

  return (
    <MainLayout title={language === 'ko' ? exercise.nameKo : exercise.name}>
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Timer/Status Display */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {/* Ready State */}
                    {sessionState === 'ready' && (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center p-8"
                      >
                        <h2 className="text-2xl font-bold text-text-primary mb-4">
                          {language === 'ko' ? exercise.nameKo : exercise.name}
                        </h2>
                        <p className="text-text-secondary mb-6">
                          {language === 'ko' ? exercise.descriptionKo : exercise.description}
                        </p>
                        <div className="flex justify-center gap-4 mb-6 text-sm text-text-secondary">
                          <span>{targetReps} {t('exercise.list.reps')} × {targetSets} {t('exercise.list.sets')}</span>
                          <span>|</span>
                          <span>{holdDuration}s {t('exercise.guided.hold')}</span>
                        </div>
                        <Button onClick={handleStart} size="lg" className="px-8">
                          <Play className="mr-2 h-5 w-5" />
                          {t('common.start')}
                        </Button>
                      </motion.div>
                    )}

                    {/* Countdown State */}
                    {sessionState === 'countdown' && (
                      <motion.div
                        key="countdown"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="text-center"
                      >
                        <p className="text-lg text-text-secondary mb-2">
                          {t('exercise.guided.getReady')}
                        </p>
                        <motion.span
                          key={countdownTimer}
                          initial={{ scale: 1.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-8xl font-bold text-primary"
                        >
                          {countdownTimer}
                        </motion.span>
                      </motion.div>
                    )}

                    {/* Exercise State */}
                    {sessionState === 'exercise' && (
                      <motion.div
                        key="exercise"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center w-full"
                      >
                        {/* Progress Ring */}
                        <div className="relative inline-flex items-center justify-center mb-4">
                          <svg className="w-48 h-48 transform -rotate-90">
                            <circle
                              cx="96"
                              cy="96"
                              r="88"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-border"
                            />
                            <motion.circle
                              cx="96"
                              cy="96"
                              r="88"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeLinecap="round"
                              className="text-primary"
                              initial={{ pathLength: 1 }}
                              animate={{ pathLength: holdTimer / holdDuration }}
                              transition={{ duration: 0.5 }}
                              style={{
                                strokeDasharray: 553,
                                strokeDashoffset: 553 * (1 - holdTimer / holdDuration),
                              }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-bold text-primary">
                              {holdTimer}
                            </span>
                            <span className="text-sm text-text-secondary mt-1">
                              {t('exercise.guided.secondsLeft')}
                            </span>
                          </div>
                        </div>

                        <p className="text-xl font-semibold text-text-primary">
                          {t('exercise.guided.holdPosition')}
                        </p>

                        {breathingTip && (
                          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-secondary">
                            <Wind className="h-4 w-4" />
                            <span>{breathingTip}</span>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Rest State */}
                    {sessionState === 'rest' && (
                      <motion.div
                        key="rest"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <p className="text-lg text-text-secondary mb-4">
                          {t('exercise.guided.restTime')}
                        </p>
                        <span className="text-7xl font-bold text-secondary">
                          {restTimer}
                        </span>
                        <p className="text-sm text-text-secondary mt-4">
                          {t('exercise.guided.nextSet')}: {currentSet + 1} / {targetSets}
                        </p>
                      </motion.div>
                    )}

                    {/* Complete State (before modal) */}
                    {sessionState === 'complete' && !showResult && (
                      <motion.div
                        key="complete"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                      >
                        <Trophy className="h-16 w-16 text-warning mx-auto mb-4" />
                        <p className="text-2xl font-bold text-text-primary">
                          {t('exercise.guided.completed')}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pause Overlay */}
                  {isPaused && sessionState !== 'ready' && sessionState !== 'complete' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Pause className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-xl font-semibold">{t('common.paused')}</p>
                      </div>
                    </div>
                  )}

                  {/* Total Time */}
                  {sessionState !== 'ready' && (
                    <div className="absolute top-4 left-4 bg-black/50 text-white rounded-lg px-3 py-2 text-sm">
                      <Clock className="inline h-4 w-4 mr-1" />
                      {formatTime(totalElapsedTime)}
                    </div>
                  )}

                  {/* Mute Button */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute top-4 right-4 bg-black/50 text-white rounded-lg p-2 hover:bg-black/70 transition-colors"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            {sessionState !== 'ready' && sessionState !== 'complete' && (
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
                <Button variant="destructive" onClick={handleComplete}>
                  <X className="mr-2 h-4 w-4" />
                  {t('common.complete')}
                </Button>
              </div>
            )}

            {/* Progress Bar */}
            {sessionState !== 'ready' && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-text-secondary">{t('exercise.guided.progress')}</span>
                    <span className="font-medium text-text-primary">
                      {totalCompletedReps} / {targetReps * targetSets} {t('exercise.list.reps')}
                    </span>
                  </div>
                  <div className="h-3 bg-background rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-text-secondary">
                    <span>{t('exercise.guided.set')} {currentSet}/{targetSets}</span>
                    <span>{t('exercise.guided.rep')} {currentRep}/{targetReps}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Instructions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {t('exercise.session.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {instructions.map((instruction, index) => (
                    <li
                      key={index}
                      className={cn(
                        'flex gap-3 text-sm transition-colors',
                        currentStep === index && sessionState === 'exercise'
                          ? 'text-primary font-medium'
                          : 'text-text-secondary'
                      )}
                    >
                      {currentStep > index && sessionState === 'exercise' ? (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-secondary" />
                      ) : (
                        <Circle className={cn(
                          'h-5 w-5 flex-shrink-0',
                          currentStep === index && sessionState === 'exercise'
                            ? 'text-primary'
                            : 'text-border'
                        )} />
                      )}
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Benefits */}
            {benefits && benefits.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-secondary">
                    {t('exercise.guided.benefits')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-secondary">•</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Precautions */}
            {precautions && precautions.length > 0 && (
              <Card className="border-warning/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-warning">
                    {t('exercise.guided.precautions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    {precautions.map((precaution, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-warning">⚠</span>
                        {precaution}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

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
                {formatTime(totalElapsedTime)}
              </p>
              <p className="text-sm text-text-secondary">
                {t('exercise.result.totalTime')}
              </p>
            </div>

            <div className="rounded-lg bg-background p-4 text-center">
              <Target className="mx-auto mb-2 h-6 w-6 text-secondary" />
              <p className="text-2xl font-bold text-text-primary">
                {totalCompletedReps}
              </p>
              <p className="text-sm text-text-secondary">
                {t('exercise.result.completedReps')}
              </p>
            </div>

            <div className="rounded-lg bg-background p-4 text-center">
              <div className="mx-auto mb-2 text-xl text-warning">🔥</div>
              <p className="text-2xl font-bold text-text-primary">
                {targetSets}
              </p>
              <p className="text-sm text-text-secondary">
                {t('exercise.guided.completedSets')}
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

export default function GuidedWorkoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <GuidedWorkoutContent />
    </Suspense>
  )
}
