"""
AI Hub 사람인체자세 3D 데이터 전처리 스크립트
- 2D/3D JSON 파일을 읽어서 학습용 데이터셋으로 변환
- 출력: processed_data.npz (NumPy 압축 파일)
"""

import json
import numpy as np
from pathlib import Path
from tqdm import tqdm
import re


# ============================================================
# 설정
# ============================================================
DATA_ROOT = Path(__file__).parent / "data" / "aihub-pose-3d"
LABEL_2D_DIR = DATA_ROOT / "label" / "2d"
LABEL_3D_DIR = DATA_ROOT / "label" / "3d"
OUTPUT_DIR = Path(__file__).parent / "processed"

# 관절 개수
NUM_JOINTS = 24

# 이미지 크기 (정규화용)
IMG_WIDTH = 1920
IMG_HEIGHT = 1080

# 3D 좌표 정규화 범위 (mm 단위 추정)
POSE_3D_SCALE = 1000.0


# ============================================================
# 유틸리티 함수
# ============================================================
def parse_2d_json(file_path: Path) -> dict:
    """2D JSON 파일 파싱"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    info = data['info']
    annotations = data['annotations']
    
    # 2D 좌표 추출 및 정규화 (0~1)
    coords_2d = np.array(annotations['2d_pos'], dtype=np.float32)
    coords_2d[:, 0] /= IMG_WIDTH   # x 정규화
    coords_2d[:, 1] /= IMG_HEIGHT  # y 정규화
    
    return {
        'action_id': info['action_category_id'],
        'actor_id': info['actor_id'],
        'camera_no': info['camera_no'],
        'frame_no': annotations['frame_no'],
        'coords_2d': coords_2d.flatten()  # (24, 2) -> (48,)
    }


def parse_3d_json(file_path: Path) -> dict:
    """3D JSON 파일 파싱"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    info = data['info']
    annotations = data['annotations']
    
    # 3D 좌표 추출 - [[x], [y], [z], [1.0]] 형식
    raw_3d_pos = annotations['3d_pos']
    coords_3d = []
    for joint in raw_3d_pos:
        x = joint[0][0]
        y = joint[1][0]
        z = joint[2][0]
        coords_3d.append([x, y, z])
    
    coords_3d = np.array(coords_3d, dtype=np.float32)
    
    # 정규화 (센터링 + 스케일링)
    center = coords_3d.mean(axis=0)
    coords_3d = (coords_3d - center) / POSE_3D_SCALE
    
    # 3D 회전값 추출 (옵션)
    raw_3d_rot = annotations['3d_rot']
    coords_rot = []
    for joint in raw_3d_rot:
        roll = joint[0][0]
        pitch = joint[1][0]
        yaw = joint[2][0]
        coords_rot.append([roll, pitch, yaw])
    
    coords_rot = np.array(coords_rot, dtype=np.float32)
    # 라디안으로 변환 (도 -> 라디안)
    coords_rot = np.deg2rad(coords_rot)
    
    return {
        'action_id': info['action_category_id'],
        'actor_id': info['actor_id'],
        'frame_no': annotations['frame_no'],
        'coords_3d': coords_3d.flatten(),  # (24, 3) -> (72,)
        'coords_rot': coords_rot.flatten()  # (24, 3) -> (72,)
    }


def find_matching_3d_file(label_3d_dir: Path, action_id: str, actor_id: str, frame_no: int) -> Path | None:
    """2D 파일에 매칭되는 3D 파일 찾기"""
    # 3D 파일명 패턴: 3D_{action}_{actor}_{frame}.json
    pattern = f"3D_{action_id}_{actor_id}_{frame_no}.json"
    
    # 액터 폴더 내에서 검색
    actor_folder = label_3d_dir / f"{action_id}_{actor_id}"
    if actor_folder.exists():
        target_file = actor_folder / pattern
        if target_file.exists():
            return target_file
    
    # 직접 검색
    for folder in label_3d_dir.iterdir():
        if folder.is_dir():
            target_file = folder / pattern
            if target_file.exists():
                return target_file
    
    return None


def collect_all_2d_files(label_2d_dir: Path) -> list[Path]:
    """모든 2D JSON 파일 수집"""
    all_files = []
    for actor_folder in label_2d_dir.iterdir():
        if actor_folder.is_dir():
            json_files = list(actor_folder.glob("*.json"))
            all_files.extend(json_files)
    return all_files


