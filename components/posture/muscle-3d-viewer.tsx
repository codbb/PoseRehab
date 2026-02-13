'use client'

import { Suspense, useState, useRef, useCallback, useEffect, useMemo, memo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Loader2, RotateCcw, Eye } from 'lucide-react'
import type { Pose3DPredictedCondition, LegType } from '@/types/analysis-result'
import {
  getAffectedRegions,
  getRegionMuscles,
  MUSCLE_DATA,
  REGION_NAMES,
  type MuscleStatus,
} from '@/lib/analysis/muscle-condition-map'
import { cn } from '@/lib/utils'

// ── Types ──
interface MuscleMapping {
  regions: Record<string, {
    meshes: string[]
    state: string
    xMin: number | null
    xMax: number | null
    yMin: number | null
    yMax: number | null
  }>
  layers: {
    muscle: string[]
    bone: string[]
    tendon: string[]
    ligament: string[]
    cartilage: string[]
    capsule: string[]
    other: string[]
  }
}

interface Muscle3DViewerProps {
  conditions: Pose3DPredictedCondition[]
  legAlignmentType?: LegType
  language: 'ko' | 'en'
  className?: string
}

type ViewPreset = 'front' | 'back' | 'left' | 'right'

const VIEW_POSITIONS: Record<ViewPreset, [number, number, number]> = {
  front: [0, 0.8, 2.5],
  back: [0, 0.8, -2.5],
  left: [2.5, 0.8, 0],
  right: [-2.5, 0.8, 0],
}

const VIEW_LABELS: Record<ViewPreset, { ko: string; en: string }> = {
  front: { ko: '정면', en: 'Front' },
  back: { ko: '후면', en: 'Back' },
  left: { ko: '좌측', en: 'Left' },
  right: { ko: '우측', en: 'Right' },
}

// ── Materials ──
const CONTRACTED_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff4444,
  emissive: 0x331111,
  roughness: 0.6,
  metalness: 0.1,
  transparent: true,
  opacity: 0.85,
})

const ELONGATED_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  emissive: 0x111133,
  roughness: 0.6,
  metalness: 0.1,
  transparent: true,
  opacity: 0.85,
})

const NEUTRAL_MUSCLE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x8b6f6f,
  roughness: 0.7,
  metalness: 0.05,
  transparent: true,
  opacity: 0.35,
})

const BONE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.5,
  metalness: 0.05,
  transparent: true,
  opacity: 0.25,
})

// ── Hover highlight materials (slightly brighter) ──
const CONTRACTED_HOVER_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff6666,
  emissive: 0x662222,
  roughness: 0.5,
  metalness: 0.1,
  transparent: true,
  opacity: 0.95,
})

const ELONGATED_HOVER_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x66aaff,
  emissive: 0x222266,
  roughness: 0.5,
  metalness: 0.1,
  transparent: true,
  opacity: 0.95,
})

// ── Camera controller for smooth transitions ──
function CameraController({
  targetPosition,
}: {
  targetPosition: [number, number, number]
}) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.8, 0))
  const lerpFactor = useRef(0)
  const startPos = useRef(new THREE.Vector3())
  const endPos = useRef(new THREE.Vector3())
  const animating = useRef(false)

  useEffect(() => {
    startPos.current.copy(camera.position)
    endPos.current.set(...targetPosition)
    lerpFactor.current = 0
    animating.current = true
  }, [targetPosition, camera])

  useFrame(() => {
    if (!animating.current) return
    lerpFactor.current = Math.min(lerpFactor.current + 0.04, 1)
    camera.position.lerpVectors(startPos.current, endPos.current, lerpFactor.current)
    camera.lookAt(target.current)
    if (lerpFactor.current >= 1) animating.current = false
  })

  return null
}

