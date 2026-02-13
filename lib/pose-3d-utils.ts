/**
 * 3D 포즈 변환 유틸리티
 * - MediaPipe 2D → AI Hub 24관절 → 3D 좌표
 */

import type { Pose3DResult } from '@/hooks/use-onnx-model';

// 관절 연결 정보 (스켈레톤 렌더링용)
export const SKELETON_CONNECTIONS: [number, number][] = [
  // 척추
  [0, 3],   // Pelvis → Spine1
  [3, 6],   // Spine1 → Spine2
  [6, 9],   // Spine2 → Spine3
  [9, 12],  // Spine3 → Neck
  [12, 15], // Neck → Head

  // 왼쪽 다리
  [0, 1],   // Pelvis → L_Hip
  [1, 4],   // L_Hip → L_Knee
  [4, 7],   // L_Knee → L_Ankle
  [7, 10],  // L_Ankle → L_Foot

  // 오른쪽 다리
  [0, 2],   // Pelvis → R_Hip
  [2, 5],   // R_Hip → R_Knee
  [5, 8],   // R_Knee → R_Ankle
  [8, 11],  // R_Ankle → R_Foot

  // 왼쪽 팔
  [12, 13], // Neck → L_Collar
  [13, 16], // L_Collar → L_Shoulder
  [16, 18], // L_Shoulder → L_Elbow
  [18, 20], // L_Elbow → L_Wrist
  [20, 22], // L_Wrist → L_Hand

  // 오른쪽 팔
  [12, 14], // Neck → R_Collar
  [14, 17], // R_Collar → R_Shoulder
  [17, 19], // R_Shoulder → R_Elbow
  [19, 21], // R_Elbow → R_Wrist
  [21, 23], // R_Wrist → R_Hand
];

// 관절별 색상 (시각화용)
export const JOINT_COLORS: Record<string, string> = {
  // 척추 - 파란색 계열
  Pelvis: '#3B82F6',
  Spine1: '#60A5FA',
  Spine2: '#93C5FD',
  Spine3: '#BFDBFE',
  Neck: '#1D4ED8',
  Head: '#1E40AF',

  // 왼쪽 - 초록색 계열
  L_Hip: '#22C55E',
  L_Knee: '#4ADE80',
  L_Ankle: '#86EFAC',
  L_Foot: '#BBF7D0',
  L_Collar: '#16A34A',
  L_Shoulder: '#15803D',
  L_Elbow: '#166534',
  L_Wrist: '#14532D',
  L_Hand: '#052E16',

  // 오른쪽 - 빨간색 계열
  R_Hip: '#EF4444',
  R_Knee: '#F87171',
  R_Ankle: '#FCA5A5',
  R_Foot: '#FECACA',
  R_Collar: '#DC2626',
  R_Shoulder: '#B91C1C',
  R_Elbow: '#991B1B',
  R_Wrist: '#7F1D1D',
  R_Hand: '#450A0A',
};

/**
 * 3D 좌표를 2D 화면에 투영 (간단한 정사영)
 */
export function project3Dto2D(
  pose3D: Pose3DResult,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 200
): { x: number; y: number; z: number; name: string }[] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return pose3D.joints.map((joint) => ({
    name: joint.name,
    x: centerX + joint.x * scale,
    y: centerY - joint.y * scale, // Y축 반전 (화면 좌표계)
    z: joint.z * scale,
  }));
}

/**
 * 3D 스켈레톤을 캔버스에 렌더링
 */