# ============================================================
# 메인 전처리 함수
# ============================================================
def preprocess_data():
    """메인 전처리 함수"""
    print("=" * 60)
    print("AI Hub 사람인체자세 3D 데이터 전처리")
    print("=" * 60)
    
    # 출력 디렉토리 생성
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 2D 파일 수집
    print(f"\n📁 2D 라벨 디렉토리: {LABEL_2D_DIR}")
    print(f"📁 3D 라벨 디렉토리: {LABEL_3D_DIR}")
    
    all_2d_files = collect_all_2d_files(LABEL_2D_DIR)
    print(f"\n📊 발견된 2D JSON 파일: {len(all_2d_files)}개")
    
    # 데이터 수집
    data_2d = []
    data_3d = []
    data_rot = []
    matched_count = 0
    
    print("\n🔄 데이터 처리 중...")
    for file_2d in tqdm(all_2d_files, desc="Processing"):
        try:
            # 2D 파싱
            parsed_2d = parse_2d_json(file_2d)
            
            # 매칭되는 3D 파일 찾기
            file_3d = find_matching_3d_file(
                LABEL_3D_DIR,
                parsed_2d['action_id'],
                parsed_2d['actor_id'],
                parsed_2d['frame_no']
            )
            
            if file_3d is None:
                continue
            
            # 3D 파싱
            parsed_3d = parse_3d_json(file_3d)
            
            # 데이터 추가
            data_2d.append(parsed_2d['coords_2d'])
            data_3d.append(parsed_3d['coords_3d'])
            data_rot.append(parsed_3d['coords_rot'])
            matched_count += 1
            
        except Exception as e:
            print(f"\n⚠️ 오류 발생 ({file_2d.name}): {e}")
            continue
    
    print(f"\n✅ 매칭된 2D-3D 쌍: {matched_count}개")
    
    if matched_count == 0:
        print("❌ 매칭된 데이터가 없습니다. 폴더 구조를 확인해주세요.")
        return
    
    # NumPy 배열로 변환
    X = np.array(data_2d, dtype=np.float32)  # (N, 48) - 2D 입력
    Y = np.array(data_3d, dtype=np.float32)  # (N, 72) - 3D 출력
    R = np.array(data_rot, dtype=np.float32)  # (N, 72) - 회전값
    
    print(f"\n📐 데이터 형태:")
    print(f"   - 입력 (2D): {X.shape}")
    print(f"   - 출력 (3D): {Y.shape}")
    print(f"   - 회전값: {R.shape}")
    
    # 학습/검증 분할 (80/20)
    np.random.seed(42)
    indices = np.random.permutation(len(X))
    split_idx = int(len(X) * 0.8)
    
    train_idx = indices[:split_idx]
    val_idx = indices[split_idx:]
    
    X_train, X_val = X[train_idx], X[val_idx]
    Y_train, Y_val = Y[train_idx], Y[val_idx]
    R_train, R_val = R[train_idx], R[val_idx]
    
    print(f"\n📊 데이터 분할:")
    print(f"   - 학습: {len(X_train)}개")
    print(f"   - 검증: {len(X_val)}개")
    
    # 저장
    output_path = OUTPUT_DIR / "processed_data.npz"
    np.savez_compressed(
        output_path,
        X_train=X_train, X_val=X_val,
        Y_train=Y_train, Y_val=Y_val,
        R_train=R_train, R_val=R_val,
        joint_names=[
            "Pelvis", "L_Hip", "R_Hip", "Spine1", "L_Knee", "R_Knee",
            "Spine2", "L_Ankle", "R_Ankle", "Spine3", "L_Foot", "R_Foot",
            "Neck", "L_Collar", "R_Collar", "Head", "L_Shoulder", "R_Shoulder",
            "L_Elbow", "R_Elbow", "L_Wrist", "R_Wrist", "L_Hand", "R_Hand"
        ]
    )
    
    print(f"\n💾 저장 완료: {output_path}")
    print(f"   파일 크기: {output_path.stat().st_size / 1024:.1f} KB")
    
    # 통계 출력
    print(f"\n📈 데이터 통계:")
    print(f"   - 2D 입력 범위: [{X.min():.3f}, {X.max():.3f}]")
    print(f"   - 3D 출력 범위: [{Y.min():.3f}, {Y.max():.3f}]")
    
    print("\n" + "=" * 60)
    print("✅ 전처리 완료!")
    print("=" * 60)


if __name__ == "__main__":
    preprocess_data()
