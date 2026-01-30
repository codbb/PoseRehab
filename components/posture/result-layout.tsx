'use client'

import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, List, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MainLayout } from '@/components/layout/main-layout'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'

interface ResultLayoutProps {
  children: React.ReactNode
}

const steps = [
  {
    id: 'classification',
    path: '/posture-analysis/result/classification',
    labelKo: '자세 유형 분류',
    labelEn: 'Classification',
    number: '01',
  },
  {
    id: 'visualization',
    path: '/posture-analysis/result/visualization',
    labelKo: '신체 왜곡 시각화',
    labelEn: 'Visualization',
    number: '02',
  },
  {
    id: 'muscle',
    path: '/posture-analysis/result/muscle',
    labelKo: '근육 불균형 분석',
    labelEn: 'Muscle Analysis',
    number: '03',
  },
]

export function ResultLayout({ children }: ResultLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useTranslation()
  const { viewingFromHistory, setDetailedResult, setViewingFromHistory } = usePostureStore()

  const currentStepIndex = steps.findIndex((step) => step.path === pathname)
  const currentStep = steps[currentStepIndex] || steps[0]
  const isLastStep = currentStepIndex === steps.length - 1

  const goToPrevious = () => {
    if (currentStepIndex > 0) {
      router.push(steps[currentStepIndex - 1].path)
    }
  }

  const goToNext = () => {
    if (currentStepIndex < steps.length - 1) {
      router.push(steps[currentStepIndex + 1].path)
    }
  }

  const goToStep = (index: number) => {
    router.push(steps[index].path)
  }

  const handleBackToList = () => {
    setDetailedResult(null)
    setViewingFromHistory(false)
    router.push('/posture-analysis/history')
  }

  const handleNewAnalysis = () => {
    setDetailedResult(null)
    setViewingFromHistory(false)
    router.push('/posture-analysis')
  }

  // 현재 단계에 맞는 타이틀 생성
  const getTitle = () => {
    if (language === 'ko') {
      return currentStep.id === 'classification'
        ? '자세 유형 분류'
        : currentStep.id === 'visualization'
        ? '신체 왜곡 시각화'
        : '근육 불균형 분석'
    }
    return currentStep.id === 'classification'
      ? 'Posture Classification'
      : currentStep.id === 'visualization'
      ? 'Body Distortion'
      : 'Muscle Analysis'
  }

  return (
    <MainLayout title={getTitle()} className="p-0">
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        {/* Step Navigation Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-2 md:gap-4">
              {steps.map((step, index) => {
                const isActive = index === currentStepIndex
                const isCompleted = index < currentStepIndex

                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : isCompleted
                        ? 'text-secondary hover:bg-secondary/10'
                        : 'text-text-secondary hover:bg-background'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all',
                        isActive
                          ? 'bg-primary text-white'
                          : isCompleted
                          ? 'bg-secondary text-white'
                          : 'bg-border text-text-secondary'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-medium">
                      {language === 'ko' ? step.labelKo : step.labelEn}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="max-w-7xl mx-auto px-4 pt-6 w-full">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
              <span className="text-secondary">{currentStep.number}</span>
              <span className="mx-2 text-text-secondary">/</span>
              {language === 'ko'
                ? currentStep.id === 'classification'
                  ? '디지털화 - 12가지 자세 유형 분류'
                  : currentStep.id === 'visualization'
                  ? '시각화 - 신체 왜곡 시각화'
                  : '분석 - 근육 불균형 분석'
                : currentStep.id === 'classification'
                ? 'Digitization - 12 Posture Type Classification'
                : currentStep.id === 'visualization'
                ? 'Visualization - Body Distortion Analysis'
                : 'Analysis - Muscle Imbalance Analysis'}
            </h1>
          </motion.div>
        </div>

        {/* Main Content */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 max-w-7xl mx-auto px-4 pb-24 w-full"
        >
          {children}
        </motion.div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-[72px] lg:left-[240px] right-0 bg-surface border-t border-border z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentStepIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'ko' ? '이전' : 'Previous'}
            </Button>

            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    index === currentStepIndex
                      ? 'bg-primary w-6'
                      : index < currentStepIndex
                      ? 'bg-secondary'
                      : 'bg-border'
                  )}
                />
              ))}
            </div>

            {isLastStep ? (
              <div className="flex items-center gap-2">
                {viewingFromHistory ? (
                  <Button onClick={handleBackToList} className="gap-2">
                    <List className="w-4 h-4" />
                    {language === 'ko' ? '목록으로' : 'Back to List'}
                  </Button>
                ) : (
                  <Button onClick={handleNewAnalysis} variant="secondary" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {language === 'ko' ? '새 분석' : 'New Analysis'}
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={goToNext} className="gap-2">
                {language === 'ko' ? '다음' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
