import type { VRM } from '@pixiv/three-vrm'
import type * as THREE from 'three'

// Tracking modes
export type TrackingMode = 'fullbody' | 'hands' | 'game'

// Viewer sizes
export type ViewerSize = 'small' | 'medium' | 'large'

// Camera presets
export type CameraPreset = 'front' | 'left' | 'right' | 'back'

// VRM Viewer Props
export interface VrmViewerProps {
  mode: TrackingMode
  size: ViewerSize
  showControls?: boolean
  className?: string
  vrmUrl?: string
  onLoad?: () => void
  onError?: (error: string) => void
}

// Avatar Controls Props
export interface AvatarControlsProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  backgroundColor: string
  onBackgroundChange: (color: string) => void
  lightingIntensity: number
  onLightingChange: (intensity: number) => void
  cameraPreset: CameraPreset
  onCameraPresetChange: (preset: CameraPreset) => void
  selectedVrm: string
  onVrmChange: (url: string) => void
  availableVrms: VrmOption[]
  onFileUpload?: (file: File) => void
}

// VRM option for selection
export interface VrmOption {
  name: string
  url: string
  thumbnail?: string
}

// Avatar settings state
export interface AvatarSettings {
  backgroundColor: string
  lightingIntensity: number
  cameraPreset: CameraPreset
  selectedVrmUrl: string
}

// Camera preset position
export interface CameraPosition {
  x: number
  y: number
  z: number
  lookAt?: { x: number; y: number; z: number }
}

// VRM bone rig for Kalidokit
export interface VrmBoneRig {
  head?: THREE.Object3D
  neck?: THREE.Object3D
  chest?: THREE.Object3D
  spine?: THREE.Object3D
  hips?: THREE.Object3D
  leftShoulder?: THREE.Object3D
  leftUpperArm?: THREE.Object3D
  leftLowerArm?: THREE.Object3D
  leftHand?: THREE.Object3D
  rightShoulder?: THREE.Object3D
  rightUpperArm?: THREE.Object3D
  rightLowerArm?: THREE.Object3D
  rightHand?: THREE.Object3D
  leftUpperLeg?: THREE.Object3D
  leftLowerLeg?: THREE.Object3D
  leftFoot?: THREE.Object3D
  rightUpperLeg?: THREE.Object3D
  rightLowerLeg?: THREE.Object3D
  rightFoot?: THREE.Object3D
}

// Kalidokit results
export interface KalidokitPoseResults {
  Hips?: { rotation: { x: number; y: number; z: number } }
  Spine?: { rotation: { x: number; y: number; z: number } }
  Chest?: { rotation: { x: number; y: number; z: number } }
  Neck?: { rotation: { x: number; y: number; z: number } }
  Head?: { rotation: { x: number; y: number; z: number } }
  LeftUpperArm?: { rotation: { x: number; y: number; z: number } }
  LeftLowerArm?: { rotation: { x: number; y: number; z: number } }
  LeftHand?: { rotation: { x: number; y: number; z: number } }
  RightUpperArm?: { rotation: { x: number; y: number; z: number } }
  RightLowerArm?: { rotation: { x: number; y: number; z: number } }
  RightHand?: { rotation: { x: number; y: number; z: number } }
  LeftUpperLeg?: { rotation: { x: number; y: number; z: number } }
  LeftLowerLeg?: { rotation: { x: number; y: number; z: number } }
  RightUpperLeg?: { rotation: { x: number; y: number; z: number } }
  RightLowerLeg?: { rotation: { x: number; y: number; z: number } }
}

export interface KalidokitHandResults {
  LeftWrist?: { rotation: { x: number; y: number; z: number } }
  RightWrist?: { rotation: { x: number; y: number; z: number } }
  LeftThumb?: { rotation: { x: number; y: number; z: number }[] }
  LeftIndex?: { rotation: { x: number; y: number; z: number }[] }
  LeftMiddle?: { rotation: { x: number; y: number; z: number }[] }
  LeftRing?: { rotation: { x: number; y: number; z: number }[] }
  LeftPinky?: { rotation: { x: number; y: number; z: number }[] }
  RightThumb?: { rotation: { x: number; y: number; z: number }[] }
  RightIndex?: { rotation: { x: number; y: number; z: number }[] }
  RightMiddle?: { rotation: { x: number; y: number; z: number }[] }
  RightRing?: { rotation: { x: number; y: number; z: number }[] }
  RightPinky?: { rotation: { x: number; y: number; z: number }[] }
}

// Use VRM hook options
export interface UseVrmOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  size?: ViewerSize
  backgroundColor?: string
  lightingIntensity?: number
  onLoad?: () => void
  onError?: (error: string) => void
}

// Use VRM hook return
export interface UseVrmReturn {
  isLoading: boolean
  isReady: boolean
  error: string | null
  vrm: VRM | null
  scene: THREE.Scene | null
  camera: THREE.PerspectiveCamera | null
  loadVrm: (url: string) => Promise<void>
  loadVrmFromFile: (file: File) => Promise<void>
  setCameraPreset: (preset: CameraPreset) => void
  setBackgroundColor: (color: string) => void
  setLightingIntensity: (intensity: number) => void
  startRenderLoop: () => void
  stopRenderLoop: () => void
  dispose: () => void
}

// Use Kalidokit hook options
export interface UseKalidokitOptions {
  vrm: VRM | null
  mode: TrackingMode
  smoothing?: number
}

// Use Kalidokit hook return
export interface UseKalidokitReturn {
  applyPose: (landmarks: { x: number; y: number; z: number; visibility?: number }[]) => void
  applyHands: (leftHand: { x: number; y: number; z: number }[] | null, rightHand: { x: number; y: number; z: number }[] | null) => void
  resetPose: () => void
}

// Default VRM models
export const DEFAULT_VRM_MODELS: VrmOption[] = [
  {
    name: 'Sample Avatar',
    url: 'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
  },
]

// Camera preset positions
export const CAMERA_PRESETS: Record<CameraPreset, CameraPosition> = {
  front: { x: 0, y: 1.2, z: 2.5, lookAt: { x: 0, y: 1, z: 0 } },
  left: { x: -2.5, y: 1.2, z: 0, lookAt: { x: 0, y: 1, z: 0 } },
  right: { x: 2.5, y: 1.2, z: 0, lookAt: { x: 0, y: 1, z: 0 } },
  back: { x: 0, y: 1.2, z: -2.5, lookAt: { x: 0, y: 1, z: 0 } },
}

// Size configurations
export const SIZE_CONFIG: Record<ViewerSize, { width: number; height: number; className: string }> = {
  small: { width: 320, height: 240, className: 'w-80 h-60' },
  medium: { width: 480, height: 360, className: 'w-[480px] h-[360px]' },
  large: { width: 640, height: 480, className: 'w-full h-full min-h-[400px]' },
}

// Background color options
export const BACKGROUND_COLORS = [
  { value: '#1a1a1a', label: 'Dark' },
  { value: '#2d2d2d', label: 'Gray' },
  { value: '#1e3a5f', label: 'Navy' },
  { value: '#2d4a2d', label: 'Forest' },
  { value: '#3d2d4a', label: 'Purple' },
  { value: '#ffffff', label: 'White' },
] as const
