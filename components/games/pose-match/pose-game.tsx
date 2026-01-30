'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Check, X } from 'lucide-react'
import { useCamera } from '@/hooks/use-camera'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { CameraView } from '@/components/posture/camera-view'
import { PoseOverlay } from '@/components/posture/pose-overlay'
import { Countdown, GameResultModal } from '@/components/games/common'
import { useGameStore } from '@/stores/game-store'
import { useTranslation } from '@/hooks/use-translation'
import type { GameDifficulty, PoseMatchWall, PoseMatchResult } from '@/types/game'
import {
  generateWalls,
  checkPoseMatch,
  calculatePoseMatchResult,
  getPoseDefinition,
  POSE_MATCH_DIFFICULTY_CONFIG,
  type PoseType,
} from '@/lib/games/pose-match'

interface PoseGameProps {
  difficulty: GameDifficulty
  onBack: () => void
}

interface WallWithState extends PoseMatchWall {
  x: number // position (100 = right edge, 0 = left edge, -20 = passed)
  active: boolean
  judged: boolean
  passed?: boolean
  accuracy?: number
}

export function PoseGame({ difficulty, onBack }: PoseGameProps) {
  const { language } = useTranslation()
  const { addScore, getHighScore } = useGameStore()
  const config = POSE_MATCH_DIFFICULTY_CONFIG[difficulty]

  // Game state
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'result'>('countdown')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [walls, setWalls] = useState<WallWithState[]>([])
  const [wallResults, setWallResults] = useState<{ passed: boolean; accuracy: number }[]>([])
  const [currentPose, setCurrentPose] = useState<PoseType | null>(null)
  const [isPoseMatched, setIsPoseMatched] = useState(false)
  const [result, setResult] = useState<PoseMatchResult | null>(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 })

  // Timing
  const startTimeRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)

  // Camera and pose detection
  const { videoRef, canvasRef, isStreaming, startCamera, stopCamera } = useCamera({
    width: 640,
    height: 480,
  })
  const { landmarks, startDetection, stopDetection } = usePoseDetection()

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

  // Update video dimensions
  useEffect(() => {
    if (isStreaming && videoRef.current) {
      setVideoDimensions({
        width: videoRef.current.videoWidth || 640,
        height: videoRef.current.videoHeight || 480,
      })
    }
  }, [isStreaming])

  // Start detection when streaming
  useEffect(() => {
    if (isStreaming && videoRef.current && gameState === 'playing') {
      startDetection(videoRef.current)
    } else {
      stopDetection()
    }
  }, [isStreaming, gameState])

  // Check pose match
  useEffect(() => {
    if (gameState !== 'playing' || !currentPose || landmarks.length === 0) {
      setIsPoseMatched(false)
      return
    }

    const matched = checkPoseMatch(landmarks, currentPose)
    setIsPoseMatched(matched)
  }, [landmarks, currentPose, gameState])

  // Game loop
  const startGame = useCallback(() => {
    const generatedWalls = generateWalls(difficulty)
    const wallsWithState: WallWithState[] = generatedWalls.map((wall) => ({
      ...wall,
      x: 120,
      active: false,
      judged: false,
    }))

    setWalls(wallsWithState)
    startTimeRef.current = Date.now()
    setGameState('playing')

    const gameLoop = () => {
      const currentTime = Date.now() - startTimeRef.current

      // Check game end
      if (currentTime >= config.gameDuration) {
        endGame()
        return
      }

      setWalls((prevWalls) => {
        let updatedCurrentPose: PoseType | null = null

        const newWalls = prevWalls.map((wall) => {
          // Calculate wall position
          const timeSinceSpawn = currentTime - (wall.timing - config.wallSpeed)
          const progress = timeSinceSpawn / config.wallSpeed
          const x = 100 - progress * 120

          // Activate wall when it should appear
          if (!wall.active && progress >= 0) {
            wall.active = true
          }

          // Set current pose when wall is in judgment zone
          if (wall.active && x > 20 && x < 50 && !wall.judged) {
            updatedCurrentPose = wall.holeShape as PoseType
          }

          // Judge when wall reaches player
          if (!wall.judged && x <= 30 && x > 20) {
            const matched = checkPoseMatch(landmarks, wall.holeShape)
            const accuracy = matched ? (isPoseMatched ? 100 : 70) : 0

            wall.judged = true
            wall.passed = matched
            wall.accuracy = accuracy

            // Update score
            if (matched) {
              setScore((prev) => prev + 50 + (accuracy > 80 ? 50 : 0))
              setCombo((prev) => {
                const newCombo = prev + 1
                setMaxCombo((max) => Math.max(max, newCombo))
                return newCombo
              })
            } else {
              setCombo(0)
            }

            setWallResults((prev) => [...prev, { passed: matched, accuracy }])
          }

          return {
            ...wall,
            x,
          }
        })

        if (updatedCurrentPose !== currentPose) {
          setCurrentPose(updatedCurrentPose)
        }

        return newWalls
      })

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [difficulty, config, landmarks, isPoseMatched, currentPose])

  const endGame = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    stopDetection()
    setCurrentPose(null)

    const finalResult = calculatePoseMatchResult(wallResults)
    setResult(finalResult)
    setGameState('result')

    // Save score
    const accuracy = wallResults.length > 0
      ? (wallResults.filter((w) => w.passed).length / wallResults.length) * 100
      : 0

    addScore({
      gameType: 'pose-match',
      score: finalResult.score,
      maxCombo,
      accuracy,
      difficulty,
      duration: Math.floor(config.gameDuration / 1000),
    })
  }, [wallResults, maxCombo, difficulty, config, addScore, stopDetection])

  const handlePlayAgain = () => {
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setWalls([])
    setWallResults([])
    setCurrentPose(null)
    setResult(null)
    setGameState('countdown')
  }

  const highScore = getHighScore('pose-match', difficulty)
  const poseDefinition = currentPose ? getPoseDefinition(currentPose) : null

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      {/* Countdown */}
      {gameState === 'countdown' && (
        <Countdown from={3} onComplete={startGame} />
      )}

      {/* Game Area */}
      <div className="relative h-full">
        {/* Camera View (main) */}
        <div className="absolute inset-0">
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            isStreaming={isStreaming}
            showGuide={false}
            className="h-full w-full object-cover"
          >
            {/* Pose Overlay */}
            {landmarks.length > 0 && (
              <PoseOverlay
                landmarks={landmarks}
                width={videoDimensions.width}
                height={videoDimensions.height}
                className="absolute inset-0 h-full w-full"
                pointColor={isPoseMatched ? '#10B981' : '#6366F1'}
                connectionColor={isPoseMatched ? '#10B981' : '#6366F1'}
              />
            )}
          </CameraView>
        </div>

        {/* Walls */}
        <AnimatePresence>
          {walls
            .filter((w) => w.active && w.x > -30 && w.x < 120)
            .map((wall) => (
              <motion.div
                key={wall.id}
                className={`absolute top-0 h-full w-24 ${
                  wall.judged
                    ? wall.passed
                      ? 'bg-secondary/30'
                      : 'bg-error/30'
                    : 'bg-primary/40'
                }`}
                style={{ left: `${wall.x}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Wall hole silhouette */}
                <div className="flex h-full items-center justify-center">
                  <div className="relative">
                    <User className={`h-32 w-32 ${
                      wall.judged
                        ? wall.passed
                          ? 'text-secondary'
                          : 'text-error'
                        : 'text-white'
                    }`} />
                    {wall.judged && (
                      <div className="absolute -right-2 -top-2">
                        {wall.passed ? (
                          <Check className="h-8 w-8 text-secondary" />
                        ) : (
                          <X className="h-8 w-8 text-error" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pose label */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/50 px-3 py-1 text-sm text-white">
                  {getPoseDefinition(wall.holeShape as PoseType)?.[language === 'ko' ? 'nameKo' : 'nameEn']}
                </div>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Player Zone Indicator */}
        <div className="absolute left-[25%] top-0 h-full w-1 bg-primary/50" />
        <div className="absolute left-[35%] top-0 h-full w-1 bg-primary/50" />

        {/* HUD */}
        <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/50 p-4 text-white">
          <div className="text-3xl font-bold">{score}</div>
          <div className="text-sm opacity-70">SCORE</div>
          {combo > 0 && (
            <div className="mt-2">
              <div className={`text-2xl font-bold ${combo >= 5 ? 'text-warning' : 'text-secondary'}`}>
                {combo}x
              </div>
              <div className="text-xs opacity-70">COMBO</div>
            </div>
          )}
        </div>

        {/* Current Pose Guide */}
        {currentPose && poseDefinition && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
          >
            <div className={`rounded-xl px-6 py-3 ${
              isPoseMatched ? 'bg-secondary' : 'bg-primary'
            }`}>
              <div className="text-center text-white">
                <div className="text-lg font-bold">
                  {language === 'ko' ? poseDefinition.nameKo : poseDefinition.nameEn}
                </div>
                {isPoseMatched && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-1 text-sm"
                  >
                    {language === 'ko' ? '맞았어요!' : 'Matched!'}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Result Modal */}
      {result && (
        <GameResultModal
          isOpen={gameState === 'result'}
          gameTitle={language === 'ko' ? '자세 맞추기' : 'Pose Match'}
          score={result.score}
          highScore={highScore}
          maxCombo={maxCombo}
          accuracy={(result.wallsPassed / result.totalWalls) * 100}
          duration={Math.floor(config.gameDuration / 1000)}
          extraStats={[
            {
              label: language === 'ko' ? '통과한 벽' : 'Walls Passed',
              value: `${result.wallsPassed}/${result.totalWalls}`,
            },
          ]}
          onPlayAgain={handlePlayAgain}
          onExit={onBack}
        />
      )}
    </div>
  )
}
