/**
 * ONNX 24-joint 3D coordinates → VRM Humanoid Bone rotations
 *
 * Converts ONNX model output (24 joints × 3 coordinates) into VRM bone
 * quaternion rotations by computing direction vectors between parent-child
 * joints and comparing them against the VRM T-pose rest directions.
 *
 * ONNX coordinate system (from pose-3d-analyzer.ts patterns):
 *   - X and Z are horizontal (horizontal distance = sqrt(dx² + dz²))
 *   - Y is vertical (up)
 *   - This maps well to VRM's right-hand Y-up coordinate system
 *
 * VRM coordinate system:
 *   - Right-hand, Y-up, model faces -Z in rest pose
 *   - After loadVrm rotation (Math.PI around Y), model faces +Z (camera)
 */

import * as THREE from 'three'
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import type { Pose3DResult } from '@/hooks/use-onnx-model'

// ── ONNX Joint Index Constants ──
const J = {
  Pelvis: 0,
  L_Hip: 1,
  R_Hip: 2,
  Spine1: 3,
  L_Knee: 4,
  R_Knee: 5,
  Spine2: 6,
  L_Ankle: 7,
  R_Ankle: 8,
  Spine3: 9,
  L_Foot: 10,
  R_Foot: 11,
  Neck: 12,
  L_Collar: 13,
  R_Collar: 14,
  Head: 15,
  L_Shoulder: 16,
  R_Shoulder: 17,
  L_Elbow: 18,
  R_Elbow: 19,
  L_Wrist: 20,
  R_Wrist: 21,
  L_Hand: 22,
  R_Hand: 23,
} as const

// ── ONNX → VRM Bone mapping ──
// Each entry: [parentJointIdx, childJointIdx, VRMHumanBoneName, restDirection]
// restDirection = the direction from parent to child in T-pose
interface BoneMapping {
  parent: number
  child: number
  bone: VRMHumanBoneName
  restDir: THREE.Vector3
}

const UP = new THREE.Vector3(0, 1, 0)
const DOWN = new THREE.Vector3(0, -1, 0)
const LEFT = new THREE.Vector3(1, 0, 0)   // +X is left in ONNX (L_Hip.x > R_Hip.x)
const RIGHT = new THREE.Vector3(-1, 0, 0) // -X is right

const BONE_MAPPINGS: BoneMapping[] = [
  // Spine chain
  { parent: J.Pelvis, child: J.Spine1, bone: VRMHumanBoneName.Spine, restDir: UP },
  { parent: J.Spine1, child: J.Spine2, bone: VRMHumanBoneName.Chest, restDir: UP },
  { parent: J.Spine2, child: J.Spine3, bone: VRMHumanBoneName.UpperChest, restDir: UP },
  { parent: J.Spine3, child: J.Neck, bone: VRMHumanBoneName.Neck, restDir: UP },
  { parent: J.Neck, child: J.Head, bone: VRMHumanBoneName.Head, restDir: UP },

  // Left arm
  { parent: J.Spine3, child: J.L_Collar, bone: VRMHumanBoneName.LeftShoulder, restDir: LEFT },
  { parent: J.L_Collar, child: J.L_Shoulder, bone: VRMHumanBoneName.LeftUpperArm, restDir: LEFT },
  { parent: J.L_Shoulder, child: J.L_Elbow, bone: VRMHumanBoneName.LeftLowerArm, restDir: LEFT },
  { parent: J.L_Elbow, child: J.L_Wrist, bone: VRMHumanBoneName.LeftHand, restDir: LEFT },

  // Right arm
  { parent: J.Spine3, child: J.R_Collar, bone: VRMHumanBoneName.RightShoulder, restDir: RIGHT },
  { parent: J.R_Collar, child: J.R_Shoulder, bone: VRMHumanBoneName.RightUpperArm, restDir: RIGHT },
  { parent: J.R_Shoulder, child: J.R_Elbow, bone: VRMHumanBoneName.RightLowerArm, restDir: RIGHT },
  { parent: J.R_Elbow, child: J.R_Wrist, bone: VRMHumanBoneName.RightHand, restDir: RIGHT },

  // Left leg
  { parent: J.Pelvis, child: J.L_Hip, bone: VRMHumanBoneName.LeftUpperLeg, restDir: DOWN },
  { parent: J.L_Hip, child: J.L_Knee, bone: VRMHumanBoneName.LeftUpperLeg, restDir: DOWN },
  { parent: J.L_Knee, child: J.L_Ankle, bone: VRMHumanBoneName.LeftLowerLeg, restDir: DOWN },
  { parent: J.L_Ankle, child: J.L_Foot, bone: VRMHumanBoneName.LeftFoot, restDir: DOWN },

  // Right leg
  { parent: J.Pelvis, child: J.R_Hip, bone: VRMHumanBoneName.RightUpperLeg, restDir: DOWN },
  { parent: J.R_Hip, child: J.R_Knee, bone: VRMHumanBoneName.RightUpperLeg, restDir: DOWN },
  { parent: J.R_Knee, child: J.R_Ankle, bone: VRMHumanBoneName.RightLowerLeg, restDir: DOWN },
  { parent: J.R_Ankle, child: J.R_Foot, bone: VRMHumanBoneName.RightFoot, restDir: DOWN },
]