// ── Tooltip component (rendered inside Canvas via Html) ──
function MeshTooltip({
  regionKey,
  status,
  language,
  conditions,
  legAlignmentType,
}: {
  regionKey: string
  status: MuscleStatus
  language: 'ko' | 'en'
  conditions: Pose3DPredictedCondition[]
  legAlignmentType?: LegType
}) {
  const regionName = REGION_NAMES[regionKey]
  const muscles = getRegionMuscles(regionKey, conditions, legAlignmentType)

  return (
    <Html
      center
      distanceFactor={3}
      style={{ pointerEvents: 'none' }}
    >
      <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg min-w-[140px]">
        <p className="font-semibold text-text-primary text-sm">
          {language === 'ko' ? regionName?.nameKo : regionName?.nameEn}
        </p>
        <p className={cn(
          'text-xs font-medium',
          status === 'contracted' ? 'text-red-500' : 'text-blue-500'
        )}>
          {status === 'contracted'
            ? (language === 'ko' ? '단축 (수축)' : 'Contracted')
            : (language === 'ko' ? '이완 (늘어남)' : 'Elongated')
          }
        </p>
        {muscles.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {muscles.slice(0, 3).map(({ muscleId, status: mStatus }) => {
              const data = MUSCLE_DATA[muscleId]
              if (!data) return null
              return (
                <p key={muscleId} className="text-[10px] text-text-secondary">
                  {language === 'ko' ? data.nameKo : data.nameEn}
                  <span className={mStatus === 'contracted' ? 'text-red-400' : 'text-blue-400'}>
                    {' '}({mStatus === 'contracted'
                      ? (language === 'ko' ? '수축' : 'Short')
                      : (language === 'ko' ? '이완' : 'Long')
                    })
                  </span>
                </p>
              )
            })}
            {muscles.length > 3 && (
              <p className="text-[10px] text-text-secondary">
                +{muscles.length - 3} {language === 'ko' ? '더보기' : 'more'}
              </p>
            )}
          </div>
        )}
      </div>
    </Html>
  )
}

// ── Build a lookup: meshName → list of { regionKey, bounds } ──
function buildMeshRegionLookup(mapping: MuscleMapping) {
  const lookup = new Map<string, Array<{ regionKey: string; xMin: number | null; xMax: number | null; yMin: number | null; yMax: number | null }>>()

  Object.entries(mapping.regions).forEach(([regionKey, region]) => {
    region.meshes.forEach((meshName) => {
      if (!lookup.has(meshName)) lookup.set(meshName, [])
      lookup.get(meshName)!.push({
        regionKey,
        xMin: region.xMin,
        xMax: region.xMax,
        yMin: region.yMin,
        yMax: region.yMax,
      })
    })
  })

  return lookup
}

// ── Check if a vertex position falls within a region's bounds ──
function isVertexInBounds(
  pos: THREE.Vector3,
  bounds: { xMin: number | null; xMax: number | null; yMin: number | null; yMax: number | null }
): boolean {
  if (bounds.xMin !== null && pos.x < bounds.xMin) return false
  if (bounds.xMax !== null && pos.x > bounds.xMax) return false
  if (bounds.yMin !== null && pos.y < bounds.yMin) return false
  if (bounds.yMax !== null && pos.y > bounds.yMax) return false
  return true
}