export function render3DSkeleton(
  ctx: CanvasRenderingContext2D,
  pose3D: Pose3DResult,
  canvasWidth: number,
  canvasHeight: number,
  options: {
    scale?: number;
    showJoints?: boolean;
    showBones?: boolean;
    jointRadius?: number;
    boneWidth?: number;
  } = {}
): void {
  const {
    scale = 200,
    showJoints = true,
    showBones = true,
    jointRadius = 5,
    boneWidth = 2,
  } = options;

  const projected = project3Dto2D(pose3D, canvasWidth, canvasHeight, scale);

  // Z값 기준 정렬 (깊이에 따른 렌더링)
  const sortedConnections = [...SKELETON_CONNECTIONS].sort((a, b) => {
    const zA = (projected[a[0]].z + projected[a[1]].z) / 2;
    const zB = (projected[b[0]].z + projected[b[1]].z) / 2;
    return zA - zB; // 뒤에서 앞으로
  });

  // 뼈대 그리기
  if (showBones) {
    for (const [startIdx, endIdx] of sortedConnections) {
      const start = projected[startIdx];
      const end = projected[endIdx];

      // Z값에 따른 투명도
      const avgZ = (start.z + end.z) / 2;
      const alpha = Math.max(0.3, Math.min(1, 0.7 + avgZ / 500));

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
      ctx.lineWidth = boneWidth;
      ctx.stroke();
    }
  }

  // 관절 그리기
  if (showJoints) {
    // Z값 기준 정렬
    const sortedJoints = [...projected].sort((a, b) => a.z - b.z);

    for (const joint of sortedJoints) {
      const color = JOINT_COLORS[joint.name] || '#888888';

      // Z값에 따른 크기와 투명도
      const sizeMultiplier = Math.max(0.5, Math.min(1.5, 1 + joint.z / 300));
      const alpha = Math.max(0.4, Math.min(1, 0.7 + joint.z / 500));

      ctx.beginPath();
      ctx.arc(joint.x, joint.y, jointRadius * sizeMultiplier, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/**
 * 3D 좌표에서 관절 각도 계산
 */
export function calculate3DAngle(
  pose3D: Pose3DResult,
  jointA: string,
  jointB: string,
  jointC: string
): number {
  const a = pose3D.joints.find((j) => j.name === jointA);
  const b = pose3D.joints.find((j) => j.name === jointB);
  const c = pose3D.joints.find((j) => j.name === jointC);

  if (!a || !b || !c) return 0;

  // 벡터 BA, BC
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  // 내적
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;

  // 벡터 크기
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  // 각도 (라디안 → 도)
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * 주요 관절 각도 계산
 */
export function calculateAllAngles(pose3D: Pose3DResult): Record<string, number> {
  return {
    // 왼쪽 팔꿈치
    leftElbow: calculate3DAngle(pose3D, 'L_Shoulder', 'L_Elbow', 'L_Wrist'),
    // 오른쪽 팔꿈치
    rightElbow: calculate3DAngle(pose3D, 'R_Shoulder', 'R_Elbow', 'R_Wrist'),
    // 왼쪽 어깨
    leftShoulder: calculate3DAngle(pose3D, 'L_Elbow', 'L_Shoulder', 'Spine3'),
    // 오른쪽 어깨
    rightShoulder: calculate3DAngle(pose3D, 'R_Elbow', 'R_Shoulder', 'Spine3'),
    // 왼쪽 무릎
    leftKnee: calculate3DAngle(pose3D, 'L_Hip', 'L_Knee', 'L_Ankle'),
    // 오른쪽 무릎
    rightKnee: calculate3DAngle(pose3D, 'R_Hip', 'R_Knee', 'R_Ankle'),
    // 왼쪽 엉덩이
    leftHip: calculate3DAngle(pose3D, 'L_Knee', 'L_Hip', 'Pelvis'),
    // 오른쪽 엉덩이
    rightHip: calculate3DAngle(pose3D, 'R_Knee', 'R_Hip', 'Pelvis'),
    // 허리 (척추 굽힘)
    spine: calculate3DAngle(pose3D, 'Pelvis', 'Spine2', 'Neck'),
    // 목
    neck: calculate3DAngle(pose3D, 'Spine3', 'Neck', 'Head'),
  };
}
