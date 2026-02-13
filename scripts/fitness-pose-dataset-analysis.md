# AI Hub 피트니스 자세 데이터셋 분석 결과

## 1. 데이터셋 개요

### 샘플 데이터 경로
```
C:\Users\user\Desktop\피트니스 자세 데이터\013.피트니스자세_sample\
├── 라벨링데이터/          # JSON 어노테이션 파일
│   └── D08-1-XXX.json    # 120개 파일
└── 원천데이터/            # 이미지 파일
    └── 1/
        ├── A/             # 카메라 앵글 A (view1)
        ├── B/             # 카메라 앵글 B (view2)
        ├── C/             # 카메라 앵글 C (view3)
        ├── D/             # 카메라 앵글 D (view4)
        └── E/             # 카메라 앵글 E (view5)
```

### 데이터 규모 (샘플)
- JSON 파일: 120개
- JPG 이미지: 19,195개
- 각 JSON은 16프레임 × 5뷰 = 80개 이미지 참조

---

## 2. JSON 어노테이션 구조

### 최상위 구조
```json
{
  "frames": [...],      // 16개 프레임
  "type": "033",        // 운동 타입 코드
  "type_info": {...}    // 운동 메타데이터
}
```

### type_info 구조
```json
{
  "key": "033",
  "type": "맨몸 운동",
  "pose": "선 자세",
  "exercise": "스탠딩 니업",
  "conditions": [
    { "condition": "시선 정면", "value": true },
    { "condition": "척추 중립", "value": true/false },
    { "condition": "무릎 충분히 올라오고", "value": true/false },
    { "condition": "이완시 다리 긴장 유지", "value": true/false }
  ],
  "description": "1 시선 정면, 2 척추 중립, ..."
}
```

### 정자세/오류자세 판별 방법
- **모든 conditions.value가 true** → 정자세 (Correct Posture)
- **하나라도 conditions.value가 false** → 오류자세 (Incorrect Posture)
- 어떤 condition이 false인지로 구체적인 오류 유형 파악 가능

### 프레임 구조
```json
{
  "view1": {
    "pts": { ... },           // 24개 키포인트 좌표
    "active": "Yes",          // 활성화 여부
    "img_key": "Day08.../A/033-1-1-21-Z17_A/033-1-1-21-Z17_A-0000001.jpg"
  },
  "view2": { ... },
  "view3": { ... },
  "view4": { ... },
  "view5": { ... }
}
```

---

## 3. 샘플 데이터 운동 종류

| 운동명 | 영문명 | 파일 수 | 조건 항목 |
|--------|--------|---------|-----------|
| 스탠딩 니업 | Standing Knee Up | 8 | 시선 정면, 척추 중립, 무릎 올라옴, 다리 긴장 |
| 오버 헤드 프레스 | Overhead Press | 16 | 척추 중립, 전완 수직, ... |
| 사이드 레터럴 레이즈 | Side Lateral Raise | 32 | 무릎 반동 없음, 어깨 으쓱 없음, ... |
| 바벨 컬 | Barbell Curl | 32 | 팔꿈치 위치 고정, 손목 중립, ... |
| 덤벨 컬 | Dumbbell Curl | 32 | 팔꿈치 위치 고정, 손목 중립, ... |

---

## 4. 키포인트 정의 (24개)

### 데이터셋 키포인트
| # | 이름 | 영문명 |
|---|------|--------|
| 0 | 코 | Nose |
| 1 | 왼쪽 눈 | Left Eye |
| 2 | 오른쪽 눈 | Right Eye |
| 3 | 왼쪽 귀 | Left Ear |
| 4 | 오른쪽 귀 | Right Ear |
| 5 | 왼쪽 어깨 | Left Shoulder |
| 6 | 오른쪽 어깨 | Right Shoulder |
| 7 | 왼쪽 팔꿈치 | Left Elbow |
| 8 | 오른쪽 팔꿈치 | Right Elbow |
| 9 | 왼쪽 손목 | Left Wrist |
| 10 | 오른쪽 손목 | Right Wrist |
| 11 | 왼쪽 엉덩이 | Left Hip |
| 12 | 오른쪽 엉덩이 | Right Hip |
| 13 | 왼쪽 무릎 | Left Knee |
| 14 | 오른쪽 무릎 | Right Knee |
| 15 | 왼쪽 발목 | Left Ankle |
| 16 | 오른쪽 발목 | Right Ankle |
| 17 | 목 | Neck |
| 18 | 왼쪽 손바닥 | Left Palm |
| 19 | 오른쪽 손바닥 | Right Palm |
| 20 | 등 | Back |
| 21 | 허리 | Waist |
| 22 | 왼쪽 발 | Left Foot |
| 23 | 오른쪽 발 | Right Foot |