// Deduplicated mappings: when multiple entries share the same bone,
// use only the first (primary) one. E.g. LeftUpperLeg appears twice
// (Pelvis→L_Hip for hip offset and L_Hip→L_Knee for actual direction).
// We want L_Hip→L_Knee for the limb direction.
const PRIMARY_BONE_MAPPINGS: BoneMapping[] = (() => {
  const seen = new Set<string>()
  const result: BoneMapping[] = []
  // Process in reverse so later entries (the actual limb directions) take priority
  for (let i = BONE_MAPPINGS.length - 1; i >= 0; i--) {
    const m = BONE_MAPPINGS[i]
    if (!seen.has(m.bone)) {
      seen.add(m.bone)
      result.push(m)
    }
  }
  return result.reverse()
})()

// Reusable temp vectors
const _parentPos = new THREE.Vector3()
const _childPos = new THREE.Vector3()
const _currentDir = new THREE.Vector3()
const _quat = new THREE.Quaternion()

/**
 * Convert ONNX 3D joint position to VRM world-space Vector3.
 *
 * ONNX coords: Y-up, X/Z horizontal. The model output is already in
 * a Y-up right-hand coordinate system, so minimal conversion is needed.
 * We negate Z to match VRM's -Z forward convention (model faces camera).
 */
function onnxToVRM(joint: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(joint.x, joint.y, -joint.z)
}

/**
 * Compute the quaternion rotation to rotate restDirection to currentDirection.
 */
function computeBoneRotation(
  parentPos: THREE.Vector3,
  childPos: THREE.Vector3,
  restDirection: THREE.Vector3,
): THREE.Quaternion {
  _currentDir.subVectors(childPos, parentPos).normalize()

  // If vectors are nearly identical, return identity
  if (_currentDir.dot(restDirection) > 0.9999) {
    return new THREE.Quaternion()
  }

  // If vectors are nearly opposite, pick an arbitrary perpendicular axis
  if (_currentDir.dot(restDirection) < -0.9999) {
    const perp = Math.abs(restDirection.x) < 0.9
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromAxisAngle(perp, Math.PI)
  }

  return new THREE.Quaternion().setFromUnitVectors(restDirection, _currentDir)
}

/**
 * Apply ONNX 3D pose to a VRM model.
 *
 * @param vrm - The loaded VRM instance
 * @param pose3D - ONNX 24-joint 3D result
 * @param dampen - Overall dampening factor (0-1, default 0.8)
 */
export function applyOnnx3DToVRM(
  vrm: VRM,
  pose3D: Pose3DResult,
  dampen: number = 0.8,
): void {
  if (!vrm.humanoid || pose3D.joints.length < 24) return

  // Convert all joints to VRM space
  const vrmJoints = pose3D.joints.map((j) => onnxToVRM(j))

  // Apply Hips position (offset from rest position)
  const hipsNode = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips)
  if (hipsNode) {
    // Center the pelvis relative to the model
    // VRM rest position hips are at roughly (0, ~1, 0)
    // ONNX pelvis Y is usually around 0.8-1.0
    const pelvis = vrmJoints[J.Pelvis]
    hipsNode.position.set(
      pelvis.x * dampen * 0.5,
      0, // Keep Y at rest to avoid vertical drift
      pelvis.z * dampen * 0.5,
    )

    // Compute hips rotation from the hip line and spine direction
    const lHip = vrmJoints[J.L_Hip]
    const rHip = vrmJoints[J.R_Hip]
    const spine1 = vrmJoints[J.Spine1]

    // Hip facing direction: cross product of (L_Hip - R_Hip) × (Spine1 - Pelvis)
    const hipRight = new THREE.Vector3().subVectors(lHip, rHip).normalize()
    const spineUp = new THREE.Vector3().subVectors(spine1, pelvis).normalize()
    const hipForward = new THREE.Vector3().crossVectors(hipRight, spineUp).normalize()

    // Build rotation matrix from these axes
    const hipMatrix = new THREE.Matrix4().makeBasis(hipRight, spineUp, hipForward)
    const hipQuat = new THREE.Quaternion().setFromRotationMatrix(hipMatrix)

    // Slerp toward target
    hipsNode.quaternion.slerp(hipQuat, dampen)
  }

  // Apply bone rotations
  for (const mapping of PRIMARY_BONE_MAPPINGS) {
    const boneNode = vrm.humanoid.getNormalizedBoneNode(mapping.bone)
    if (!boneNode) continue

    _parentPos.copy(vrmJoints[mapping.parent])
    _childPos.copy(vrmJoints[mapping.child])

    _quat.copy(computeBoneRotation(_parentPos, _childPos, mapping.restDir))

    // Apply dampening via slerp from identity
    const identity = new THREE.Quaternion()
    _quat.copy(identity.slerp(_quat, dampen))

    boneNode.quaternion.copy(_quat)
  }
}

/**
 * Reset VRM to T-pose (all rotations identity, hips at origin).
 */
export function resetVRMPose(vrm: VRM): void {
  if (!vrm.humanoid) return

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
  ]

  allBones.forEach((boneName) => {
    const node = vrm.humanoid?.getNormalizedBoneNode(boneName)
    if (node) {
      node.quaternion.identity()
      if (boneName === VRMHumanBoneName.Hips) {
        node.position.set(0, 0, 0)
      }
    }
  })
}
