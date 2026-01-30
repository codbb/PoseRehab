'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface HandResult {
  landmarks: HandLandmark[]
  handedness: 'Left' | 'Right'
}

interface UseHandDetectionOptions {
  onResults?: (hands: HandResult[]) => void
  maxNumHands?: number
  minDetectionConfidence?: number
  minTrackingConfidence?: number
}

interface UseHandDetectionReturn {
  isLoading: boolean
  isReady: boolean
  error: string | null
  hands: HandResult[]
  startDetection: (videoElement: HTMLVideoElement) => void
  stopDetection: () => void
}

// Hand landmark indices
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const

// Hand connections for skeleton drawing
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
]

// CDN URL for MediaPipe Hands - using stable version
const MEDIAPIPE_HANDS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915'

// Global script loading state
let handsScriptLoadPromise: Promise<void> | null = null
let isHandsScriptLoaded = false

// Load MediaPipe Hands script from CDN
function loadMediaPipeHandsScript(): Promise<void> {
  if (isHandsScriptLoaded) {
    return Promise.resolve()
  }

  if (handsScriptLoadPromise) {
    return handsScriptLoadPromise
  }

  console.log('[Hands] Loading MediaPipe Hands script...')

  handsScriptLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && (window as any).Hands) {
      console.log('[Hands] Already loaded from window')
      isHandsScriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `${MEDIAPIPE_HANDS_CDN}/hands.js`
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      console.log('[Hands] Script loaded successfully')
      isHandsScriptLoaded = true
      resolve()
    }

    script.onerror = (err) => {
      console.error('[Hands] Script load error:', err)
      handsScriptLoadPromise = null
      reject(new Error('Failed to load MediaPipe Hands script'))
    }

    document.head.appendChild(script)
  })

  return handsScriptLoadPromise
}

export function useHandDetection(options: UseHandDetectionOptions = {}): UseHandDetectionReturn {
  const {
    onResults,
    maxNumHands = 2,
    minDetectionConfidence = 0.5,
    minTrackingConfidence = 0.5,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hands, setHands] = useState<HandResult[]>([])

  const handsRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isDetectingRef = useRef(false)
  const isInitializingRef = useRef(false)
  const frameCountRef = useRef(0)

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async () => {
    if (handsRef.current || isInitializingRef.current) return

    isInitializingRef.current = true
    setIsLoading(true)
    setError(null)

    console.log('[Hands] Initializing MediaPipe Hands...')

    try {
      // Load script from CDN
      await loadMediaPipeHandsScript()

      // Access Hands from global window
      const HandsClass = (window as any).Hands
      if (!HandsClass) {
        throw new Error('MediaPipe Hands class not found')
      }

      console.log('[Hands] Creating Hands instance...')

      const handsModel = new HandsClass({
        locateFile: (file: string) => {
          const url = `${MEDIAPIPE_HANDS_CDN}/${file}`
          console.log('[Hands] Loading file:', file)
          return url
        },
      })

      handsModel.setOptions({
        maxNumHands,
        modelComplexity: 1,
        minDetectionConfidence,
        minTrackingConfidence,
      })

      handsModel.onResults((results: any) => {
        frameCountRef.current++

        if (results.multiHandLandmarks && results.multiHandedness && results.multiHandLandmarks.length > 0) {
          const processedHands: HandResult[] = results.multiHandLandmarks.map(
            (landmarks: any, index: number) => ({
              landmarks: landmarks.map((lm: any) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
              })),
              handedness: results.multiHandedness[index]?.label || 'Right',
            })
          )

          // Log every 30 frames
          if (frameCountRef.current % 30 === 0) {
            console.log('[Hands] Detected hands:', processedHands.length,
              'Landmarks per hand:', processedHands[0]?.landmarks.length || 0)
          }

          setHands(processedHands)
          onResults?.(processedHands)
        } else {
          if (frameCountRef.current % 60 === 0) {
            console.log('[Hands] No hands detected')
          }
          setHands([])
          onResults?.([])
        }
      })

      // Wait for model to initialize with timeout
      console.log('[Hands] Waiting for model initialization...')
      await Promise.race([
        handsModel.initialize(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Hands initialization timeout')), 30000)
        )
      ])

      handsRef.current = handsModel
      setIsReady(true)
      console.log('[Hands] MediaPipe Hands ready!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize hand detection'
      setError(errorMessage)
      console.error('[Hands] Initialization error:', err)
      // Don't crash the app - just mark as not ready
      setIsReady(false)
    } finally {
      setIsLoading(false)
      isInitializingRef.current = false
    }
  }, [maxNumHands, minDetectionConfidence, minTrackingConfidence, onResults])

  // Continuous detection
  const startDetection = useCallback(
    async (videoElement: HTMLVideoElement) => {
      console.log('[Hands] Starting detection...')

      try {
        if (!handsRef.current) {
          console.log('[Hands] Model not ready, initializing...')
          await initializeHands()
        }

        if (!handsRef.current) {
          console.error('[Hands] Failed to initialize model')
          return
        }

        isDetectingRef.current = true
        frameCountRef.current = 0
        console.log('[Hands] Detection loop started')

        const detect = async () => {
          if (!isDetectingRef.current) return

          if (handsRef.current && videoElement.readyState >= 2) {
            try {
              await handsRef.current.send({ image: videoElement })
            } catch (err) {
              // Log errors occasionally
              if (frameCountRef.current % 100 === 0) {
                console.warn('[Hands] Send error:', err)
              }
            }
          }

          if (isDetectingRef.current) {
            animationFrameRef.current = requestAnimationFrame(detect)
          }
        }

        detect()
      } catch (err) {
        console.error('[Hands] startDetection error:', err)
        setError(err instanceof Error ? err.message : 'Failed to start hand detection')
      }
    },
    [initializeHands]
  )

  const stopDetection = useCallback(() => {
    console.log('[Hands] Stopping detection...')
    isDetectingRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setHands([])
    frameCountRef.current = 0
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      stopDetection()
      if (handsRef.current) {
        try {
          handsRef.current.close()
        } catch (e) {
          // Ignore close errors
        }
        handsRef.current = null
      }
    }
  }, [stopDetection])

  return {
    isLoading,
    isReady,
    error,
    hands,
    startDetection,
    stopDetection,
  }
}

