'use client'

import { useState } from 'react'
import { Database, Download, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/use-translation'
import { useUserStore } from '@/stores/user-store'
import { useExerciseStore } from '@/stores/exercise-store'
import { usePostureStore } from '@/stores/posture-store'
import { useGameStore } from '@/stores/game-store'
import { useChallengeStore } from '@/stores/challenge-store'

export function DataManagement() {
  const { language } = useTranslation()
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')

  const userStore = useUserStore()
  const exerciseStore = useExerciseStore()
  const postureStore = usePostureStore()
  const gameStore = useGameStore()

  const handleExportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      user: {
        profile: userStore.profile,
        level: userStore.level,
        experience: userStore.experience,
        badges: userStore.badges,
        goals: userStore.goals,
        painAreas: userStore.painAreas,
      },
      exercise: {
        records: exerciseStore.exerciseRecords,
      },
      posture: {
        history: postureStore.analysisHistory,
        currentAnalysis: postureStore.currentAnalysis,
      },
      games: {
        scores: gameStore.gameScores,
      },
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `posture-ai-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleResetData = () => {
    if (resetConfirmText !== 'DELETE') return

    // Clear all localStorage data
    localStorage.removeItem('posture-ai-user')
    localStorage.removeItem('posture-ai-exercise')
    localStorage.removeItem('posture-ai-posture')
    localStorage.removeItem('posture-ai-games')
    localStorage.removeItem('posture-ai-challenges')
    localStorage.removeItem('posture-ai-settings')

    // Refresh the page to reset all stores
    window.location.reload()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {language === 'ko' ? '데이터 관리' : 'Data Management'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-text-primary">
                {language === 'ko' ? '데이터 내보내기' : 'Export Data'}
              </p>
              <p className="text-sm text-text-secondary">
                {language === 'ko'
                  ? '모든 데이터를 JSON 파일로 다운로드합니다'
                  : 'Download all data as a JSON file'}
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              {language === 'ko' ? '내보내기' : 'Export'}
            </Button>
          </div>

          {/* Reset Data */}
          <div className="flex items-center justify-between rounded-lg border border-error/30 bg-error/5 p-4">
            <div>
              <p className="font-medium text-error">
                {language === 'ko' ? '데이터 초기화' : 'Reset All Data'}
              </p>
              <p className="text-sm text-text-secondary">
                {language === 'ko'
                  ? '모든 데이터가 영구적으로 삭제됩니다'
                  : 'All data will be permanently deleted'}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowResetModal(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {language === 'ko' ? '초기화' : 'Reset'}
            </Button>
          </div>

          {/* Storage Info */}
          <div className="rounded-lg bg-background p-4">
            <p className="text-sm text-text-secondary">
              {language === 'ko' ? '저장 위치' : 'Storage Location'}:{' '}
              <span className="font-medium text-text-primary">
                {language === 'ko' ? '로컬 스토리지 (브라우저)' : 'Local Storage (Browser)'}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false)
          setResetConfirmText('')
        }}
        title={language === 'ko' ? '데이터 초기화' : 'Reset All Data'}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-error/10 p-4">
            <AlertTriangle className="h-6 w-6 text-error flex-shrink-0" />
            <div>
              <p className="font-medium text-error">
                {language === 'ko' ? '경고' : 'Warning'}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {language === 'ko'
                  ? '이 작업은 되돌릴 수 없습니다. 모든 운동 기록, 자세 분석 기록, 게임 점수, 뱃지 및 설정이 영구적으로 삭제됩니다.'
                  : 'This action cannot be undone. All exercise records, posture analysis history, game scores, badges, and settings will be permanently deleted.'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">
              {language === 'ko'
                ? '확인을 위해 "DELETE"를 입력하세요:'
                : 'Type "DELETE" to confirm:'}
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus:border-error focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowResetModal(false)
                setResetConfirmText('')
              }}
            >
              {language === 'ko' ? '취소' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={resetConfirmText !== 'DELETE'}
              onClick={handleResetData}
            >
              {language === 'ko' ? '데이터 삭제' : 'Delete Data'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
