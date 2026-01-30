'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { History, Info } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { GaitCamera } from '@/components/gait/gait-camera'
import { GaitDashboard } from '@/components/gait/gait-dashboard'
import { PhaseIndicator } from '@/components/gait/phase-indicator'
import {
  KneeAngleChart,
  HipAngleChart,
  AnkleHeightChart,
  SymmetryChart,
} from '@/components/gait/gait-charts'
import { useGaitStore } from '@/stores/gait-store'
import { useTranslation } from '@/hooks/use-translation'
import { getGaitAnalyzer, resetGaitAnalyzer } from '@/lib/analysis/gait-analyzer'
import type { Landmark } from '@/types/posture'
import Link from 'next/link'

export default function GaitAnalysisPage() {
  const router = useRouter()
  const { language } = useTranslation()
  const analyzerRef = useRef(getGaitAnalyzer())

  // 스토어 상태
  const {
    isActive,
    currentMode,
    currentMeasurements,
    currentPhase,
    frameHistory,
    showSkeleton,
    showPhaseIndicator,
    targetFps,
    setIsActive,
    setCurrentMode,
    startSession,
    addFrame,
    updateMeasurements,
    updatePhase,
    saveAnalysis,
    resetFrameHistory,
  } = useGaitStore()

  // 로컬 상태
  const [analysisTime, setAnalysisTime] = useState(0)
  const analysisStartTime = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 분석 시작
  const handleAnalysisStart = useCallback(() => {
    resetGaitAnalyzer()
    analyzerRef.current = getGaitAnalyzer()
    startSession(currentMode)
    analysisStartTime.current = Date.now()
    setAnalysisTime(0)

    // 타이머 시작
    timerRef.current = setInterval(() => {
      setAnalysisTime(Math.floor((Date.now() - analysisStartTime.current) / 1000))
    }, 1000)
  }, [currentMode, startSession])

  // 분석 중지
  const handleAnalysisStop = useCallback(() => {
    setIsActive(false)

    // 타이머 정지
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // 분석 결과 생성 및 저장
    const result = analyzerRef.current.generateAnalysisResult()
    if (result && result.totalStrides > 0) {
      saveAnalysis(result)
      // 결과 페이지로 이동
      router.push(`/gait-analysis/result?id=${result.id}`)
    }

    setAnalysisTime(0)
  }, [setIsActive, saveAnalysis, router])

  // 프레임 처리
  const handleFrame = useCallback(
    (landmarks: Landmark[], timestamp: number) => {
      try {
        const frame = analyzerRef.current.processFrame(landmarks, timestamp)
        addFrame(frame)

        // 측정값과 보행 단계 업데이트
        if (frame.measurements) {
          const fullMeasurements = analyzerRef.current.getCurrentMeasurements()
          if (fullMeasurements) {
            updateMeasurements(fullMeasurements)
          }
        }

        if (frame.phase) {
          updatePhase(frame.phase)
        }
      } catch (error) {
        console.error('Frame processing error:', error)
      }
    },
    [addFrame, updateMeasurements, updatePhase]
  )

  // 모드 변경
  const handleModeChange = useCallback(
    (mode: 'webcam' | 'video') => {
      if (isActive) {
        handleAnalysisStop()
      }
      setCurrentMode(mode)
    },
    [isActive, handleAnalysisStop, setCurrentMode]
  )

  // 영상 변경 시 분석 결과 초기화
  const handleVideoChange = useCallback(() => {
    resetGaitAnalyzer()
    analyzerRef.current = getGaitAnalyzer()
    resetFrameHistory() // 프레임 히스토리 초기화
    setAnalysisTime(0)
  }, [resetFrameHistory])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-primary text-2xl font-bold">
              {language === 'ko' ? '보행 분석' : 'Gait Analysis'}
            </h1>
            <p className="text-text-secondary text-sm">
              {language === 'ko'
                ? 'MediaPipe Pose를 사용한 실시간 보행 분석'
                : 'Real-time gait analysis using MediaPipe Pose'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/gait-analysis/history"
              className="text-text-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface"
            >
              <History className="h-4 w-4" />
              {language === 'ko' ? '기록' : 'History'}
            </Link>
          </div>
        </div>

        {/* 분석 시간 표시 */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center"
          >
            <div className="bg-surface rounded-full border border-border px-6 py-2">
              <span className="text-text-secondary mr-2 text-sm">
                {language === 'ko' ? '분석 시간' : 'Analysis Time'}:
              </span>
              <span className="text-text-primary text-lg font-bold tabular-nums">
                {formatTime(analysisTime)}
              </span>
            </div>
          </motion.div>
        )}

        {/* 메인 그리드 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 왼쪽: 카메라 뷰 */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-2xl border border-border p-4">
              <GaitCamera
                mode={currentMode}
                isAnalyzing={isActive}
                showSkeleton={showSkeleton}
                onModeChange={handleModeChange}
                onAnalysisStart={handleAnalysisStart}
                onAnalysisStop={handleAnalysisStop}
                onVideoChange={handleVideoChange}
                onFrame={handleFrame}
                targetFps={targetFps}
              />
            </div>

            {/* 실시간 차트 영역 - 분석 중이거나 데이터가 있을 때 표시 */}
            {(isActive || frameHistory.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 grid gap-4 md:grid-cols-2"
              >
                <KneeAngleChart frames={frameHistory} />
                <HipAngleChart frames={frameHistory} />
                <AnkleHeightChart frames={frameHistory} />
                <SymmetryChart measurements={currentMeasurements} />
              </motion.div>
            )}
          </div>

          {/* 오른쪽: 대시보드 */}
          <div className="space-y-4">
            {/* 측정값 대시보드 */}
            <div className="bg-surface rounded-2xl border border-border p-4">
              <h3 className="text-text-primary mb-4 font-medium">
                {language === 'ko' ? '실시간 측정값' : 'Real-time Measurements'}
              </h3>
              <GaitDashboard measurements={currentMeasurements} showAll={false} />
            </div>

            {/* 보행 단계 표시 */}
            {showPhaseIndicator && (
              <div className="bg-surface rounded-2xl border border-border p-4">
                <PhaseIndicator phaseState={currentPhase} />
              </div>
            )}

            {/* 안내 카드 */}
            {!isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-primary/5 rounded-2xl border border-primary/20 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <h4 className="text-text-primary font-medium">
                    {language === 'ko' ? '측정 안내' : 'Measurement Guide'}
                  </h4>
                </div>
                <ul className="text-text-secondary space-y-1 text-sm">
                  <li>
                    •{' '}
                    {language === 'ko'
                      ? '카메라에서 2-3m 거리에 위치하세요'
                      : 'Stand 2-3m away from the camera'}
                  </li>
                  <li>
                    •{' '}
                    {language === 'ko'
                      ? '측면이 보이도록 서주세요'
                      : 'Stand sideways to show your profile'}
                  </li>
                  <li>
                    •{' '}
                    {language === 'ko'
                      ? '자연스럽게 걸어주세요'
                      : 'Walk naturally'}
                  </li>
                  <li>
                    •{' '}
                    {language === 'ko'
                      ? '최소 10초 이상 분석하세요'
                      : 'Analyze for at least 10 seconds'}
                  </li>
                </ul>
              </motion.div>
            )}

            {/* 측정 중 추가 정보 */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface rounded-2xl border border-border p-4"
              >
                <h4 className="text-text-primary mb-3 font-medium">
                  {language === 'ko' ? '측정 상태' : 'Measurement Status'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      {language === 'ko' ? '프레임 수' : 'Frames'}
                    </span>
                    <span className="text-text-primary font-medium">
                      {frameHistory.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      {language === 'ko' ? '걸음 수' : 'Steps'}
                    </span>
                    <span className="text-text-primary font-medium">
                      {currentPhase?.cycleCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      {language === 'ko' ? '분석 모드' : 'Mode'}
                    </span>
                    <span className="text-text-primary font-medium">
                      {currentMode === 'webcam'
                        ? language === 'ko'
                          ? '웹캠'
                          : 'Webcam'
                        : language === 'ko'
                        ? '비디오'
                        : 'Video'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
