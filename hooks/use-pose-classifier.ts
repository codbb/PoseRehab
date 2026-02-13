'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// 타입 정의
// ============================================================================

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface PoseClassifierResult {
  // 자세 분류 결과
  isCorrect: boolean;
  postureConfidence: number;
  postureRawScore: number;
  // 운동 분류 결과
  exerciseType: number;
  exerciseConfidence: number;
  exerciseName: string;
}

interface UsePoseClassifierOptions {
  modelPath?: string;
  threshold?: number;
}

interface UsePoseClassifierReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  exerciseNames: string[];
  classify: (keypoints: Keypoint[]) => Promise<PoseClassifierResult | null>;
  classifyBatch: (keypointsBatch: Keypoint[][]) => Promise<PoseClassifierResult[]>;
}

// window.ort 타입 정의
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

// ============================================================================
// 상수 정의
// ============================================================================

// 운동 이름 목록 (학습된 모델의 클래스 순서와 일치)
const EXERCISE_NAMES = [
  'Squat',
  'Lunge',
  'Cross Lunge',
  'Side Lunge',
  'Push Up',
  'Knee Push Up',
  'Plank',
  'Crunch',
  'Bicycle Crunch',
  'Standing Side Crunch',
  'Lying Leg Raise',
  'Barbell Deadlift',
  'Barbell Row',
  'Dumbbell Bent Over Row',
  'Upright Row',
  'Front Raise',
  'Side Lateral Raise',
  'Overhead Press',
  'Hip Thrust',
  'Good Morning',
  'Burpee Test',
];

// 24개 키포인트 이름
const KEYPOINT_NAMES = [
  'Nose', 'Left Eye', 'Right Eye', 'Left Ear', 'Right Ear',
  'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip',
  'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle',
  'Neck', 'Left Palm', 'Right Palm', 'Back', 'Waist',
  'Left Foot', 'Right Foot'
];

// MediaPipe 33 → Dataset 24 매핑
const MP_TO_DATASET_MAP: Record<number, number> = {
  0: 0,   // Nose
  2: 1,   // Left Eye (MediaPipe Left Eye)
  5: 2,   // Right Eye (MediaPipe Right Eye)
  7: 3,   // Left Ear
  8: 4,   // Right Ear
  11: 5,  // Left Shoulder
  12: 6,  // Right Shoulder
  13: 7,  // Left Elbow
  14: 8,  // Right Elbow
  15: 9,  // Left Wrist
  16: 10, // Right Wrist
  23: 11, // Left Hip
  24: 12, // Right Hip
  25: 13, // Left Knee
  26: 14, // Right Knee
  27: 15, // Left Ankle
  28: 16, // Right Ankle
  19: 18, // Left Index → Left Palm 근사
  20: 19, // Right Index → Right Palm 근사
  31: 22, // Left Foot Index
  32: 23, // Right Foot Index
};

// ============================================================================
// ORT 스크립트 로더
// ============================================================================

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

// ============================================================================
// 특징 추출 함수
// ============================================================================

/**
 * MediaPipe 33 키포인트를 Dataset 24 형식으로 변환
 */
function convertMediaPipeToDataset(mpKeypoints: Keypoint[]): { coords: number[][]; visibility: number[] } {
  const coords: number[][] = new Array(24).fill(null).map(() => [0, 0]);
  const visibility: number[] = new Array(24).fill(0);

  // 직접 매핑되는 키포인트
  for (const [mpIdx, dsIdx] of Object.entries(MP_TO_DATASET_MAP)) {
    const kp = mpKeypoints[parseInt(mpIdx)];
    if (kp && (kp.visibility ?? 1) > 0.5) {
      coords[dsIdx] = [kp.x, kp.y];
      visibility[dsIdx] = 1;
    }
  }

  // 계산이 필요한 키포인트
  const leftShoulder = mpKeypoints[11];
  const rightShoulder = mpKeypoints[12];
  const leftHip = mpKeypoints[23];
  const rightHip = mpKeypoints[24];

  // Neck (17) = 양 어깨 중간점
  if (leftShoulder && rightShoulder &&
      (leftShoulder.visibility ?? 1) > 0.5 && (rightShoulder.visibility ?? 1) > 0.5) {
    coords[17] = [(leftShoulder.x + rightShoulder.x) / 2, (leftShoulder.y + rightShoulder.y) / 2];
    visibility[17] = 1;
  }

  // Waist (21) = 양 엉덩이 중간점
  if (leftHip && rightHip &&
      (leftHip.visibility ?? 1) > 0.5 && (rightHip.visibility ?? 1) > 0.5) {
    coords[21] = [(leftHip.x + rightHip.x) / 2, (leftHip.y + rightHip.y) / 2];
    visibility[21] = 1;
  }

  // Back (20) = Neck과 Waist 중간점
  if (visibility[17] && visibility[21]) {
    coords[20] = [(coords[17][0] + coords[21][0]) / 2, (coords[17][1] + coords[21][1]) / 2];
    visibility[20] = 1;
  }

  return { coords, visibility };
}

