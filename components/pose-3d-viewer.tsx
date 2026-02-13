'use client';

import { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Pose3DResult } from '@/hooks/use-onnx-model';
import { render3DSkeleton, calculateAllAngles } from '@/lib/pose-3d-utils';

interface Pose3DViewerProps {
  pose3D: Pose3DResult | null;
  width?: number;
  height?: number;
  showAngles?: boolean;
  className?: string;
}

export function Pose3DViewer({
  pose3D,
  width = 400,
  height = 400,
  showAngles = true,
  className = '',
}: Pose3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 3D 스켈레톤 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 클리어
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // 그리드 그리기
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    const gridSize = 40;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 중심점 표시
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4a4a6e';
    ctx.fill();

    // 포즈가 없으면 안내 텍스트
    if (!pose3D) {
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('카메라에 사람이 보이면', width / 2, height / 2 - 10);
      ctx.fillText('3D 스켈레톤이 표시됩니다', width / 2, height / 2 + 10);
      return;
    }

    // 3D 스켈레톤 렌더링
    render3DSkeleton(ctx, pose3D, width, height, {
      scale: 250,
      showJoints: true,
      showBones: true,
      jointRadius: 6,
      boneWidth: 3,
    });

  }, [pose3D, width, height]);

  // 각도 계산
  const angles = pose3D ? calculateAllAngles(pose3D) : null;

  return (
    <Card className={className}>
      <div className="pb-2 p-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>3D 포즈</span>
          {pose3D && (
            <span className="text-xs font-normal text-green-500 border border-green-500 rounded-full px-2 py-0.5">
              신뢰도: {(pose3D.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <CardContent className="space-y-4">
        {/* 3D 캔버스 */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded-lg border border-gray-700"
          />
        </div>

        {/* 각도 정보 */}
        {showAngles && angles && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <AngleItem label="왼팔꿈치" value={angles.leftElbow} />
            <AngleItem label="오른팔꿈치" value={angles.rightElbow} />
            <AngleItem label="왼무릎" value={angles.leftKnee} />
            <AngleItem label="오른무릎" value={angles.rightKnee} />
            <AngleItem label="왼어깨" value={angles.leftShoulder} />
            <AngleItem label="오른어깨" value={angles.rightShoulder} />
            <AngleItem label="허리" value={angles.spine} />
            <AngleItem label="목" value={angles.neck} />
          </div>
        )}

        {/* 범례 */}
        <div className="flex flex-wrap gap-2 justify-center text-xs">
          <LegendItem color="#22C55E" label="왼쪽" />
          <LegendItem color="#EF4444" label="오른쪽" />
          <LegendItem color="#3B82F6" label="척추" />
        </div>
      </CardContent>
    </Card>
  );
}

// 각도 표시 컴포넌트
function AngleItem({ label, value }: { label: string; value: number }) {
  const getColor = (angle: number) => {
    if (angle < 30) return 'text-red-400';
    if (angle > 150) return 'text-red-400';
    return 'text-green-400';
  };

  return (
    <div className="flex justify-between bg-gray-800/50 px-2 py-1 rounded">
      <span className="text-gray-400">{label}</span>
      <span className={getColor(value)}>{value.toFixed(0)}°</span>
    </div>
  );
}

// 범례 컴포넌트
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-400">{label}</span>
    </div>
  );
}