// ── Body Model Scene ──
function BodyModelScene({
  affectedRegions,
  mapping,
  language,
  conditions,
  legAlignmentType,
}: {
  affectedRegions: Map<string, MuscleStatus>
  mapping: MuscleMapping
  language: 'ko' | 'en'
  conditions: Pose3DPredictedCondition[]
  legAlignmentType?: LegType
}) {
  const { scene } = useGLTF('/models/body-model.glb')
  const [hoveredRegion, setHoveredRegion] = useState<{
    regionKey: string
    status: MuscleStatus
    point: THREE.Vector3
  } | null>(null)

  const muscleMeshSet = useMemo(() => new Set(mapping.layers.muscle), [mapping])
  const boneMeshSet = useMemo(() => new Set(mapping.layers.bone), [mapping])
  const meshRegionLookup = useMemo(() => buildMeshRegionLookup(mapping), [mapping])

  // Hidden layer sets
  const hiddenLayers = useMemo(() => {
    const set = new Set<string>()
    ;[
      ...mapping.layers.tendon,
      ...mapping.layers.ligament,
      ...mapping.layers.cartilage,
      ...mapping.layers.capsule,
      ...mapping.layers.other,
    ].forEach((name) => set.add(name))
    return set
  }, [mapping])

  // Process meshes on load
  useEffect(() => {
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const name = child.name

      // Hide non-relevant layers
      if (hiddenLayers.has(name)) {
        child.visible = false
        return
      }

      // Bone meshes
      if (boneMeshSet.has(name)) {
        child.material = BONE_MATERIAL
        child.visible = true
        return
      }

      // Muscle meshes
      if (muscleMeshSet.has(name)) {
        const regionEntries = meshRegionLookup.get(name)
        if (!regionEntries) {
          // Muscle mesh not in any region - show as neutral
          child.material = NEUTRAL_MUSCLE_MATERIAL
          child.visible = true
          return
        }

        // Check if any region for this mesh is affected
        let meshStatus: MuscleStatus | null = null
        let needsVertexColors = false
        let hasBounds = false

        for (const entry of regionEntries) {
          const status = affectedRegions.get(entry.regionKey)
          if (status) {
            meshStatus = status
            if (entry.xMin !== null || entry.xMax !== null || entry.yMin !== null || entry.yMax !== null) {
              hasBounds = true
            }
          }
        }

        if (!meshStatus) {
          child.material = NEUTRAL_MUSCLE_MATERIAL
          child.visible = true
          return
        }

        // If bounds exist, use vertex colors for precise region highlighting
        if (hasBounds) {
          needsVertexColors = true
          const geometry = child.geometry
          const posAttr = geometry.getAttribute('position')
          const count = posAttr.count
          const colors = new Float32Array(count * 3)

          // Neutral color (same as NEUTRAL_MUSCLE_MATERIAL)
          const neutralColor = new THREE.Color(0x8b6f6f)
          const contractedColor = new THREE.Color(0xff4444)
          const elongatedColor = new THREE.Color(0x4488ff)
          const tempVec = new THREE.Vector3()

          for (let i = 0; i < count; i++) {
            tempVec.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
            // Transform to world space
            child.localToWorld(tempVec)

            let vertexInRegion = false
            let vertexStatus: MuscleStatus | null = null
            for (const entry of regionEntries) {
              const rStatus = affectedRegions.get(entry.regionKey)
              if (rStatus && isVertexInBounds(tempVec, entry)) {
                vertexInRegion = true
                vertexStatus = rStatus
                break
              }
            }

            const color = vertexInRegion
              ? (vertexStatus === 'contracted' ? contractedColor : elongatedColor)
              : neutralColor

            colors[i * 3] = color.r
            colors[i * 3 + 1] = color.g
            colors[i * 3 + 2] = color.b
          }

          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

          child.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8,
          })
        } else {
          // No bounds - apply color to entire mesh
          child.material = meshStatus === 'contracted' ? CONTRACTED_MATERIAL : ELONGATED_MATERIAL
        }

        child.visible = true

        // Store userData for hover detection
        child.userData.regionEntries = regionEntries
        child.userData.hasStatus = true
        child.userData.needsVertexColors = needsVertexColors
        return
      }

      // Anything not in known layers - hide
      child.visible = false
    })
  }, [scene, affectedRegions, muscleMeshSet, boneMeshSet, hiddenLayers, meshRegionLookup])

  // Hover handler
  const handlePointerMove = useCallback((e: THREE.Event) => {
    const threeEvent = e as unknown as { object: THREE.Mesh; point: THREE.Vector3 }
    const mesh = threeEvent.object
    if (!mesh?.userData?.hasStatus) {
      setHoveredRegion(null)
      return
    }

    const regionEntries = mesh.userData.regionEntries as Array<{
      regionKey: string
      xMin: number | null
      xMax: number | null
      yMin: number | null
      yMax: number | null
    }>

    // Find which region the hovered point belongs to
    const point = threeEvent.point
    for (const entry of regionEntries) {
      const status = affectedRegions.get(entry.regionKey)
      if (status && isVertexInBounds(point, entry)) {
        setHoveredRegion({ regionKey: entry.regionKey, status, point })
        // Apply hover material
        if (!mesh.userData.needsVertexColors) {
          mesh.material = status === 'contracted' ? CONTRACTED_HOVER_MATERIAL : ELONGATED_HOVER_MATERIAL
        }
        return
      }
    }

    // If no specific region matched but mesh has status
    for (const entry of regionEntries) {
      const status = affectedRegions.get(entry.regionKey)
      if (status) {
        setHoveredRegion({ regionKey: entry.regionKey, status, point })
        if (!mesh.userData.needsVertexColors) {
          mesh.material = status === 'contracted' ? CONTRACTED_HOVER_MATERIAL : ELONGATED_HOVER_MATERIAL
        }
        return
      }
    }
  }, [affectedRegions])

  const handlePointerOut = useCallback((e: THREE.Event) => {
    const threeEvent = e as unknown as { object: THREE.Mesh }
    const mesh = threeEvent.object
    if (mesh?.userData?.hasStatus && !mesh.userData.needsVertexColors) {
      const regionEntries = mesh.userData.regionEntries as Array<{ regionKey: string }>
      for (const entry of regionEntries) {
        const status = affectedRegions.get(entry.regionKey)
        if (status) {
          mesh.material = status === 'contracted' ? CONTRACTED_MATERIAL : ELONGATED_MATERIAL
          break
        }
      }
    }
    setHoveredRegion(null)
  }, [affectedRegions])

  return (
    <group>
      <primitive
        object={scene}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      />
      {hoveredRegion && (
        <group position={[hoveredRegion.point.x, hoveredRegion.point.y + 0.1, hoveredRegion.point.z]}>
          <MeshTooltip
            regionKey={hoveredRegion.regionKey}
            status={hoveredRegion.status}
            language={language}
            conditions={conditions}
            legAlignmentType={legAlignmentType}
          />
        </group>
      )}
    </group>
  )
}

