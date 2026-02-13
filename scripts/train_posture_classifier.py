"""
자세 분류 모델 학습 스크립트 (Multi-Task Learning)

전처리된 데이터셋을 사용하여 PyTorch 모델을 학습하고,
ONNX 형식으로 변환합니다.

Multi-Task 출력:
- 출력 1: 운동 종류 분류 (19개 클래스, softmax)
- 출력 2: 정자세/오류자세 분류 (2개 클래스, sigmoid)

사용법:
    python train_posture_classifier.py --data_dir <전처리_데이터_경로>
"""

import json
import argparse
import shutil
import numpy as np
from pathlib import Path
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score


# ============================================================================
# 모델 정의
# ============================================================================

class PostureClassifierMLP(nn.Module):
    """
    다층 퍼셉트론 기반 자세 분류 모델 (단일 출력)

    입력: 키포인트 특징 벡터 (58차원 = 48 좌표 + 10 각도)
    출력: 이진 분류 (정자세/오류자세)
    """

    def __init__(self, input_dim: int = 58, hidden_dims: list = [128, 64, 32], dropout: float = 0.3):
        super().__init__()

        layers = []
        prev_dim = input_dim

        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
            ])
            prev_dim = hidden_dim

        # 출력층
        layers.append(nn.Linear(prev_dim, 1))

        self.network = nn.Sequential(*layers)

    def forward(self, x):
        return self.network(x)


