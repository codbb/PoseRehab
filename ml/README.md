# 🤖 AI Hub Pose 3D 학습 가이드

AI Hub "사람 인체/자세 3D" 데이터를 활용한 2D→3D 변환 모델 학습 가이드입니다.

---

## 📁 폴더 구조

```
ml/
├── data/
│   └── aihub-pose-3d/      # AI Hub 샘플 데이터
│       ├── label/
│       │   ├── 2d/         # 2D 관절 좌표 JSON
│       │   ├── 3d/         # 3D 관절 좌표 JSON
│       │   ├── camera/     # 카메라 파라미터
│       │   └── shape/      # 액터 체형 정보
│       └── raw/
│           ├── 3D_shape/   # 3D 메시 (OBJ)
│           └── Image/      # 원본 이미지
├── processed/              # 전처리된 데이터 (자동 생성)
├── models/                 # 학습된 모델 (자동 생성)
├── preprocess.py           # 1단계: 데이터 전처리
├── train.py                # 2단계: 모델 학습
├── export.py               # 3단계: ONNX 변환
├── requirements.txt        # 필요 패키지
└── README.md               # 이 파일
```

---

## 🚀 실행 순서

### 0단계: 환경 설정

```bash
# ml 폴더로 이동
cd ml

# 가상환경 생성 (권장)
python -m venv venv

# 가상환경 활성화
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt

# PyTorch GPU 버전 설치 (RTX 4050용)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 1단계: 데이터 전처리

```bash
python preprocess.py
```

**출력:**
- `processed/processed_data.npz` - 학습용 데이터

**예상 시간:** ~1분

### 2단계: 모델 학습

```bash
python train.py
```

**출력:**
- `models/best_model.pth` - 최고 성능 모델
- `models/final_model.pth` - 최종 모델
- `models/training_history.png` - 학습 곡선

**예상 시간:** ~5분 (GPU), ~30분 (CPU)

### 3단계: ONNX 변환

```bash
python export.py
```

**출력:**
- `public/models/pose2d_to_3d.onnx` - 브라우저용 모델
- `public/models/pose2d_to_3d_metadata.json` - 모델 메타데이터

---

## 📊 모델 정보

### 입력/출력

| 구분 | 형태 | 설명 |
|------|------|------|
| 입력 | (1, 48) | 24개 관절 × 2D 좌표 (x, y) |
| 출력 | (1, 72) | 24개 관절 × 3D 좌표 (x, y, z) |

### 관절 목록 (24개)

```
0: Pelvis (골반)
1: L_Hip (왼쪽 엉덩이)
2: R_Hip (오른쪽 엉덩이)
3: Spine1 (척추1)
4: L_Knee (왼쪽 무릎)
5: R_Knee (오른쪽 무릎)
6: Spine2 (척추2)
7: L_Ankle (왼쪽 발목)
8: R_Ankle (오른쪽 발목)
9: Spine3 (척추3)
10: L_Foot (왼쪽 발)
11: R_Foot (오른쪽 발)
12: Neck (목)
13: L_Collar (왼쪽 쇄골)
14: R_Collar (오른쪽 쇄골)
15: Head (머리)
16: L_Shoulder (왼쪽 어깨)
17: R_Shoulder (오른쪽 어깨)
18: L_Elbow (왼쪽 팔꿈치)
19: R_Elbow (오른쪽 팔꿈치)
20: L_Wrist (왼쪽 손목)
21: R_Wrist (오른쪽 손목)
22: L_Hand (왼쪽 손)
23: R_Hand (오른쪽 손)
```

---

## 🔧 Next.js 통합

학습 완료 후 `public/models/` 폴더에 ONNX 파일이 생성됩니다.

### 설치

```bash
npm install onnxruntime-web
```

### 사용 예시

```typescript
import * as ort from 'onnxruntime-web';

// 모델 로드
const session = await ort.InferenceSession.create('/models/pose2d_to_3d.onnx');

// 2D 좌표 입력 (MediaPipe 결과 변환)
const input2d = new Float32Array(48); // 24 joints × 2 coords

// 추론
const feeds = { input_2d: new ort.Tensor('float32', input2d, [1, 48]) };
const results = await session.run(feeds);

// 3D 좌표 출력
const output3d = results.output_3d.data; // Float32Array(72)
```

---

## ❓ 문제 해결

### CUDA 오류
```bash
# CUDA 버전 확인
nvidia-smi

# PyTorch CUDA 버전 재설치
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 메모리 부족
`train.py`에서 `BATCH_SIZE`를 줄여보세요:
```python
BATCH_SIZE = 32  # 64 → 32
```

### 데이터 매칭 실패
폴더 구조가 올바른지 확인하세요:
```
label/2d/01_F150C/  ← 폴더명
label/3d/01_F150C/  ← 동일해야 함
```

---

## 📈 성능 지표

- **MPJPE (Mean Per Joint Position Error)**: 관절당 평균 오차 (mm)
- 목표: < 100mm

---

## 📚 참고 자료

- [AI Hub 사람 인체/자세 3D](https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=209)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript.html)
- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html)
