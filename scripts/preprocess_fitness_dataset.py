"""
AI Hub 피트니스 자세 데이터셋 전처리 스크립트

이 스크립트는 JSON 어노테이션 파일에서 키포인트를 추출하고,
자세 분류 모델 학습을 위한 데이터셋을 생성합니다.

사용법:
    python preprocess_fitness_dataset.py --input_dirs <라벨링데이터_경로1>,<경로2> --output_dir <출력_경로>

예시:
    python preprocess_fitness_dataset.py \
        --input_dirs "C:/path/맨몸운동_Labeling,C:/path/바벨_덤벨_Labeling" \
        --exercise_types "015,004,005,016,027,026,025,017,018,022,021,008,006,028,014,012,013,009,010,023,003" \
        --output_dir ./processed_data
"""

import json
import os
import argparse
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from sklearn.model_selection import train_test_split
import warnings

warnings.filterwarnings('ignore')


# ============================================================================
# 데이터 구조 정의
# ============================================================================

@dataclass
class KeypointData:
    """24개 키포인트 데이터"""
    coordinates: np.ndarray  # (24, 2) - x, y 좌표
    visibility: np.ndarray   # (24,) - 가시성 (0 또는 1)


@dataclass
class FrameData:
    """단일 프레임 데이터 (5개 뷰)"""
    keypoints: Dict[str, KeypointData]  # view1~view5
    active_views: List[str]


@dataclass
class SampleData:
    """단일 샘플 (JSON 파일) 데이터"""
    file_name: str
    exercise_type: str
    exercise_name: str
    exercise_name_kr: str
    pose_type: str
    conditions: List[Dict]
    is_correct: bool  # 모든 조건이 True면 정자세
    frames: List[FrameData]


# ============================================================================
# 키포인트 정의
# ============================================================================

KEYPOINT_NAMES = [
    'Nose', 'Left Eye', 'Right Eye', 'Left Ear', 'Right Ear',
    'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
    'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip',
    'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle',
    'Neck', 'Left Palm', 'Right Palm', 'Back', 'Waist',
    'Left Foot', 'Right Foot'
]

KEYPOINT_INDICES = {name: idx for idx, name in enumerate(KEYPOINT_NAMES)}

# JSON pts 키 → 키포인트 인덱스 매핑 (실제 데이터셋은 영문 이름 사용)
PTS_KEY_MAPPING = {name: idx for idx, name in enumerate(KEYPOINT_NAMES)}

# ============================================================================
# 운동 이름 매핑 (한국어 → 영문, type_info.exercise 필드 기준)
# ============================================================================