/**
 * 바운딩 박스 기준 좌표 정규화
 */
function normalizeCoordinates(coords: number[][], visibility: number[]): number[][] {
  const normalized = coords.map(c => [...c]);
  const visibleCoords = coords.filter((_, i) => visibility[i] > 0);

  if (visibleCoords.length === 0) return normalized;

  const xs = visibleCoords.map(c => c[0]);
  const ys = visibleCoords.map(c => c[1]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  for (let i = 0; i < 24; i++) {
    if (visibility[i] > 0) {
      normalized[i] = [
        (coords[i][0] - minX) / rangeX,
        (coords[i][1] - minY) / rangeY
      ];
    }
  }

  return normalized;
}

/**
 * 세 점으로 각도 계산 (라디안)
 */
function calcAngle(p1: number[], p2: number[], p3: number[]): number {
  const v1 = [p1[0] - p2[0], p1[1] - p2[1]];
  const v2 = [p3[0] - p2[0], p3[1] - p2[1]];

  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);

  if (mag1 < 1e-8 || mag2 < 1e-8) return 0;

  let cosAngle = dot / (mag1 * mag2);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));

  return Math.acos(cosAngle);
}

/**
 * 관절 각도 추출 (10개)
 */
function extractJointAngles(coords: number[][], visibility: number[]): number[] {
  const angleDefinitions: [number, number, number][] = [
    [11, 13, 15], // Left Knee Angle (Hip-Knee-Ankle)
    [12, 14, 16], // Right Knee Angle
    [5, 7, 9],    // Left Elbow Angle (Shoulder-Elbow-Wrist)
    [6, 8, 10],   // Right Elbow Angle
    [7, 5, 11],   // Left Shoulder Angle (Elbow-Shoulder-Hip)
    [8, 6, 12],   // Right Shoulder Angle
    [5, 11, 13],  // Left Hip Angle (Shoulder-Hip-Knee)
    [6, 12, 14],  // Right Hip Angle
    [5, 17, 6],   // Neck Angle (LShoulder-Neck-RShoulder)
    [11, 21, 12], // Waist Angle (LHip-Waist-RHip)
  ];

  return angleDefinitions.map(([i1, i2, i3]) => {
    if (visibility[i1] > 0 && visibility[i2] > 0 && visibility[i3] > 0) {
      return calcAngle(coords[i1], coords[i2], coords[i3]);
    }
    return 0;
  });
}

/**
 * 특징 벡터 추출 (58차원: 48 좌표 + 10 각도)
 */
function extractFeatures(mpKeypoints: Keypoint[]): Float32Array {
  const { coords, visibility } = convertMediaPipeToDataset(mpKeypoints);
  const normalizedCoords = normalizeCoordinates(coords, visibility);
  const angles = extractJointAngles(normalizedCoords, visibility);

  // 좌표 평탄화 (24 * 2 = 48)
  const flatCoords = normalizedCoords.flat();

  // 좌표 + 각도 결합 (48 + 10 = 58)
  return new Float32Array([...flatCoords, ...angles]);
}

/**
 * Softmax 함수
 */
function softmax(logits: Float32Array): Float32Array {
  const arr = Array.from(logits);
  const maxLogit = Math.max(...arr);
  const expScores = arr.map(l => Math.exp(l - maxLogit));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  // division by zero 방지
  if (sumExp === 0 || !isFinite(sumExp)) {
    // 균등 분포 반환
    const uniformProb = 1 / arr.length;
    return new Float32Array(arr.map(() => uniformProb));
  }
  return new Float32Array(expScores.map(e => e / sumExp));
}

/**
 * Float32Array에서 최대값의 인덱스 찾기
 */
