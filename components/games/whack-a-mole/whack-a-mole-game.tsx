'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Zap } from 'lucide-react'
import { useCamera } from '@/hooks/use-camera'
import { useHandDetection, HAND_LANDMARKS, type HandResult } from '@/hooks/use-hand-detection'
import { CameraView } from '@/components/posture/camera-view'
import { HandOverlay } from '@/components/hand-rehab/hand-overlay'
import { FpsCounter } from '@/components/games/fps-counter'
import { Countdown, GameResultModal } from '@/components/games/common'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty, WhackAMoleResult } from '@/types/game'
import {
  generateMole,
  calculateResult,
  calculateAccuracy,
  WHACK_A_MOLE_DIFFICULTY_CONFIG,
  MOLE_SCORES,
  type MoleState,
} from '@/lib/games/whack-a-mole'

interface WhackAMoleGameProps {
  difficulty: GameDifficulty
  onBack: () => void
}

const GRID_SIZE = 3
const HIT_DISTANCE_THRESHOLD = 0.15 // How close finger needs to be to hit a mole

export function WhackAMoleGame({ difficulty, onBack }: WhackAMoleGameProps) {
  const { language } = useTranslation()
  const { addScore, getHighScore } = useGameStore()
  const config = WHACK_A_MOLE_DIFFICULTY_CONFIG[difficulty]

  // Game state
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'result'>('countdown')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [moles, setMoles] = useState<MoleState[]>([])
  const [timeLeft, setTimeLeft] = useState(config.gameDuration / 1000)
  const [result, setResult] = useState<WhackAMoleResult | null>(null)
  const [hitEffect, setHitEffect] = useState<{ position: number; type: string } | null>(null)

  // Stats tracking
  const statsRef = useRef({
    molesHit: 0,
    totalMoles: 0,
    goldenHits: 0,
    bombsHit: 0,
  })

  // Timing
  const startTimeRef = useRef<number>(0)
  const lastMoleTimeRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)

  // Finger position tracking
  const lastFingerPosRef = useRef<{ x: number; y: number } | null>(null)
  const cooldownRef = useRef<Set<number>>(new Set())

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

  // Get finger tip position (index finger)
  const getFingerPosition = useCallback((hands: HandResult[]): { x: number; y: number } | null => {
    if (hands.length === 0) return null

    // Use the first detected hand's index finger tip
    const hand = hands[0]
    const indexTip = hand.landmarks[HAND_LANDMARKS.INDEX_TIP]

    return {
      x: indexTip.x,
      y: indexTip.y,
    }
  }, [])

  // Check if finger is over a mole
  const checkMoleHit = useCallback(
    (fingerPos: { x: number; y: number }) => {
      if (gameState !== 'playing') return

      const cellWidth = 1 / GRID_SIZE
      const cellHeight = 1 / GRID_SIZE

      for (const mole of moles) {
        if (!mole.isVisible || mole.isHit) continue
        if (cooldownRef.current.has(mole.position)) continue

        // Calculate mole center position
        const col = mole.position % GRID_SIZE
        const row = Math.floor(mole.position / GRID_SIZE)
        const moleCenterX = (col + 0.5) * cellWidth
        const moleCenterY = (row + 0.5) * cellHeight

        // Calculate distance (accounting for camera mirror)
        const mirroredFingerX = 1 - fingerPos.x
        const dx = mirroredFingerX - moleCenterX
        const dy = fingerPos.y - moleCenterY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < HIT_DISTANCE_THRESHOLD) {
          // Hit the mole!
          handleMoleHit(mole)
          // Add cooldown to prevent multiple hits
          cooldownRef.current.add(mole.position)
          setTimeout(() => {
            cooldownRef.current.delete(mole.position)
          }, 300)
          break
        }
      }
    },
    [moles, gameState]
  )

  // Handle mole hit
  const handleMoleHit = useCallback((mole: MoleState) => {
    setMoles((prev) =>
      prev.map((m) => (m.id === mole.id ? { ...m, isHit: true, isVisible: false } : m))
    )

    const points = MOLE_SCORES[mole.type]
    setScore((prev) => Math.max(0, prev + points))

    // Update stats
    if (mole.type === 'bomb') {
      statsRef.current.bombsHit++
      setCombo(0)
      setHitEffect({ position: mole.position, type: 'bomb' })
    } else {
      statsRef.current.molesHit++
      if (mole.type === 'golden') {
        statsRef.current.goldenHits++
      }
      setCombo((prev) => {
        const newCombo = prev + 1
        setMaxCombo((max) => Math.max(max, newCombo))
        return newCombo
      })
      setHitEffect({ position: mole.position, type: mole.type })
    }

    // Clear hit effect after animation
    setTimeout(() => setHitEffect(null), 300)

    // Play sound/haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(mole.type === 'bomb' ? [100, 50, 100] : 50)
    }
  }, [])

  // Process hand detection for hitting
  useEffect(() => {
    if (gameState !== 'playing') return

    const fingerPos = getFingerPosition(hands)
    if (fingerPos) {
      lastFingerPosRef.current = fingerPos
      checkMoleHit(fingerPos)
    }
  }, [hands, gameState, getFingerPosition, checkMoleHit])

  // Game loop
  const startGame = useCallback(() => {
    startTimeRef.current = Date.now()
    lastMoleTimeRef.current = 0
    statsRef.current = { molesHit: 0, totalMoles: 0, goldenHits: 0, bombsHit: 0 }
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setMoles([])
    setGameState('playing')
    setTimeLeft(config.gameDuration / 1000)

    const gameLoop = () => {
      const currentTime = Date.now() - startTimeRef.current
      const remaining = Math.max(0, config.gameDuration - currentTime)
      setTimeLeft(Math.ceil(remaining / 1000))

      // Check game end
      if (remaining <= 0) {
        endGame()
        return
      }

      // Spawn new moles
      if (currentTime - lastMoleTimeRef.current >= config.moleInterval) {
        setMoles((prevMoles) => {
          const visibleMoles = prevMoles.filter((m) => m.isVisible && !m.isHit)
          if (visibleMoles.length < config.maxSimultaneous) {
            const occupiedPositions = visibleMoles.map((m) => m.position)
            const newMole = generateMole(difficulty, currentTime, occupiedPositions)
            if (newMole) {
              statsRef.current.totalMoles++
              return [...prevMoles, newMole]
            }
          }
          return prevMoles
        })
        lastMoleTimeRef.current = currentTime
      }

      // Update mole visibility (hide expired moles)
      setMoles((prevMoles) =>
        prevMoles.map((mole) => {
          if (mole.isVisible && !mole.isHit && currentTime >= mole.hideTime) {
            return { ...mole, isVisible: false }
          }
          return mole
        })
      )

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [difficulty, config])

  const endGame = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    stopDetection()

    const finalResult = calculateResult(
      statsRef.current.molesHit,
      statsRef.current.totalMoles,
      statsRef.current.goldenHits,
      statsRef.current.bombsHit,
      maxCombo,
      score
    )
    setResult(finalResult)
    setGameState('result')

    // Save score
    addScore({
      gameType: 'whack-a-mole',
      score: finalResult.score,
      maxCombo: finalResult.maxCombo,
      accuracy: calculateAccuracy(finalResult),
      difficulty,
      duration: Math.floor(config.gameDuration / 1000),
    })
  }, [maxCombo, score, difficulty, config, addScore, stopDetection])

  const handlePlayAgain = () => {
    setResult(null)
    setGameState('countdown')
  }

  const highScore = getHighScore('whack-a-mole', difficulty)

  // Render mole grid position
  const getMoleStyle = (position: number) => {
    const col = position % GRID_SIZE
    const row = Math.floor(position / GRID_SIZE)
    return {
      left: `${(col * 100) / GRID_SIZE + 100 / GRID_SIZE / 2}%`,
      top: `${(row * 100) / GRID_SIZE + 100 / GRID_SIZE / 2}%`,
    }
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      {/* Countdown */}
      {gameState === 'countdown' && <Countdown from={3} onComplete={startGame} />}

      {/* Game Area */}
      <div className="relative h-full">
        {/* Camera View (background) */}
        <div className="absolute inset-0">
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            isStreaming={isStreaming}
            showGuide={false}
            className="h-full w-full object-cover"
          />
          {/* Hand Overlay */}
          {hands.length > 0 && (
            <div className="absolute inset-0">
              <HandOverlay hands={hands} width={640} height={480} className="h-full w-full" />
            </div>
          )}
        </div>

        {/* Game Overlay */}
        <div className="absolute inset-0 bg-black/30">
          {/* HUD */}
          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            {/* FPS Counter */}
            <FpsCounter showGraph className="rounded bg-black/50 px-2 py-1" />

            {/* Timer */}
            <div className="flex items-center gap-2 rounded-lg bg-black/50 px-4 py-2">
              <Timer className="h-5 w-5 text-white" />
              <span className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-error' : 'text-white'}`}>
                {timeLeft}
              </span>
            </div>

            {/* Score */}
            <div className="rounded-lg bg-black/50 px-4 py-2 text-right">
              <div className="text-2xl font-bold text-white">{score}</div>
              <div className="text-xs text-white/70">SCORE</div>
            </div>
          </div>

          {/* Combo Display */}
          {combo > 0 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="absolute left-1/2 top-20 -translate-x-1/2"
            >
              <div className="flex items-center gap-2 rounded-full bg-warning/90 px-4 py-2">
                <Zap className="h-5 w-5 text-white" />
                <span className="text-xl font-bold text-white">{combo}x COMBO</span>
              </div>
            </motion.div>
          )}

          {/* Mole Grid */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: '80%', height: '60%', maxWidth: '500px', maxHeight: '400px' }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-xl border-2 border-white/20 bg-white/5" />
              ))}
            </div>

            {/* Moles */}
            <AnimatePresence>
              {moles
                .filter((m) => m.isVisible)
                .map((mole) => (
                  <motion.div
                    key={mole.id}
                    initial={{ scale: 0, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, y: 50 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={getMoleStyle(mole.position)}
                  >
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-lg ${
                        mole.type === 'golden'
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                          : mole.type === 'bomb'
                          ? 'bg-gradient-to-br from-gray-700 to-gray-900'
                          : 'bg-gradient-to-br from-amber-600 to-amber-800'
                      }`}
                    >
                      {mole.type === 'bomb' ? '💣' : mole.type === 'golden' ? '⭐' : '🐹'}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            {/* Hit Effects */}
            <AnimatePresence>
              {hitEffect && (
                <motion.div
                  key={`hit-${hitEffect.position}`}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={getMoleStyle(hitEffect.position)}
                >
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold ${
                      hitEffect.type === 'bomb'
                        ? 'bg-error/50 text-error'
                        : hitEffect.type === 'golden'
                        ? 'bg-yellow-500/50 text-yellow-300'
                        : 'bg-secondary/50 text-secondary'
                    }`}
                  >
                    {hitEffect.type === 'bomb'
                      ? '-200'
                      : hitEffect.type === 'golden'
                      ? '+300'
                      : '+100'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-4 py-2">
            <p className="text-center text-sm text-white">
              {language === 'ko'
                ? '검지 손가락으로 두더지를 터치하세요! ⭐는 보너스, 💣는 피하세요!'
                : 'Touch the moles with your index finger! ⭐ for bonus, avoid 💣!'}
            </p>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {result && (
        <GameResultModal
          isOpen={gameState === 'result'}
          gameTitle={language === 'ko' ? 'AI 두더지 잡기' : 'AI Whack-a-Mole'}
          score={result.score}
          highScore={highScore}
          maxCombo={result.maxCombo}
          accuracy={calculateAccuracy(result)}
          duration={Math.floor(config.gameDuration / 1000)}
          extraStats={[
            {
              label: language === 'ko' ? '잡은 두더지' : 'Moles Hit',
              value: result.molesHit,
            },
            {
              label: language === 'ko' ? '골든 두더지' : 'Golden Moles',
              value: result.goldenHits,
            },
            {
              label: language === 'ko' ? '폭탄 터뜨림' : 'Bombs Hit',
              value: result.bombsHit,
            },
          ]}
          onPlayAgain={handlePlayAgain}
          onExit={onBack}
        />
      )}
    </div>
  )
}
