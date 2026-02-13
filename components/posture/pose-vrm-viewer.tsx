'use client'

import { useRef, useEffect, useState, useCallback, memo } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm'
import { Loader2, User, RotateCcw } from 'lucide-react'
import type { Pose3DResult } from '@/hooks/use-onnx-model'
import { applyOnnx3DToVRM, resetVRMPose } from '@/lib/avatar/onnx-to-vrm'
import { cn } from '@/lib/utils'

const DEFAULT_VRM_URL =
  'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm'

interface PoseVrmViewerProps {
  joints3D: Pose3DResult | null
  viewLabel?: string
  language?: 'ko' | 'en'
  className?: string
}

type ViewPreset = 'front' | 'back' | 'left' | 'right'

const VIEW_POSITIONS: Record<ViewPreset, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
  front: { pos: [0, 1.2, 2.5], lookAt: [0, 1, 0] },
  back: { pos: [0, 1.2, -2.5], lookAt: [0, 1, 0] },
  left: { pos: [-2.5, 1.2, 0], lookAt: [0, 1, 0] },
  right: { pos: [2.5, 1.2, 0], lookAt: [0, 1, 0] },
}

const VIEW_LABELS: Record<ViewPreset, { ko: string; en: string }> = {
  front: { ko: '정면', en: 'Front' },
  back: { ko: '후면', en: 'Back' },
  left: { ko: '좌측', en: 'Left' },
  right: { ko: '우측', en: 'Right' },
}

function PoseVrmViewerInner({
  joints3D,
  viewLabel,
  language = 'ko',
  className,
}: PoseVrmViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const vrmRef = useRef<VRM | null>(null)
  const clockRef = useRef(new THREE.Clock())
  const frameIdRef = useRef<number | null>(null)
  const initRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<ViewPreset>('front')

  // Initialize Three.js scene & load VRM
  useEffect(() => {
    if (!containerRef.current || initRef.current) return
    initRef.current = true

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const width = rect.width || 400
    const height = rect.height || 400

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#1a1a2e')
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100)
    camera.position.set(0, 1.2, 2.5)
    camera.lookAt(0, 1, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1, 0)
    controls.enablePan = false
    controls.minPolarAngle = Math.PI * 0.15
    controls.maxPolarAngle = Math.PI * 0.85
    controls.minDistance = 1.5
    controls.maxDistance = 5
    controls.update()
    controlsRef.current = controls

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(1, 2, 1)
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-1, 1, -1)
    scene.add(fillLight)

    // Ground grid (subtle)
    const grid = new THREE.GridHelper(4, 20, 0x444466, 0x333355)
    grid.position.y = 0
    scene.add(grid)

    // Load VRM
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    loader.loadAsync(DEFAULT_VRM_URL)
      .then((gltf) => {
        const vrm = gltf.userData.vrm as VRM
        if (!vrm) throw new Error('VRM not found in GLTF')

        // Face camera
        vrm.scene.rotation.y = Math.PI
        scene.add(vrm.scene)
        vrmRef.current = vrm
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('[PoseVRM] Load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load VRM')
        setIsLoading(false)
      })

    // Render loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      if (vrmRef.current) vrmRef.current.update(delta)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const ro = new ResizeObserver(() => {
      if (!container) return
      const r = container.getBoundingClientRect()
      const w = r.width || 400
      const h = r.height || 400
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current)
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.remove()
      if (vrmRef.current && sceneRef.current) {
        sceneRef.current.remove(vrmRef.current.scene)
      }
      sceneRef.current = null
      vrmRef.current = null
      initRef.current = false
    }
  }, [])

  // Apply ONNX pose when joints3D changes or VRM loads
  useEffect(() => {
    const vrm = vrmRef.current
    if (!vrm || !joints3D) return

    resetVRMPose(vrm)
    applyOnnx3DToVRM(vrm, joints3D, 0.85)
  }, [joints3D, isLoading]) // re-run when loading finishes

  // Camera view preset
  const handleViewChange = useCallback((view: ViewPreset) => {
    setCurrentView(view)
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const preset = VIEW_POSITIONS[view]
    camera.position.set(...preset.pos)
    controls.target.set(...preset.lookAt)
    controls.update()
  }, [])

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border bg-surface', className)}>
      {/* View label */}
      {viewLabel && (
        <div className="absolute left-3 top-3 z-10">
          <span className="rounded-full bg-primary/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {viewLabel}
          </span>
        </div>
      )}

      {/* Three.js container */}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ minHeight: '380px' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-text-secondary">
            {language === 'ko' ? 'VRM 모델 로딩...' : 'Loading VRM model...'}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm">
          <User className="h-10 w-10 text-text-secondary/30" />
          <p className="mt-2 text-sm text-error">{error}</p>
        </div>
      )}

      {/* No pose data */}
      {!isLoading && !error && !joints3D && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
          <User className="h-10 w-10 text-text-secondary/30" />
          <p className="mt-2 text-sm text-text-secondary">
            {language === 'ko' ? '자세 데이터 없음' : 'No pose data'}
          </p>
        </div>
      )}

      {/* View buttons */}
      {!isLoading && !error && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {(Object.keys(VIEW_POSITIONS) as ViewPreset[]).map((view) => (
            <button
              key={view}
              onClick={() => handleViewChange(view)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all',
                currentView === view
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-background/80 text-text-secondary hover:bg-background hover:text-text-primary backdrop-blur-sm border border-border/50'
              )}
            >
              {language === 'ko' ? VIEW_LABELS[view].ko : VIEW_LABELS[view].en}
            </button>
          ))}
        </div>
      )}

      {/* Drag hint */}
      {!isLoading && !error && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-1 text-[10px] text-text-secondary backdrop-blur-sm">
          <RotateCcw className="h-3 w-3" />
          {language === 'ko' ? '드래그하여 회전' : 'Drag to rotate'}
        </div>
      )}
    </div>
  )
}

export const PoseVrmViewer = memo(PoseVrmViewerInner)
