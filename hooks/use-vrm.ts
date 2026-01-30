'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm'
import type {
  UseVrmOptions,
  UseVrmReturn,
  CameraPreset,
  ViewerSize,
} from '@/types/avatar'
import { CAMERA_PRESETS, SIZE_CONFIG } from '@/types/avatar'

export function useVrm(options: UseVrmOptions): UseVrmReturn {
  const {
    containerRef,
    size = 'medium',
    backgroundColor = '#1a1a1a',
    lightingIntensity = 1.0,
    onLoad,
    onError,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vrm, setVrm] = useState<VRM | null>(null)

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const vrmRef = useRef<VRM | null>(null)
  const clockRef = useRef<THREE.Clock>(new THREE.Clock())
  const animationFrameRef = useRef<number | null>(null)
  const isRenderingRef = useRef(false)
  const lightsRef = useRef<THREE.Light[]>([])
  const isInitializedRef = useRef(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Background and lighting refs for updates
  const backgroundColorRef = useRef(backgroundColor)
  const lightingIntensityRef = useRef(lightingIntensity)

  // Initialize Three.js scene
  const initializeScene = useCallback(() => {
    // Prevent double initialization (React Strict Mode)
    if (!containerRef.current || isInitializedRef.current) return
    if (sceneRef.current && rendererRef.current) return

    const container = containerRef.current

    // Clean up any existing canvas elements (safety check)
    const existingCanvas = container.querySelector('canvas')
    if (existingCanvas) {
      console.log('[VRM] Removing existing canvas')
      existingCanvas.remove()
    }

    const rect = container.getBoundingClientRect()
    const width = rect.width || SIZE_CONFIG[size].width
    const height = rect.height || SIZE_CONFIG[size].height

    console.log('[VRM] Initializing scene', { width, height })

    try {
      // Create scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(backgroundColorRef.current)
      sceneRef.current = scene

      // Create camera
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100)
      camera.position.set(
        CAMERA_PRESETS.front.x,
        CAMERA_PRESETS.front.y,
        CAMERA_PRESETS.front.z
      )
      if (CAMERA_PRESETS.front.lookAt) {
        camera.lookAt(
          CAMERA_PRESETS.front.lookAt.x,
          CAMERA_PRESETS.front.lookAt.y,
          CAMERA_PRESETS.front.lookAt.z
        )
      }
      cameraRef.current = camera

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5 * lightingIntensityRef.current)
      scene.add(ambientLight)
      lightsRef.current.push(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8 * lightingIntensityRef.current)
      directionalLight.position.set(1, 2, 1)
      scene.add(directionalLight)
      lightsRef.current.push(directionalLight)

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3 * lightingIntensityRef.current)
      fillLight.position.set(-1, 1, -1)
      scene.add(fillLight)
      lightsRef.current.push(fillLight)

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return

        const newRect = containerRef.current.getBoundingClientRect()
        const newWidth = newRect.width || SIZE_CONFIG[size].width
        const newHeight = newRect.height || SIZE_CONFIG[size].height

        cameraRef.current.aspect = newWidth / newHeight
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(newWidth, newHeight)
      }

      resizeObserverRef.current = new ResizeObserver(handleResize)
      resizeObserverRef.current.observe(container)

      isInitializedRef.current = true
      console.log('[VRM] Scene initialized successfully')
    } catch (err) {
      console.error('[VRM] Scene initialization error:', err)
      setError('Failed to initialize 3D scene')
    }
  }, [containerRef, size])

  // Load VRM from URL
  const loadVrm = useCallback(async (url: string) => {
    if (!sceneRef.current) {
      initializeScene()
    }

    setIsLoading(true)
    setError(null)

    try {
      // Remove existing VRM
      if (vrmRef.current) {
        sceneRef.current?.remove(vrmRef.current.scene)
        vrmRef.current = null
        setVrm(null)
      }

      const loader = new GLTFLoader()
      loader.register((parser) => new VRMLoaderPlugin(parser))

      const gltf = await loader.loadAsync(url)
      const loadedVrm = gltf.userData.vrm as VRM

      if (!loadedVrm) {
        throw new Error('Failed to load VRM model')
      }

      // Debug: Log all humanoid bones
      console.log('[VRM] ========== HUMANOID BONES ==========')
      if (loadedVrm.humanoid) {
        const humanBones = loadedVrm.humanoid.humanBones
        const boneNames = Object.keys(humanBones)
        console.log('[VRM] Total bones:', boneNames.length)
        console.log('[VRM] All bone names:', boneNames)

        // Check for hand and finger bones specifically
        const handBones = boneNames.filter(name =>
          name.toLowerCase().includes('hand') ||
          name.toLowerCase().includes('thumb') ||
          name.toLowerCase().includes('index') ||
          name.toLowerCase().includes('middle') ||
          name.toLowerCase().includes('ring') ||
          name.toLowerCase().includes('little') ||
          name.toLowerCase().includes('pinky')
        )
        console.log('[VRM] Hand/Finger bones:', handBones)

        // Check each finger bone exists
        const fingerBoneChecks = [
          'leftHand', 'rightHand',
          'leftThumbProximal', 'leftThumbMetacarpal', 'leftThumbDistal',
          'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
          'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
          'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
          'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
          'rightThumbProximal', 'rightThumbMetacarpal', 'rightThumbDistal',
          'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
          'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
          'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
          'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
        ]

        console.log('[VRM] Finger bone check:')
        fingerBoneChecks.forEach(boneName => {
          const exists = boneNames.includes(boneName)
          const node = exists ? humanBones[boneName as keyof typeof humanBones]?.node : null
          console.log(`  ${boneName}: ${exists ? '✓' : '✗'}${node ? ' (has node)' : ''}`)
        })

        // Summary
        const hasFingerBones = handBones.length > 2
        console.log('[VRM] Has finger bones:', hasFingerBones ? 'YES' : 'NO - Hand tracking will not work!')
      } else {
        console.log('[VRM] WARNING: No humanoid data in VRM!')
      }
      console.log('[VRM] =====================================')

      // Rotate model to face camera (VRM default faces +Z)
      loadedVrm.scene.rotation.y = Math.PI

      sceneRef.current?.add(loadedVrm.scene)
      vrmRef.current = loadedVrm
      setVrm(loadedVrm)
      setIsReady(true)
      onLoad?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load VRM model'
      setError(errorMessage)
      onError?.(errorMessage)
      console.error('VRM loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [initializeScene, onLoad, onError])

  // Load VRM from file
  const loadVrmFromFile = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    try {
      await loadVrm(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [loadVrm])

  // Set camera preset
  const setCameraPreset = useCallback((preset: CameraPreset) => {
    if (!cameraRef.current) return

    const position = CAMERA_PRESETS[preset]
    cameraRef.current.position.set(position.x, position.y, position.z)
    if (position.lookAt) {
      cameraRef.current.lookAt(position.lookAt.x, position.lookAt.y, position.lookAt.z)
    }
  }, [])

  // Set background color
  const setBackgroundColor = useCallback((color: string) => {
    backgroundColorRef.current = color
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(color)
    }
  }, [])

  // Set lighting intensity
  const setLightingIntensity = useCallback((intensity: number) => {
    lightingIntensityRef.current = intensity
    lightsRef.current.forEach((light, index) => {
      if (light instanceof THREE.AmbientLight) {
        light.intensity = 0.5 * intensity
      } else if (light instanceof THREE.DirectionalLight) {
        light.intensity = (index === 1 ? 0.8 : 0.3) * intensity
      }
    })
  }, [])

  // Render loop
  const render = useCallback(() => {
    if (!isRenderingRef.current) return

    const delta = clockRef.current.getDelta()

    // Update VRM
    if (vrmRef.current) {
      vrmRef.current.update(delta)
    }

    // Render scene
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [])

  // Start render loop
  const startRenderLoop = useCallback(() => {
    if (isRenderingRef.current) return

    isRenderingRef.current = true
    clockRef.current.start()
    render()
  }, [render])

  // Stop render loop
  const stopRenderLoop = useCallback(() => {
    isRenderingRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // Dispose resources
  const dispose = useCallback(() => {
    console.log('[VRM] Disposing resources')
    stopRenderLoop()

    // Disconnect resize observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }

    // Remove VRM
    if (vrmRef.current && sceneRef.current) {
      sceneRef.current.remove(vrmRef.current.scene)
      vrmRef.current = null
    }

    // Remove lights
    lightsRef.current.forEach((light) => {
      sceneRef.current?.remove(light)
    })
    lightsRef.current = []

    // Dispose renderer
    if (rendererRef.current) {
      rendererRef.current.dispose()
      if (rendererRef.current.domElement.parentNode) {
        rendererRef.current.domElement.remove()
      }
      rendererRef.current = null
    }

    // Clear scene
    if (sceneRef.current) {
      sceneRef.current.clear()
      sceneRef.current = null
    }

    cameraRef.current = null
    isInitializedRef.current = false
    setVrm(null)
    setIsReady(false)
  }, [stopRenderLoop])

  // Initialize on mount
  useEffect(() => {
    // Small delay to ensure container is mounted
    const timer = setTimeout(() => {
      initializeScene()
    }, 0)

    return () => {
      clearTimeout(timer)
      dispose()
    }
  }, []) // Empty deps - only run once on mount/unmount

  return {
    isLoading,
    isReady,
    error,
    vrm,
    scene: sceneRef.current,
    camera: cameraRef.current,
    loadVrm,
    loadVrmFromFile,
    setCameraPreset,
    setBackgroundColor,
    setLightingIntensity,
    startRenderLoop,
    stopRenderLoop,
    dispose,
  }
}