---

## 5. COCO 17 ↔ 데이터셋 24 ↔ MediaPipe 33 매핑

### COCO 17 키포인트 (표준)
```
0: Nose, 1: Left Eye, 2: Right Eye, 3: Left Ear, 4: Right Ear,
5: Left Shoulder, 6: Right Shoulder, 7: Left Elbow, 8: Right Elbow,
9: Left Wrist, 10: Right Wrist, 11: Left Hip, 12: Right Hip,
13: Left Knee, 14: Right Knee, 15: Left Ankle, 16: Right Ankle
```

### MediaPipe Pose 33 키포인트
```
0: Nose, 1: Left Eye Inner, 2: Left Eye, 3: Left Eye Outer,
4: Right Eye Inner, 5: Right Eye, 6: Right Eye Outer,
7: Left Ear, 8: Right Ear, 9: Mouth Left, 10: Mouth Right,
11: Left Shoulder, 12: Right Shoulder, 13: Left Elbow, 14: Right Elbow,
15: Left Wrist, 16: Right Wrist, 17: Left Pinky, 18: Right Pinky,
19: Left Index, 20: Right Index, 21: Left Thumb, 22: Right Thumb,
23: Left Hip, 24: Right Hip, 25: Left Knee, 26: Right Knee,
27: Left Ankle, 28: Right Ankle, 29: Left Heel, 30: Right Heel,
31: Left Foot Index, 32: Right Foot Index
```

### 매핑 테이블: 데이터셋 24 → MediaPipe 33

| 데이터셋 키포인트 | MediaPipe 인덱스 | 비고 |
|------------------|-----------------|------|
| Nose | 0 | 직접 매핑 |
| Left Eye | 2 | MediaPipe Left Eye |
| Right Eye | 5 | MediaPipe Right Eye |
| Left Ear | 7 | 직접 매핑 |
| Right Ear | 8 | 직접 매핑 |
| Left Shoulder | 11 | 직접 매핑 |
| Right Shoulder | 12 | 직접 매핑 |
| Left Elbow | 13 | 직접 매핑 |
| Right Elbow | 14 | 직접 매핑 |
| Left Wrist | 15 | 직접 매핑 |
| Right Wrist | 16 | 직접 매핑 |
| Left Hip | 23 | 직접 매핑 |
| Right Hip | 24 | 직접 매핑 |
| Left Knee | 25 | 직접 매핑 |
| Right Knee | 26 | 직접 매핑 |
| Left Ankle | 27 | 직접 매핑 |
| Right Ankle | 28 | 직접 매핑 |
| Neck | - | (Left Shoulder + Right Shoulder) / 2 로 계산 |
| Left Palm | 19 | MediaPipe Left Index 근사 |
| Right Palm | 20 | MediaPipe Right Index 근사 |
| Back | - | (Neck + Waist) / 2 로 계산 |
| Waist | - | (Left Hip + Right Hip) / 2 로 계산 |
| Left Foot | 31 | MediaPipe Left Foot Index |
| Right Foot | 32 | MediaPipe Right Foot Index |

---

## 6. 학습 데이터 구성 전략

### 입력 특징 (Features)
1. **옵션 A: 24개 키포인트 좌표 (48차원)**
   - 정규화된 (x, y) 좌표 × 24개 = 48차원

2. **옵션 B: 관절 각도 기반 (추천)**
   - 주요 관절 각도 계산 (목, 어깨, 팔꿈치, 무릎, 엉덩이 등)
   - 약 10-15개 각도 특징
   - 스케일 불변성 확보

3. **옵션 C: 하이브리드**
   - 정규화 좌표 + 각도 + 거리 비율

### 출력 레이블 (Labels)
1. **이진 분류**: 정자세(1) vs 오류자세(0)
2. **다중 레이블**: 각 condition별 True/False 예측
3. **운동별 분류**: 운동 타입 + 자세 정확도

### 데이터 분할
- Train: 80%
- Validation: 10%
- Test: 10%
- Stratified split by exercise type and posture correctness