# 한국어 운동 이름 → 영문 이름 매핑
EXERCISE_NAME_MAP = {
    # 스쿼트 계열
    '스쿼트': 'Squat',
    '바벨 스쿼트': 'Squat',
    '바벨 스쿼트 ': 'Squat',  # 공백 포함
    '고블렛 스쿼트': 'Squat',
    '점프 스쿼트 다이나믹 런지': 'Lunge',  # 복합 운동 → 런지로 분류
    '점프 스쿼트 사이드 다이나믹 런지': 'Side Lunge',  # 복합 운동 → 사이드런지로 분류

    # 런지 계열
    '런지': 'Lunge',
    '런치': 'Lunge',
    '크로스 런지': 'Cross Lunge',
    '사이드 런지': 'Side Lunge',
    '워킹 런지': 'Walking Lunge',

    # 푸시업 계열
    '푸시업': 'Push Up',
    '푸쉬업': 'Push Up',
    '니푸시업': 'Knee Push Up',
    '니푸쉬업': 'Knee Push Up',

    # 플랭크
    '플랭크': 'Plank',
    '플랭크&트위스트': 'Plank',

    # 크런치 계열
    '크런치': 'Crunch',
    '바이시클 크런치': 'Bicycle Crunch',
    '바이시클크런치': 'Bicycle Crunch',
    '스탠딩 사이드 크런치': 'Standing Side Crunch',

    # 레그 레이즈
    '라잉 레그레이즈': 'Lying Leg Raise',
    '라잉레그레이즈': 'Lying Leg Raise',
    '행잉 레그레이즈': 'Hanging Leg Raise',

    # 데드리프트
    '바벨 데드리프트': 'Barbell Deadlift',
    '바벨 컨벤셔널 데드리프트': 'Barbell Deadlift',
    '덤벨 데드리프트': 'Dumbbell Deadlift',
    '스티프 레그 데드리프트': 'Stiff Leg Deadlift',

    # 로우 계열
    '바벨 로우': 'Barbell Row',
    '바벨 로우 ': 'Barbell Row',  # 공백 포함
    '바벨로우': 'Barbell Row',
    '덤벨 로우': 'Dumbbell Bent Over Row',
    '덤벨 벤트오버 로우': 'Dumbbell Bent Over Row',
    '업라이트로우': 'Upright Row',
    '업라이트 로우': 'Upright Row',

    # 레이즈 계열
    '프런트 레이즈': 'Front Raise',
    '사이드 레터럴 레이즈': 'Side Lateral Raise',
    '사이드레터럴 레이즈': 'Side Lateral Raise',
    '오버헤드 프레스': 'Overhead Press',

    # 숄더 프레스
    '오버헤드프레스': 'Overhead Press',
    '숄더 프레스': 'Shoulder Press',

    # 힙스러스트
    '힙스러스트': 'Hip Thrust',
    '힙쓰러스트': 'Hip Thrust',

    # 굿모닝
    '굿모닝': 'Good Morning',
    '굿 모닝': 'Good Morning',

    # 버피
    '버피 테스트': 'Burpee Test',
    '버피테스트': 'Burpee Test',

    # 기타
    '스탠딩 니업': 'Standing Knee Up',
    'Y - Exercise': 'Y Exercise',
}

# 타겟 운동 영문 이름 목록 (모델에서 분류할 운동들)
TARGET_EXERCISES = [
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
]

def create_exercise_id_map(exercise_names: List[str]) -> Dict[str, int]:
    """주어진 운동 이름 리스트에 대해 0부터 순차적 ID 매핑 생성"""
    return {name: idx for idx, name in enumerate(exercise_names)}


def get_english_exercise_name(korean_name: str) -> Optional[str]:
    """한국어 운동 이름을 영문 이름으로 변환

    Args:
        korean_name: 한국어 운동 이름 (type_info.exercise 필드)

    Returns:
        영문 운동 이름 또는 None (매핑되지 않은 경우)
    """
    # 직접 매핑 확인
    if korean_name in EXERCISE_NAME_MAP:
        return EXERCISE_NAME_MAP[korean_name]

    # 부분 매칭 시도 (포함 관계)
    korean_lower = korean_name.lower()
    for kr_name, en_name in EXERCISE_NAME_MAP.items():
        if kr_name in korean_name or korean_name in kr_name:
            return en_name

    return None


# ============================================================================
# JSON 파싱 함수
# ============================================================================

def parse_keypoints_from_pts(pts: Dict) -> KeypointData:
    """pts 딕셔너리에서 키포인트 추출

    실제 데이터셋 구조:
    pts = {
        "Nose": {"x": 1052, "y": 332},
        "Left Eye": {"x": 1047, "y": 320},
        ...
    }
    """
    coordinates = np.zeros((24, 2), dtype=np.float32)
    visibility = np.zeros(24, dtype=np.float32)

    for kp_name, idx in PTS_KEY_MAPPING.items():
        if kp_name in pts:
            pt = pts[kp_name]
            if pt and 'x' in pt and 'y' in pt:
                x_val = pt['x']
                y_val = pt['y']
                # 좌표가 유효한 숫자인지 확인
                if x_val is not None and y_val is not None:
                    coordinates[idx] = [float(x_val), float(y_val)]
                    visibility[idx] = 1.0

    return KeypointData(coordinates=coordinates, visibility=visibility)


