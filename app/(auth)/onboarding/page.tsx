'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from '@/hooks/use-translation'
import { useUserStore, type PainArea, type UserProfile } from '@/stores/user-store'
import { useSettingsStore } from '@/stores/settings-store'
import { GOALS, PAIN_AREAS } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Step 1: Goals Selection
function GoalsStep({
  selectedGoals,
  onSelect,
}: {
  selectedGoals: string[]
  onSelect: (goals: string[]) => void
}) {
  const { t, language } = useTranslation()

  const toggleGoal = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      onSelect(selectedGoals.filter((id) => id !== goalId))
    } else {
      onSelect([...selectedGoals, goalId])
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          {t('onboarding.step1.title')}
        </h2>
        <p className="mt-2 text-text-secondary">
          {t('onboarding.step1.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-card border-2 p-4 transition-all',
              selectedGoals.includes(goal.id)
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
          >
            <span className="text-3xl">{goal.icon}</span>
            <span className="text-sm font-medium text-text-primary">
              {language === 'ko' ? goal.nameKo : goal.name}
            </span>
            {selectedGoals.includes(goal.id) && (
              <div className="absolute -right-1 -top-1 rounded-full bg-primary p-1">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Step 2: Pain Areas
function PainAreasStep({
  painAreas,
  onUpdate,
}: {
  painAreas: PainArea[]
  onUpdate: (areas: PainArea[]) => void
}) {
  const { t, language } = useTranslation()
  const [selectedArea, setSelectedArea] = useState<string | null>(null)

  const togglePainArea = (area: (typeof PAIN_AREAS)[0]) => {
    const existing = painAreas.find((p) => p.id === area.id)
    if (existing) {
      if (selectedArea === area.id) {
        setSelectedArea(null)
      } else {
        setSelectedArea(area.id)
      }
    } else {
      const newArea: PainArea = {
        id: area.id,
        name: language === 'ko' ? area.nameKo : area.name,
        intensity: 5,
        frequency: 'occasionally',
      }
      onUpdate([...painAreas, newArea])
      setSelectedArea(area.id)
    }
  }

  const updatePainArea = (id: string, updates: Partial<PainArea>) => {
    onUpdate(
      painAreas.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  const removePainArea = (id: string) => {
    onUpdate(painAreas.filter((p) => p.id !== id))
    setSelectedArea(null)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          {t('onboarding.step2.title')}
        </h2>
        <p className="mt-2 text-text-secondary">
          {t('onboarding.step2.subtitle')}
        </p>
      </div>

      {/* Body Diagram */}
      <div className="relative mx-auto aspect-[1/2] w-48">
        {/* Simple body silhouette */}
        <svg viewBox="0 0 100 200" className="h-full w-full">
          {/* Head */}
          <circle cx="50" cy="15" r="12" className="fill-surface stroke-border stroke-2" />
          {/* Body */}
          <ellipse cx="50" cy="55" rx="25" ry="30" className="fill-surface stroke-border stroke-2" />
          {/* Arms */}
          <line x1="25" y1="35" x2="10" y2="70" className="stroke-border stroke-[6]" strokeLinecap="round" />
          <line x1="75" y1="35" x2="90" y2="70" className="stroke-border stroke-[6]" strokeLinecap="round" />
          {/* Legs */}
          <line x1="40" y1="85" x2="35" y2="140" className="stroke-border stroke-[8]" strokeLinecap="round" />
          <line x1="60" y1="85" x2="65" y2="140" className="stroke-border stroke-[8]" strokeLinecap="round" />
          {/* Lower legs */}
          <line x1="35" y1="140" x2="35" y2="180" className="stroke-border stroke-[6]" strokeLinecap="round" />
          <line x1="65" y1="140" x2="65" y2="180" className="stroke-border stroke-[6]" strokeLinecap="round" />
        </svg>

        {/* Pain area dots */}
        {PAIN_AREAS.map((area) => {
          const isSelected = painAreas.some((p) => p.id === area.id)
          return (
            <button
              key={area.id}
              onClick={() => togglePainArea(area)}
              className={cn(
                'absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all',
                isSelected
                  ? 'bg-error ring-2 ring-error ring-offset-2'
                  : 'bg-primary/30 hover:bg-primary/50'
              )}
              style={{ left: `${area.x}%`, top: `${area.y}%` }}
              title={language === 'ko' ? area.nameKo : area.name}
            />
          )
        })}
      </div>

      {/* Pain area details */}
      <AnimatePresence>
        {selectedArea && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-card border border-border bg-surface p-4"
          >
            {(() => {
              const area = painAreas.find((p) => p.id === selectedArea)
              if (!area) return null

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-text-primary">{area.name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePainArea(area.id)}
                      className="text-error"
                    >
                      {t('common.delete')}
                    </Button>
                  </div>

                  {/* Intensity slider */}
                  <div>
                    <label className="mb-2 block text-sm text-text-secondary">
                      {t('onboarding.step2.intensity')}: {area.intensity}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={area.intensity}
                      onChange={(e) =>
                        updatePainArea(area.id, { intensity: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="mb-2 block text-sm text-text-secondary">
                      {t('onboarding.step2.frequency')}
                    </label>
                    <div className="flex gap-2">
                      {(['daily', 'weekly', 'occasionally'] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => updatePainArea(area.id, { frequency: freq })}
                          className={cn(
                            'rounded-lg px-3 py-1 text-sm transition-colors',
                            area.frequency === freq
                              ? 'bg-primary text-white'
                              : 'bg-background text-text-secondary hover:bg-primary/10'
                          )}
                        >
                          {t(`onboarding.step2.frequencyOptions.${freq}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Step 3: Profile Information
function ProfileStep({
  profile,
  onUpdate,
}: {
  profile: Partial<UserProfile>
  onUpdate: (profile: Partial<UserProfile>) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          {t('onboarding.step3.title')}
        </h2>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            {t('onboarding.step3.name')}
          </label>
          <input
            type="text"
            value={profile.name || ''}
            onChange={(e) => onUpdate({ ...profile, name: e.target.value })}
            className="w-full rounded-input border border-border bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('onboarding.step3.name')}
          />
        </div>

        {/* Gender */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            {t('onboarding.step3.gender')}
          </label>
          <div className="flex gap-2">
            {(['male', 'female', 'other'] as const).map((gender) => (
              <button
                key={gender}
                onClick={() => onUpdate({ ...profile, gender })}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm transition-colors',
                  profile.gender === gender
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary hover:bg-primary/10'
                )}
              >
                {t(`onboarding.step3.genderOptions.${gender}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            {t('onboarding.step3.age')}
          </label>
          <input
            type="number"
            value={profile.age || ''}
            onChange={(e) => onUpdate({ ...profile, age: Number(e.target.value) })}
            className="w-full rounded-input border border-border bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            min="1"
            max="120"
          />
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              {t('onboarding.step3.height')}
            </label>
            <input
              type="number"
              value={profile.height || ''}
              onChange={(e) => onUpdate({ ...profile, height: Number(e.target.value) })}
              className="w-full rounded-input border border-border bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              min="50"
              max="250"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              {t('onboarding.step3.weight')}
            </label>
            <input
              type="number"
              value={profile.weight || ''}
              onChange={(e) => onUpdate({ ...profile, weight: Number(e.target.value) })}
              className="w-full rounded-input border border-border bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              min="20"
              max="300"
            />
          </div>
        </div>

        {/* Occupation */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            {t('onboarding.step3.occupation')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['desk', 'standing', 'active', 'other'] as const).map((occ) => (
              <button
                key={occ}
                onClick={() => onUpdate({ ...profile, occupation: occ })}
                className={cn(
                  'rounded-lg py-2 text-sm transition-colors',
                  profile.occupation === occ
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary hover:bg-primary/10'
                )}
              >
                {t(`onboarding.step3.occupationOptions.${occ}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 4: Exercise Preferences
function PreferencesStep({
  preferences,
  onUpdate,
}: {
  preferences: { dailyTime: number; preferredTime: string; reminder: boolean }
  onUpdate: (prefs: typeof preferences) => void
}) {
  const { t } = useTranslation()

  const timeOptions = [10, 20, 30, 60]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          {t('onboarding.step4.title')}
        </h2>
      </div>

      <div className="space-y-6">
        {/* Daily Time */}
        <div>
          <label className="mb-3 block text-sm font-medium text-text-primary">
            {t('onboarding.step4.dailyTime')}
          </label>
          <div className="flex gap-2">
            {timeOptions.map((time) => (
              <button
                key={time}
                onClick={() => onUpdate({ ...preferences, dailyTime: time })}
                className={cn(
                  'flex-1 rounded-lg py-3 text-sm transition-colors',
                  preferences.dailyTime === time
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary hover:bg-primary/10'
                )}
              >
                {time >= 60 ? `${time / 60}h` : `${time}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Time */}
        <div>
          <label className="mb-3 block text-sm font-medium text-text-primary">
            {t('onboarding.step4.preferredTime')}
          </label>
          <div className="flex gap-2">
            {(['morning', 'afternoon', 'evening'] as const).map((time) => (
              <button
                key={time}
                onClick={() => onUpdate({ ...preferences, preferredTime: time })}
                className={cn(
                  'flex-1 rounded-lg py-3 text-sm transition-colors',
                  preferences.preferredTime === time
                    ? 'bg-primary text-white'
                    : 'bg-background text-text-secondary hover:bg-primary/10'
                )}
              >
                {t(`onboarding.step4.preferredTimeOptions.${time}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Reminder Toggle */}
        <div className="flex items-center justify-between rounded-card border border-border p-4">
          <span className="text-sm font-medium text-text-primary">
            {t('onboarding.step4.enableReminder')}
          </span>
          <button
            onClick={() => onUpdate({ ...preferences, reminder: !preferences.reminder })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              preferences.reminder ? 'bg-primary' : 'bg-border'
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                preferences.reminder && 'translate-x-5'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

// Complete Screen
function CompleteStep() {
  const { t } = useTranslation()
  const router = useRouter()
  const { setOnboardingComplete } = useUserStore()

  const handleStart = () => {
    setOnboardingComplete(true)
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary/20"
      >
        <Check className="h-12 w-12 text-secondary" />
      </motion.div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          {t('onboarding.complete.title')}
        </h2>
        <p className="mt-2 text-text-secondary">
          {t('onboarding.complete.subtitle')}
        </p>
      </div>

      <Button size="lg" onClick={handleStart} className="mt-8">
        {t('onboarding.complete.startButton')}
      </Button>
    </div>
  )
}

// ============================================================
// [DEV] 개발 테스트용 기본값 - 배포 시 제거하거나 isDev를 false로 설정
// ============================================================
const isDev = process.env.NODE_ENV === 'development'

const DEV_DEFAULTS = {
  goals: ['posture_correction'],
  painAreas: [
    {
      id: 'neck',
      name: '목',
      intensity: 5,
      frequency: 'occasionally' as const,
    },
  ],
  profile: {
    name: '테스터',
    gender: 'male' as const,
    age: 25,
    height: 175,
    weight: 70,
    occupation: 'desk' as const,
  },
}
// ============================================================

// Main Onboarding Page
export default function OnboardingPage() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [goals, setGoals] = useState<string[]>(isDev ? DEV_DEFAULTS.goals : [])
  const [painAreas, setPainAreas] = useState<PainArea[]>(isDev ? DEV_DEFAULTS.painAreas : [])
  const [profile, setProfile] = useState<Partial<UserProfile>>(isDev ? DEV_DEFAULTS.profile : {})
  const [preferences, setPreferences] = useState({
    dailyTime: 20,
    preferredTime: 'morning',
    reminder: true,
  })

  const { setGoals: saveGoals, setPainAreas: savePainAreas, setProfile: saveProfile, setExercisePreferences } = useUserStore()
  const { setNotifications } = useSettingsStore()

  const totalSteps = 5 // Including complete step

  const handleNext = () => {
    if (step === 0) {
      saveGoals(goals)
    } else if (step === 1) {
      savePainAreas(painAreas)
    } else if (step === 2 && profile.name && profile.gender && profile.age) {
      saveProfile(profile as UserProfile)
    } else if (step === 3) {
      setExercisePreferences({
        dailyTime: preferences.dailyTime,
        preferredTime: preferences.preferredTime as 'morning' | 'afternoon' | 'evening',
      })
      setNotifications({ exerciseReminder: preferences.reminder })
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1))
  }

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0))
  }

  const canProceed = () => {
    if (step === 0) return goals.length > 0
    if (step === 2) return profile.name && profile.gender && profile.age && profile.height && profile.weight && profile.occupation
    return true
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress */}
      {step < 4 && (
        <div className="p-4">
          <Progress value={((step + 1) / (totalSteps - 1)) * 100} size="sm" />
          <p className="mt-2 text-center text-sm text-text-secondary">
            {step + 1} / {totalSteps - 1}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-md"
          >
            {step === 0 && <GoalsStep selectedGoals={goals} onSelect={setGoals} />}
            {step === 1 && <PainAreasStep painAreas={painAreas} onUpdate={setPainAreas} />}
            {step === 2 && <ProfileStep profile={profile} onUpdate={setProfile} />}
            {step === 3 && <PreferencesStep preferences={preferences} onUpdate={setPreferences} />}
            {step === 4 && <CompleteStep />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>

          <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
            {step === 3 ? t('common.complete') : t('common.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
