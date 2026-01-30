'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hand } from 'lucide-react'
import { useCamera } from '@/hooks/use-camera'
import { useHandDetection, isHandClosed, type HandResult } from '@/hooks/use-hand-detection'
import { CameraView } from '@/components/posture/camera-view'
import { Countdown, GameResultModal } from '@/components/games/common'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty, RhythmGripResult } from '@/types/game'
import {
  generateNotes,
  getJudgment,
  getScore,
  calculateResult,
  calculateAccuracy,
  RHYTHM_DIFFICULTY_CONFIG,
  TIMING_WINDOWS,
  type JudgmentType,
  type NoteWithState,
} from '@/lib/games/rhythm-grip'

interface RhythmGameProps {
  difficulty: GameDifficulty
  onBack: () => void
}

export function RhythmGame({ difficulty, onBack }: RhythmGameProps) {
  const { language } = useTranslation()
  const { addScore, getHighScore } = useGameStore()
  const config = RHYTHM_DIFFICULTY_CONFIG[difficulty]

  // Game state
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'result'>('countdown')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [notes, setNotes] = useState<NoteWithState[]>([])
  const [judgments, setJudgments] = useState<{ type: JudgmentType }[]>([])
  const [currentJudgment, setCurrentJudgment] = useState<JudgmentType | null>(null)
  const [result, setResult] = useState<RhythmGripResult | null>(null)

  // Hand state
  const [leftHandClosed, setLeftHandClosed] = useState(false)
  const [rightHandClosed, setRightHandClosed] = useState(false)
  const prevLeftClosed = useRef(false)
  const prevRightClosed = useRef(false)

  // Timing
  const startTimeRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)

  // Camera and hand detection
  const { videoRef, canvasRef, isStreaming, startCamera, stopCamera } = useCamera({
    width: 640,
    height: 480,
  })
  const { hands, startDetection, stopDetection } = useHandDetection()

  // Initialize game
  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      stopDetection()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Start detection when streaming
  useEffect(() => {
    if (isStreaming && videoRef.current && gameState === 'playing') {
      startDetection(videoRef.current)
    } else {
      stopDetection()
    }
  }, [isStreaming, gameState])

  // Process hand detection
  useEffect(() => {
    if (hands.length === 0) {
      setLeftHandClosed(false)
      setRightHandClosed(false)
      return
    }

    for (const hand of hands) {
      const closed = isHandClosed(hand.landmarks)
      // MediaPipe returns mirrored handedness
      if (hand.handedness === 'Right') {
        setLeftHandClosed(closed)
      } else {
        setRightHandClosed(closed)
      }
    }
  }, [hands])

  // Handle hand grip for note hitting
  useEffect(() => {
    if (gameState !== 'playing') return

    const currentTime = Date.now() - startTimeRef.current

    // Check for new grip (transition from open to closed)
    if (leftHandClosed && !prevLeftClosed.current) {
      handleGrip('left', currentTime)
    }
    if (rightHandClosed && !prevRightClosed.current) {
      handleGrip('right', currentTime)
    }

    prevLeftClosed.current = leftHandClosed
    prevRightClosed.current = rightHandClosed
  }, [leftHandClosed, rightHandClosed, gameState])

  const handleGrip = useCallback(
    (lane: 'left' | 'right', currentTime: number) => {
      setNotes((prevNotes) => {
        const updatedNotes = [...prevNotes]
        let hitNote: NoteWithState | null = null
        let bestDiff = Infinity

        // Find the closest unhit note in this lane
        for (const note of updatedNotes) {
          if (note.lane === lane && note.active && !note.hit) {
            const diff = Math.abs(currentTime - note.timing)
            if (diff < bestDiff && diff <= TIMING_WINDOWS.good + 50) {
              bestDiff = diff
              hitNote = note
            }
          }
        }

        if (hitNote) {
          const judgment = getJudgment(bestDiff)
          hitNote.hit = true
          hitNote.judgment = judgment

          // Update score and combo
          const noteScore = getScore(judgment)
          setScore((prev) => prev + noteScore)

          if (judgment !== 'miss') {
            setCombo((prev) => {
              const newCombo = prev + 1
              setMaxCombo((max) => Math.max(max, newCombo))
              // Combo bonus
              setScore((s) => s + Math.floor(newCombo / 10) * 10)
              return newCombo
            })
          } else {
            setCombo(0)
          }

          setJudgments((prev) => [...prev, { type: judgment }])
          showJudgment(judgment)
        }

        return updatedNotes
      })
    },
    []
  )

  const showJudgment = (judgment: JudgmentType) => {
    setCurrentJudgment(judgment)
    setTimeout(() => setCurrentJudgment(null), 300)
  }

  // Game loop
  const startGame = useCallback(() => {
    const generatedNotes = generateNotes(difficulty)
    const notesWithState: NoteWithState[] = generatedNotes.map((note) => ({
      ...note,
      y: -10,
      active: false,
      hit: false,
    }))

    setNotes(notesWithState)
    startTimeRef.current = Date.now()
    setGameState('playing')

    const gameLoop = () => {
      const currentTime = Date.now() - startTimeRef.current

      // Check game end
      if (currentTime >= config.gameDuration) {
        endGame()
        return
      }

      setNotes((prevNotes) => {
        return prevNotes.map((note) => {
          // Calculate note position
          const timeSinceSpawn = currentTime - (note.timing - config.noteSpeed)
          const progress = timeSinceSpawn / config.noteSpeed

          // Activate note when it should appear
          if (!note.active && progress >= 0) {
            note.active = true
          }

          // Mark as miss if passed without hit
          if (!note.hit && progress > 1.1) {
            note.hit = true
            note.judgment = 'miss'
            setCombo(0)
            setJudgments((prev) => [...prev, { type: 'miss' }])
          }

          return {
            ...note,
            y: progress * 100,
          }
        })
      })

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [difficulty, config])

  const endGame = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    stopDetection()

    const finalResult = calculateResult(judgments)
    setResult(finalResult)
    setGameState('result')

    // Save score
    addScore({
      gameType: 'rhythm-grip',
      score: finalResult.score,
      maxCombo: finalResult.maxCombo,
      accuracy: calculateAccuracy(finalResult),
      difficulty,
      duration: Math.floor(config.gameDuration / 1000),
    })
  }, [judgments, difficulty, config, addScore, stopDetection])

  const handlePlayAgain = () => {
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setNotes([])
    setJudgments([])
    setResult(null)
    setGameState('countdown')
  }

  const highScore = getHighScore('rhythm-grip', difficulty)

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      {/* Countdown */}
      {gameState === 'countdown' && (
        <Countdown from={3} onComplete={startGame} />
      )}

      {/* Game Area */}
      <div className="flex h-full">
        {/* Camera View (background) */}
        <div className="absolute inset-0 opacity-30">
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            isStreaming={isStreaming}
            showGuide={false}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Game Lanes */}
        <div className="relative flex flex-1 items-center justify-center gap-8">
          {/* Left Lane */}
          <div className="relative h-[80%] w-32 rounded-lg border-2 border-primary/30 bg-surface/50 backdrop-blur-sm">
            <div className="absolute bottom-8 left-0 right-0 h-1 bg-primary" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-text-secondary">
              {language === 'ko' ? '왼손' : 'Left'}
            </div>

            {/* Hand indicator */}
            <motion.div
              className={`absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full p-3 ${
                leftHandClosed ? 'bg-primary text-white' : 'bg-surface text-text-secondary'
              }`}
              animate={{ scale: leftHandClosed ? 1.2 : 1 }}
            >
              <Hand className="h-6 w-6" />
            </motion.div>

            {/* Notes */}
            <AnimatePresence>
              {notes
                .filter((n) => n.lane === 'left' && n.active && n.y < 110)
                .map((note) => (
                  <motion.div
                    key={note.id}
                    className={`absolute left-1/2 h-8 w-8 -translate-x-1/2 rounded-full ${
                      note.hit
                        ? note.judgment === 'perfect'
                          ? 'bg-secondary'
                          : note.judgment === 'great'
                          ? 'bg-primary'
                          : note.judgment === 'good'
                          ? 'bg-warning'
                          : 'bg-error opacity-50'
                        : 'bg-primary'
                    }`}
                    style={{ top: `${note.y}%` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: note.hit ? 1.5 : 1, opacity: note.hit ? 0 : 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                ))}
            </AnimatePresence>
          </div>

          {/* Center Score Display */}
          <div className="z-10 flex flex-col items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{score}</div>
              <div className="text-sm text-text-secondary">SCORE</div>
            </div>

            {combo > 0 && (
              <motion.div
                key={combo}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <div className={`text-3xl font-bold ${combo >= 10 ? 'text-warning' : 'text-secondary'}`}>
                  {combo}
                </div>
                <div className="text-sm text-text-secondary">COMBO</div>
              </motion.div>
            )}

            {/* Judgment Display */}
            <AnimatePresence>
              {currentJudgment && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  className={`text-2xl font-bold ${
                    currentJudgment === 'perfect'
                      ? 'text-secondary'
                      : currentJudgment === 'great'
                      ? 'text-primary'
                      : currentJudgment === 'good'
                      ? 'text-warning'
                      : 'text-error'
                  }`}
                >
                  {currentJudgment.toUpperCase()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Lane */}
          <div className="relative h-[80%] w-32 rounded-lg border-2 border-secondary/30 bg-surface/50 backdrop-blur-sm">
            <div className="absolute bottom-8 left-0 right-0 h-1 bg-secondary" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-text-secondary">
              {language === 'ko' ? '오른손' : 'Right'}
            </div>

            {/* Hand indicator */}
            <motion.div
              className={`absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full p-3 ${
                rightHandClosed ? 'bg-secondary text-white' : 'bg-surface text-text-secondary'
              }`}
              animate={{ scale: rightHandClosed ? 1.2 : 1 }}
            >
              <Hand className="h-6 w-6" />
            </motion.div>

            {/* Notes */}
            <AnimatePresence>
              {notes
                .filter((n) => n.lane === 'right' && n.active && n.y < 110)
                .map((note) => (
                  <motion.div
                    key={note.id}
                    className={`absolute left-1/2 h-8 w-8 -translate-x-1/2 rounded-full ${
                      note.hit
                        ? note.judgment === 'perfect'
                          ? 'bg-secondary'
                          : note.judgment === 'great'
                          ? 'bg-primary'
                          : note.judgment === 'good'
                          ? 'bg-warning'
                          : 'bg-error opacity-50'
                        : 'bg-secondary'
                    }`}
                    style={{ top: `${note.y}%` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: note.hit ? 1.5 : 1, opacity: note.hit ? 0 : 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {result && (
        <GameResultModal
          isOpen={gameState === 'result'}
          gameTitle={language === 'ko' ? '리듬 그립' : 'Rhythm Grip'}
          score={result.score}
          highScore={highScore}
          maxCombo={result.maxCombo}
          accuracy={calculateAccuracy(result)}
          duration={Math.floor(config.gameDuration / 1000)}
          extraStats={[
            {
              label: 'Perfect',
              value: result.perfect,
            },
            {
              label: 'Great',
              value: result.great,
            },
            {
              label: 'Good',
              value: result.good,
            },
            {
              label: 'Miss',
              value: result.miss,
            },
          ]}
          onPlayAgain={handlePlayAgain}
          onExit={onBack}
        />
      )}
    </div>
  )
}
