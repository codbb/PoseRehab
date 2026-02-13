'use client'

import type { ViewAngle } from '@/types/analysis-result'

interface PoseSilhouetteProps {
  view: ViewAngle
  className?: string
}

// 정면 실루엣 SVG
function FrontSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 200"
      fill="currentColor"
      className={className}
    >
      {/* 머리 */}
      <ellipse cx="50" cy="20" rx="14" ry="16" />

      {/* 목 */}
      <rect x="44" y="34" width="12" height="10" rx="2" />

      {/* 몸통 */}
      <path d="M30 44 L70 44 L68 100 L32 100 Z" />

      {/* 왼팔 */}
      <path d="M30 44 L22 48 L18 85 L24 86 L26 52 L30 50 Z" />
      <ellipse cx="20" cy="90" rx="5" ry="6" /> {/* 왼손 */}

      {/* 오른팔 */}
      <path d="M70 44 L78 48 L82 85 L76 86 L74 52 L70 50 Z" />
      <ellipse cx="80" cy="90" rx="5" ry="6" /> {/* 오른손 */}

      {/* 골반/엉덩이 */}
      <path d="M32 100 L68 100 L72 115 L28 115 Z" />

      {/* 왼다리 */}
      <path d="M28 115 L42 115 L40 170 L32 170 Z" />
      <rect x="30" y="170" width="12" height="8" rx="2" /> {/* 왼발 */}

      {/* 오른다리 */}
      <path d="M58 115 L72 115 L68 170 L60 170 Z" />
      <rect x="58" y="170" width="12" height="8" rx="2" /> {/* 오른발 */}
    </svg>
  )
}

// 측면 실루엣 SVG (오른쪽을 바라봄)
function SideSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 200"
      fill="currentColor"
      className={className}
    >
      {/* 머리 (옆모습) */}
      <ellipse cx="45" cy="20" rx="12" ry="16" />
      {/* 얼굴 앞쪽 돌출 */}
      <ellipse cx="54" cy="18" rx="5" ry="10" />

      {/* 목 */}
      <path d="M38 34 L50 34 L48 44 L40 44 Z" />

      {/* 몸통 (옆에서 보면 얇음) */}
      <path d="M32 44 L52 44 L54 75 L48 100 L36 100 L30 75 Z" />

      {/* 팔 (자연스럽게 내린 자세) */}
      <path d="M32 46 L28 50 L24 85 L30 86 L32 55 Z" />
      <ellipse cx="26" cy="90" rx="4" ry="5" /> {/* 손 */}

      {/* 엉덩이 */}
      <path d="M36 100 L48 100 L50 115 L34 118 L30 108 Z" />

      {/* 다리 */}
      <path d="M34 118 L46 115 L44 170 L36 170 Z" />

      {/* 발 */}
      <path d="M34 170 L46 170 L52 176 L32 178 Z" />
    </svg>
  )
}

// 후면 실루엣 SVG
function BackSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 200"
      fill="currentColor"
      className={className}
    >
      {/* 머리 (뒷모습) */}
      <ellipse cx="50" cy="20" rx="14" ry="16" />
      {/* 뒤통수 머리카락 라인 */}
      <path d="M36 12 Q50 5 64 12 Q65 20 64 28 Q50 32 36 28 Q35 20 36 12" opacity="0.3" />

      {/* 목 */}
      <rect x="44" y="34" width="12" height="10" rx="2" />

      {/* 몸통 (등) */}
      <path d="M30 44 L70 44 L68 100 L32 100 Z" />
      {/* 척추 라인 */}
      <line x1="50" y1="44" x2="50" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      {/* 견갑골 표시 */}
      <ellipse cx="38" cy="60" rx="6" ry="10" opacity="0.15" />
      <ellipse cx="62" cy="60" rx="6" ry="10" opacity="0.15" />

      {/* 왼팔 */}
      <path d="M30 44 L22 48 L18 85 L24 86 L26 52 L30 50 Z" />
      <ellipse cx="20" cy="90" rx="5" ry="6" /> {/* 왼손 */}

      {/* 오른팔 */}
      <path d="M70 44 L78 48 L82 85 L76 86 L74 52 L70 50 Z" />
      <ellipse cx="80" cy="90" rx="5" ry="6" /> {/* 오른손 */}

      {/* 골반/엉덩이 */}
      <path d="M32 100 L68 100 L72 115 L28 115 Z" />

      {/* 왼다리 */}
      <path d="M28 115 L42 115 L40 170 L32 170 Z" />
      <rect x="30" y="170" width="12" height="8" rx="2" /> {/* 왼발 */}

      {/* 오른다리 */}
      <path d="M58 115 L72 115 L68 170 L60 170 Z" />
      <rect x="58" y="170" width="12" height="8" rx="2" /> {/* 오른발 */}
    </svg>
  )
}

export function PoseSilhouette({ view, className = '' }: PoseSilhouetteProps) {
  const baseClass = `text-text-secondary/30 ${className}`

  switch (view) {
    case 'front':
      return <FrontSilhouette className={baseClass} />
    case 'side':
      return <SideSilhouette className={baseClass} />
    case 'back':
      return <BackSilhouette className={baseClass} />
  }
}