// ── Loading fallback ──
function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-text-secondary">3D Model Loading...</p>
      </div>
    </div>
  )
}

// ── Main Muscle3DViewer Component ──
function Muscle3DViewerInner({
  conditions,
  legAlignmentType,
  language,
  className,
}: Muscle3DViewerProps) {
  const [currentView, setCurrentView] = useState<ViewPreset>('front')
  const [mapping, setMapping] = useState<MuscleMapping | null>(null)
  const [mappingError, setMappingError] = useState(false)

  // Load muscle-mapping.json
  useEffect(() => {
    fetch('/data/muscle-mapping.json')
      .then((res) => res.json())
      .then((data: MuscleMapping) => setMapping(data))
      .catch(() => setMappingError(true))
  }, [])

  const affectedRegions = useMemo(
    () => getAffectedRegions(conditions, legAlignmentType),
    [conditions, legAlignmentType]
  )

  const stats = useMemo(() => {
    let contracted = 0
    let elongated = 0
    affectedRegions.forEach((status) => {
      if (status === 'contracted') contracted++
      else elongated++
    })
    return { contracted, elongated }
  }, [affectedRegions])

  if (mappingError) return null
  if (!mapping) return <LoadingFallback />

  return (
    <div className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Eye className="h-3.5 w-3.5 text-primary" />
          </span>
          {language === 'ko' ? '3D 근육 상태 시각화' : '3D Muscle Status Visualization'}
        </h3>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            <span>{language === 'ko' ? '단축(수축)' : 'Contracted'}: <strong className="text-red-500">{stats.contracted}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
            <span>{language === 'ko' ? '이완(늘어남)' : 'Elongated'}: <strong className="text-blue-500">{stats.elongated}</strong></span>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative" style={{ height: '420px' }}>
        <Canvas
          camera={{
            position: VIEW_POSITIONS.front,
            fov: 45,
            near: 0.1,
            far: 100,
          }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-3, 3, -3]} intensity={0.4} />

          <Suspense fallback={null}>
            <BodyModelScene
              affectedRegions={affectedRegions}
              mapping={mapping}
              language={language}
              conditions={conditions}
              legAlignmentType={legAlignmentType}
            />
          </Suspense>

          <CameraController targetPosition={VIEW_POSITIONS[currentView]} />
          <OrbitControls
            target={[0, 0.8, 0]}
            enablePan={false}
            minPolarAngle={Math.PI * 0.15}
            maxPolarAngle={Math.PI * 0.85}
            minDistance={1.5}
            maxDistance={4}
          />
        </Canvas>

        {/* View preset buttons */}
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {(Object.keys(VIEW_POSITIONS) as ViewPreset[]).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
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

        {/* Interaction hint */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-1 text-[10px] text-text-secondary backdrop-blur-sm">
          <RotateCcw className="h-3 w-3" />
          {language === 'ko' ? '드래그하여 회전' : 'Drag to rotate'}
        </div>
      </div>
    </div>
  )
}

export const Muscle3DViewer = memo(Muscle3DViewerInner)

// Preload model
useGLTF.preload('/models/body-model.glb')
