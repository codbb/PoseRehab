'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Zap, Target } from 'lucide-react'
import { useCamera } from '@/hooks/use-camera'
import { useHandDetection, HAND_LANDMARKS, type HandResult } from '@/hooks/use-hand-detection'
import { CameraView } from '@/components/posture/camera-view'
import { HandOverlay } from '@/components/hand-rehab/hand-overlay'
import { FpsCounter } from '@/components/games/fps-counter'
import { Countdown, GameResultModal } from '@/components/games/common'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty, BubbleShooterResult } from '@/types/game'
import {
  generateBubble,
  updateBubble,
  isBubbleOffScreen,
  checkBubbleHit,
  calculateResult,
  BUBBLE_SHOOTER_DIFFICULTY_CONFIG,
  BUBBLE_SCORES,
  type BubbleState,
} from '@/lib/games/bubble-shooter'

interface BubbleShooterGameProps {
  difficulty: GameDifficulty
  onBack: () => void
}

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 480
const HIT_RADIUS = 40

export function BubbleShooterGame({ difficulty, onBack }: BubbleShooterGameProps) {
  const { language } = useTranslation()
  const { addScore, getHighScore } = useGameStore()
  const config = BUBBLE_SHOOTER_DIFFICULTY_CONFIG[difficulty]

  // Game state
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'result'>('countdown')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [bubbles, setBubbles] = useState<BubbleState[]>([])
  const [timeLeft, setTimeLeft] = useState(config.gameDuration / 1000)
  const [result, setResult] = useState<BubbleShooterResult | null>(null)
  const [popEffects, setPopEffects] = useState<{ id: string; x: number; y: number; color: string }[]>([])
  const [fingerPosition, setFingerPosition] = useState<{ x: number; y: number } | null>(null)

  // Stats tracking
  const statsRef = useRef({
    bubblesPopped: 0,
    shotsFired: 0,
  })

  // Timing
  const startTimeRef = useRef<number>(0)
  const lastBubbleTimeRef = useRef<number>(0)
  const lastComboTimeRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

  // Camera and hand detection
  const { videoRef, canvasRef, isStreaming, startCamera, stopCamera } = useCamera({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
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

    const hand = hands[0]
    const indexTip = hand.landmarks[HAND_LANDMARKS.INDEX_TIP]

    // Convert normalized coordinates to canvas coordinates and mirror
    return {
      x: (1 - indexTip.x) * CANVAS_WIDTH,
      y: indexTip.y * CANVAS_HEIGHT,
    }
  }, [])

  // Check if finger pops any bubbles
  const checkBubblePops = useCallback(
    (fingerPos: { x: number; y: number }) => {
      if (gameState !== 'playing') return

      setBubbles((prevBubbles) => {
        let popped = false
        const updatedBubbles = prevBubbles.map((bubble) => {
          if (bubble.isPopping) return bubble

          if (checkBubbleHit(fingerPos.x, fingerPos.y, bubble, HIT_RADIUS)) {
            popped = true
            statsRef.current.bubblesPopped++
            statsRef.current.shotsFired++

            // Add score
            const currentTime = Date.now()
            const isCombo = currentTime - lastComboTimeRef.current < config.comboTimeWindow
            const points = isCombo ? BUBBLE_SCORES.combo : BUBBLE_SCORES.normal
            setScore((prev) => prev + points)

            // Update combo
            if (isCombo) {
              setCombo((prev) => {
                const newCombo = prev + 1
                setMaxCombo((max) => Math.max(max, newCombo))
                return newCombo
              })
            } else {
              setCombo(1)
              setMaxCombo((max) => Math.max(max, 1))
            }
            lastComboTimeRef.current = currentTime

            // Add pop effect
            setPopEffects((prev) => [
              ...prev,
              { id: bubble.id, x: bubble.x, y: bubble.y, color: bubble.color },
            ])
            setTimeout(() => {
              setPopEffects((prev) => prev.filter((e) => e.id !== bubble.id))
            }, 300)

            // Haptic feedback
            if (navigator.vibrate) {
              navigator.vibrate(30)
            }

            return { ...bubble, isPopping: true }
          }
          return bubble
        })

        return updatedBubbles
      })
    },
    [gameState, config.comboTimeWindow]
  )

  // Process hand detection
  useEffect(() => {
    if (gameState !== 'playing') return

    const fingerPos = getFingerPosition(hands)
    if (fingerPos) {
      setFingerPosition(fingerPos)
      checkBubblePops(fingerPos)
    } else {
      setFingerPosition(null)
    }
  }, [hands, gameState, getFingerPosition, checkBubblePops])

  // Reset combo if too much time passes
  useEffect(() => {
    if (gameState !== 'playing') return

    const comboTimer = setInterval(() => {
      const currentTime = Date.now()
      if (currentTime - lastComboTimeRef.current > config.comboTimeWindow) {
        setCombo(0)
      }
    }, 500)

    return () => clearInterval(comboTimer)
  }, [gameState, config.comboTimeWindow])

  // Game loop
  const startGame = useCallback(() => {
    startTimeRef.current = Date.now()
    lastBubbleTimeRef.current = 0
    lastComboTimeRef.current = 0
    lastFrameTimeRef.current = Date.now()
    statsRef.current = { bubblesPopped: 0, shotsFired: 0 }
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setBubbles([])
    setGameState('playing')
    setTimeLeft(config.gameDuration / 1000)

    const gameLoop = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastFrameTimeRef.current
      lastFrameTimeRef.current = currentTime

      const gameTime = currentTime - startTimeRef.current
      const remaining = Math.max(0, config.gameDuration - gameTime)
      setTimeLeft(Math.ceil(remaining / 1000))

      // Check game end
      if (remaining <= 0) {
        endGame()
        return
      }

      // Spawn new bubbles
      if (gameTime - lastBubbleTimeRef.current >= config.bubbleSpawnInterval) {
        setBubbles((prevBubbles) => {
          const activeBubbles = prevBubbles.filter((b) => !b.isPopping)
          if (activeBubbles.length < config.maxBubbles) {
            const newBubble = generateBubble(difficulty, CANVAS_WIDTH, CANVAS_HEIGHT, gameTime)
            return [...prevBubbles, newBubble]
          }
          return prevBubbles
        })
        lastBubbleTimeRef.current = gameTime
      }

      // Update bubble positions and remove off-screen/popped bubbles
      setBubbles((prevBubbles) => {
        return prevBubbles
          .map((bubble) => updateBubble(bubble, deltaTime / 16.67)) // Normalize to 60fps
          .filter((bubble) => {
            if (bubble.isPopping) return false
            return !isBubbleOffScreen(bubble, CANVAS_WIDTH, CANVAS_HEIGHT)
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

    const finalResult = calculateResult(
      statsRef.current.bubblesPopped,
      statsRef.current.shotsFired,
      maxCombo,
      score
    )
    setResult(finalResult)
    setGameState('result')

    // Save score
    addScore({
      gameType: 'bubble-shooter',
      score: finalResult.score,
      maxCombo: finalResult.maxCombo,
      accuracy: finalResult.accuracy,
      difficulty,
      duration: Math.floor(config.gameDuration / 1000),
    })
  }, [maxCombo, score, difficulty, config, addScore, stopDetection])

  const handlePlayAgain = () => {
    setResult(null)
    setGameState('countdown')
  }

  const highScore = getHighScore('bubble-shooter', difficulty)

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
              <HandOverlay hands={hands} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="h-full w-full" />
            </div>
          )}
        </div>

        {/* Game Overlay */}
        <div className="absolute inset-0">
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
          {combo > 1 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="absolute left-1/2 top-20 -translate-x-1/2"
            >
              <div className="flex items-center gap-2 rounded-full bg-primary/90 px-4 py-2">
                <Zap className="h-5 w-5 text-white" />
                <span className="text-xl font-bold text-white">{combo}x COMBO</span>
              </div>
            </motion.div>
          )}

          {/* Bubbles */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ transform: 'scaleX(-1)' }}>
            <AnimatePresence>
              {bubbles
                .filter((b) => !b.isPopping)
                .map((bubble) => (
                  <motion.g key={bubble.id}>
                    {/* Bubble shadow */}
                    <circle
                      cx={bubble.x}
                      cy={bubble.y + 5}
                      r={bubble.radius}
                      fill="rgba(0,0,0,0.2)"
                    />
                    {/* Main bubble */}
                    <motion.circle
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      cx={bubble.x}
                      cy={bubble.y}
                      r={bubble.radius}
                      fill={bubble.color}
                      opacity={0.9}
                    />
                    {/* Bubble highlight */}
                    <circle
                      cx={bubble.x - bubble.radius * 0.3}
                      cy={bubble.y - bubble.radius * 0.3}
                      r={bubble.radius * 0.2}
                      fill="rgba(255,255,255,0.5)"
                    />
                  </motion.g>
                ))}
            </AnimatePresence>

            {/* Pop Effects */}
            <AnimatePresence>
              {popEffects.map((effect) => (
                <motion.g key={effect.id}>
                  {/* Burst particles */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i * Math.PI * 2) / 8
                    return (
                      <motion.circle
                        key={i}
                        initial={{
                          cx: effect.x,
                          cy: effect.y,
                          r: 8,
                          opacity: 1,
                        }}
                        animate={{
                          cx: effect.x + Math.cos(angle) * 50,
                          cy: effect.y + Math.sin(angle) * 50,
                          r: 3,
                          opacity: 0,
                        }}
                        transition={{ duration: 0.3 }}
                        fill={effect.color}
                      />
                    )
                  })}
                </motion.g>
              ))}
            </AnimatePresence>

            {/* Finger cursor indicator */}
            {fingerPosition && (
              <motion.circle
                cx={CANVAS_WIDTH - fingerPosition.x}
                cy={fingerPosition.y}
                r={HIT_RADIUS}
                fill="rgba(255,255,255,0.2)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </svg>

          {/* Stats Display */}
          <div className="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-white">
              <Target className="h-4 w-4" />
              <span>{statsRef.current.bubblesPopped} {language === 'ko' ? '터뜨림' : 'popped'}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-4 py-2">
            <p className="text-center text-sm text-white">
              {language === 'ko'
                ? '검지 손가락으로 버블을 터뜨리세요!'
                : 'Pop the bubbles with your index finger!'}
            </p>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {result && (
        <GameResultModal
          isOpen={gameState === 'result'}
          gameTitle={language === 'ko' ? '버블 슈터' : 'Bubble Shooter'}
          score={result.score}
          highScore={highScore}
          maxCombo={result.maxCombo}
          accuracy={result.accuracy}
          duration={Math.floor(config.gameDuration / 1000)}
          extraStats={[
            {
              label: language === 'ko' ? '터뜨린 버블' : 'Bubbles Popped',
              value: result.bubblesPopped,
            },
          ]}
          onPlayAgain={handlePlayAgain}
          onExit={onBack}
        />
      )}
    </div>
  )
}
