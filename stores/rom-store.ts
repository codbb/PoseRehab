import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MovementType,
  JointSide,
  CalibrationData,
  MeasurementRecord,
  RomMeasurementSession,
  JointCategory,
} from '@/types/rom'

interface RomState {
  // 현재 측정 상태
  isActive: boolean
  selectedCategory: JointCategory
  selectedMovement: MovementType | null
  selectedSide: JointSide
  currentAngle: number
  isCalibrating: boolean
  calibrationStep: 'idle' | 'min' | 'max' | 'complete'

  // 캘리브레이션 데이터
  calibrations: Record<string, CalibrationData>

  // 측정 기록
  measurementHistory: RomMeasurementSession[]
  currentSession: MeasurementRecord[]

  // 설정
  voiceEnabled: boolean
  measurementMode: 'single' | 'full' | 'compare'

  // 액션
  setIsActive: (active: boolean) => void
  setSelectedCategory: (category: JointCategory) => void
  setSelectedMovement: (movement: MovementType | null) => void
  setSelectedSide: (side: JointSide) => void
  setCurrentAngle: (angle: number) => void
  setIsCalibrating: (calibrating: boolean) => void
  setCalibrationStep: (step: 'idle' | 'min' | 'max' | 'complete') => void

  // 캘리브레이션
  saveCalibration: (data: CalibrationData) => void
  getCalibration: (movementId: MovementType, side: JointSide) => CalibrationData | null
  resetCalibration: (movementId: MovementType, side: JointSide) => void
  resetAllCalibrations: () => void

  // 측정 기록
  addMeasurement: (record: MeasurementRecord) => void
  saveSession: () => void
  clearCurrentSession: () => void
  clearHistory: () => void

  // 설정
  setVoiceEnabled: (enabled: boolean) => void
  setMeasurementMode: (mode: 'single' | 'full' | 'compare') => void
}

function generateCalibrationKey(movementId: MovementType, side: JointSide): string {
  return `${movementId}_${side}`
}

export const useRomStore = create<RomState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      isActive: false,
      selectedCategory: 'shoulder',
      selectedMovement: null,
      selectedSide: 'left',
      currentAngle: 0,
      isCalibrating: false,
      calibrationStep: 'idle',

      calibrations: {},
      measurementHistory: [],
      currentSession: [],

      voiceEnabled: true,
      measurementMode: 'single',

      // 측정 상태 액션
      setIsActive: (active) => set({ isActive: active }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSelectedMovement: (movement) => set({ selectedMovement: movement }),
      setSelectedSide: (side) => set({ selectedSide: side }),
      setCurrentAngle: (angle) => set({ currentAngle: angle }),
      setIsCalibrating: (calibrating) => set({ isCalibrating: calibrating }),
      setCalibrationStep: (step) => set({ calibrationStep: step }),

      // 캘리브레이션 액션
      saveCalibration: (data) => {
        const key = generateCalibrationKey(data.movementId, data.side)
        set((state) => ({
          calibrations: {
            ...state.calibrations,
            [key]: data,
          },
        }))
      },

      getCalibration: (movementId, side) => {
        const key = generateCalibrationKey(movementId, side)
        return get().calibrations[key] || null
      },

      resetCalibration: (movementId, side) => {
        const key = generateCalibrationKey(movementId, side)
        set((state) => {
          const newCalibrations = { ...state.calibrations }
          delete newCalibrations[key]
          return { calibrations: newCalibrations }
        })
      },

      resetAllCalibrations: () => set({ calibrations: {} }),

      // 측정 기록 액션
      addMeasurement: (record) => {
        set((state) => ({
          currentSession: [...state.currentSession, record],
        }))
      },

      saveSession: () => {
        const currentSession = get().currentSession
        if (currentSession.length === 0) return

        const session: RomMeasurementSession = {
          id: `session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          measurements: currentSession,
        }

        set((state) => ({
          measurementHistory: [session, ...state.measurementHistory].slice(0, 100),
          currentSession: [],
        }))
      },

      clearCurrentSession: () => set({ currentSession: [] }),

      clearHistory: () => set({ measurementHistory: [] }),

      // 설정 액션
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      setMeasurementMode: (mode) => set({ measurementMode: mode }),
    }),
    {
      name: 'posture-ai-rom',
      // 캐시할 데이터만 선택 (일시적인 상태는 제외)
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        selectedMovement: state.selectedMovement,
        selectedSide: state.selectedSide,
        calibrations: state.calibrations,
        measurementHistory: state.measurementHistory,
        currentSession: state.currentSession,
        voiceEnabled: state.voiceEnabled,
        measurementMode: state.measurementMode,
      }),
    }
  )
)
