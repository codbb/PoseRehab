import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PostureAnalysisResult } from '@/types/posture'
import type { DetailedAnalysisResult, AI3DAnalysisHistoryEntry } from '@/types/analysis-result'

const MAX_DETAILED_RESULTS = 50

interface PostureState {
  currentAnalysis: PostureAnalysisResult | null
  analysisHistory: PostureAnalysisResult[]
  isAnalyzing: boolean

  // 상세 결과 (3페이지용)
  detailedResult: DetailedAnalysisResult | null
  detailedResultHistory: Record<string, DetailedAnalysisResult> // id로 저장
  viewingFromHistory: boolean // 기록에서 보는 중인지

  // AI 3D 분석 히스토리 (변화 추적용)
  ai3dAnalysisHistory: AI3DAnalysisHistoryEntry[]

  setCurrentAnalysis: (analysis: PostureAnalysisResult | null) => void
  addToHistory: (analysis: PostureAnalysisResult) => void
  setIsAnalyzing: (analyzing: boolean) => void
  clearHistory: () => void

  // 상세 결과 액션
  setDetailedResult: (result: DetailedAnalysisResult | null) => void
  saveDetailedResult: (id: string, result: DetailedAnalysisResult) => void
  loadDetailedResultById: (id: string) => DetailedAnalysisResult | null
  setViewingFromHistory: (value: boolean) => void

  // AI 3D 분석 히스토리 액션
  addAI3DAnalysis: (entry: AI3DAnalysisHistoryEntry) => void
  getAI3DAnalysisById: (id: string) => AI3DAnalysisHistoryEntry | null
  deleteAI3DAnalysis: (id: string) => void
  clearAI3DHistory: () => void
}

export const usePostureStore = create<PostureState>()(
  persist(
    (set, get) => ({
      currentAnalysis: null,
      analysisHistory: [],
      isAnalyzing: false,
      detailedResult: null,
      detailedResultHistory: {},
      viewingFromHistory: false,
      ai3dAnalysisHistory: [],

      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      addToHistory: (analysis) =>
        set((state) => ({
          analysisHistory: [analysis, ...state.analysisHistory].slice(0, 50), // Keep last 50
        })),
      setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      clearHistory: () => set({ analysisHistory: [], detailedResultHistory: {}, ai3dAnalysisHistory: [] }),

      setDetailedResult: (result) => set({ detailedResult: result }),
      saveDetailedResult: (id, result) =>
        set((state) => {
          const updated = { ...state.detailedResultHistory, [id]: result }
          // Limit entries to prevent localStorage overflow
          const keys = Object.keys(updated)
          if (keys.length > MAX_DETAILED_RESULTS) {
            const keysToRemove = keys.slice(0, keys.length - MAX_DETAILED_RESULTS)
            for (const key of keysToRemove) {
              delete updated[key]
            }
          }
          return { detailedResultHistory: updated }
        }),
      loadDetailedResultById: (id) => {
        const state = get()
        return state.detailedResultHistory?.[id] || null
      },
      setViewingFromHistory: (value) => set({ viewingFromHistory: value }),

      // AI 3D 분석 히스토리 액션
      addAI3DAnalysis: (entry) =>
        set((state) => ({
          ai3dAnalysisHistory: [entry, ...state.ai3dAnalysisHistory].slice(0, 20), // Keep last 20 for storage management
        })),
      getAI3DAnalysisById: (id) => {
        const state = get()
        return state.ai3dAnalysisHistory.find((e) => e.id === id) || null
      },
      deleteAI3DAnalysis: (id) =>
        set((state) => ({
          ai3dAnalysisHistory: state.ai3dAnalysisHistory.filter((e) => e.id !== id),
        })),
      clearAI3DHistory: () => set({ ai3dAnalysisHistory: [] }),
    }),
    {
      name: 'posture-ai-posture',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>
        if (version === 0) {
          // Ensure new fields exist for old localStorage data
          if (!state.ai3dAnalysisHistory) state.ai3dAnalysisHistory = []
          if (!state.detailedResultHistory) state.detailedResultHistory = {}
        }
        return state as unknown as PostureState
      },
    }
  )
)