function argmax(arr: Float32Array): number {
  let maxIdx = 0;
  let maxVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) {
      maxVal = arr[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

// ============================================================================
// 훅 구현 (Multi-Task 모델용)
// ============================================================================

export function usePoseClassifier(options: UsePoseClassifierOptions = {}): UsePoseClassifierReturn {
  // 옵션을 ref로 저장하여 무한 루프 방지
  const modelPath = options.modelPath ?? '/models/posture_classifier_multitask.onnx';
  const threshold = options.threshold ?? 0.5;
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<OrtSession | null>(null);
  const ortRef = useRef<OrtGlobal | null>(null);
  const modelPathRef = useRef(modelPath);
  const isLoadingRef = useRef(false);

  // 모델 로드 (modelPath가 실제로 변경될 때만 실행)
  useEffect(() => {
    // 이미 로딩 중이면 무시
    if (isLoadingRef.current) {
      return;
    }
    // modelPath가 실제로 변경되지 않았고 세션이 있으면 무시
    if (modelPathRef.current === modelPath && sessionRef.current) {
      return;
    }
    modelPathRef.current = modelPath;
    isLoadingRef.current = true;

    let cancelled = false;

    async function loadModel() {
      try {
        setIsLoading(true);
        setError(null);
        setIsReady(false);

        // 1) ort 스크립트 로드 (webpack 우회)
        const ort = await loadOrtScript();
        if (cancelled) return;
        ortRef.current = ort;

        // 2) WASM 경로 설정 (public/ 에서 서빙)
        ort.env.wasm.wasmPaths = '/';
        ort.env.wasm.numThreads = 1;

        // 3) ONNX 모델 세션 생성
        const session = await ort.InferenceSession.create(modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });

        if (cancelled) {
          session.release();
          return;
        }

        sessionRef.current = session;
        setIsReady(true);
        setIsLoading(false);
        isLoadingRef.current = false;
        console.log('Posture classifier (multitask) model loaded');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load posture classifier:', err);
        setError(err instanceof Error ? err.message : 'Failed to load model');
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }

    loadModel();

    return () => {
      cancelled = true;
      isLoadingRef.current = false;
    };
  }, [modelPath]);

  // 단일 분류
  const classify = useCallback(async (keypoints: Keypoint[]): Promise<PoseClassifierResult | null> => {
    const ort = ortRef.current;
    const session = sessionRef.current;
    if (!session || !ort) {
      return null;
    }

    try {
      // 특징 추출
      const features = extractFeatures(keypoints);

      // 입력 텐서 생성
      const inputTensor = new ort.Tensor('float32', features, [1, features.length]);

      // 추론 (Multi-Task: exercise_type, posture_correct 두 출력)
      const results = await session.run({ input: inputTensor });

      // 디버깅: 출력 구조 확인
      const outputKeys = Object.keys(results);

      // ONNX Runtime Web은 출력을 Map-like 객체로 반환
      let exerciseData: Float32Array | null = null;
      let postureData: Float32Array | null = null;

      // 출력 텐서 순회하며 데이터 추출
      for (const key of outputKeys) {
        const tensor = results[key] as OrtTensor;
        if (!tensor?.data) continue;

        const data = tensor.data as Float32Array;
        const dims = tensor.dims;

        // 차원으로 구분: exercise_type은 [1, 21], posture_correct는 [1, 1]
        if (dims.length === 2) {
          if (dims[1] > 1) {
            // 클래스가 여러 개면 exercise_type
            exerciseData = data;
          } else if (dims[1] === 1) {
            // 클래스가 1개면 posture_correct
            postureData = data;
          }
        } else if (dims.length === 1) {
          // 1차원 배열인 경우
          if (data.length > 2) {
            exerciseData = data;
          } else {
            postureData = data;
          }
        }
      }

      // 키 이름으로도 한 번 더 확인 (위에서 못 찾은 경우)
      if (!exerciseData || !postureData) {
        for (const key of outputKeys) {
          const tensor = results[key] as OrtTensor;
          if (!tensor?.data) continue;

          if (!exerciseData && (key === 'exercise_type' || key.includes('exercise'))) {
            exerciseData = tensor.data as Float32Array;
          }
          if (!postureData && (key === 'posture_correct' || key.includes('posture'))) {
            postureData = tensor.data as Float32Array;
          }
        }
      }

      if (!exerciseData || !postureData) {
        // 상세 디버깅 정보 출력
        const debugInfo = outputKeys.map(key => {
          const tensor = results[key] as OrtTensor;
          return {
            key,
            dims: tensor?.dims,
            dataLength: tensor?.data?.length
          };
        });
        console.error('Failed to get model outputs:', JSON.stringify(debugInfo, null, 2));
        console.error('exerciseData found:', !!exerciseData, 'postureData found:', !!postureData);
        return null;
      }

      // 운동 분류 결과 처리
      const exerciseProbs = softmax(exerciseData);
      const exerciseType = argmax(exerciseProbs);
      let exerciseConfidence = exerciseProbs[exerciseType];
      // NaN 체크
      if (isNaN(exerciseConfidence) || !isFinite(exerciseConfidence)) {
        console.warn('exerciseConfidence is NaN');
        exerciseConfidence = 0;
      }
      const exerciseName = EXERCISE_NAMES[exerciseType] || `Exercise_${exerciseType}`;

      // 자세 분류 결과 처리
      const postureLogit = postureData[0];
      let postureConfidence = 1 / (1 + Math.exp(-postureLogit));
      // NaN 체크 - logit이 undefined/NaN이면 0.5로 fallback
      if (isNaN(postureConfidence) || !isFinite(postureConfidence)) {
        console.warn('postureConfidence is NaN, logit was:', postureLogit);
        postureConfidence = 0.5;
      }
      const isCorrect = postureConfidence > thresholdRef.current;

      return {
        isCorrect,
        postureConfidence,
        postureRawScore: postureLogit,
        exerciseType,
        exerciseConfidence,
        exerciseName,
      };
    } catch (err) {
      console.error('Classification error:', err);
      return null;
    }
  }, []);

  // 배치 분류
  const classifyBatch = useCallback(async (keypointsBatch: Keypoint[][]): Promise<PoseClassifierResult[]> => {
    const ort = ortRef.current;
    const session = sessionRef.current;
    if (!session || !ort) {
      return [];
    }

    try {
      const batchSize = keypointsBatch.length;
      const featureDim = 58;

      // 배치 특징 추출
      const batchFeatures = new Float32Array(batchSize * featureDim);
      keypointsBatch.forEach((keypoints, i) => {
        const features = extractFeatures(keypoints);
        batchFeatures.set(features, i * featureDim);
      });

      // 입력 텐서 생성
      const inputTensor = new ort.Tensor('float32', batchFeatures, [batchSize, featureDim]);

      // 추론
      const results = await session.run({ input: inputTensor });

      // 출력 데이터 추출
      let exerciseLogits: Float32Array | null = null;
      let postureLogits: Float32Array | null = null;

      // 직접 속성 접근
      if (results.exercise_type?.data) {
        exerciseLogits = results.exercise_type.data as Float32Array;
      }
      if (results.posture_correct?.data) {
        postureLogits = results.posture_correct.data as Float32Array;
      }

      // 대괄호 표기법 fallback
      if (!exerciseLogits && results['exercise_type']?.data) {
        exerciseLogits = results['exercise_type'].data as Float32Array;
      }
      if (!postureLogits && results['posture_correct']?.data) {
        postureLogits = results['posture_correct'].data as Float32Array;
      }

      // entries fallback
      if (!exerciseLogits || !postureLogits) {
        for (const [key, value] of Object.entries(results)) {
          const tensor = value as OrtTensor;
          if (key === 'exercise_type' || key.includes('exercise')) {
            exerciseLogits = tensor.data as Float32Array;
          } else if (key === 'posture_correct' || key.includes('posture')) {
            postureLogits = tensor.data as Float32Array;
          }
        }
      }

      if (!exerciseLogits || !postureLogits) {
        console.error('Failed to get batch outputs');
        return [];
      }

      const numClasses = exerciseLogits.length / batchSize;

      // 결과 처리
      return Array.from({ length: batchSize }, (_, i) => {
        // 운동 분류
        const logitsSlice = new Float32Array(exerciseLogits!.slice(i * numClasses, (i + 1) * numClasses));
        const probs = softmax(logitsSlice);
        const exerciseType = argmax(probs);
        let exerciseConfidence = probs[exerciseType];
        if (isNaN(exerciseConfidence) || !isFinite(exerciseConfidence)) {
          exerciseConfidence = 0;
        }
        const exerciseName = EXERCISE_NAMES[exerciseType] || `Exercise_${exerciseType}`;

        // 자세 분류
        const postureLogit = postureLogits![i];
        let postureConfidence = 1 / (1 + Math.exp(-postureLogit));
        if (isNaN(postureConfidence) || !isFinite(postureConfidence)) {
          postureConfidence = 0.5;
        }
        const isCorrect = postureConfidence > thresholdRef.current;

        return {
          isCorrect,
          postureConfidence,
          postureRawScore: postureLogit,
          exerciseType,
          exerciseConfidence,
          exerciseName,
        };
      });
    } catch (err) {
      console.error('Batch classification error:', err);
      return [];
    }
  }, []);

  return {
    isLoading,
    isReady,
    error,
    exerciseNames: EXERCISE_NAMES,
    classify,
    classifyBatch,
  };
}

// ============================================================================
// 내보내기
// ============================================================================

export type { Keypoint, PoseClassifierResult, UsePoseClassifierOptions, UsePoseClassifierReturn };
export { extractFeatures, convertMediaPipeToDataset, normalizeCoordinates, extractJointAngles, KEYPOINT_NAMES, EXERCISE_NAMES };