def parse_frame(frame: Dict) -> FrameData:
    """단일 프레임 파싱"""
    keypoints = {}
    active_views = []

    for view_name in ['view1', 'view2', 'view3', 'view4', 'view5']:
        if view_name in frame:
            view_data = frame[view_name]
            if view_data.get('active') == 'Yes' and 'pts' in view_data:
                kp = parse_keypoints_from_pts(view_data['pts'])
                keypoints[view_name] = kp
                active_views.append(view_name)

    return FrameData(keypoints=keypoints, active_views=active_views)


def parse_json_file(json_path: str, target_exercises: List[str] = None) -> Optional[SampleData]:
    """JSON 파일 전체 파싱

    Args:
        json_path: JSON 파일 경로
        target_exercises: 필터링할 영문 운동 이름 리스트 (None이면 모든 운동)

    Returns:
        SampleData 또는 None (필터링된 경우)
    """
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # type_info 파싱
        type_info = data.get('type_info', {})
        posture_type_code = data.get('type', type_info.get('key', 'unknown'))

        # 운동 이름 추출 (한국어 → 영문 변환)
        exercise_name_kr = type_info.get('exercise', 'Unknown')
        exercise_name = get_english_exercise_name(exercise_name_kr)

        # 매핑되지 않은 운동 건너뛰기
        if exercise_name is None:
            return None

        # 타겟 운동 필터링
        if target_exercises is not None and exercise_name not in target_exercises:
            return None

        pose_type = type_info.get('pose', 'Unknown')
        conditions = type_info.get('conditions', [])

        # 정자세 여부 판별 (모든 condition의 value가 True여야 정자세)
        is_correct = all(
            cond.get('value', False) for cond in conditions
        ) if conditions else False

        # 프레임 파싱
        frames = []
        for frame in data.get('frames', []):
            frame_data = parse_frame(frame)
            if frame_data.active_views:  # 최소 하나의 활성 뷰가 있어야 함
                frames.append(frame_data)

        if not frames:
            return None

        return SampleData(
            file_name=os.path.basename(json_path),
            exercise_type=exercise_name,  # 영문 운동 이름
            exercise_name=exercise_name,
            exercise_name_kr=exercise_name_kr,
            pose_type=pose_type,
            conditions=conditions,
            is_correct=is_correct,
            frames=frames
        )

    except Exception as e:
        print(f"Error parsing {json_path}: {e}")
        return None


# ============================================================================
# 좌표 정규화
# ============================================================================

def normalize_coordinates(coordinates: np.ndarray,
                          visibility: np.ndarray,
                          method: str = 'bbox') -> np.ndarray:
    """
    키포인트 좌표 정규화

    Args:
        coordinates: (24, 2) 원본 좌표
        visibility: (24,) 가시성 플래그
        method: 정규화 방법
            - 'bbox': 바운딩 박스 기준 [0, 1] 범위
            - 'hip_center': 엉덩이 중심 기준 상대 좌표

    Returns:
        normalized: (24, 2) 정규화된 좌표
    """
    normalized = coordinates.copy()
    visible_mask = visibility > 0

    if not np.any(visible_mask):
        return normalized

    visible_coords = coordinates[visible_mask]

    if method == 'bbox':
        # 바운딩 박스 기준 정규화
        min_xy = visible_coords.min(axis=0)
        max_xy = visible_coords.max(axis=0)
        range_xy = max_xy - min_xy
        range_xy = np.where(range_xy > 0, range_xy, 1.0)  # 0으로 나누기 방지

        normalized[visible_mask] = (visible_coords - min_xy) / range_xy

    elif method == 'hip_center':
        # 엉덩이 중심 기준 정규화
        left_hip = coordinates[KEYPOINT_INDICES['Left Hip']]
        right_hip = coordinates[KEYPOINT_INDICES['Right Hip']]

        if visibility[KEYPOINT_INDICES['Left Hip']] > 0 and \
           visibility[KEYPOINT_INDICES['Right Hip']] > 0:
            hip_center = (left_hip + right_hip) / 2

            # 스케일: 어깨 너비 또는 엉덩이 너비
            scale = np.linalg.norm(right_hip - left_hip)
            if scale < 1e-6:
                scale = 1.0

            normalized[visible_mask] = (visible_coords - hip_center) / scale

    return normalized


