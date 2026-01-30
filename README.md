# PostureAI

AI 기반 자세 분석 및 재활 운동 웹 애플리케이션

## 소개

PostureAI는 웹캠 또는 이미지를 통해 사용자의 자세를 AI로 분석하고, 맞춤형 운동을 추천하며, 실시간 피드백과 게이미피케이션을 통해 재활 및 자세 교정을 돕는 웹 애플리케이션입니다.

## 주요 기능

### 자세 분석
- 웹캠 실시간 촬영 또는 이미지 업로드
- MediaPipe Pose를 활용한 AI 자세 분석
- 부위별 상세 분석 (어깨, 척추, 골반, 무릎 등)
- 자세 점수 및 개선 포인트 제공

### 운동 기능
- 맞춤형 운동 추천
- 실시간 자세 피드백 및 반복 횟수 카운트
- 손 재활 운동 (MediaPipe Hands 활용)

### 재활 게임
- **리듬 그립**: 리듬에 맞춰 손 쥐기 게임
- **자세 맞추기**: 화면의 자세를 따라하는 게임
- **과일 닌자**: 손동작으로 과일 자르기

### 기록 및 분석
- 캘린더 기반 운동 기록
- 주간/월간 통계 및 차트
- 통증 예측 및 체형 변화 예측
- PDF 리포트 생성

### 게이미피케이션
- 레벨 시스템 및 XP
- 업적 뱃지
- 일일 챌린지

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 애니메이션 | Framer Motion |
| 자세 분석 | MediaPipe Pose |
| 손 인식 | MediaPipe Hands |
| 상태관리 | Zustand |
| 차트 | Recharts |

## 시작하기

### 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/posture-ai.git
cd posture-ai

# 의존성 설치
npm install
```

### 실행

```bash
# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

### 빌드

```bash
npm run build
npm run start
```

## 프로젝트 구조

```
posture-ai/
├── app/                    # Next.js App Router 페이지
│   ├── (auth)/            # 인증 관련 (온보딩)
│   └── (main)/            # 메인 기능 페이지
├── components/            # React 컴포넌트
│   ├── ui/               # 공통 UI 컴포넌트
│   ├── layout/           # 레이아웃 컴포넌트
│   ├── posture/          # 자세 분석 관련
│   ├── exercise/         # 운동 관련
│   ├── games/            # 게임 관련
│   └── charts/           # 차트 컴포넌트
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티 및 분석 로직
├── stores/                # Zustand 스토어
├── types/                 # TypeScript 타입
└── locales/               # 다국어 지원 (ko, en)
```

## 스크립트

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 실행
npm run type-check   # TypeScript 타입 체크
```

## 브라우저 지원

- Chrome (권장)
- Firefox
- Safari
- Edge

## 카메라 요구사항

- 최소 720p 웹캠
- 전신이 보이는 거리 (약 2-3m)
- 충분한 조명


