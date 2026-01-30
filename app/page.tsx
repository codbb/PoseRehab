'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/stores/user-store'

export default function Home() {
  const router = useRouter()
  const { isOnboardingComplete } = useUserStore()

  useEffect(() => {
    if (isOnboardingComplete) {
      router.push('/dashboard')
    } else {
      router.push('/onboarding')
    }
  }, [isOnboardingComplete, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}