class PostureClassifierMultiTask(nn.Module):
    """
    Multi-Task Learning 기반 자세 분류 모델

    입력: 키포인트 특징 벡터 (58차원 = 48 좌표 + 10 각도)
    출력 1 (exercise_type): 운동 종류 분류 (num_classes개 클래스)
    출력 2 (posture_correct): 정자세/오류자세 분류 (이진)

    구조:
    - 공유 레이어: 특징 추출 (128 → 64)
    - Exercise Head: 64 → 32 → num_classes
    - Posture Head: 64 → 32 → 1
    """

    def __init__(self, input_dim: int = 58, num_exercise_types: int = 19,
                 shared_dims: list = [128, 64], head_dim: int = 32, dropout: float = 0.3):
        super().__init__()

        # 공유 레이어 (특징 추출)
        shared_layers = []
        prev_dim = input_dim

        for hidden_dim in shared_dims:
            shared_layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.BatchNorm1d(hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
            ])
            prev_dim = hidden_dim

        self.shared = nn.Sequential(*shared_layers)

        # Exercise Classification Head (운동 종류 분류)
        self.exercise_head = nn.Sequential(
            nn.Linear(prev_dim, head_dim),
            nn.BatchNorm1d(head_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(head_dim, num_exercise_types),  # logits for softmax
        )

        # Posture Correctness Head (정자세/오류자세 분류)
        self.posture_head = nn.Sequential(
            nn.Linear(prev_dim, head_dim),
            nn.BatchNorm1d(head_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(head_dim, 1),  # logit for sigmoid
        )

        self.num_exercise_types = num_exercise_types

    def forward(self, x):
        """
        Forward pass

        Returns:
            exercise_logits: (batch, num_exercise_types) - 운동 종류 분류 logits
            posture_logit: (batch, 1) - 자세 정확도 logit
        """
        # 공유 레이어
        shared_features = self.shared(x)

        # 두 개의 헤드
        exercise_logits = self.exercise_head(shared_features)
        posture_logit = self.posture_head(shared_features)

        return exercise_logits, posture_logit


class PostureClassifierLSTM(nn.Module):
    """
    LSTM 기반 자세 분류 모델 (시퀀스 입력용)

    입력: (batch, seq_len, input_dim)
    출력: 이진 분류
    """

    def __init__(self, input_dim: int = 58, hidden_dim: int = 64,
                 num_layers: int = 2, dropout: float = 0.3):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=True
        )

        self.fc = nn.Sequential(
            nn.Linear(hidden_dim * 2, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
        )

    def forward(self, x):
        # x: (batch, seq_len, input_dim)
        if x.dim() == 2:
            x = x.unsqueeze(1)  # (batch, 1, input_dim)

        lstm_out, _ = self.lstm(x)
        # 마지막 타임스텝의 출력 사용
        last_output = lstm_out[:, -1, :]
        return self.fc(last_output)


# ============================================================================
# 학습 함수 (단일 태스크)
# ============================================================================

def train_epoch(model, dataloader, criterion, optimizer, device):
    """한 에폭 학습 (단일 태스크)"""
    model.train()
    total_loss = 0
    all_preds = []
    all_labels = []

    for X_batch, y_batch in dataloader:
        X_batch = X_batch.to(device)
        y_batch = y_batch.to(device).float().unsqueeze(1)

        optimizer.zero_grad()
        outputs = model(X_batch)
        loss = criterion(outputs, y_batch)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        preds = (torch.sigmoid(outputs) > 0.5).long().cpu().numpy()
        all_preds.extend(preds.flatten())
        all_labels.extend(y_batch.cpu().numpy().flatten())

    avg_loss = total_loss / len(dataloader)
    accuracy = accuracy_score(all_labels, all_preds)
    return avg_loss, accuracy


def evaluate(model, dataloader, criterion, device):
    """모델 평가 (단일 태스크)"""
    model.eval()
    total_loss = 0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for X_batch, y_batch in dataloader:
            X_batch = X_batch.to(device)
            y_batch = y_batch.to(device).float().unsqueeze(1)

            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)

            total_loss += loss.item()
            preds = (torch.sigmoid(outputs) > 0.5).long().cpu().numpy()
            all_preds.extend(preds.flatten())
            all_labels.extend(y_batch.cpu().numpy().flatten())

    avg_loss = total_loss / len(dataloader)
    accuracy = accuracy_score(all_labels, all_preds)
    f1 = f1_score(all_labels, all_preds, average='binary')

    return avg_loss, accuracy, f1, all_preds, all_labels


# ============================================================================
# 학습 함수 (Multi-Task)
# ============================================================================

def train_epoch_multitask(model, dataloader, criterion_exercise, criterion_posture,
                          optimizer, device, loss_weight_exercise=1.0, loss_weight_posture=1.0):
    """한 에폭 학습 (Multi-Task)"""
    model.train()
    total_loss = 0
    total_loss_exercise = 0
    total_loss_posture = 0

    all_ex_preds = []
    all_ex_labels = []
    all_pos_preds = []
    all_pos_labels = []

    for X_batch, y_exercise_batch, y_posture_batch in dataloader:
        X_batch = X_batch.to(device)
        y_exercise_batch = y_exercise_batch.to(device)
        y_posture_batch = y_posture_batch.to(device).float().unsqueeze(1)

        optimizer.zero_grad()

        # Forward
        exercise_logits, posture_logit = model(X_batch)

        # Loss 계산
        loss_exercise = criterion_exercise(exercise_logits, y_exercise_batch)
        loss_posture = criterion_posture(posture_logit, y_posture_batch)
        loss = loss_weight_exercise * loss_exercise + loss_weight_posture * loss_posture

        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        total_loss_exercise += loss_exercise.item()
        total_loss_posture += loss_posture.item()

        # Predictions
        ex_preds = exercise_logits.argmax(dim=1).cpu().numpy()
        pos_preds = (torch.sigmoid(posture_logit) > 0.5).long().cpu().numpy()

        all_ex_preds.extend(ex_preds)
        all_ex_labels.extend(y_exercise_batch.cpu().numpy())
        all_pos_preds.extend(pos_preds.flatten())
        all_pos_labels.extend(y_posture_batch.cpu().numpy().flatten())

    n_batches = len(dataloader)
    avg_loss = total_loss / n_batches
    avg_loss_exercise = total_loss_exercise / n_batches
    avg_loss_posture = total_loss_posture / n_batches

    exercise_acc = accuracy_score(all_ex_labels, all_ex_preds)
    posture_acc = accuracy_score(all_pos_labels, all_pos_preds)

    return {
        'loss': avg_loss,
        'loss_exercise': avg_loss_exercise,
        'loss_posture': avg_loss_posture,
        'exercise_acc': exercise_acc,
        'posture_acc': posture_acc,
    }


def evaluate_multitask(model, dataloader, criterion_exercise, criterion_posture, device,
                       loss_weight_exercise=1.0, loss_weight_posture=1.0):
    """모델 평가 (Multi-Task)"""
    model.eval()
    total_loss = 0
    total_loss_exercise = 0
    total_loss_posture = 0

    all_ex_preds = []
    all_ex_labels = []
    all_pos_preds = []
    all_pos_labels = []

    with torch.no_grad():
        for X_batch, y_exercise_batch, y_posture_batch in dataloader:
            X_batch = X_batch.to(device)
            y_exercise_batch = y_exercise_batch.to(device)
            y_posture_batch = y_posture_batch.to(device).float().unsqueeze(1)

            # Forward
            exercise_logits, posture_logit = model(X_batch)

            # Loss 계산
            loss_exercise = criterion_exercise(exercise_logits, y_exercise_batch)
            loss_posture = criterion_posture(posture_logit, y_posture_batch)
            loss = loss_weight_exercise * loss_exercise + loss_weight_posture * loss_posture

            total_loss += loss.item()
            total_loss_exercise += loss_exercise.item()
            total_loss_posture += loss_posture.item()

            # Predictions
            ex_preds = exercise_logits.argmax(dim=1).cpu().numpy()
            pos_preds = (torch.sigmoid(posture_logit) > 0.5).long().cpu().numpy()

            all_ex_preds.extend(ex_preds)
            all_ex_labels.extend(y_exercise_batch.cpu().numpy())
            all_pos_preds.extend(pos_preds.flatten())
            all_pos_labels.extend(y_posture_batch.cpu().numpy().flatten())

    n_batches = len(dataloader)
    avg_loss = total_loss / n_batches
    avg_loss_exercise = total_loss_exercise / n_batches
    avg_loss_posture = total_loss_posture / n_batches

    exercise_acc = accuracy_score(all_ex_labels, all_ex_preds)
    exercise_f1 = f1_score(all_ex_labels, all_ex_preds, average='weighted')
    posture_acc = accuracy_score(all_pos_labels, all_pos_preds)
    posture_f1 = f1_score(all_pos_labels, all_pos_preds, average='binary')

    return {
        'loss': avg_loss,
        'loss_exercise': avg_loss_exercise,
        'loss_posture': avg_loss_posture,
        'exercise_acc': exercise_acc,
        'exercise_f1': exercise_f1,
        'posture_acc': posture_acc,
        'posture_f1': posture_f1,
        'exercise_preds': all_ex_preds,
        'exercise_labels': all_ex_labels,
        'posture_preds': all_pos_preds,
        'posture_labels': all_pos_labels,
    }


# ============================================================================
# ONNX 변환
# ============================================================================

def export_to_onnx(model, input_dim, output_path, device):
    """PyTorch 모델을 ONNX로 변환 (단일 출력)"""
    model.eval()

    # 더미 입력
    dummy_input = torch.randn(1, input_dim).to(device)

    # ONNX 내보내기
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=12,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        }
    )

    print(f"ONNX 모델 저장: {output_path}")


