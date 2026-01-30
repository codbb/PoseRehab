'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import type { UseKalidokitOptions, UseKalidokitReturn } from '@/types/avatar'

// Import Kalidokit dynamically to avoid type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Kalidokit: any = null

// Load Kalidokit on demand
async function loadKalidokit() {
  if (Kalidokit) return Kalidokit
  console.log('[Kalidokit] Loading module...')
  Kalidokit = await import('kalidokit')
  console.log('[Kalidokit] Module loaded:', Object.keys(Kalidokit))
  return Kalidokit
}

// Kalidokit to VRM bone name mapping for hands
// Kalidokit outputs PascalCase: LeftThumbProximal, LeftIndexIntermediate, etc.
// VRM uses camelCase enum values
const HAND_BONE_MAP: Record<string, VRMHumanBoneName> = {
  // Left hand
  'LeftWrist': VRMHumanBoneName.LeftHand,
  'LeftThumbProximal': VRMHumanBoneName.LeftThumbMetacarpal,
  'LeftThumbIntermediate': VRMHumanBoneName.LeftThumbProximal,
  'LeftThumbDistal': VRMHumanBoneName.LeftThumbDistal,
  'LeftIndexProximal': VRMHumanBoneName.LeftIndexProximal,
  'LeftIndexIntermediate': VRMHumanBoneName.LeftIndexIntermediate,
  'LeftIndexDistal': VRMHumanBoneName.LeftIndexDistal,
  'LeftMiddleProximal': VRMHumanBoneName.LeftMiddleProximal,
  'LeftMiddleIntermediate': VRMHumanBoneName.LeftMiddleIntermediate,
  'LeftMiddleDistal': VRMHumanBoneName.LeftMiddleDistal,
  'LeftRingProximal': VRMHumanBoneName.LeftRingProximal,
  'LeftRingIntermediate': VRMHumanBoneName.LeftRingIntermediate,
  'LeftRingDistal': VRMHumanBoneName.LeftRingDistal,
  'LeftLittleProximal': VRMHumanBoneName.LeftLittleProximal,
  'LeftLittleIntermediate': VRMHumanBoneName.LeftLittleIntermediate,
  'LeftLittleDistal': VRMHumanBoneName.LeftLittleDistal,
  // Right hand
  'RightWrist': VRMHumanBoneName.RightHand,
  'RightThumbProximal': VRMHumanBoneName.RightThumbMetacarpal,
  'RightThumbIntermediate': VRMHumanBoneName.RightThumbProximal,
  'RightThumbDistal': VRMHumanBoneName.RightThumbDistal,
  'RightIndexProximal': VRMHumanBoneName.RightIndexProximal,
  'RightIndexIntermediate': VRMHumanBoneName.RightIndexIntermediate,
  'RightIndexDistal': VRMHumanBoneName.RightIndexDistal,
  'RightMiddleProximal': VRMHumanBoneName.RightMiddleProximal,
  'RightMiddleIntermediate': VRMHumanBoneName.RightMiddleIntermediate,
  'RightMiddleDistal': VRMHumanBoneName.RightMiddleDistal,
  'RightRingProximal': VRMHumanBoneName.RightRingProximal,
  'RightRingIntermediate': VRMHumanBoneName.RightRingIntermediate,
  'RightRingDistal': VRMHumanBoneName.RightRingDistal,
  'RightLittleProximal': VRMHumanBoneName.RightLittleProximal,
  'RightLittleIntermediate': VRMHumanBoneName.RightLittleIntermediate,
  'RightLittleDistal': VRMHumanBoneName.RightLittleDistal,
}

// Utility function for smooth interpolation
function lerp(start: number, end: number, alpha: number): number {
  return start * (1 - alpha) + end * alpha
}

