import type { GameDifficulty, PoseMatchWall, PoseMatchResult } from '@/types/game'
import type { Landmark } from '@/types/posture'
import { generateId } from '@/lib/utils'
import { POSE_LANDMARKS } from '@/hooks/use-pose-detection'

// Difficulty configurations
export const POSE_MATCH_DIFFICULTY_CONFIG = {
  easy: {
    wallSpeed: 3000, // ms for wall to travel
    wallInterval: 4000, // ms between walls
    gameDuration: 60000, // 1 minute
    judgmentTime: 2000, // ms to hold pose
  },
  normal: {
    wallSpeed: 2500,
    wallInterval: 3000,
    gameDuration: 90000,
    judgmentTime: 1500,
  },
  hard: {
    wallSpeed: 2000,
    wallInterval: 2500,
    gameDuration: 120000,
    judgmentTime: 1000,
  },
}

// Pose types
export type PoseType =
  | 'arms_up'
  | 'arms_side'
  | 'left_arm_up'
  | 'right_arm_up'
  | 'crouch'
  | 't_pose'

export interface PoseDefinition {
  id: PoseType
  nameKo: string
  nameEn: string
  check: (landmarks: Landmark[]) => boolean
  silhouette: string // SVG path or description
}

// Score values
export const POSE_SCORE = {
  perfect: 100,
  pass: 50,
  fail: 0,
}

// Pose definitions with detection logic
export const POSE_DEFINITIONS: PoseDefinition[] = [
  {
    id: 'arms_up',
    nameKo: '양팔 들기',
    nameEn: 'Arms Up',
    check: (landmarks) => {
      if (landmarks.length < 33) return false
      const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
      const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]

      // Both hands above shoulders
      return (
        leftWrist.y < leftShoulder.y - 0.1 &&
        rightWrist.y < rightShoulder.y - 0.1
      )
    },
    silhouette: 'arms_up',
  },
  {
    id: 'arms_side',
    nameKo: '양팔 옆으로',
    nameEn: 'Arms Side',
    check: (landmarks) => {
      if (landmarks.length < 33) return false
      const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
      const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]

      // Hands at shoulder height and spread apart
      const leftAtHeight = Math.abs(leftWrist.y - leftShoulder.y) < 0.15
      const rightAtHeight = Math.abs(rightWrist.y - rightShoulder.y) < 0.15
      const spread = Math.abs(leftWrist.x - rightWrist.x) > 0.4

      return leftAtHeight && rightAtHeight && spread
    },
    silhouette: 'arms_side',
  },
  {
    id: 'left_arm_up',
    nameKo: '왼팔 들기',
    nameEn: 'Left Arm Up',
    check: (landmarks) => {
      if (landmarks.length < 33) return false
      const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
      const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
      const nose = landmarks[POSE_LANDMARKS.NOSE]

      // Left hand above head, right hand down
      return leftWrist.y < nose.y && rightWrist.y > leftShoulder.y
    },
    silhouette: 'left_arm_up',
  },
  {
    id: 'right_arm_up',
    nameKo: '오른팔 들기',
    nameEn: 'Right Arm Up',
    check: (landmarks) => {
      if (landmarks.length < 33) return false
      const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
      const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
      const nose = landmarks[POSE_LANDMARKS.NOSE]

      // Right hand above head, left hand down
      return rightWrist.y < nose.y && leftWrist.y > rightShoulder.y
    },
    silhouette: 'right_arm_up',
  },
  {
    id: 'crouch',
    nameKo: '쪼그려 앉기',
    nameEn: 'Crouch',
    check: (landmarks) => {
      if (landmarks.length < 33) return false
      const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
      const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
      const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE]
      const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE]

      // Hips lower than usual (closer to knees)
      const avgHipY = (leftHip.y + rightHip.y) / 2
      const avgKneeY = (leftKnee.y + rightKnee.y) / 2

      return avgHipY > avgKneeY - 0.15
    },
    silhouette: 'crouch',
  },
  {
    id: 't_pose',
    nameKo: 'T자 자세',
    nameEn: 'T-Pose',
    check: (landmarks) => {
      if (landmarks.length < 33) return false
      const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
      const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
      const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW]
      const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW]

      // Arms horizontal (elbows and wrists at shoulder height)
      const leftArmHorizontal =
        Math.abs(leftWrist.y - leftShoulder.y) < 0.1 &&
        Math.abs(leftElbow.y - leftShoulder.y) < 0.1
      const rightArmHorizontal =
        Math.abs(rightWrist.y - rightShoulder.y) < 0.1 &&
        Math.abs(rightElbow.y - rightShoulder.y) < 0.1

      // Arms spread wide
      const spread = Math.abs(leftWrist.x - rightWrist.x) > 0.5

      return leftArmHorizontal && rightArmHorizontal && spread
    },
    silhouette: 't_pose',
  },
]

// Get pose definition by ID
export function getPoseDefinition(poseId: PoseType): PoseDefinition | undefined {
  return POSE_DEFINITIONS.find((p) => p.id === poseId)
}

// Generate walls for a game session
export function generateWalls(difficulty: GameDifficulty): PoseMatchWall[] {
  const config = POSE_MATCH_DIFFICULTY_CONFIG[difficulty]
  const walls: PoseMatchWall[] = []
  const { gameDuration, wallInterval } = config

  // Filter poses based on difficulty
  const availablePoses =
    difficulty === 'easy'
      ? POSE_DEFINITIONS.filter((p) => ['arms_up', 'arms_side', 't_pose'].includes(p.id))
      : POSE_DEFINITIONS

  let currentTime = 3000 // Start walls after 3 seconds

  while (currentTime < gameDuration - 3000) {
    const randomPose = availablePoses[Math.floor(Math.random() * availablePoses.length)]

    walls.push({
      id: generateId(),
      timing: currentTime,
      pose: {
        leftArmUp: ['arms_up', 'left_arm_up'].includes(randomPose.id),
        rightArmUp: ['arms_up', 'right_arm_up'].includes(randomPose.id),
        leftLegUp: false,
        rightLegUp: false,
        crouch: randomPose.id === 'crouch',
      },
      holeShape: randomPose.id,
    })

    // Add variation to interval
    const variation = (Math.random() - 0.5) * (wallInterval * 0.2)
    currentTime += wallInterval + variation
  }

  return walls
}

// Check if player matches the required pose
export function checkPoseMatch(
  landmarks: Landmark[],
  poseId: string
): boolean {
  const pose = getPoseDefinition(poseId as PoseType)
  if (!pose) return false
  return pose.check(landmarks)
}

// Calculate final result
export function calculatePoseMatchResult(
  wallsResults: { passed: boolean; accuracy: number }[]
): PoseMatchResult {
  const wallsPassed = wallsResults.filter((w) => w.passed).length
  const totalWalls = wallsResults.length
  const accuracyBonus = Math.round(
    wallsResults.reduce((sum, w) => sum + w.accuracy, 0) / totalWalls
  )

  const score =
    wallsPassed * POSE_SCORE.pass +
    wallsResults.filter((w) => w.accuracy > 80).length * (POSE_SCORE.perfect - POSE_SCORE.pass)

  return {
    wallsPassed,
    totalWalls,
    accuracyBonus,
    score,
  }
}