# ============================================================================
# 특징 추출
# ============================================================================

def extract_joint_angles(coordinates: np.ndarray,
                         visibility: np.ndarray) -> np.ndarray:
    """
    주요 관절 각도 계산

    Returns:
        angles: (N,) 관절 각도 배열 (라디안)
    """
    angles = []

    def calc_angle(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
        """세 점으로 각도 계산 (p2가 꼭지점)"""
        v1 = p1 - p2
        v2 = p3 - p2

        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        return np.arccos(cos_angle)

    angle_definitions = [
        # (키포인트1, 꼭지점, 키포인트2, 이름)
        ('Left Hip', 'Left Knee', 'Left Ankle', 'Left Knee Angle'),
        ('Right Hip', 'Right Knee', 'Right Ankle', 'Right Knee Angle'),
        ('Left Shoulder', 'Left Elbow', 'Left Wrist', 'Left Elbow Angle'),
        ('Right Shoulder', 'Right Elbow', 'Right Wrist', 'Right Elbow Angle'),
        ('Left Elbow', 'Left Shoulder', 'Left Hip', 'Left Shoulder Angle'),
        ('Right Elbow', 'Right Shoulder', 'Right Hip', 'Right Shoulder Angle'),
        ('Left Shoulder', 'Left Hip', 'Left Knee', 'Left Hip Angle'),
        ('Right Shoulder', 'Right Hip', 'Right Knee', 'Right Hip Angle'),
        ('Left Shoulder', 'Neck', 'Right Shoulder', 'Neck Angle'),
        ('Left Hip', 'Waist', 'Right Hip', 'Waist Angle'),
    ]

    for kp1_name, kp2_name, kp3_name, _ in angle_definitions:
        idx1 = KEYPOINT_INDICES[kp1_name]
        idx2 = KEYPOINT_INDICES[kp2_name]
        idx3 = KEYPOINT_INDICES[kp3_name]

        if visibility[idx1] > 0 and visibility[idx2] > 0 and visibility[idx3] > 0:
            angle = calc_angle(
                coordinates[idx1],
                coordinates[idx2],
                coordinates[idx3]
            )
            angles.append(angle)
        else:
            angles.append(0.0)  # 보이지 않으면 0

    return np.array(angles, dtype=np.float32)


def extract_features(keypoint_data: KeypointData,
                     feature_type: str = 'coordinates') -> np.ndarray:
    """
    특징 벡터 추출

    Args:
        keypoint_data: 키포인트 데이터
        feature_type: 특징 유형
            - 'coordinates': 정규화된 좌표만 (48차원)
            - 'angles': 관절 각도만 (10차원)
            - 'hybrid': 좌표 + 각도 (58차원)

    Returns:
        features: 특징 벡터
    """
    coords = normalize_coordinates(
        keypoint_data.coordinates,
        keypoint_data.visibility,
        method='bbox'
    )

    if feature_type == 'coordinates':
        # 좌표만 (24 * 2 = 48차원)
        return coords.flatten()

    elif feature_type == 'angles':
        # 관절 각도만 (10차원)
        return extract_joint_angles(coords, keypoint_data.visibility)

    elif feature_type == 'hybrid':
        # 좌표 + 각도 (48 + 10 = 58차원)
        flat_coords = coords.flatten()
        angles = extract_joint_angles(coords, keypoint_data.visibility)
        return np.concatenate([flat_coords, angles])

    else:
        raise ValueError(f"Unknown feature_type: {feature_type}")


# ============================================================================
# 데이터셋 생성
# ============================================================================

def create_dataset(samples: List[SampleData],
                   exercise_id_map: Dict[str, int],
                   feature_type: str = 'hybrid',
                   use_all_frames: bool = True,
                   use_all_views: bool = False,
                   preferred_view: str = 'view1',
                   verbose: bool = False) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[Dict]]:
    """
    학습용 데이터셋 생성

    Args:
        samples: 샘플 데이터 리스트
        exercise_id_map: 운동 이름 → ID 매핑
        feature_type: 특징 유형
        use_all_frames: True면 모든 프레임 사용, False면 첫 프레임만
        use_all_views: True면 모든 뷰 사용, False면 preferred_view만
        preferred_view: 사용할 뷰 (use_all_views=False일 때)
        verbose: 디버그 출력 여부

    Returns:
        X: (N, D) 특징 행렬
        y_exercise: (N,) 운동 종류 레이블 (0~20)
        y_posture: (N,) 자세 레이블 (0=오류자세, 1=정자세)
        metadata: 샘플 메타데이터 리스트
    """
    X_list = []
    y_exercise_list = []
    y_posture_list = []
    metadata_list = []

    skipped_no_view = 0
    skipped_low_visibility = 0
    skipped_unknown_type = 0
    processed = 0

    for sample in samples:
        # 운동 ID 확인
        if sample.exercise_type not in exercise_id_map:
            skipped_unknown_type += 1
            continue

        exercise_id = exercise_id_map[sample.exercise_type]

        frames_to_use = sample.frames if use_all_frames else sample.frames[:1]

        for frame_idx, frame in enumerate(frames_to_use):
            if use_all_views:
                views_to_use = frame.active_views
            else:
                # preferred_view가 있으면 사용, 없으면 첫 번째 활성 뷰 사용
                if preferred_view in frame.keypoints:
                    views_to_use = [preferred_view]
                elif frame.active_views:
                    views_to_use = [frame.active_views[0]]
                else:
                    views_to_use = []

            for view_name in views_to_use:
                if view_name not in frame.keypoints:
                    skipped_no_view += 1
                    continue

                kp = frame.keypoints[view_name]

                # 최소 키포인트 수 체크 - 전체 24개 중 최소 12개 필요
                total_visible = sum(kp.visibility)

                if total_visible < 12:
                    skipped_low_visibility += 1
                    if verbose and skipped_low_visibility <= 5:
                        print(f"  Skipped: {sample.file_name} frame {frame_idx} {view_name} - only {total_visible} keypoints visible")
                    continue

                features = extract_features(kp, feature_type)

                X_list.append(features)
                y_exercise_list.append(exercise_id)
                y_posture_list.append(1 if sample.is_correct else 0)
                metadata_list.append({
                    'file_name': sample.file_name,
                    'exercise_name': sample.exercise_name,
                    'exercise_name_kr': sample.exercise_name_kr,
                    'exercise_id': exercise_id,
                    'frame_idx': frame_idx,
                    'view': view_name,
                    'conditions': sample.conditions,
                    'is_correct': sample.is_correct,
                })
                processed += 1

    if verbose:
        print(f"\n  Processed: {processed}")
        print(f"  Skipped (no view): {skipped_no_view}")
        print(f"  Skipped (low visibility): {skipped_low_visibility}")
        print(f"  Skipped (unknown type): {skipped_unknown_type}")

    if len(X_list) == 0:
        return np.array([]), np.array([]), np.array([]), []

    X = np.array(X_list, dtype=np.float32)
    y_exercise = np.array(y_exercise_list, dtype=np.int64)
    y_posture = np.array(y_posture_list, dtype=np.int64)

    return X, y_exercise, y_posture, metadata_list


