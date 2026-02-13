import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GaitState,
  GaitSession,
  GaitFrame,
  GaitMeasurements,
  GaitPhaseState,
  GaitAnalysisResult,
} from '@/types/gait'
import { GAIT_ANALYSIS_CONFIG } from '@/lib/gait-constants'

export const useGaitStore = create<GaitState>()(
  persist(
    (set, get) => ({
      // 분석 상태
      isActive: false,
      isModelLoaded: false,
      currentMode: 'webcam',
      currentSession: null,
      currentMeasurements: null,
      currentPhase: null,

      // 프레임 히스토리
      frameHistory: [],
      maxFrameHistory: GAIT_ANALYSIS_CONFIG.maxFrameBufferSize,

      // 저장된 기록
      analysisHistory: [],
      maxHistoryCount: GAIT_ANALYSIS_CONFIG.maxHistoryCount,

      // 설정
      showSkeleton: true,
      showMetrics: true,
      showPhaseIndicator: true,
      targetFps: 30,

      // 액션
      setIsActive: (active) => set({ isActive: active }),

      setIsModelLoaded: (loaded) => set({ isModelLoaded: loaded }),

      setCurrentMode: (mode) => set({ currentMode: mode }),

      startSession: (mode) => {
        const session: GaitSession = {
          id: crypto.randomUUID(),
          startTime: Date.now(),
          mode,
          frames: [],
          isActive: true,
        }
        set({
          currentSession: session,
          currentMode: mode,
          isActive: true,
          frameHistory: [],
          currentMeasurements: null,
          currentPhase: null,
        })
      },

      endSession: () => {
        const { currentSession, frameHistory } = get()

        if (!currentSession) {
          return null
        }

        // 분석 결과 생성은 gait-analyzer에서 수행
        // 여기서는 세션만 종료
        set({
          currentSession: null,
          isActive: false,
        })

        return null
      },

      updateMeasurements: (measurements) => {
        set({ currentMeasurements: measurements })
      },

      updatePhase: (phase) => {
        set({ currentPhase: phase })
      },

      addFrame: (frame) => {
        const { frameHistory, maxFrameHistory, currentSession } = get()

        // 프레임 히스토리 업데이트
        const newHistory = [...frameHistory, frame]
        if (newHistory.length > maxFrameHistory) {
          newHistory.shift()
        }

        // 세션에도 추가 (프레임 수 제한으로 메모리 관리)
        if (currentSession) {
          const maxSessionFrames = maxFrameHistory * 2
          const sessionFrames = [...currentSession.frames, frame]
          const updatedSession = {
            ...currentSession,
            frames: sessionFrames.length > maxSessionFrames
              ? sessionFrames.slice(-maxSessionFrames)
              : sessionFrames,
          }
          set({
            frameHistory: newHistory,
            currentSession: updatedSession,
            currentMeasurements: frame.measurements as GaitMeasurements,
            currentPhase: frame.phase,
          })
        } else {
          set({
            frameHistory: newHistory,
            currentMeasurements: frame.measurements as GaitMeasurements,
            currentPhase: frame.phase,
          })
        }
      },

      saveAnalysis: (result) => {
        const { analysisHistory, maxHistoryCount } = get()

        // 새 결과를 앞에 추가
        const newHistory = [result, ...analysisHistory]

        // 최대 개수 제한
        if (newHistory.length > maxHistoryCount) {
          newHistory.pop()
        }

        set({ analysisHistory: newHistory })
      },

      deleteAnalysis: (id) => {
        set((state) => ({
          analysisHistory: state.analysisHistory.filter((a) => a.id !== id),
        }))
      },

      clearHistory: () => {
        set({ analysisHistory: [] })
      },

      setShowSkeleton: (show) => set({ showSkeleton: show }),

      setShowMetrics: (show) => set({ showMetrics: show }),

      setShowPhaseIndicator: (show) => set({ showPhaseIndicator: show }),

      setTargetFps: (fps) => set({ targetFps: fps }),

      // 프레임 히스토리만 초기화 (영상 변경 시 사용)
      resetFrameHistory: () => {
        set({
          frameHistory: [],
          currentMeasurements: null,
          currentPhase: null,
          currentSession: null,
        })
      },
    }),
    {
      name: 'posture-ai-gait',
      partialize: (state) => ({
        // 설정과 기록만 저장
        analysisHistory: state.analysisHistory,
        showSkeleton: state.showSkeleton,
        showMetrics: state.showMetrics,
        showPhaseIndicator: state.showPhaseIndicator,
        targetFps: state.targetFps,
      }),
    }
  )
)
