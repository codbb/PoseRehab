"""
AI Hub 사람인체자세 3D 데이터 전처리 스크립트 (전체 데이터용)
- 2D: 2D_json/{action}_{actor}_{camera}_{frame}.json
- 3D: 3D_json/{action}_{actor}/3D_{action}_{actor}_{frame}.json
"""

import json
import numpy as np
from pathlib import Path
from tqdm import tqdm
import os

# ============================================================
# 설정
# ============================================================

# 다운로드 폴더 경로
DOWNLOAD_ROOT = Path(r"C:\Users\user\Downloads")

# 2D 데이터 경로
TRAIN_2D_DIR = DOWNLOAD_ROOT / "010.사람인체자세3D" / "1.Training" / "라벨링데이터_230714_add" / "2D_json_train_0714" / "2D_json"
VAL_2D_DIR = DOWNLOAD_ROOT / "010.사람인체자세3D" / "2.Validation" / "라벨링데이터_230714_add" / "2D_json_val_0714" / "2D_json"

# 3D 데이터 경로
TRAIN_3D_DIR = DOWNLOAD_ROOT / "사람 인체자세 3D" / "Training" / "[라벨]3D_json" / "3D_json"
VAL_3D_DIR = DOWNLOAD_ROOT / "사람 인체자세 3D" / "Validation" / "[라벨]3D_json" / "3D_json"

# 출력 경로
OUTPUT_DIR = Path(__file__).parent / "processed"

# 관절 개수
NUM_JOINTS = 24

# 이미지 크기 (정규화용)
IMG_WIDTH = 1920
IMG_HEIGHT = 1080

# 3D 좌표 정규화 범위
POSE_3D_SCALE = 1000.0

# 최대 샘플 수 (테스트: 10000, 전체: None)
MAX_TRAIN_SAMPLES = None
MAX_VAL_SAMPLES = None


# ============================================================
# 파싱 함수
# ============================================================

def parse_2d_json(file_path: Path) -> dict | None:
    """2D JSON 파일 파싱"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        info = data['info']
        annotations = data['annotations']
        
        # 2D 좌표 추출 및 정규화 (0~1)
        coords_2d = np.array(annotations['2d_pos'], dtype=np.float32)
        
        if len(coords_2d) != NUM_JOINTS:
            return None
            
        coords_2d[:, 0] /= IMG_WIDTH
        coords_2d[:, 1] /= IMG_HEIGHT
        
        # 파일명에서 정보 추출: 70_M180D_3_0.json
        filename = file_path.stem  # 70_M180D_3_0
        parts = filename.split('_')
        
        if len(parts) < 4:
            return None
        
        action = parts[0]      # 70
        actor = parts[1]       # M180D
        frame = parts[3]       # 0
        
        return {
            'action': action,
            'actor': actor,
            'frame': frame,
            'coords_2d': coords_2d.flatten()  # (48,)
        }
    except Exception as e:
        return None


def parse_3d_json(file_path: Path) -> dict | None:
    """3D JSON 파일 파싱"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        annotations = data['annotations']
        
        # 3D 좌표 추출
        raw_3d_pos = annotations['3d_pos']
        coords_3d = []
        
        for joint in raw_3d_pos:
            # [[x], [y], [z], [1.0]] 또는 [x, y, z, 1.0] 형식 처리
            if isinstance(joint[0], list):
                x, y, z = joint[0][0], joint[1][0], joint[2][0]
            else:
                x, y, z = joint[0], joint[1], joint[2]
            coords_3d.append([x, y, z])
        
        coords_3d = np.array(coords_3d, dtype=np.float32)
        
        if len(coords_3d) != NUM_JOINTS:
            return None
        
        # 정규화 (센터링 + 스케일링)
        center = coords_3d.mean(axis=0)
        coords_3d = (coords_3d - center) / POSE_3D_SCALE
        
        return {
            'coords_3d': coords_3d.flatten()  # (72,)
        }
    except Exception as e:
        return None


def get_3d_file_path(dir_3d: Path, action: str, actor: str, frame: str) -> Path | None:
    """2D 정보로 3D 파일 경로 생성
    
    2D: 70_M180D_3_0.json
    3D: 3D_json/70_M180D/3D_70_M180D_0.json
    """
    # 3D 폴더 경로: 3D_json/{action}_{actor}/
    folder_name = f"{action}_{actor}"
    folder_path = dir_3d / folder_name
    
    # 3D 파일명: 3D_{action}_{actor}_{frame}.json
    file_name = f"3D_{action}_{actor}_{frame}.json"
    file_path = folder_path / file_name
    
    if file_path.exists():
        return file_path
    return None


# ============================================================
# 메인 처리
# ============================================================