def split_dataset(X: np.ndarray,
                  y_exercise: np.ndarray,
                  y_posture: np.ndarray,
                  metadata: List[Dict],
                  test_size: float = 0.1,
                  val_size: float = 0.1,
                  random_state: int = 42) -> Dict:
    """
    Train/Validation/Test 분할

    샘플이 충분하면 Stratified split (운동 종류 기준), 아니면 일반 split
    """
    n_samples = len(X)

    # 샘플이 너무 적으면 간단한 분할
    if n_samples < 20:
        print("  Warning: Too few samples for stratified split, using simple split")
        indices = np.arange(n_samples)
        np.random.seed(random_state)
        np.random.shuffle(indices)

        n_test = max(1, int(n_samples * test_size))
        n_val = max(1, int(n_samples * val_size))
        n_train = n_samples - n_test - n_val

        train_idx = indices[:n_train]
        val_idx = indices[n_train:n_train + n_val]
        test_idx = indices[n_train + n_val:]

        return {
            'X_train': X[train_idx],
            'y_exercise_train': y_exercise[train_idx],
            'y_posture_train': y_posture[train_idx],
            'metadata_train': [metadata[i] for i in train_idx],
            'X_val': X[val_idx],
            'y_exercise_val': y_exercise[val_idx],
            'y_posture_val': y_posture[val_idx],
            'metadata_val': [metadata[i] for i in val_idx],
            'X_test': X[test_idx],
            'y_exercise_test': y_exercise[test_idx],
            'y_posture_test': y_posture[test_idx],
            'metadata_test': [metadata[i] for i in test_idx],
        }

    # 운동 종류로 stratify 시도
    try:
        # 먼저 train+val / test 분할
        X_temp, X_test, y_ex_temp, y_ex_test, y_pos_temp, y_pos_test, meta_temp, meta_test = train_test_split(
            X, y_exercise, y_posture, metadata,
            test_size=test_size,
            random_state=random_state,
            stratify=y_exercise
        )

        # train / val 분할
        val_ratio = val_size / (1 - test_size)
        X_train, X_val, y_ex_train, y_ex_val, y_pos_train, y_pos_val, meta_train, meta_val = train_test_split(
            X_temp, y_ex_temp, y_pos_temp, meta_temp,
            test_size=val_ratio,
            random_state=random_state,
            stratify=y_ex_temp
        )
    except ValueError as e:
        # Stratified 실패 시 일반 분할
        print(f"  Warning: Stratified split failed ({e}), using simple split")
        X_temp, X_test, y_ex_temp, y_ex_test, y_pos_temp, y_pos_test, meta_temp, meta_test = train_test_split(
            X, y_exercise, y_posture, metadata,
            test_size=test_size,
            random_state=random_state
        )

        val_ratio = val_size / (1 - test_size)
        X_train, X_val, y_ex_train, y_ex_val, y_pos_train, y_pos_val, meta_train, meta_val = train_test_split(
            X_temp, y_ex_temp, y_pos_temp, meta_temp,
            test_size=val_ratio,
            random_state=random_state
        )

    return {
        'X_train': X_train,
        'y_exercise_train': y_ex_train,
        'y_posture_train': y_pos_train,
        'metadata_train': meta_train,
        'X_val': X_val,
        'y_exercise_val': y_ex_val,
        'y_posture_val': y_pos_val,
        'metadata_val': meta_val,
        'X_test': X_test,
        'y_exercise_test': y_ex_test,
        'y_posture_test': y_pos_test,
        'metadata_test': meta_test,
    }


