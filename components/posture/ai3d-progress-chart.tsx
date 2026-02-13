'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import type { AI3DAnalysisHistoryEntry } from '@/types/analysis-result'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface AI3DProgressChartProps {
  history: AI3DAnalysisHistoryEntry[]
  className?: string
}

type MetricTab = 'overall' | 'neck' | 'shoulder' | 'pelvis' | 'spine' | 'scoliosis'

interface TabConfig {
  key: MetricTab
  labelKo: string
  labelEn: string
  unit: string
  getValue: (entry: AI3DAnalysisHistoryEntry) => number | undefined
  idealRange?: { min: number; max: number }
  // For angles, lower is better. For scores, higher is better.
  higherIsBetter: boolean
}

const TAB_CONFIGS: TabConfig[] = [
  {
    key: 'overall',
    labelKo: '종합 점수',
    labelEn: 'Overall Score',
    unit: '',
    getValue: (e) => e.overallScore,
    idealRange: { min: 80, max: 100 },
    higherIsBetter: true,
  },
  {
    key: 'neck',
    labelKo: '목 전방각도',
    labelEn: 'Neck Forward Angle',
    unit: '°',
    getValue: (e) => e.metrics?.neckForwardAngle,
    idealRange: { min: 0, max: 15 },
    higherIsBetter: false,
  },
  {
    key: 'shoulder',
    labelKo: '어깨 기울기',
    labelEn: 'Shoulder Tilt',
    unit: '°',
    getValue: (e) => e.metrics?.shoulderTilt,
    idealRange: { min: 0, max: 2 },
    higherIsBetter: false,
  },
  {
    key: 'pelvis',
    labelKo: '골반 기울기',
    labelEn: 'Pelvis Tilt',
    unit: '°',
    getValue: (e) => e.metrics?.pelvisTilt,
    idealRange: { min: 0, max: 2 },
    higherIsBetter: false,
  },
  {
    key: 'spine',
    labelKo: '척추 만곡',
    labelEn: 'Spine Curvature',
    unit: '°',
    getValue: (e) => e.metrics?.thoracicKyphosis,
    idealRange: { min: 20, max: 40 },
    higherIsBetter: false, // less deviation is better
  },
  {
    key: 'scoliosis',
    labelKo: '척추 측만',
    labelEn: 'Spine Deviation',
    unit: '°',
    getValue: (e) => e.metrics?.spineLateralDeviation,
    idealRange: { min: 0, max: 5 },
    higherIsBetter: false,
  },
]