// Rigger function to apply rotation to VRM bone
function rigRotation(
  name: string,
  rotation: { x: number; y: number; z: number } | undefined,
  bone: THREE.Object3D | null,
  dampener: number = 1,
  lerpAmount: number = 0.3,
  shouldLog: boolean = false
): boolean {
  if (!bone) {
    if (shouldLog) console.log(`[VRM] Bone not found: ${name}`)
    return false
  }
  if (!rotation) {
    if (shouldLog) console.log(`[VRM] No rotation for: ${name}`)
    return false
  }

  // Apply rotation with dampening
  const targetEuler = new THREE.Euler(
    rotation.x * dampener,
    rotation.y * dampener,
    rotation.z * dampener,
    'XYZ'
  )

  const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler)

  // Slerp current rotation towards target
  bone.quaternion.slerp(targetQuat, lerpAmount)

  if (shouldLog) {
    console.log(`[VRM] Applied rotation to ${name}:`, {
      input: rotation,
      dampened: { x: rotation.x * dampener, y: rotation.y * dampener, z: rotation.z * dampener },
      result: { x: bone.quaternion.x.toFixed(3), y: bone.quaternion.y.toFixed(3), z: bone.quaternion.z.toFixed(3), w: bone.quaternion.w.toFixed(3) }
    })
  }

  return true
}

// Rigger function for position
function rigPosition(
  name: string,
  position: { x: number; y: number; z: number } | undefined,
  bone: THREE.Object3D | null,
  dampener: number = 1,
  lerpAmount: number = 0.3,
  shouldLog: boolean = false
): boolean {
  if (!bone || !position) return false

  bone.position.x = lerp(bone.position.x, position.x * dampener, lerpAmount)
  bone.position.y = lerp(bone.position.y, position.y * dampener + 1, lerpAmount) // +1 to raise model
  bone.position.z = lerp(bone.position.z, -position.z * dampener, lerpAmount)

  if (shouldLog) {
    console.log(`[VRM] Applied position to ${name}:`, bone.position)
  }

  return true
}

