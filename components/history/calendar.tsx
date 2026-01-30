'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'
import { cn } from '@/lib/utils'

interface CalendarProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  exerciseDates: string[] // YYYY-MM-DD format
  className?: string
}

export function Calendar({
  selectedDate,
  onSelectDate,
  exerciseDates,
  className,
}: CalendarProps) {
  const { language } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const weekDays = useMemo(() => {
    return language === 'ko'
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  }, [language])

  const monthName = useMemo(() => {
    return currentMonth.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
    })
  }, [currentMonth, language])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Add empty slots for days before the first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }, [currentMonth])

  const exerciseDateSet = useMemo(() => new Set(exerciseDates), [exerciseDates])

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  }

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )
  }

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return formatDateKey(date) === formatDateKey(today)
  }

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false
    return formatDateKey(date) === formatDateKey(selectedDate)
  }

  const hasExercise = (date: Date): boolean => {
    return exerciseDateSet.has(formatDateKey(date))
  }

  return (
    <div className={cn('rounded-xl bg-surface p-4', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-text-primary">{monthName}</h2>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              'py-2 text-sm font-medium',
              index === 0 ? 'text-error' : index === 6 ? 'text-primary' : 'text-text-secondary'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => (
          <motion.div key={index} className="aspect-square">
            {date && (
              <button
                onClick={() => onSelectDate(date)}
                className={cn(
                  'relative flex h-full w-full items-center justify-center rounded-lg text-sm transition-all',
                  isSelected(date)
                    ? 'bg-primary text-white'
                    : isToday(date)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-background text-text-primary'
                )}
              >
                {date.getDate()}
                {hasExercise(date) && !isSelected(date) && (
                  <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-secondary" />
                )}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span>{language === 'ko' ? '운동 기록 있음' : 'Exercised'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>{language === 'ko' ? '선택됨' : 'Selected'}</span>
        </div>
      </div>
    </div>
  )
}
