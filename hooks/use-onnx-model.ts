'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── onnxruntime-web을 webpack 외부에서 <script> 태그로 로드 ───
// webpack이 import.meta.url을 변환하면서 url.replace 에러가 발생하므로
// 빌드 시스템을 우회하여 브라우저에서 직접 로드합니다.

// AI Hub 24개 관절 이름
const AIHUB_JOINT_NAMES = [
  'Pelvis', 'L_Hip', 'R_Hip', 'Spine1', 'L_Knee', 'R_Knee',
  'Spine2', 'L_Ankle', 'R_Ankle', 'Spine3', 'L_Foot', 'R_Foot',
  'Neck', 'L_Collar', 'R_Collar', 'Head', 'L_Shoulder', 'R_Shoulder',
  'L_Elbow', 'R_Elbow', 'L_Wrist', 'R_Wrist', 'L_Hand', 'R_Hand',
];

// MediaPipe 33개 관절 → AI Hub 24개 관절 매핑
const MEDIAPIPE_TO_AIHUB_MAP: Record<number, number> = {
  23: 1,  24: 2,  25: 4,  26: 5,
  27: 7,  28: 8,  31: 10, 32: 11,
  11: 16, 12: 17, 13: 18, 14: 19,
  15: 20, 16: 21, 19: 22, 20: 23,
  0: 15,
};

export interface Pose3DResult {
  joints: { name: string; x: number; y: number; z: number }[];
  confidence: number;
}

export interface UseOnnxModelReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  predict: (landmarks2D: { x: number; y: number; visibility?: number }[]) => Promise<Pose3DResult | null>;
}

// window.ort 타입
interface OrtGlobal {
  env: {
    wasm: {
      wasmPaths: string;
      numThreads: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  InferenceSession: {
    create(uri: string, options?: Record<string, unknown>): Promise<OrtSession>;
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor;
}

interface OrtSession {
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
  release(): void;
}

interface OrtTensor {
  data: Float32Array | Int32Array | Uint8Array;
  dims: number[];
  type: string;
}

// <script> 태그로 ort.wasm.min.js 로드 (한 번만)
let scriptLoadPromise: Promise<OrtGlobal> | null = null;

function loadOrtScript(): Promise<OrtGlobal> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<OrtGlobal>((resolve, reject) => {
    // 이미 로드되어 있는 경우
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).ort) {
      resolve((window as unknown as Record<string, unknown>).ort as OrtGlobal);
      return;
    }

    const script = document.createElement('script');
    script.src = '/ort.wasm.min.js';
    script.async = true;

    script.onload = () => {
      const ort = (window as unknown as Record<string, unknown>).ort as OrtGlobal | undefined;
      if (ort) {
        resolve(ort);
      } else {
        reject(new Error('ort global not found after script load'));
      }
    };

    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load ort.wasm.min.js'));
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function useOnnxModel(): UseOnnxModelReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<OrtSession | null>(null);
  const ortRef = useRef<OrtGlobal | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      try {
        setIsLoading(true);
        setError(null);

        // 1) ort 스크립트 로드 (webpack 우회)
        const ort = await loadOrtScript();
        if (cancelled) return;
        ortRef.current = ort;

        // 2) WASM 경로 설정 (public/ 에서 서빙)
        ort.env.wasm.wasmPaths = '/';
        ort.env.wasm.numThreads = 1;

        // 3) ONNX 모델 세션 생성
        const session = await ort.InferenceSession.create(
          '/models/pose2d_to_3d.onnx',
          {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
          },
        );

        if (cancelled) {
          session.release();
          return;
        }

        sessionRef.current = session;
        setIsReady(true);
        console.log('ONNX 모델 로드 완료');
      } catch (err) {
        if (cancelled) return;
        console.error('ONNX 모델 로드 실패:', err);
        setError(err instanceof Error ? err.message : '모델 로드 실패');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadModel();

    return () => {
      cancelled = true;
      sessionRef.current?.release();
      sessionRef.current = null;
    };
  }, []);

  // MediaPipe 2D → AI Hub 24관절 변환
  const convertMediaPipeToAIHub = useCallback(
    (landmarks: { x: number; y: number; visibility?: number }[]): Float32Array | null => {
      if (landmarks.length < 33) return null;

      const input = new Float32Array(48);

      const pelvisX = (landmarks[23].x + landmarks[24].x) / 2;
      const pelvisY = (landmarks[23].y + landmarks[24].y) / 2;
      input[0] = pelvisX;
      input[1] = pelvisY;

      const shoulderCenterX = (landmarks[11].x + landmarks[12].x) / 2;
      const shoulderCenterY = (landmarks[11].y + landmarks[12].y) / 2;

      input[6] = pelvisX + (shoulderCenterX - pelvisX) * 0.33;
      input[7] = pelvisY + (shoulderCenterY - pelvisY) * 0.33;
      input[12] = pelvisX + (shoulderCenterX - pelvisX) * 0.5;
      input[13] = pelvisY + (shoulderCenterY - pelvisY) * 0.5;
      input[18] = pelvisX + (shoulderCenterX - pelvisX) * 0.75;
      input[19] = pelvisY + (shoulderCenterY - pelvisY) * 0.75;

      input[24] = shoulderCenterX;
      input[25] = shoulderCenterY;

      input[26] = (landmarks[11].x + shoulderCenterX) / 2;
      input[27] = (landmarks[11].y + shoulderCenterY) / 2;
      input[28] = (landmarks[12].x + shoulderCenterX) / 2;
      input[29] = (landmarks[12].y + shoulderCenterY) / 2;

      for (const [mpIdx, ahIdx] of Object.entries(MEDIAPIPE_TO_AIHUB_MAP)) {
        const mpIndex = parseInt(mpIdx);
        const ahIndex = typeof ahIdx === 'number' ? ahIdx : parseInt(String(ahIdx));
        input[ahIndex * 2] = landmarks[mpIndex].x;
        input[ahIndex * 2 + 1] = landmarks[mpIndex].y;
      }

      return input;
    },
    [],
  );

  // 2D → 3D 예측
  const predict = useCallback(
    async (
      landmarks2D: { x: number; y: number; visibility?: number }[],
    ): Promise<Pose3DResult | null> => {
      const ort = ortRef.current;
      if (!sessionRef.current || !isReady || !ort) return null;

      try {
        const input = convertMediaPipeToAIHub(landmarks2D);
        if (!input) return null;

        const inputTensor = new ort.Tensor('float32', input, [1, 48]);
        const results = await sessionRef.current.run({ input_2d: inputTensor });
        const output = results.output_3d.data as Float32Array;

        const joints = AIHUB_JOINT_NAMES.map((name, i) => ({
          name,
          x: output[i * 3],
          y: output[i * 3 + 1],
          z: output[i * 3 + 2],
        }));

        const confidence =
          landmarks2D.slice(0, 33).reduce((sum, lm) => sum + (lm.visibility ?? 1), 0) / 33;

        return { joints, confidence };
      } catch (err) {
        console.error('ONNX 추론 오류:', err);
        return null;
      }
    },
    [isReady, convertMediaPipeToAIHub],
  );

  return { isLoading, isReady, error, predict };
}