// Utility functions for hand analysis
export function isHandOpen(landmarks: HandLandmark[]): boolean {
  if (landmarks.length < 21) return false

  // Check if all fingers are extended
  const fingerTips = [
    HAND_LANDMARKS.INDEX_TIP,
    HAND_LANDMARKS.MIDDLE_TIP,
    HAND_LANDMARKS.RING_TIP,
    HAND_LANDMARKS.PINKY_TIP,
  ]
  const fingerMcps = [
    HAND_LANDMARKS.INDEX_MCP,
    HAND_LANDMARKS.MIDDLE_MCP,
    HAND_LANDMARKS.RING_MCP,
    HAND_LANDMARKS.PINKY_MCP,
  ]

  let extendedFingers = 0
  for (let i = 0; i < 4; i++) {
    if (landmarks[fingerTips[i]].y < landmarks[fingerMcps[i]].y) {
      extendedFingers++
    }
  }

  return extendedFingers >= 3
}

export function isHandClosed(landmarks: HandLandmark[]): boolean {
  if (landmarks.length < 21) return false

  // Check if fingers are curled into fist
  const fingerTips = [
    HAND_LANDMARKS.INDEX_TIP,
    HAND_LANDMARKS.MIDDLE_TIP,
    HAND_LANDMARKS.RING_TIP,
    HAND_LANDMARKS.PINKY_TIP,
  ]
  const fingerPips = [
    HAND_LANDMARKS.INDEX_PIP,
    HAND_LANDMARKS.MIDDLE_PIP,
    HAND_LANDMARKS.RING_PIP,
    HAND_LANDMARKS.PINKY_PIP,
  ]

  let curledFingers = 0
  for (let i = 0; i < 4; i++) {
    if (landmarks[fingerTips[i]].y > landmarks[fingerPips[i]].y) {
      curledFingers++
    }
  }

  return curledFingers >= 3
}

export function isFingersSpread(landmarks: HandLandmark[]): boolean {
  if (landmarks.length < 21) return false

  // Check distance between finger tips
  const tips = [
    landmarks[HAND_LANDMARKS.INDEX_TIP],
    landmarks[HAND_LANDMARKS.MIDDLE_TIP],
    landmarks[HAND_LANDMARKS.RING_TIP],
    landmarks[HAND_LANDMARKS.PINKY_TIP],
  ]

  let totalDistance = 0
  for (let i = 0; i < tips.length - 1; i++) {
    const dx = tips[i + 1].x - tips[i].x
    const dy = tips[i + 1].y - tips[i].y
    totalDistance += Math.sqrt(dx * dx + dy * dy)
  }

  // If average distance is large enough, fingers are spread
  return totalDistance / 3 > 0.08
}

export function getThumbToFingerTouching(landmarks: HandLandmark[]): number | null {
  if (landmarks.length < 21) return null

  const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP]
  const fingerTips = [
    { index: 1, landmark: landmarks[HAND_LANDMARKS.INDEX_TIP] },
    { index: 2, landmark: landmarks[HAND_LANDMARKS.MIDDLE_TIP] },
    { index: 3, landmark: landmarks[HAND_LANDMARKS.RING_TIP] },
    { index: 4, landmark: landmarks[HAND_LANDMARKS.PINKY_TIP] },
  ]

  for (const finger of fingerTips) {
    const dx = thumbTip.x - finger.landmark.x
    const dy = thumbTip.y - finger.landmark.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 0.05) {
      return finger.index
    }
  }

  return null
}
