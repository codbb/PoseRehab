'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExerciseCard } from '@/components/exercise/exercise-card'
import { useTranslation } from '@/hooks/use-translation'
import { usePostureStore } from '@/stores/posture-store'
import { EXERCISES, CONDITION_EXERCISE_MAPPING } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ExerciseCategory, ExerciseDifficulty, TargetCondition, Exercise } from '@/types/exercise'
import type { DetailedAnalysisResult } from '@/types/analysis-result'

const categories: ('all' | ExerciseCategory)[] = [
  'all',
  'stretching',
  'strength',
  'core',
  'correction',
  'rehabilitation',
]

const difficulties: ('all' | ExerciseDifficulty)[] = [
  'all',
  'beginner',
  'intermediate',
  'advanced',
]

// 자세 분석 결과에서 감지된 조건 추출
function extractConditionsFromAnalysis(detailedResult: DetailedAnalysisResult | null): TargetCondition[] {
  if (!detailedResult) return []

  const conditions: TargetCondition[] = []
  const tags = detailedResult.classification?.tags || []

  // 태그 기반 조건 매핑
  if (tags.includes('forward_head') || tags.includes('turtle_neck')) {
    conditions.push('forward_head')
  }
  if (tags.includes('round_shoulder')) {
    conditions.push('round_shoulder')
  }
  if (tags.includes('upper_cross')) {
    conditions.push('upper_cross')
  }
  if (tags.includes('shoulder_imbalance')) {
    conditions.push('shoulder_imbalance')
  }
  if (tags.includes('kyphosis') || tags.includes('hunchback')) {
    conditions.push('thoracic_kyphosis')
  }
  if (tags.includes('lordosis')) {
    conditions.push('lumbar_lordosis')
  }
  if (tags.includes('lower_cross')) {
    conditions.push('lower_cross')
  }
  if (tags.includes('pelvic_tilt') || tags.includes('pelvis_misalignment')) {
    conditions.push('pelvic_tilt')
  }
  if (tags.includes('scoliosis')) {
    conditions.push('scoliosis')
  }

  // 다리 분석 결과
  const legType = detailedResult.classification?.legAnalysis?.type
  if (legType === 'o_legs') {
    conditions.push('bow_legs')
  } else if (legType === 'x_legs') {
    conditions.push('knock_knees')
  }

  return conditions
}

// 조건에 맞는 운동 추천
function getRecommendedExercises(conditions: TargetCondition[]): Exercise[] {
  if (conditions.length === 0) return []

  const recommendedIds = new Set<string>()

  conditions.forEach((condition) => {
    const exerciseIds = CONDITION_EXERCISE_MAPPING[condition] || []
    exerciseIds.forEach((id) => recommendedIds.add(id))
  })

  return EXERCISES.filter((ex) => recommendedIds.has(ex.id))
}

export default function ExerciseListPage() {
  const { t, language } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | ExerciseCategory>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | ExerciseDifficulty>('all')
  const [showRecommendations, setShowRecommendations] = useState(true)

  const { detailedResult } = usePostureStore()

  // 자세 분석 기반 추천 운동
  const detectedConditions = useMemo(() => extractConditionsFromAnalysis(detailedResult), [detailedResult])
  const recommendedExercises = useMemo(() => getRecommendedExercises(detectedConditions), [detectedConditions])

  const filteredExercises = useMemo(() => {
    return EXERCISES.filter((exercise) => {
      // Search filter
      const name = language === 'ko' ? exercise.nameKo : exercise.name
      const description = language === 'ko' ? exercise.descriptionKo : exercise.description
      const matchesSearch =
        searchQuery === '' ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase())

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || exercise.category === selectedCategory

      // Difficulty filter
      const matchesDifficulty =
        selectedDifficulty === 'all' || exercise.difficulty === selectedDifficulty

      return matchesSearch && matchesCategory && matchesDifficulty
    })
  }, [searchQuery, selectedCategory, selectedDifficulty, language])

  return (
    <MainLayout title={t('exercise.list.title')}>
      <div className="space-y-6">
        {/* 자세 분석 기반 추천 섹션 */}
        {recommendedExercises.length > 0 && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t('exercise.list.recommendedForYou')}
                  <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                    {recommendedExercises.length}
                  </span>
                </CardTitle>
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showRecommendations ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                {language === 'ko'
                  ? '자세 분석 결과에 따른 맞춤 운동입니다'
                  : 'Exercises tailored to your posture analysis results'}
              </p>
            </CardHeader>
            {showRecommendations && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {recommendedExercises.slice(0, 5).map((exercise, index) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} index={index} />
                  ))}
                </div>
                {recommendedExercises.length > 5 && (
                  <p className="mt-3 text-center text-sm text-text-secondary">
                    {language === 'ko'
                      ? `외 ${recommendedExercises.length - 5}개 추천 운동`
                      : `+${recommendedExercises.length - 5} more recommended`}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder={t('exercise.list.searchPlaceholder') || t('common.search') || 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-input border border-border bg-surface py-2 pl-10 pr-4 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
                )}
              >
                {t(`exercise.list.categories.${category}`)}
              </button>
            ))}
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-secondary" />
            <div className="flex gap-2">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => setSelectedDifficulty(difficulty)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-sm transition-colors',
                    selectedDifficulty === difficulty
                      ? 'bg-surface border border-primary text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {difficulty === 'all'
                    ? t('exercise.list.categories.all')
                    : t(`exercise.list.difficulty.${difficulty}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Exercise List */}
        <div className="space-y-3">
          {filteredExercises.length > 0 ? (
            filteredExercises.map((exercise, index) => (
              <ExerciseCard key={exercise.id} exercise={exercise} index={index} />
            ))
          ) : (
            <div className="py-12 text-center text-text-secondary">
              {language === 'ko' ? '운동을 찾을 수 없습니다' : 'No exercises found'}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