---

## 7. 학습 파이프라인 실행 가이드

### 환경 설정
```bash
cd scripts
pip install -r requirements.txt
```

### Step 2: 전처리 스크립트 실행 ✅ 완료
```bash
python preprocess_fitness_dataset.py \
    --input_dir "C:\Users\user\Desktop\피트니스 자세 데이터\013.피트니스자세_sample\라벨링데이터" \
    --output_dir "./processed_data" \
    --feature_type hybrid \
    --use_all_frames
```

**옵션 설명:**
- `--feature_type`: 특징 유형
  - `coordinates`: 정규화된 좌표만 (48차원)
  - `angles`: 관절 각도만 (10차원)
  - `hybrid`: 좌표 + 각도 (58차원, 권장)
- `--use_all_frames`: 모든 프레임 사용 (기본: 첫 프레임만)
- `--use_all_views`: 5개 뷰 모두 사용 (기본: view1만)

**출력 파일:**
- `X_train.npy`, `y_train.npy`: 학습 데이터
- `X_val.npy`, `y_val.npy`: 검증 데이터
- `X_test.npy`, `y_test.npy`: 테스트 데이터
- `metadata.json`: 메타데이터

### Step 3: 모델 학습 ✅ 완료
```bash
python train_posture_classifier.py \
    --data_dir "./processed_data" \
    --output_dir "./models" \
    --model_type mlp \
    --epochs 100 \
    --batch_size 32 \
    --lr 0.001
```

**옵션 설명:**
- `--model_type`: 모델 유형
  - `mlp`: 다층 퍼셉트론 (빠른 추론, 권장)
  - `lstm`: LSTM (시퀀스 처리용)
- `--early_stopping`: 조기 종료 인내 (기본: 10)

**출력 파일:**
- `best_model.pth`: PyTorch 체크포인트
- `posture_classifier.onnx`: ONNX 모델
- `training_info.json`: 학습 정보

### Step 4: ONNX 모델 테스트
```python
import onnxruntime as ort
import numpy as np

# 모델 로드
session = ort.InferenceSession("models/posture_classifier.onnx")

# 추론 (예: 58차원 특징 벡터)
input_data = np.random.randn(1, 58).astype(np.float32)
outputs = session.run(None, {"input": input_data})
probability = 1 / (1 + np.exp(-outputs[0]))  # sigmoid
is_correct = probability > 0.5
```

### Step 5: 웹 통합 ✅ 완료
- [x] `hooks/use-pose-classifier.ts` 작성
- [x] ONNX Runtime Web 연동
- [ ] 운동 세션 페이지 적용 (모델 학습 후)

### Step 6: 규칙 기반 피드백 대체
- [x] MediaPipe 키포인트 → 모델 입력 변환 (`convertMediaPipeToDataset`)
- [ ] 실시간 자세 분류 및 피드백 (모델 학습 후)

---

## 8. 모델 아키텍처

### MLP 모델 (권장)
```
Input (58) → Linear(128) → BN → ReLU → Dropout(0.3)
          → Linear(64)  → BN → ReLU → Dropout(0.3)
          → Linear(32)  → BN → ReLU → Dropout(0.3)
          → Linear(1)   → Sigmoid
```

### LSTM 모델 (시퀀스용)
```
Input (batch, seq, 58) → BiLSTM(64, 2 layers)
                       → Linear(32) → ReLU → Dropout(0.3)
                       → Linear(1)  → Sigmoid
```

---

## 9. MediaPipe → 모델 입력 변환

웹에서 MediaPipe로 추출한 33개 키포인트를 24개로 매핑 후 특징 추출:

```typescript
// MediaPipe 33 → Dataset 24 인덱스 매핑
const MP_TO_DATASET = {
  0: 0,   // Nose
  2: 1,   // Left Eye
  5: 2,   // Right Eye
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
  // 17-23은 계산 필요
};

// Neck = (Left Shoulder + Right Shoulder) / 2
// Waist = (Left Hip + Right Hip) / 2
// Back = (Neck + Waist) / 2
// Left Palm ≈ MediaPipe[19] (Left Index)
// Right Palm ≈ MediaPipe[20] (Right Index)
// Left Foot = MediaPipe[31] (Left Foot Index)
// Right Foot = MediaPipe[32] (Right Foot Index)
```