def export_to_onnx_multitask(model, input_dim, output_path, device):
    """PyTorch Multi-Task 모델을 ONNX로 변환 (두 개 출력)"""
    model.eval()

    # 더미 입력
    dummy_input = torch.randn(1, input_dim).to(device)

    # ONNX 내보내기
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=12,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['exercise_type', 'posture_correct'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'exercise_type': {0: 'batch_size'},
            'posture_correct': {0: 'batch_size'}
        }
    )

    print(f"ONNX Multi-Task 모델 저장: {output_path}")


# ============================================================================
# 메인 실행
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='자세 분류 모델 학습 (Multi-Task)')
    parser.add_argument('--data_dir', type=str, required=True,
                        help='전처리된 데이터 폴더 경로')
    parser.add_argument('--output_dir', type=str, default='./models',
                        help='모델 저장 폴더')
    parser.add_argument('--model_type', type=str, default='multitask',
                        choices=['mlp', 'lstm', 'multitask'],
                        help='모델 유형 (multitask 권장)')
    parser.add_argument('--epochs', type=int, default=100,
                        help='학습 에폭 수')
    parser.add_argument('--batch_size', type=int, default=32,
                        help='배치 크기')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='학습률')
    parser.add_argument('--early_stopping', type=int, default=10,
                        help='조기 종료 인내')
    parser.add_argument('--loss_weight_exercise', type=float, default=1.0,
                        help='운동 분류 손실 가중치')
    parser.add_argument('--loss_weight_posture', type=float, default=1.0,
                        help='자세 분류 손실 가중치')

    args = parser.parse_args()

    # 디바이스 설정
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    # 데이터 로드
    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("데이터 로드 중...")

    # Multi-Task용 데이터 로드
    if args.model_type == 'multitask':
        X_train = np.load(data_dir / 'X_train.npy')
        y_exercise_train = np.load(data_dir / 'y_exercise_train.npy')
        y_posture_train = np.load(data_dir / 'y_posture_train.npy')
        X_val = np.load(data_dir / 'X_val.npy')
        y_exercise_val = np.load(data_dir / 'y_exercise_val.npy')
        y_posture_val = np.load(data_dir / 'y_posture_val.npy')
        X_test = np.load(data_dir / 'X_test.npy')
        y_exercise_test = np.load(data_dir / 'y_exercise_test.npy')
        y_posture_test = np.load(data_dir / 'y_posture_test.npy')

        with open(data_dir / 'metadata.json', 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        input_dim = X_train.shape[1]
        num_exercise_types = metadata.get('num_exercise_types', 19)

        print(f"입력 차원: {input_dim}")
        print(f"운동 종류 수: {num_exercise_types}")
        print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

        # 클래스 불균형 가중치 계산 (자세 분류용)
        posture_pos_weight = (y_posture_train == 0).sum() / max((y_posture_train == 1).sum(), 1)
        print(f"자세 분류 양성 클래스 가중치: {posture_pos_weight:.2f}")

        # 운동 종류별 가중치 계산 (클래스 불균형 처리)
        exercise_class_counts = np.bincount(y_exercise_train, minlength=num_exercise_types)
        exercise_weights = 1.0 / np.maximum(exercise_class_counts, 1)
        exercise_weights = exercise_weights / exercise_weights.sum() * num_exercise_types
        print(f"운동 분류 클래스별 샘플 수: {exercise_class_counts}")

        # 데이터로더 생성
        train_dataset = TensorDataset(
            torch.from_numpy(X_train).float(),
            torch.from_numpy(y_exercise_train).long(),
            torch.from_numpy(y_posture_train).long()
        )
        val_dataset = TensorDataset(
            torch.from_numpy(X_val).float(),
            torch.from_numpy(y_exercise_val).long(),
            torch.from_numpy(y_posture_val).long()
        )
        test_dataset = TensorDataset(
            torch.from_numpy(X_test).float(),
            torch.from_numpy(y_exercise_test).long(),
            torch.from_numpy(y_posture_test).long()
        )

        train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=args.batch_size)
        test_loader = DataLoader(test_dataset, batch_size=args.batch_size)

        # 모델 생성
        model = PostureClassifierMultiTask(
            input_dim=input_dim,
            num_exercise_types=num_exercise_types
        )
        model = model.to(device)
        print(f"\n모델 구조:\n{model}")

        # 손실 함수
        criterion_exercise = nn.CrossEntropyLoss(
            weight=torch.from_numpy(exercise_weights).float().to(device)
        )
        criterion_posture = nn.BCEWithLogitsLoss(
            pos_weight=torch.tensor([posture_pos_weight]).to(device)
        )

        # 옵티마이저
        optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

        # 학습
        print("\nMulti-Task 학습 시작...")
        best_combined_f1 = 0
        patience_counter = 0
        history = {
            'train_loss': [], 'val_loss': [],
            'train_exercise_acc': [], 'val_exercise_acc': [], 'val_exercise_f1': [],
            'train_posture_acc': [], 'val_posture_acc': [], 'val_posture_f1': [],
        }

        for epoch in range(args.epochs):
            # 학습
            train_metrics = train_epoch_multitask(
                model, train_loader, criterion_exercise, criterion_posture,
                optimizer, device, args.loss_weight_exercise, args.loss_weight_posture
            )

            # 검증
            val_metrics = evaluate_multitask(
                model, val_loader, criterion_exercise, criterion_posture, device,
                args.loss_weight_exercise, args.loss_weight_posture
            )

            # 기록
            history['train_loss'].append(train_metrics['loss'])
            history['val_loss'].append(val_metrics['loss'])
            history['train_exercise_acc'].append(train_metrics['exercise_acc'])
            history['val_exercise_acc'].append(val_metrics['exercise_acc'])
            history['val_exercise_f1'].append(val_metrics['exercise_f1'])
            history['train_posture_acc'].append(train_metrics['posture_acc'])
            history['val_posture_acc'].append(val_metrics['posture_acc'])
            history['val_posture_f1'].append(val_metrics['posture_f1'])

            # 스케줄러 업데이트
            scheduler.step(val_metrics['loss'])

            # Combined F1 (평균)
            combined_f1 = (val_metrics['exercise_f1'] + val_metrics['posture_f1']) / 2

            # 로그
            print(f"Epoch {epoch + 1:3d}/{args.epochs} | "
                  f"Loss: {train_metrics['loss']:.4f}/{val_metrics['loss']:.4f} | "
                  f"Ex Acc: {train_metrics['exercise_acc']:.3f}/{val_metrics['exercise_acc']:.3f} (F1: {val_metrics['exercise_f1']:.3f}) | "
                  f"Pos Acc: {train_metrics['posture_acc']:.3f}/{val_metrics['posture_acc']:.3f} (F1: {val_metrics['posture_f1']:.3f})")

            # 최고 성능 모델 저장
            if combined_f1 > best_combined_f1:
                best_combined_f1 = combined_f1
                patience_counter = 0
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'exercise_f1': val_metrics['exercise_f1'],
                    'posture_f1': val_metrics['posture_f1'],
                    'combined_f1': combined_f1,
                }, output_dir / 'best_model_multitask.pth')
            else:
                patience_counter += 1
                if patience_counter >= args.early_stopping:
                    print(f"\n조기 종료 (patience: {args.early_stopping})")
                    break

        # 최고 모델 로드
        checkpoint = torch.load(output_dir / 'best_model_multitask.pth')
        model.load_state_dict(checkpoint['model_state_dict'])
        print(f"\n최고 Combined F1: {checkpoint['combined_f1']:.4f} "
              f"(Exercise: {checkpoint['exercise_f1']:.4f}, Posture: {checkpoint['posture_f1']:.4f}) "
              f"(Epoch {checkpoint['epoch'] + 1})")

        # 테스트 평가
        print("\n=== 테스트셋 평가 ===")
        test_metrics = evaluate_multitask(
            model, test_loader, criterion_exercise, criterion_posture, device,
            args.loss_weight_exercise, args.loss_weight_posture
        )

        print(f"Test Loss: {test_metrics['loss']:.4f}")
        print(f"Exercise Accuracy: {test_metrics['exercise_acc']:.4f}")
        print(f"Exercise F1 Score: {test_metrics['exercise_f1']:.4f}")
        print(f"Posture Accuracy: {test_metrics['posture_acc']:.4f}")
        print(f"Posture F1 Score: {test_metrics['posture_f1']:.4f}")

        # 운동 분류 리포트
        exercise_names = metadata.get('exercise_names', [str(i) for i in range(num_exercise_types)])
        # 실제 데이터에 존재하는 클래스만 사용
        unique_labels = sorted(set(test_metrics['exercise_labels']) | set(test_metrics['exercise_preds']))
        filtered_names = [exercise_names[i] if i < len(exercise_names) else str(i) for i in unique_labels]
        print("\n=== 운동 분류 리포트 ===")
        print(classification_report(
            test_metrics['exercise_labels'],
            test_metrics['exercise_preds'],
            labels=unique_labels,
            target_names=filtered_names,
            zero_division=0
        ))

        # 자세 분류 리포트
        print("\n=== 자세 분류 리포트 ===")
        print(classification_report(
            test_metrics['posture_labels'],
            test_metrics['posture_preds'],
            labels=[0, 1],
            target_names=['오류자세', '정자세'],
            zero_division=0
        ))

        print("\n자세 분류 혼동 행렬:")
        print(confusion_matrix(test_metrics['posture_labels'], test_metrics['posture_preds']))

        # ONNX 변환
        print("\nONNX 변환 중...")
        onnx_path = output_dir / 'posture_classifier_multitask.onnx'
        export_to_onnx_multitask(model, input_dim, str(onnx_path), device)

        # public/models에 복사
        public_models_dir = Path(__file__).parent.parent / 'public' / 'models'
        public_models_dir.mkdir(parents=True, exist_ok=True)
        public_onnx_path = public_models_dir / 'posture_classifier_multitask.onnx'
        shutil.copy2(onnx_path, public_onnx_path)
        print(f"ONNX 모델 복사 완료: {public_onnx_path}")

        # 학습 히스토리 및 설정 저장
        training_info = {
            'model_type': args.model_type,
            'input_dim': input_dim,
            'num_exercise_types': num_exercise_types,
            'epochs_trained': len(history['train_loss']),
            'best_combined_f1': best_combined_f1,
            'test_exercise_accuracy': test_metrics['exercise_acc'],
            'test_exercise_f1': test_metrics['exercise_f1'],
            'test_posture_accuracy': test_metrics['posture_acc'],
            'test_posture_f1': test_metrics['posture_f1'],
            'feature_type': metadata.get('feature_type', 'hybrid'),
            'exercise_type_mapping': metadata.get('exercise_type_mapping', {}),
            'history': history,
            'trained_at': datetime.now().isoformat(),
        }

        with open(output_dir / 'training_info_multitask.json', 'w', encoding='utf-8') as f:
            json.dump(training_info, f, indent=2, ensure_ascii=False)

        print(f"\n학습 완료!")
        print(f"  모델: {output_dir / 'best_model_multitask.pth'}")
        print(f"  ONNX: {onnx_path}")
        print(f"  정보: {output_dir / 'training_info_multitask.json'}")

    else:
        # 기존 단일 태스크 모드 (mlp, lstm)
        # y_train.npy가 있으면 기존 형식, 없으면 y_posture_train.npy 사용
        try:
            y_train = np.load(data_dir / 'y_train.npy')
            y_val = np.load(data_dir / 'y_val.npy')
            y_test = np.load(data_dir / 'y_test.npy')
        except FileNotFoundError:
            y_train = np.load(data_dir / 'y_posture_train.npy')
            y_val = np.load(data_dir / 'y_posture_val.npy')
            y_test = np.load(data_dir / 'y_posture_test.npy')

        X_train = np.load(data_dir / 'X_train.npy')
        X_val = np.load(data_dir / 'X_val.npy')
        X_test = np.load(data_dir / 'X_test.npy')

        with open(data_dir / 'metadata.json', 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        input_dim = X_train.shape[1]
        print(f"입력 차원: {input_dim}")
        print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

        # 클래스 불균형 가중치 계산
        pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
        print(f"양성 클래스 가중치: {pos_weight:.2f}")

        # 데이터로더 생성
        train_dataset = TensorDataset(
            torch.from_numpy(X_train).float(),
            torch.from_numpy(y_train).long()
        )
        val_dataset = TensorDataset(
            torch.from_numpy(X_val).float(),
            torch.from_numpy(y_val).long()
        )
        test_dataset = TensorDataset(
            torch.from_numpy(X_test).float(),
            torch.from_numpy(y_test).long()
        )

        train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=args.batch_size)
        test_loader = DataLoader(test_dataset, batch_size=args.batch_size)

        # 모델 생성
        if args.model_type == 'mlp':
            model = PostureClassifierMLP(input_dim=input_dim)
        else:
            model = PostureClassifierLSTM(input_dim=input_dim)

        model = model.to(device)
        print(f"\n모델 구조:\n{model}")

        # 손실 함수 & 옵티마이저
        criterion = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([pos_weight]).to(device))
        optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

        # 학습
        print("\n학습 시작...")
        best_val_f1 = 0
        patience_counter = 0
        history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': [], 'val_f1': []}

        for epoch in range(args.epochs):
            # 학습
            train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)

            # 검증
            val_loss, val_acc, val_f1, _, _ = evaluate(model, val_loader, criterion, device)

            # 기록
            history['train_loss'].append(train_loss)
            history['train_acc'].append(train_acc)
            history['val_loss'].append(val_loss)
            history['val_acc'].append(val_acc)
            history['val_f1'].append(val_f1)

            # 스케줄러 업데이트
            scheduler.step(val_loss)

            # 로그
            print(f"Epoch {epoch + 1:3d}/{args.epochs} | "
                  f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.4f} | "
                  f"Val Loss: {val_loss:.4f}, Acc: {val_acc:.4f}, F1: {val_f1:.4f}")

            # 최고 성능 모델 저장
            if val_f1 > best_val_f1:
                best_val_f1 = val_f1
                patience_counter = 0
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'val_f1': val_f1,
                }, output_dir / 'best_model.pth')
            else:
                patience_counter += 1
                if patience_counter >= args.early_stopping:
                    print(f"\n조기 종료 (patience: {args.early_stopping})")
                    break

        # 최고 모델 로드
        checkpoint = torch.load(output_dir / 'best_model.pth')
        model.load_state_dict(checkpoint['model_state_dict'])
        print(f"\n최고 검증 F1: {checkpoint['val_f1']:.4f} (Epoch {checkpoint['epoch'] + 1})")

        # 테스트 평가
        print("\n=== 테스트셋 평가 ===")
        test_loss, test_acc, test_f1, test_preds, test_labels = evaluate(
            model, test_loader, criterion, device
        )

        print(f"Test Loss: {test_loss:.4f}")
        print(f"Test Accuracy: {test_acc:.4f}")
        print(f"Test F1 Score: {test_f1:.4f}")

        print("\n분류 리포트:")
        print(classification_report(test_labels, test_preds,
                                    labels=[0, 1],
                                    target_names=['오류자세', '정자세'],
                                    zero_division=0))

        print("\n혼동 행렬:")
        print(confusion_matrix(test_labels, test_preds))

        # ONNX 변환
        print("\nONNX 변환 중...")
        onnx_path = output_dir / 'posture_classifier.onnx'
        export_to_onnx(model, input_dim, str(onnx_path), device)

        # 학습 히스토리 및 설정 저장
        training_info = {
            'model_type': args.model_type,
            'input_dim': input_dim,
            'epochs_trained': len(history['train_loss']),
            'best_val_f1': best_val_f1,
            'test_accuracy': test_acc,
            'test_f1': test_f1,
            'feature_type': metadata.get('feature_type', 'hybrid'),
            'history': history,
            'trained_at': datetime.now().isoformat(),
        }

        with open(output_dir / 'training_info.json', 'w', encoding='utf-8') as f:
            json.dump(training_info, f, indent=2, ensure_ascii=False)

        print(f"\n학습 완료!")
        print(f"  모델: {output_dir / 'best_model.pth'}")
        print(f"  ONNX: {onnx_path}")
        print(f"  정보: {output_dir / 'training_info.json'}")


if __name__ == '__main__':
    main()
