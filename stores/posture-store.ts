import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PostureAnalysisResult } from '@/types/posture'
import type { DetailedAnalysisResult } from '@/types/analysis-result'

interface PostureState {
  currentAnalysis: PostureAnalysisResult | null
  analysisHistory: PostureAnalysisResult[]
  isAnalyzing: boolean

  // 상세 결과 (3페이지용)
  detailedResult: DetailedAnalysisResult | null
  detailedResultHistory: Record<string, DetailedAnalysisResult> // id로 저장
  viewingFromHistory: boolean // 기록에서 보는 중인지

  setCurrentAnalysis: (analysis: PostureAnalysisResult | null) => void
  addToHistory: (analysis: PostureAnalysisResult) => void
  setIsAnalyzing: (analyzing: boolean) => void
  clearHistory: () => void

  // 상세 결과 액션
  setDetailedResult: (result: DetailedAnalysisResult | null) => void
  saveDetailedResult: (id: string, result: DetailedAnalysisResult) => void
  loadDetailedResultById: (id: string) => DetailedAnalysisResult | null
  setViewingFromHistory: (value: boolean) => void
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

      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      addToHistory: (analysis) =>
        set((state) => ({
          analysisHistory: [analysis, ...state.analysisHistory].slice(0, 50), // Keep last 50
        })),
      setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      clearHistory: () => set({ analysisHistory: [], detailedResultHistory: {} }),

      setDetailedResult: (result) => set({ detailedResult: result }),
      saveDetailedResult: (id, result) =>
        set((state) => ({
          detailedResultHistory: {
            ...state.detailedResultHistory,
            [id]: result,
          },
        })),
      loadDetailedResultById: (id) => {
        const state = get()
        return state.detailedResultHistory[id] || null
      },
      setViewingFromHistory: (value) => set({ viewingFromHistory: value }),
    }),
    {
      name: 'posture-ai-posture',
    }
  )
)
