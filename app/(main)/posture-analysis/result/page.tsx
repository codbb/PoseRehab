'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResultPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/posture-analysis/result/classification')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