export function AI3DProgressChart({ history, className }: AI3DProgressChartProps) {
  const { language } = useTranslation()
  const [activeTab, setActiveTab] = useState<MetricTab>('overall')

  const activeConfig = TAB_CONFIGS.find((t) => t.key === activeTab)!

  // Prepare chart data (last 10 entries, reversed so oldest is first)
  const chartData = useMemo(() => {
    const sliced = history.slice(0, 10).reverse()
    return sliced.map((entry, index) => {
      const date = new Date(entry.timestamp)
      const value = activeConfig.getValue(entry)
      return {
        index: index + 1,
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        fullDate: date.toLocaleDateString(),
        value: value !== undefined ? Number(value.toFixed(1)) : null,
      }
    })
  }, [history, activeConfig])

  // Calculate change from previous analysis
  const changeInfo = useMemo(() => {
    if (history.length < 2) return null

    const current = activeConfig.getValue(history[0])
    const previous = activeConfig.getValue(history[1])

    if (current === undefined || previous === undefined) return null

    const diff = current - previous
    const absDiff = Math.abs(diff)

    // Determine if this is an improvement
    let isImprovement: boolean
    if (activeConfig.higherIsBetter) {
      isImprovement = diff > 0
    } else {
      isImprovement = diff < 0
    }

    return {
      diff: absDiff,
      isImprovement,
      isNoChange: absDiff < 0.5,
    }
  }, [history, activeConfig])

  // Empty state
  if (history.length === 0) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
        <h4 className="text-text-primary mb-2 text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {language === 'ko' ? '자세 변화 추이' : 'Posture Progress'}
        </h4>
        <div className="flex flex-col items-center justify-center h-40 text-text-secondary text-sm">
          <Info className="h-8 w-8 mb-2 opacity-50" />
          {language === 'ko'
            ? '첫 분석을 완료하면 변화를 추적합니다'
            : 'Complete your first analysis to track changes'}
        </div>
      </div>
    )
  }

  // Single analysis state
  if (history.length === 1) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
        <h4 className="text-text-primary mb-2 text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {language === 'ko' ? '자세 변화 추이' : 'Posture Progress'}
        </h4>
        <div className="flex flex-col items-center justify-center h-40 text-text-secondary text-sm">
          <Info className="h-8 w-8 mb-2 opacity-50" />
          {language === 'ko'
            ? '다음 분석부터 변화를 추적합니다'
            : 'Changes will be tracked from your next analysis'}
        </div>
      </div>
    )
  }

  const validData = chartData.filter((d) => d.value !== null)

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-4', className)}>
      {/* Header with change badge */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-text-primary text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {language === 'ko' ? '자세 변화 추이' : 'Posture Progress'}
        </h4>
        {changeInfo && !changeInfo.isNoChange && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              changeInfo.isImprovement
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {changeInfo.isImprovement ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {changeInfo.isImprovement
              ? language === 'ko'
                ? '개선'
                : 'Improved'
              : language === 'ko'
              ? '악화'
              : 'Declined'}
            {activeConfig.unit && ` ${changeInfo.diff.toFixed(1)}${activeConfig.unit}`}
          </div>
        )}
        {changeInfo && changeInfo.isNoChange && (
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
            <Minus className="h-3 w-3" />
            {language === 'ko' ? '유지' : 'Maintained'}
          </div>
        )}
      </div>

      {/* Tab buttons */}
      <div className="flex flex-wrap gap-1 mb-3">
        {TAB_CONFIGS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-2 py-1 text-xs rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-background text-text-secondary hover:text-text-primary'
            )}
          >
            {language === 'ko' ? tab.labelKo : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Chart */}
      {validData.length >= 2 ? (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              fontSize={10}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={10}
              domain={
                activeConfig.idealRange
                  ? [
                      Math.min(
                        activeConfig.idealRange.min * 0.5,
                        Math.min(...validData.map((d) => d.value || 0))
                      ),
                      Math.max(
                        activeConfig.idealRange.max * 1.2,
                        Math.max(...validData.map((d) => d.value || 0))
                      ),
                    ]
                  : ['auto', 'auto']
              }
              tickFormatter={(value) =>
                activeConfig.unit ? `${value}${activeConfig.unit}` : `${value}`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [
                `${value}${activeConfig.unit}`,
                language === 'ko' ? activeConfig.labelKo : activeConfig.labelEn,
              ]}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]?.payload?.fullDate) {
                  return payload[0].payload.fullDate
                }
                return ''
              }}
            />
            {/* Ideal range reference lines */}
            {activeConfig.idealRange && (
              <>
                <ReferenceLine
                  y={activeConfig.idealRange.min}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={activeConfig.idealRange.max}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </>
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366F1"
              strokeWidth={2}
              dot={{ fill: '#6366F1', r: 4, stroke: '#6366F1', strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
          {language === 'ko'
            ? '이 지표의 데이터가 충분하지 않습니다'
            : 'Not enough data for this metric'}
        </div>
      )}

      {/* Legend */}
      {validData.length >= 2 && activeConfig.idealRange && (
        <div className="mt-2 flex justify-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <div className="w-4 h-px bg-green-500" style={{ borderStyle: 'dashed' }} />
            {language === 'ko' ? '정상 범위' : 'Normal range'}
          </span>
        </div>
      )}
    </div>
  )
}
