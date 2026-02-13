"""
PyTorch → ONNX 모델 변환 스크립트 (전체 데이터용)
- train.py의 모델 구조와 동일해야 함
"""

import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
import json
import onnx
import onnxruntime as ort

# ============================================================
# 설정 (train.py와 동일하게!)
# ============================================================

INPUT_DIM = 48
OUTPUT_DIM = 72
HIDDEN_DIM = 512
NUM_BLOCKS = 4

MODEL_DIR = Path(__file__).parent / "models"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "models"


# ============================================================
# 모델 정의 (train.py와 동일!)
# ============================================================

class ResidualBlock(nn.Module):
    """잔차 블록"""
    def __init__(self, dim):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(dim, dim),
            nn.BatchNorm1d(dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(dim, dim),
            nn.BatchNorm1d(dim),
        )
        self.relu = nn.ReLU()
    
    def forward(self, x):
        return self.relu(x + self.layers(x))


class Pose2Dto3DModel(nn.Module):
    """2D → 3D 포즈 변환 모델"""
    def __init__(self, input_dim=INPUT_DIM, output_dim=OUTPUT_DIM, 
                 hidden_dim=HIDDEN_DIM, num_blocks=NUM_BLOCKS):
        super().__init__()
        
        # 입력 레이어
        self.input_layer = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
        )
        
        # 잔차 블록들
        self.res_blocks = nn.Sequential(
            *[ResidualBlock(hidden_dim) for _ in range(num_blocks)]
        )
        
        # 출력 레이어
        self.output_layer = nn.Linear(hidden_dim, output_dim)
    
    def forward(self, x):
        x = self.input_layer(x)
        x = self.res_blocks(x)
        x = self.output_layer(x)
        return x


# ============================================================
# ONNX 변환
# ============================================================

def export_to_onnx():
    print("=" * 60)
    print("PyTorch → ONNX 모델 변환")
    print("=" * 60)
    
    # 모델 경로
    model_path = MODEL_DIR / "best_model.pth"
    
    if not model_path.exists():
        print(f"❌ 모델 파일이 없습니다: {model_path}")
        return
    
    # 모델 로드
    print(f"\n📂 모델 로드: {model_path}")
    checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
    
    print(f"   - 체크포인트 에포크: {checkpoint.get('epoch', 'N/A')}")
    print(f"   - 검증 손실: {checkpoint.get('val_loss', 'N/A'):.6f}")
    print(f"   - 검증 MPJPE: {checkpoint.get('val_mpjpe', 'N/A'):.4f}")
    
    # 모델 생성 및 가중치 로드
    model = Pose2Dto3DModel()
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # ONNX 변환
    print(f"\n🔄 ONNX 변환 중...")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = OUTPUT_DIR / "pose2d_to_3d.onnx"
    
    # 더미 입력
    dummy_input = torch.randn(1, INPUT_DIM)
    
    # 변환
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input_2d'],
        output_names=['output_3d'],
        dynamic_axes={
            'input_2d': {0: 'batch_size'},
            'output_3d': {0: 'batch_size'}
        }
    )
    
    file_size = onnx_path.stat().st_size / 1024
    print(f"   ✅ 저장 완료: {onnx_path}")
    print(f"   - 파일 크기: {file_size:.1f} KB")
    
    # ONNX 검증
    print(f"\n🔍 ONNX 모델 검증...")
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    print(f"   ✅ 모델 검증 통과!")
    
    # ONNX Runtime 테스트
    print(f"\n🧪 ONNX Runtime 추론 테스트...")
    ort_session = ort.InferenceSession(str(onnx_path))
    
    test_input = np.random.randn(1, INPUT_DIM).astype(np.float32)
    outputs = ort_session.run(None, {'input_2d': test_input})
    
    print(f"   - 입력 형태: {test_input.shape}")
    print(f"   - 출력 형태: {outputs[0].shape}")
    print(f"   ✅ 추론 테스트 통과!")
    
    # 메타데이터 저장
    metadata = {
        "input_dim": INPUT_DIM,
        "output_dim": OUTPUT_DIM,
        "hidden_dim": HIDDEN_DIM,
        "num_blocks": NUM_BLOCKS,
        "num_joints": 24,
        "joint_names": [
            "Pelvis", "L_Hip", "R_Hip", "Spine1", "L_Knee", "R_Knee",
            "Spine2", "L_Ankle", "R_Ankle", "Spine3", "L_Foot", "R_Foot",
            "Neck", "L_Collar", "R_Collar", "Head", "L_Shoulder", "R_Shoulder",
            "L_Elbow", "R_Elbow", "L_Wrist", "R_Wrist", "L_Hand", "R_Hand"
        ],
        "training_info": {
            "epoch": checkpoint.get('epoch', 'N/A'),
            "val_loss": float(checkpoint.get('val_loss', 0)),
            "val_mpjpe": float(checkpoint.get('val_mpjpe', 0)),
            "train_samples": 1779527,
            "val_samples": 114514
        },
        "normalization": {
            "img_width": 1920,
            "img_height": 1080,
            "pose_3d_scale": 1000.0
        }
    }
    
    metadata_path = OUTPUT_DIR / "pose2d_to_3d_metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"   - 메타데이터: {metadata_path}")
    
    print(f"\n{'='*60}")
    print("✅ ONNX 변환 완료!")
    print(f"{'='*60}")
    print(f"\n📍 Next.js에서 사용할 파일:")
    print(f"   - {onnx_path}")
    print(f"   - {metadata_path}")


if __name__ == "__main__":
    export_to_onnx()
