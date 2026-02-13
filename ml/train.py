"""
2D → 3D Pose 변환 모델 학습 스크립트 (전체 데이터용)
- 189만 개 데이터 학습
- GPU 가속 지원
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
from tqdm import tqdm
import time

# ============================================================
# 설정
# ============================================================

# 경로
DATA_PATH = Path(__file__).parent / "processed" / "processed_data.npz"
MODEL_DIR = Path(__file__).parent / "models"

# 모델 하이퍼파라미터
INPUT_DIM = 48      # 24 joints × 2 (x, y)
OUTPUT_DIM = 72     # 24 joints × 3 (x, y, z)
HIDDEN_DIM = 512    # 더 큰 모델 (데이터가 많으니까)
NUM_BLOCKS = 4      # 레이어 수 증가

# 학습 하이퍼파라미터
BATCH_SIZE = 1024   # 큰 배치 (GPU 메모리 활용)
LEARNING_RATE = 0.001
EPOCHS = 50         # 데이터가 많아서 50 에포크로 충분
WEIGHT_DECAY = 1e-4

# 디바이스
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


# ============================================================
# 모델 정의
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
# 손실 함수
# ============================================================

def mpjpe_loss(pred, target):
    """Mean Per Joint Position Error (MPJPE)"""
    # (batch, 72) → (batch, 24, 3)
    pred = pred.view(-1, 24, 3)
    target = target.view(-1, 24, 3)
    
    # 각 관절별 유클리드 거리의 평균
    return torch.mean(torch.sqrt(torch.sum((pred - target) ** 2, dim=2)))


# ============================================================
# 학습 함수
# ============================================================

def train_model():
    print("=" * 60)
    print("2D → 3D Pose 변환 모델 학습 (전체 데이터)")
    print("=" * 60)
    
    # 데이터 로드
    print(f"\n📂 데이터 로드: {DATA_PATH}")
    data = np.load(DATA_PATH)
    
    # 새로운 키 이름 사용
    X_train = torch.FloatTensor(data['train_2d'])
    y_train = torch.FloatTensor(data['train_3d'])
    X_val = torch.FloatTensor(data['val_2d'])
    y_val = torch.FloatTensor(data['val_3d'])
    
    print(f"   - 학습 데이터: {len(X_train):,}개")
    print(f"   - 검증 데이터: {len(X_val):,}개")
    
    # 데이터로더
    train_dataset = TensorDataset(X_train, y_train)
    val_dataset = TensorDataset(X_val, y_val)
    
    train_loader = DataLoader(
        train_dataset, 
        batch_size=BATCH_SIZE, 
        shuffle=True,
        num_workers=0,
        pin_memory=True
    )
    val_loader = DataLoader(
        val_dataset, 
        batch_size=BATCH_SIZE,
        num_workers=0,
        pin_memory=True
    )
    
    # 모델 생성
    print(f"\n🔧 모델 생성")
    model = Pose2Dto3DModel().to(DEVICE)
    print(f"   - 디바이스: {DEVICE}")
    print(f"   - 히든 차원: {HIDDEN_DIM}")
    print(f"   - 레이어 수: {NUM_BLOCKS}")
    print(f"   - 파라미터 수: {sum(p.numel() for p in model.parameters()):,}개")
    
    # 옵티마이저 & 스케줄러
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    
    # 손실 함수
    mse_loss = nn.MSELoss()
    
    # 학습 기록
    history = {
        'train_loss': [], 'val_loss': [],
        'train_mpjpe': [], 'val_mpjpe': []
    }
    
    best_val_loss = float('inf')
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # 학습 시작
    print(f"\n🚀 학습 시작 (Epochs: {EPOCHS}, Batch: {BATCH_SIZE})")
    print("-" * 60)
    
    start_time = time.time()
    
    for epoch in range(EPOCHS):
        # Training
        model.train()
        train_losses = []
        train_mpjpes = []
        
        pbar = tqdm(train_loader, desc=f"Epoch {epoch+1:3d}/{EPOCHS}", leave=False)
        for X_batch, y_batch in pbar:
            X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
            
            optimizer.zero_grad()
            pred = model(X_batch)
            
            loss = mse_loss(pred, y_batch)
            mpjpe = mpjpe_loss(pred, y_batch)
            
            loss.backward()
            optimizer.step()
            
            train_losses.append(loss.item())
            train_mpjpes.append(mpjpe.item())
            
            pbar.set_postfix({'loss': f'{loss.item():.4f}'})
        
        # Validation
        model.eval()
        val_losses = []
        val_mpjpes = []
        
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
                pred = model(X_batch)
                
                loss = mse_loss(pred, y_batch)
                mpjpe = mpjpe_loss(pred, y_batch)
                
                val_losses.append(loss.item())
                val_mpjpes.append(mpjpe.item())
        
        # 에포크 평균
        train_loss = np.mean(train_losses)
        val_loss = np.mean(val_losses)
        train_mpjpe = np.mean(train_mpjpes)
        val_mpjpe = np.mean(val_mpjpes)
        
        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['train_mpjpe'].append(train_mpjpe)
        history['val_mpjpe'].append(val_mpjpe)
        
        # 스케줄러 업데이트
        scheduler.step()
        
        # 출력
        print(f"Epoch [{epoch+1:3d}/{EPOCHS}] | "
              f"Train Loss: {train_loss:.6f} | Val Loss: {val_loss:.6f} | "
              f"Train MPJPE: {train_mpjpe:.4f} | Val MPJPE: {val_mpjpe:.4f}")
        
        # 최고 모델 저장
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'val_mpjpe': val_mpjpe,
            }, MODEL_DIR / "best_model.pth")
    
    # 학습 완료
    elapsed_time = time.time() - start_time
    print("-" * 60)
    print(f"\n✅ 학습 완료!")
    print(f"   - 소요 시간: {elapsed_time/60:.1f}분")
    print(f"   - 최고 검증 손실: {best_val_loss:.6f}")
    print(f"   - 모델 저장: {MODEL_DIR / 'best_model.pth'}")
    
    # 최종 모델 저장
    torch.save({
        'epoch': EPOCHS,
        'model_state_dict': model.state_dict(),
        'val_loss': val_loss,
    }, MODEL_DIR / "final_model.pth")
    
    # 학습 곡선 저장
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    
    axes[0].plot(history['train_loss'], label='Train')
    axes[0].plot(history['val_loss'], label='Validation')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('Loss Curve')
    axes[0].legend()
    axes[0].grid(True)
    
    axes[1].plot(history['train_mpjpe'], label='Train')
    axes[1].plot(history['val_mpjpe'], label='Validation')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('MPJPE')
    axes[1].set_title('MPJPE Curve')
    axes[1].legend()
    axes[1].grid(True)
    
    plt.tight_layout()
    plt.savefig(MODEL_DIR / "training_history.png", dpi=150)
    print(f"   - 학습 곡선: {MODEL_DIR / 'training_history.png'}")


if __name__ == "__main__":
    train_model()
