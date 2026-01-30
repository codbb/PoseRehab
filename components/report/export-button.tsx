'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'
import { useExerciseStore } from '@/stores/exercise-store'
import { useUserStore } from '@/stores/user-store'
import { generatePdfReport, downloadPdf } from '@/lib/report/pdf-generator'
import { predictPain } from '@/lib/prediction'

interface ExportButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function ExportButton({
  variant = 'outline',
  size = 'default',
  className,
}: ExportButtonProps) {
  const { language } = useTranslation()
  const { currentAnalysis, analysisHistory } = usePostureStore()
  const { exerciseRecords } = useExerciseStore()
  const { profile } = useUserStore()

  const [isGenerating, setIsGenerating] = useState(false)

  const handleExport = async () => {
    if (!currentAnalysis) return

    setIsGenerating(true)
    try {
      const painPredictions = predictPain(analysisHistory, currentAnalysis)

      const blob = await generatePdfReport({
        userName: profile?.name || '',
        analysis: currentAnalysis,
        exerciseRecords,
        painPredictions,
        language,
      })

      const fileName = `posture-report-${new Date().toISOString().split('T')[0]}.pdf`
      downloadPdf(blob, fileName)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={!currentAnalysis || isGenerating}
      className={className}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      {language === 'ko' ? 'PDF 다운로드' : 'Download PDF'}
    </Button>
  )
}