# ============================================================================
# 메인 실행
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='피트니스 자세 데이터셋 전처리')
    parser.add_argument('--input_dir', type=str, default=None,
                        help='라벨링데이터 폴더 경로 (단일 폴더)')
    parser.add_argument('--input_dirs', type=str, default=None,
                        help='라벨링데이터 폴더 경로들 (쉼표로 구분)')
    parser.add_argument('--output_dir', type=str, default='./processed_data',
                        help='출력 폴더 경로')
    parser.add_argument('--exercises', type=str, default=None,
                        help='필터링할 운동 이름들 (쉼표로 구분, 예: "Squat,Push Up,Lunge")')
    parser.add_argument('--feature_type', type=str, default='hybrid',
                        choices=['coordinates', 'angles', 'hybrid'],
                        help='특징 추출 방식')
    parser.add_argument('--use_all_frames', action='store_true',
                        help='모든 프레임 사용 (기본: 첫 프레임만)')
    parser.add_argument('--use_all_views', action='store_true',
                        help='모든 뷰 사용 (기본: view1만)')
    parser.add_argument('--test_size', type=float, default=0.1,
                        help='테스트셋 비율')
    parser.add_argument('--val_size', type=float, default=0.1,
                        help='검증셋 비율')

    args = parser.parse_args()

    # 입력 디렉토리 결정
    input_dirs = []
    if args.input_dirs:
        input_dirs = [p.strip() for p in args.input_dirs.split(',')]
    elif args.input_dir:
        input_dirs = [args.input_dir]
    else:
        parser.error("--input_dir 또는 --input_dirs 중 하나를 지정해야 합니다.")

    # 운동 필터 설정
    if args.exercises:
        target_exercises = [e.strip() for e in args.exercises.split(',')]
        print(f"필터링할 운동 수: {len(target_exercises)}")
    else:
        # 기본: 모든 타겟 운동 사용
        target_exercises = TARGET_EXERCISES.copy()
        print(f"모든 타겟 운동 사용: {len(target_exercises)}")

    # 운동 ID 매핑 생성 (순서 고정)
    exercise_id_map = create_exercise_id_map(target_exercises)
    num_exercise_types = len(exercise_id_map)

    print(f"\n=== 운동 ID 매핑 ===")
    for name, idx in exercise_id_map.items():
        print(f"  {idx}: {name}")

    # 출력 디렉토리 생성
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # JSON 파일 목록 수집
    all_json_files = []
    for input_dir in input_dirs:
        input_path = Path(input_dir)
        if not input_path.exists():
            print(f"경고: 디렉토리가 존재하지 않습니다: {input_dir}")
            continue
        json_files = list(input_path.glob('**/*.json'))  # 하위 폴더 재귀 탐색
        print(f"{input_dir}: {len(json_files)}개 JSON 파일 (하위 폴더 포함)")
        all_json_files.extend(json_files)

    print(f"\n총 JSON 파일 수: {len(all_json_files)}")

    # JSON 파싱 (3d 파일 제외)
    samples = []
    skipped_3d = 0
    for json_file in all_json_files:
        if '-3d' in json_file.name:
            skipped_3d += 1
            continue
        sample = parse_json_file(str(json_file), target_exercises)
        if sample:
            samples.append(sample)

    print(f"3D 파일 건너뜀: {skipped_3d}개")

    print(f"파싱 성공한 샘플 수: {len(samples)}")

    if len(samples) == 0:
        print("\n오류: 파싱된 샘플이 없습니다. 운동 타입 필터를 확인해주세요.")
        return

    # 통계 출력
    exercise_counts = {}
    correct_counts = {}
    for sample in samples:
        ex = sample.exercise_name
        exercise_counts[ex] = exercise_counts.get(ex, 0) + 1
        if sample.is_correct:
            correct_counts[ex] = correct_counts.get(ex, 0) + 1
        else:
            correct_counts[ex] = correct_counts.get(ex, 0)

    print("\n=== 운동별 통계 ===")
    for ex, count in sorted(exercise_counts.items()):
        correct = correct_counts.get(ex, 0)
        print(f"  {ex}: {count}개 (정자세: {correct}, 오류자세: {count - correct})")

    # 첫 번째 샘플 디버그 출력
    if samples:
        first_sample = samples[0]
        print(f"\n=== 첫 번째 샘플 디버그 ===")
        print(f"  File: {first_sample.file_name}")
        print(f"  Exercise: {first_sample.exercise_name} (type: {first_sample.exercise_type})")
        print(f"  Is Correct: {first_sample.is_correct}")
        print(f"  Frames: {len(first_sample.frames)}")
        if first_sample.frames:
            first_frame = first_sample.frames[0]
            print(f"  Active views: {first_frame.active_views}")
            for view_name in first_frame.active_views[:1]:  # 첫 뷰만
                kp = first_frame.keypoints[view_name]
                visible_count = sum(kp.visibility)
                print(f"  {view_name} visible keypoints: {visible_count}")
                # 처음 5개 키포인트 좌표 출력
                for i in range(min(5, 24)):
                    if kp.visibility[i] > 0:
                        print(f"    {KEYPOINT_NAMES[i]}: ({kp.coordinates[i][0]:.1f}, {kp.coordinates[i][1]:.1f})")

    # 데이터셋 생성
    print(f"\n특징 추출 중... (type: {args.feature_type})")
    X, y_exercise, y_posture, metadata = create_dataset(
        samples,
        exercise_id_map,
        feature_type=args.feature_type,
        use_all_frames=args.use_all_frames,
        use_all_views=args.use_all_views,
        verbose=True,
    )

    print(f"생성된 샘플 수: {len(X)}")

    if len(X) == 0:
        print("\n오류: 생성된 샘플이 없습니다. 데이터 구조를 확인해주세요.")
        return

    print(f"특징 차원: {X.shape[1]}")
    print(f"운동 종류 수: {num_exercise_types}")
    print(f"정자세 비율: {y_posture.sum() / len(y_posture) * 100:.1f}%")

    # 운동별 샘플 수 출력
    print("\n=== 운동별 샘플 수 ===")
    for ex_name, ex_id in exercise_id_map.items():
        count = (y_exercise == ex_id).sum()
        correct = ((y_exercise == ex_id) & (y_posture == 1)).sum()
        print(f"  {ex_id}: {ex_name} - 총 {count}개 (정자세: {correct})")

    # 데이터셋 분할
    print("\n데이터셋 분할 중...")
    dataset = split_dataset(
        X, y_exercise, y_posture, metadata,
        test_size=args.test_size,
        val_size=args.val_size,
    )

    print(f"  Train: {len(dataset['X_train'])}개")
    print(f"  Validation: {len(dataset['X_val'])}개")
    print(f"  Test: {len(dataset['X_test'])}개")

    # NPY 파일 저장
    print(f"\n저장 중... ({output_dir})")

    np.save(output_dir / 'X_train.npy', dataset['X_train'])
    np.save(output_dir / 'y_exercise_train.npy', dataset['y_exercise_train'])
    np.save(output_dir / 'y_posture_train.npy', dataset['y_posture_train'])
    np.save(output_dir / 'X_val.npy', dataset['X_val'])
    np.save(output_dir / 'y_exercise_val.npy', dataset['y_exercise_val'])
    np.save(output_dir / 'y_posture_val.npy', dataset['y_posture_val'])
    np.save(output_dir / 'X_test.npy', dataset['X_test'])
    np.save(output_dir / 'y_exercise_test.npy', dataset['y_exercise_test'])
    np.save(output_dir / 'y_posture_test.npy', dataset['y_posture_test'])

    # 메타데이터 저장
    exercise_mapping = {
        name: {'id': idx, 'name': name}
        for name, idx in exercise_id_map.items()
    }

    with open(output_dir / 'metadata.json', 'w', encoding='utf-8') as f:
        json.dump({
            'feature_type': args.feature_type,
            'feature_dim': int(X.shape[1]),
            'num_exercise_types': num_exercise_types,
            'num_train': len(dataset['X_train']),
            'num_val': len(dataset['X_val']),
            'num_test': len(dataset['X_test']),
            'keypoint_names': KEYPOINT_NAMES,
            'exercise_mapping': exercise_mapping,
            'exercise_names': target_exercises,
            'train_metadata': dataset['metadata_train'],
            'val_metadata': dataset['metadata_val'],
            'test_metadata': dataset['metadata_test'],
        }, f, ensure_ascii=False, indent=2)

    print("\n완료!")
    print(f"  X_train.npy: {dataset['X_train'].shape}")
    print(f"  y_exercise_train.npy: {dataset['y_exercise_train'].shape}")
    print(f"  y_posture_train.npy: {dataset['y_posture_train'].shape}")
    print(f"  X_val.npy: {dataset['X_val'].shape}")
    print(f"  y_exercise_val.npy: {dataset['y_exercise_val'].shape}")
    print(f"  y_posture_val.npy: {dataset['y_posture_val'].shape}")
    print(f"  X_test.npy: {dataset['X_test'].shape}")
    print(f"  y_exercise_test.npy: {dataset['y_exercise_test'].shape}")
    print(f"  y_posture_test.npy: {dataset['y_posture_test'].shape}")
    print(f"  metadata.json")


if __name__ == '__main__':
    main()
