'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
      <AlertTriangle className="mb-4 h-12 w-12 text-warning" />
      <h2 className="mb-2 text-xl font-semibold text-text-primary">
        Something went wrong
      </h2>
      <p className="mb-6 text-sm text-text-secondary">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  )
}
