'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCamera } from '@/hooks/use-camera'
import { useHandDetection, HAND_LANDMARKS } from '@/hooks/use-hand-detection'
import { CameraView } from '@/components/posture/camera-view'
import { Countdown, GameResultModal } from '@/components/games/common'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty, FruitNinjaResult } from '@/types/game'
import {
  spawnFruit,
  updateFruit,
  checkSlice,
  calculateSliceAngle,
  calculateFruitNinjaResult,
  calculateAccuracy,
  FRUIT_NINJA_DIFFICULTY_CONFIG,
  FRUIT_CONFIGS,
  type FruitWithState,
} from '@/lib/games/fruit-ninja'

interface NinjaGameProps {
  difficulty: GameDifficulty
  onBack: () => void
}

interface TrailPoint {
  x: number
  y: number
  timestamp: number
}

export function NinjaGame({ difficulty, onBack }: NinjaGameProps) {
  const { language } = useTranslation()
  const { addScore, getHighScore } = useGameStore()
  const config = FRUIT_NINJA_DIFFICULTY_CONFIG[difficulty]

  // Game state
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'result'>('countdown')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [fruits, setFruits] = useState<FruitWithState[]>([])
  const [trail, setTrail] = useState<TrailPoint[]>([])
  const [sliceEffects, setSliceEffects] = useState<{ id: string; x: number; y: number; angle: number; emoji: string }[]>([])
  const [result, setResult] = useState<FruitNinjaResult | null>(null)

  // Stats tracking
  const statsRef = useRef({
    fruitsSliced: 0,
    bombsHit: 0,
    totalFruits: 0,
  })

  // Hand tracking
  const prevHandPosRef = useRef<{ x: number; y: number } | null>(null)

  // Timing
  const startTimeRef = useRef<number>(0)
  const lastSpawnRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
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

  // Process hand detection for slicing
  useEffect(() => {
    if (gameState !== 'playing' || hands.length === 0) {
      prevHandPosRef.current = null
      return
    }

    // Get hand position (use wrist as reference)
    const hand = hands[0]
    const wrist = hand.landmarks[HAND_LANDMARKS.WRIST]

    // Convert to screen percentage (mirrored)
    const handX = (1 - wrist.x) * 100
    const handY = wrist.y * 100

    // Add to trail
    setTrail((prev) => {
      const now = Date.now()
      const newTrail = [...prev, { x: handX, y: handY, timestamp: now }]
      // Keep only recent points
      return newTrail.filter((p) => now - p.timestamp < 200)
    })

    // Check for slices
    if (prevHandPosRef.current) {
      const prevX = prevHandPosRef.current.x
      const prevY = prevHandPosRef.current.y

      // Calculate hand speed
      const speed = Math.sqrt(
        Math.pow(handX - prevX, 2) + Math.pow(handY - prevY, 2)
      )

      // Only slice if hand is moving fast enough
      if (speed > 2) {
        setFruits((prevFruits) => {
          return prevFruits.map((fruit) => {
            if (!fruit.sliced && !fruit.missed && checkSlice(fruit, prevX, prevY, handX, handY)) {
              // Fruit sliced!
              const sliceAngle = calculateSliceAngle(prevX, prevY, handX, handY)
              const fruitConfig = FRUIT_CONFIGS[fruit.type]

              if (fruit.type === 'bomb') {
                // Hit a bomb
                setScore((s) => Math.max(0, s - 50))
                setCombo(0)
                statsRef.current.bombsHit++

                // Bomb explosion effect
                setSliceEffects((prev) => [
                  ...prev,
                  { id: fruit.id, x: fruit.x, y: fruit.y, angle: 0, emoji: '💥' },
                ])
              } else {
                // Normal fruit
                const comboBonus = Math.floor(combo / 5) * 5
                setScore((s) => s + fruitConfig.points + comboBonus)
                setCombo((c) => {
                  const newCombo = c + 1
                  setMaxCombo((m) => Math.max(m, newCombo))
                  return newCombo
                })
                statsRef.current.fruitsSliced++

                // Slice effect
                setSliceEffects((prev) => [
                  ...prev,
                  { id: fruit.id, x: fruit.x, y: fruit.y, angle: sliceAngle, emoji: fruitConfig.emoji },
                ])
              }

              return {
                ...fruit,
                sliced: true,
                sliceAngle,
              }
            }
            return fruit
          })
        })

        // Clear old slice effects
        setTimeout(() => {
          setSliceEffects((prev) => prev.slice(-10))
        }, 500)
      }
    }

    prevHandPosRef.current = { x: handX, y: handY }
  }, [hands, gameState, combo])

  // Game loop
  const startGame = useCallback(() => {
    statsRef.current = { fruitsSliced: 0, bombsHit: 0, totalFruits: 0 }
    startTimeRef.current = Date.now()
    lastSpawnRef.current = Date.now()
    lastFrameRef.current = Date.now()
    setGameState('playing')

    const gameLoop = () => {
      const now = Date.now()
      const currentTime = now - startTimeRef.current
      const deltaTime = now - lastFrameRef.current
      lastFrameRef.current = now

      // Check game end
      if (currentTime >= config.gameDuration) {
        endGame()
        return
      }

      // Spawn new fruits
      if (now - lastSpawnRef.current >= config.fruitInterval) {
        const fruitsToSpawn = 1 + Math.floor(Math.random() * config.maxFruitsAtOnce)
        const newFruits: FruitWithState[] = []

        for (let i = 0; i < fruitsToSpawn; i++) {
          newFruits.push(spawnFruit(difficulty))
          if (newFruits[newFruits.length - 1].type !== 'bomb') {
            statsRef.current.totalFruits++
          }
        }

        setFruits((prev) => [...prev, ...newFruits])
        lastSpawnRef.current = now
      }

      // Update fruit physics
      setFruits((prevFruits) => {
        return prevFruits
          .map((fruit) => {
            const updated = updateFruit(fruit, deltaTime, config.gravity)

            // Mark as missed if fell off screen
            if (updated.y > 110 && !updated.sliced && !updated.missed && updated.type !== 'bomb') {
              setCombo(0)
              return { ...updated, missed: true }
            }

            return updated
          })
          .filter((fruit) => fruit.y < 120) // Remove fruits that are way off screen
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

    const finalResult = calculateFruitNinjaResult(
      statsRef.current.fruitsSliced,
      statsRef.current.bombsHit,
      maxCombo,
      score
    )
    setResult(finalResult)
    setGameState('result')

    // Save score
    addScore({
      gameType: 'fruit-ninja',
      score: finalResult.score,
      maxCombo: finalResult.maxCombo,
      accuracy: calculateAccuracy(
        statsRef.current.fruitsSliced,
        statsRef.current.totalFruits,
        statsRef.current.bombsHit
      ),
      difficulty,
      duration: Math.floor(config.gameDuration / 1000),
    })
  }, [maxCombo, score, difficulty, config, addScore, stopDetection])

  const handlePlayAgain = () => {
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setFruits([])
    setTrail([])
    setSliceEffects([])
    setResult(null)
    setGameState('countdown')
  }

  const highScore = getHighScore('fruit-ninja', difficulty)

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-sky-400 to-sky-600">
      {/* Countdown */}
      {gameState === 'countdown' && (
        <Countdown from={3} onComplete={startGame} />
      )}

      {/* Game Area */}
      <div className="relative h-full">
        {/* Camera View (semi-transparent background) */}
        <div className="absolute inset-0 opacity-40">
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            isStreaming={isStreaming}
            showGuide={false}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Fruits */}
        <AnimatePresence>
          {fruits
            .filter((f) => !f.missed && f.y > -10 && f.y < 110)
            .map((fruit) => {
              const fruitConfig = FRUIT_CONFIGS[fruit.type]
              return (
                <motion.div
                  key={fruit.id}
                  className="absolute text-center"
                  style={{
                    left: `${fruit.x}%`,
                    top: `${fruit.y}%`,
                    transform: `translate(-50%, -50%) rotate(${fruit.rotation}deg)`,
                    fontSize: `${fruitConfig.size * 1.5}rem`,
                  }}
                  initial={{ scale: 0 }}
                  animate={{
                    scale: fruit.sliced ? [1, 1.5, 0] : 1,
                    opacity: fruit.sliced ? [1, 1, 0] : 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: fruit.sliced ? 0.3 : 0.1 }}
                >
                  {fruitConfig.emoji}
                </motion.div>
              )
            })}
        </AnimatePresence>

        {/* Slice Effects */}
        <AnimatePresence>
          {sliceEffects.map((effect) => (
            <motion.div
              key={effect.id}
              className="pointer-events-none absolute"
              style={{
                left: `${effect.x}%`,
                top: `${effect.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-4xl">{effect.emoji}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Hand Trail */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {trail.length > 1 && (
            <motion.path
              d={`M ${trail.map((p) => `${p.x}% ${p.y}%`).join(' L ')}`}
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              style={{
                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))',
              }}
            />
          )}
        </svg>

        {/* HUD */}
        <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/50 p-4 text-white">
          <div className="text-3xl font-bold">{score}</div>
          <div className="text-sm opacity-70">SCORE</div>
          {combo > 0 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="mt-2"
            >
              <div className={`text-2xl font-bold ${combo >= 5 ? 'text-warning' : 'text-secondary'}`}>
                {combo}x
              </div>
              <div className="text-xs opacity-70">COMBO</div>
            </motion.div>
          )}
        </div>

        {/* Time remaining */}
        <div className="absolute right-4 top-4 z-10 rounded-lg bg-black/50 px-4 py-2 text-white">
          <div className="text-xl font-bold">
            {Math.max(0, Math.ceil((config.gameDuration - (Date.now() - startTimeRef.current)) / 1000))}s
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {result && (
        <GameResultModal
          isOpen={gameState === 'result'}
          gameTitle={language === 'ko' ? '과일 닌자' : 'Fruit Ninja'}
          score={result.score}
          highScore={highScore}
          maxCombo={result.maxCombo}
          accuracy={calculateAccuracy(
            statsRef.current.fruitsSliced,
            statsRef.current.totalFruits,
            statsRef.current.bombsHit
          )}
          duration={Math.floor(config.gameDuration / 1000)}
          extraStats={[
            {
              label: language === 'ko' ? '자른 과일' : 'Fruits Sliced',
              value: result.fruitsSliced,
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