def process_dataset(dir_2d: Path, dir_3d: Path, max_samples: int | None, desc: str) -> tuple:
    """데이터셋 처리"""
    print(f"\n{'='*60}")
    print(f"📊 {desc} 데이터 처리")
    print(f"{'='*60}")
    print(f"   2D 경로: {dir_2d}")
    print(f"   3D 경로: {dir_3d}")
    
    # 경로 확인
    if not dir_2d.exists():
        print(f"❌ 2D 경로를 찾을 수 없습니다: {dir_2d}")
        return np.array([]), np.array([])
    
    if not dir_3d.exists():
        print(f"❌ 3D 경로를 찾을 수 없습니다: {dir_3d}")
        return np.array([]), np.array([])
    
    # 2D 파일 목록 (하위 폴더 포함)
    files_2d = list(dir_2d.rglob("*.json"))
    print(f"📁 2D JSON 파일: {len(files_2d):,}개")
    
    if max_samples:
        files_2d = files_2d[:max_samples]
        print(f"   → 샘플 제한: {max_samples:,}개")
    
    # 데이터 수집
    data_2d = []
    data_3d = []
    matched = 0
    skipped_2d = 0
    skipped_3d_not_found = 0
    skipped_3d_parse = 0
    
    for file_2d in tqdm(files_2d, desc="처리 중"):
        # 2D 파싱
        result_2d = parse_2d_json(file_2d)
        if result_2d is None:
            skipped_2d += 1
            continue
        
        # 3D 파일 경로 생성
        file_3d = get_3d_file_path(
            dir_3d, 
            result_2d['action'], 
            result_2d['actor'], 
            result_2d['frame']
        )
        
        if file_3d is None:
            skipped_3d_not_found += 1
            continue
        
        # 3D 파싱
        result_3d = parse_3d_json(file_3d)
        if result_3d is None:
            skipped_3d_parse += 1
            continue
        
        # 데이터 추가
        data_2d.append(result_2d['coords_2d'])
        data_3d.append(result_3d['coords_3d'])
        matched += 1
    
    print(f"\n✅ 매칭 완료: {matched:,}개")
    print(f"⏭️  스킵 상세:")
    print(f"   - 2D 파싱 실패: {skipped_2d:,}개")
    print(f"   - 3D 파일 없음: {skipped_3d_not_found:,}개")
    print(f"   - 3D 파싱 실패: {skipped_3d_parse:,}개")
    
    return np.array(data_2d, dtype=np.float32), np.array(data_3d, dtype=np.float32)


def main():
    print("=" * 60)
    print("AI Hub 사람인체자세 3D 데이터 전처리 (전체 데이터)")
    print("=" * 60)
    
    # 출력 디렉토리 생성
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Training 데이터 처리
    train_2d, train_3d = process_dataset(
        TRAIN_2D_DIR, TRAIN_3D_DIR, 
        MAX_TRAIN_SAMPLES, "Training"
    )
    
    # Validation 데이터 처리
    val_2d, val_3d = process_dataset(
        VAL_2D_DIR, VAL_3D_DIR,
        MAX_VAL_SAMPLES, "Validation"
    )
    
    # 결과 확인
    print(f"\n{'='*60}")
    print("📊 최종 결과")
    print(f"{'='*60}")
    print(f"   Training:   {len(train_2d):,}개")
    print(f"   Validation: {len(val_2d):,}개")
    print(f"   총합:       {len(train_2d) + len(val_2d):,}개")
    
    if len(train_2d) == 0:
        print("\n❌ 처리된 데이터가 없습니다. 경로를 확인하세요.")
        return
    
    # 저장
    output_path = OUTPUT_DIR / "processed_data.npz"
    
    np.savez_compressed(
        output_path,
        train_2d=train_2d,
        train_3d=train_3d,
        val_2d=val_2d,
        val_3d=val_3d,
        img_width=IMG_WIDTH,
        img_height=IMG_HEIGHT,
        pose_3d_scale=POSE_3D_SCALE,
        num_joints=NUM_JOINTS
    )
    
    file_size = output_path.stat().st_size / (1024 * 1024)
    print(f"\n💾 저장 완료: {output_path}")
    print(f"   파일 크기: {file_size:.1f} MB")
    
    # 통계
    print(f"\n📈 데이터 통계:")
    print(f"   - 2D 입력 범위: [{train_2d.min():.3f}, {train_2d.max():.3f}]")
    print(f"   - 3D 출력 범위: [{train_3d.min():.3f}, {train_3d.max():.3f}]")
    
    print(f"\n{'='*60}")
    print("✅ 전처리 완료!")
    print("다음 단계: py -3.12 train.py")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