export function useKalidokit(options: UseKalidokitOptions): UseKalidokitReturn {
  const { vrm, mode, smoothing = 0.5 } = options

  const [isReady, setIsReady] = useState(false)
  const frameCountRef = useRef(0)

  // Load Kalidokit on mount
  useEffect(() => {
    loadKalidokit().then(() => {
      setIsReady(true)
      console.log('[Kalidokit] Ready to use')
    }).catch(err => {
      console.error('[Kalidokit] Failed to load:', err)
    })
  }, [])

  // Get VRM bone by name
  const getBone = useCallback((boneName: VRMHumanBoneName): THREE.Object3D | null => {
    if (!vrm) return null
    const node = vrm.humanoid?.getNormalizedBoneNode(boneName)
    return node || null
  }, [vrm])

  // Apply pose from MediaPipe landmarks
  const applyPose = useCallback((landmarks: { x: number; y: number; z: number; visibility?: number }[]) => {
    // Debug: Log every 30 frames to confirm function is being called
    if (frameCountRef.current % 30 === 0) {
      console.log('[Kalidokit] applyPose called - vrm:', !!vrm, 'Kalidokit:', !!Kalidokit, 'isReady:', isReady, 'landmarks:', landmarks.length, 'mode:', mode)
    }

    // Step 1: Validation
    if (!vrm) {
      if (frameCountRef.current % 30 === 0) console.log('[Kalidokit] applyPose - VRM not available')
      return
    }
    if (!Kalidokit) {
      if (frameCountRef.current % 30 === 0) console.log('[Kalidokit] applyPose - Kalidokit not loaded')
      return
    }
    if (!isReady) {
      if (frameCountRef.current % 30 === 0) console.log('[Kalidokit] applyPose - Not ready yet')
      return
    }
    if (landmarks.length === 0) {
      return
    }
    if (mode === 'hands') {
      return // Skip pose in hands-only mode
    }

    frameCountRef.current++
    const shouldLog = frameCountRef.current % 60 === 1 // Log first frame and every 60 frames
    const lerpAmount = 1 - smoothing

    if (shouldLog) {
      console.log('========== [Pose Processing] ==========')
      console.log('[Step 1] MediaPipe landmarks received:', landmarks.length)
      console.log('[Step 1] Sample landmark (nose):', landmarks[0])
    }

    try {
      // Step 2: Convert MediaPipe landmarks to Kalidokit format
      // Kalidokit.Pose.solve expects:
      // - pose3DLandmarks: Array of {x, y, z, visibility?}
      // - pose2DLandmarks: Array of {x, y, visibility?} (optional but helps accuracy)
      const pose3DLandmarks = landmarks.map(lm => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility ?? 1,
      }))

      const pose2DLandmarks = landmarks.map(lm => ({
        x: lm.x,
        y: lm.y,
        visibility: lm.visibility ?? 1,
      }))

      if (shouldLog) {
        console.log('[Step 2] Converted landmarks - 3D sample:', pose3DLandmarks[0])
        console.log('[Step 2] Converted landmarks - 2D sample:', pose2DLandmarks[0])
      }

      // Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks)
      const poseRig = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks)

      if (!poseRig) {
        if (shouldLog) console.log('[Step 2] Kalidokit.Pose.solve returned null!')
        return
      }

      if (shouldLog) {
        console.log('[Step 2] Kalidokit Pose rig keys:', Object.keys(poseRig))
        console.log('[Step 2] Spine:', poseRig.Spine)
        console.log('[Step 2] RightUpperArm:', poseRig.RightUpperArm)
        console.log('[Step 2] Hips:', poseRig.Hips)
      }

      // Step 3: Apply to VRM bones
      let appliedCount = 0

      // Hips (position + rotation)
      if (poseRig.Hips) {
        const hips = getBone(VRMHumanBoneName.Hips)
        if (poseRig.Hips.rotation) {
          if (rigRotation('Hips', poseRig.Hips.rotation, hips, 0.7, lerpAmount, shouldLog)) {
            appliedCount++
          }
        }
        if (poseRig.Hips.position) {
          rigPosition('Hips', poseRig.Hips.position, hips, 0.5, lerpAmount, shouldLog)
        }
      }

      // Spine
      if (poseRig.Spine) {
        const spine = getBone(VRMHumanBoneName.Spine)
        if (rigRotation('Spine', poseRig.Spine, spine, 0.5, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }

      // Chest
      const chest = getBone(VRMHumanBoneName.Chest)
      if (chest && poseRig.Spine) {
        const chestRotation = {
          x: poseRig.Spine.x * 0.3,
          y: poseRig.Spine.y * 0.3,
          z: poseRig.Spine.z * 0.3,
        }
        if (rigRotation('Chest', chestRotation, chest, 1, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }

      // Right Arm
      if (poseRig.RightUpperArm) {
        const bone = getBone(VRMHumanBoneName.RightUpperArm)
        if (rigRotation('RightUpperArm', poseRig.RightUpperArm, bone, 1, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }
      if (poseRig.RightLowerArm) {
        const bone = getBone(VRMHumanBoneName.RightLowerArm)
        if (rigRotation('RightLowerArm', poseRig.RightLowerArm, bone, 1, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }
      if (poseRig.RightHand) {
        const bone = getBone(VRMHumanBoneName.RightHand)
        if (rigRotation('RightHand', poseRig.RightHand, bone, 1, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }

      // Left Arm
      if (poseRig.LeftUpperArm) {
        const bone = getBone(VRMHumanBoneName.LeftUpperArm)
        if (rigRotation('LeftUpperArm', poseRig.LeftUpperArm, bone, 1, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }
      if (poseRig.LeftLowerArm) {
        const bone = getBone(VRMHumanBoneName.LeftLowerArm)
        if (rigRotation('LeftLowerArm', poseRig.LeftLowerArm, bone, 1, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }
      if (poseRig.LeftHand) {
        const bone = getBone(VRMHumanBoneName.LeftHand)
        if (rigRotation('LeftHand', poseRig.LeftHand, bone, 1, lerpAmount, shouldLog)) {
          appliedCount++
        }
      }

      // Legs (fullbody mode only)
      if (mode === 'fullbody') {
        // Right Leg
        if (poseRig.RightUpperLeg) {
          const bone = getBone(VRMHumanBoneName.RightUpperLeg)
          if (rigRotation('RightUpperLeg', poseRig.RightUpperLeg, bone, 1, lerpAmount, shouldLog)) {
            appliedCount++
          }
        }
        if (poseRig.RightLowerLeg) {
          const bone = getBone(VRMHumanBoneName.RightLowerLeg)
          if (rigRotation('RightLowerLeg', poseRig.RightLowerLeg, bone, 1, lerpAmount, shouldLog)) {
            appliedCount++
          }
        }

        // Left Leg
        if (poseRig.LeftUpperLeg) {
          const bone = getBone(VRMHumanBoneName.LeftUpperLeg)
          if (rigRotation('LeftUpperLeg', poseRig.LeftUpperLeg, bone, 1, lerpAmount, shouldLog)) {
            appliedCount++
          }
        }
        if (poseRig.LeftLowerLeg) {
          const bone = getBone(VRMHumanBoneName.LeftLowerLeg)
          if (rigRotation('LeftLowerLeg', poseRig.LeftLowerLeg, bone, 1, lerpAmount, shouldLog)) {
            appliedCount++
          }
        }
      }

      if (shouldLog) {
        console.log(`[Step 3] Applied rotations to ${appliedCount} bones`)
        console.log('=========================================')
      }

    } catch (err) {
      console.error('[Kalidokit] Pose error:', err)
    }
  }, [vrm, mode, smoothing, getBone, isReady])

  // Apply hand pose from MediaPipe hand landmarks
  const applyHands = useCallback((
    leftHand: { x: number; y: number; z: number }[] | null,
    rightHand: { x: number; y: number; z: number }[] | null
  ) => {
    // Debug: Log every 30 frames to confirm function is being called
    if (frameCountRef.current % 30 === 0) {
      console.log('[Kalidokit] applyHands called - vrm:', !!vrm, 'Kalidokit:', !!Kalidokit, 'isReady:', isReady, 'left:', leftHand?.length || 0, 'right:', rightHand?.length || 0)
    }

    // Step 1: Validation
    if (!vrm) {
      if (frameCountRef.current % 30 === 0) console.log('[Kalidokit] applyHands - VRM not available')
      return
    }
    if (!Kalidokit) {
      if (frameCountRef.current % 30 === 0) console.log('[Kalidokit] applyHands - Kalidokit not loaded')
      return
    }
    if (!isReady) {
      if (frameCountRef.current % 30 === 0) console.log('[Kalidokit] applyHands - Not ready yet')
      return
    }
    if (!leftHand && !rightHand) {
      return
    }

    frameCountRef.current++
    const shouldLog = frameCountRef.current % 60 === 1
    const lerpAmount = 1 - smoothing

    if (shouldLog) {
      console.log('========== [Hands Processing] ==========')
      console.log('[Step 1] Left hand landmarks:', leftHand?.length || 0)
      console.log('[Step 1] Right hand landmarks:', rightHand?.length || 0)
    }

    try {
      let appliedCount = 0

      // Helper function to apply hand rig to VRM
      const applyHandRig = (handRig: any, side: 'Left' | 'Right') => {
        if (!handRig) return 0

        let count = 0
        const rigKeys = Object.keys(handRig)

        if (shouldLog) {
          console.log(`[Step 2] ${side} hand rig keys:`, rigKeys)
          // Log a sample rotation value
          const sampleKey = rigKeys.find(k => k.includes('Index'))
          if (sampleKey) {
            console.log(`[Step 2] Sample ${sampleKey}:`, handRig[sampleKey])
          }
        }

        rigKeys.forEach((kalidokitKey) => {
          const vrmBoneName = HAND_BONE_MAP[kalidokitKey]
          if (!vrmBoneName) {
            if (shouldLog) console.log(`[Step 3] No mapping for: ${kalidokitKey}`)
            return
          }

          const bone = getBone(vrmBoneName)
          const rotation = handRig[kalidokitKey]

          if (shouldLog && kalidokitKey.includes('Index') && kalidokitKey.includes('Proximal')) {
            console.log(`[Step 3] ${kalidokitKey} -> ${vrmBoneName}:`, rotation, 'bone:', !!bone)
          }

          if (bone && rotation && typeof rotation === 'object' && rotation.x !== undefined) {
            if (rigRotation(kalidokitKey, rotation, bone, 1, lerpAmount, false)) {
              count++
            }
          }
        })

        return count
      }

      // Process Left Hand
      if (leftHand && leftHand.length >= 21) {
        const leftHandRig = Kalidokit.Hand.solve(leftHand, 'Left')
        appliedCount += applyHandRig(leftHandRig, 'Left')
      }

      // Process Right Hand
      if (rightHand && rightHand.length >= 21) {
        const rightHandRig = Kalidokit.Hand.solve(rightHand, 'Right')
        appliedCount += applyHandRig(rightHandRig, 'Right')
      }

      if (shouldLog) {
        console.log(`[Step 3] Applied rotations to ${appliedCount} bones`)
        console.log('=========================================')
      }

    } catch (err) {
      console.error('[Kalidokit] Hand error:', err)
    }
  }, [vrm, smoothing, getBone, isReady])

  // Reset pose to default T-pose
  const resetPose = useCallback(() => {
    if (!vrm) return

    console.log('[Kalidokit] Resetting pose to T-pose')

    // Reset all bone rotations
    const allBones: VRMHumanBoneName[] = [
      VRMHumanBoneName.Hips,
      VRMHumanBoneName.Spine,
      VRMHumanBoneName.Chest,
      VRMHumanBoneName.UpperChest,
      VRMHumanBoneName.Neck,
      VRMHumanBoneName.Head,
      VRMHumanBoneName.LeftShoulder,
      VRMHumanBoneName.LeftUpperArm,
      VRMHumanBoneName.LeftLowerArm,
      VRMHumanBoneName.LeftHand,
      VRMHumanBoneName.RightShoulder,
      VRMHumanBoneName.RightUpperArm,
      VRMHumanBoneName.RightLowerArm,
      VRMHumanBoneName.RightHand,
      VRMHumanBoneName.LeftUpperLeg,
      VRMHumanBoneName.LeftLowerLeg,
      VRMHumanBoneName.LeftFoot,
      VRMHumanBoneName.RightUpperLeg,
      VRMHumanBoneName.RightLowerLeg,
      VRMHumanBoneName.RightFoot,
      // Fingers
      VRMHumanBoneName.LeftThumbProximal,
      VRMHumanBoneName.LeftThumbDistal,
      VRMHumanBoneName.LeftIndexProximal,
      VRMHumanBoneName.LeftIndexIntermediate,
      VRMHumanBoneName.LeftIndexDistal,
      VRMHumanBoneName.LeftMiddleProximal,
      VRMHumanBoneName.LeftMiddleIntermediate,
      VRMHumanBoneName.LeftMiddleDistal,
      VRMHumanBoneName.LeftRingProximal,
      VRMHumanBoneName.LeftRingIntermediate,
      VRMHumanBoneName.LeftRingDistal,
      VRMHumanBoneName.LeftLittleProximal,
      VRMHumanBoneName.LeftLittleIntermediate,
      VRMHumanBoneName.LeftLittleDistal,
      VRMHumanBoneName.RightThumbProximal,
      VRMHumanBoneName.RightThumbDistal,
      VRMHumanBoneName.RightIndexProximal,
      VRMHumanBoneName.RightIndexIntermediate,
      VRMHumanBoneName.RightIndexDistal,
      VRMHumanBoneName.RightMiddleProximal,
      VRMHumanBoneName.RightMiddleIntermediate,
      VRMHumanBoneName.RightMiddleDistal,
      VRMHumanBoneName.RightRingProximal,
      VRMHumanBoneName.RightRingIntermediate,
      VRMHumanBoneName.RightRingDistal,
      VRMHumanBoneName.RightLittleProximal,
      VRMHumanBoneName.RightLittleIntermediate,
      VRMHumanBoneName.RightLittleDistal,
    ]

    allBones.forEach((boneName) => {
      const bone = getBone(boneName)
      if (bone) {
        bone.quaternion.identity()
      }
    })

    // Reset hips position
    const hips = getBone(VRMHumanBoneName.Hips)
    if (hips) {
      hips.position.set(0, 0, 0)
    }

    frameCountRef.current = 0
  }, [vrm, getBone])

  return {
    applyPose,
    applyHands,
    resetPose,
  }
}
