'use client'

import { forwardRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  showValue?: boolean
  disabled?: boolean
  className?: string
}

const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      label,
      showValue = true,
      disabled = false,
      className,
    },
    ref
  ) => {
    const percentage = ((value - min) / (max - min)) * 100

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value))
      },
      [onChange]
    )

    return (
      <div ref={ref} className={cn('w-full', className)}>
        {(label || showValue) && (
          <div className="mb-2 flex justify-between text-sm">
            {label && (
              <span className="font-medium text-text-primary">{label}</span>
            )}
            {showValue && (
              <span className="text-text-secondary">{value}</span>
            )}
          </div>
        )}
        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={cn(
              'h-2 w-full cursor-pointer appearance-none rounded-full bg-border',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`,
            }}
          />
        </div>
      </div>
    )
  }
)
Slider.displayName = 'Slider'

interface RangeSliderProps {
  minValue: number
  maxValue: number
  onChange: (min: number, max: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  disabled?: boolean
  className?: string
}

export function RangeSlider({
  minValue,
  maxValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
  className,
}: RangeSliderProps) {
  const minPercent = ((minValue - min) / (max - min)) * 100
  const maxPercent = ((maxValue - min) / (max - min)) * 100

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-text-primary">{label}</span>
          <span className="text-text-secondary">
            {minValue} - {maxValue}
          </span>
        </div>
      )}
      <div className="relative h-2">
        {/* Track background */}
        <div className="absolute inset-0 rounded-full bg-border" />

        {/* Active track */}
        <div
          className="absolute h-full rounded-full bg-primary"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={(e) => {
            const newMin = Math.min(Number(e.target.value), maxValue - step)
            onChange(newMin, maxValue)
          }}
          disabled={disabled}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={(e) => {
            const newMax = Math.max(Number(e.target.value), minValue + step)
            onChange(minValue, newMax)
          }}
          disabled={disabled}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
      </div>
    </div>
  )
}

export { Slider }
