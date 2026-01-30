'use client'

import { ResultLayout } from '@/components/posture/result-layout'

export default function ResultPagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ResultLayout>{children}</ResultLayout>
}
