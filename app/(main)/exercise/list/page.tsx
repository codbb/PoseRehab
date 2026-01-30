'use client'

import { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import { MainLayout } from '@/components/layout/main-layout'
import { Input } from '@/components/ui/input'
import { ExerciseCard } from '@/components/exercise/exercise-card'
import { useTranslation } from '@/hooks/use-translation'
import { EXERCISES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ExerciseCategory, ExerciseDifficulty } from '@/types/exercise'

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

export default function ExerciseListPage() {
  const { t, language } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | ExerciseCategory>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | ExerciseDifficulty>('all')

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
        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder={t('common.search') || 'Search...'}
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
              No exercises found
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
