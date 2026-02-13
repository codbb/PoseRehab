export interface RiskFactor {
  ko: string
  en: string
}

export const RISK_FACTORS: Record<string, RiskFactor[]> = {
  'shoulderHeightDifference': [
    { ko: '한쪽 어깨에 가방을 자주 맴', en: 'Frequently carrying bag on one shoulder' },
    { ko: '측면 수면 자세', en: 'Side sleeping position' },
    { ko: '한쪽 팔을 많이 사용하는 작업', en: 'Repetitive single-arm tasks' },
  ],
  'pelvicTilt': [
    { ko: '다리 꼬기 습관', en: 'Leg crossing habit' },
    { ko: '한쪽으로 기대는 자세', en: 'Leaning to one side' },
    { ko: '좌우 근력 불균형', en: 'Left-right muscle imbalance' },
  ],
  'legAlignment': [
    { ko: '평발 또는 요족', en: 'Flat feet or high arches' },
    { ko: '부적절한 신발', en: 'Improper footwear' },
    { ko: '골반 정렬 이상', en: 'Pelvic misalignment' },
  ],
  'forwardHead': [
    { ko: '장시간 스마트폰/컴퓨터 사용', en: 'Prolonged phone/computer use' },
    { ko: '낮은 모니터 높이', en: 'Low monitor height' },
    { ko: '높은 베개 사용', en: 'Using a high pillow' },
  ],
  'thoracicKyphosis': [
    { ko: '장시간 구부정한 자세', en: 'Prolonged slouching posture' },
    { ko: '복근/등근육 약화', en: 'Weak core/back muscles' },
    { ko: '장시간 앉아있는 생활', en: 'Sedentary lifestyle' },
  ],
  'lumbarLordosis': [
    { ko: '복근 약화', en: 'Weak abdominal muscles' },
    { ko: '고관절 굴곡근 단축', en: 'Tight hip flexors' },
    { ko: '과체중/복부 비만', en: 'Overweight/abdominal obesity' },
  ],
  'shoulderProtraction': [
    { ko: '가슴근육(대흉근) 단축', en: 'Tight pectoral muscles' },
    { ko: '등근육(능형근) 약화', en: 'Weak rhomboid muscles' },
    { ko: '장시간 전방 작업 자세', en: 'Prolonged forward-reaching posture' },
  ],
  'spineLateralDeviation': [
    { ko: '좌우 근력 불균형', en: 'Left-right muscle imbalance' },
    { ko: '한쪽으로 짐 운반 습관', en: 'Habitual one-sided carrying' },
    { ko: '비대칭 운동 패턴', en: 'Asymmetric exercise patterns' },
  ],
  'scapulaHeightDifference': [
    { ko: '승모근 좌우 불균형', en: 'Trapezius muscle imbalance' },
    { ko: '한쪽 어깨 과사용', en: 'One shoulder overuse' },
    { ko: '흉추 측만', en: 'Thoracic lateral curvature' },
  ],
}

// Map risk name to RISK_FACTORS key
export function getRiskFactorKey(riskName: string): string | null {
  const mapping: Record<string, string> = {
    'Shoulder Height Difference': 'shoulderHeightDifference',
    'Pelvic Tilt': 'pelvicTilt',
    'Leg Alignment': 'legAlignment',
    'Forward Head Posture': 'forwardHead',
    'Thoracic Kyphosis': 'thoracicKyphosis',
    'Lumbar Lordosis': 'lumbarLordosis',
    'Shoulder Protraction': 'shoulderProtraction',
    'Spine Lateral Deviation': 'spineLateralDeviation',
    'Scapula Height Difference': 'scapulaHeightDifference',
    // Legacy name mappings
    'Spine Curvature': 'thoracicKyphosis',
    'Shoulders': 'shoulderHeightDifference',
    'Pelvis': 'pelvicTilt',
    'Neck': 'forwardHead',
    'Round Shoulder': 'shoulderProtraction',
    'Scoliosis (C7-Pelvis Deviation)': 'spineLateralDeviation',
    'Scapula Asymmetry (Height Diff)': 'scapulaHeightDifference',
  }
  return mapping[riskName] || null
}
