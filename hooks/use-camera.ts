'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseCameraOptions {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  isStreaming: boolean
  error: string | null
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureFrame: () => string | null
  stream: MediaStream | null
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { width = 640, height = 480, facingMode = 'user' } = options

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isStartingRef = useRef(false)

  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    isStartingRef.current = false
    setIsStreaming(false)
  }, [])

  const startCamera = useCallback(async () => {
    // 이미 시작 중이거나 스트리밍 중이면 무시
    if (isStartingRef.current || streamRef.current) {
      return
    }

    isStartingRef.current = true

    try {
      setError(null)

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream

      if (videoRef.current) {
        // 이전 srcObject 정리
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject = null
        }

        videoRef.current.srcObject = mediaStream

        // loadedmetadata 이벤트를 기다린 후 play
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!

          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('error', handleError)
            resolve()
          }

          const handleError = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata)
            video.removeEventListener('error', handleError)
            reject(new Error('Video loading error'))
          }

          // 이미 메타데이터가 로드되어 있으면 바로 resolve
          if (video.readyState >= 1) {
            resolve()
          } else {
            video.addEventListener('loadedmetadata', handleLoadedMetadata)
            video.addEventListener('error', handleError)
          }
        })

        // play 호출
        try {
          await videoRef.current.play()
          setIsStreaming(true)
        } catch (playError) {
          // AbortError는 무시 (새로운 로드 요청에 의해 중단됨)
          if (playError instanceof DOMException && playError.name === 'AbortError') {
            console.log('Play was interrupted, will retry')
          } else {
            throw playError
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another application.')
        } else if (err.name === 'AbortError') {
          // AbortError는 무시
          return
        } else {
          setError(errorMessage)
        }
      } else {
        setError(errorMessage)
      }

      setIsStreaming(false)
    } finally {
      isStartingRef.current = false
    }
  }, [width, height, facingMode])

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 0.8)
  }, [isStreaming])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    videoRef,
    canvasRef,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    stream: streamRef.current,
  }
}
