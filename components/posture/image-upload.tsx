'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PoseOverlay } from '@/components/posture/pose-overlay'
import { useTranslation } from '@/hooks/use-translation'
import { usePoseDetection } from '@/hooks/use-pose-detection'
import { cn } from '@/lib/utils'
import type { Landmark } from '@/types/posture'

type Direction = 'front' | 'side' | 'back'

interface UploadedImage {
  direction: Direction
  file: File
  preview: string
  landmarks: Landmark[]
  status: 'pending' | 'analyzing' | 'success' | 'error'
  dimensions: { width: number; height: number }
}

interface ImageUploadProps {
  onComplete: (images: UploadedImage[]) => void
  onCancel: () => void
}

const DIRECTIONS: { value: Direction; label: string; labelKo: string }[] = [
  { value: 'front', label: 'Front View', labelKo: '정면' },
  { value: 'side', label: 'Side View', labelKo: '측면' },
  { value: 'back', label: 'Back View', labelKo: '후면' },
]

export function ImageUpload({ onComplete, onCancel }: ImageUploadProps) {
  const { language } = useTranslation()
  const [images, setImages] = useState<UploadedImage[]>([])
  const [selectedDirection, setSelectedDirection] = useState<Direction>('front')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRefs = useRef<Map<Direction, HTMLImageElement>>(new Map())

  const { detectPoseFromImage, isLoading: poseLoading } = usePoseDetection()

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(language === 'ko' ? '이미지 파일만 업로드 가능합니다.' : 'Only image files are allowed.')
        return
      }

      // Create preview URL
      const preview = URL.createObjectURL(file)

      // Get image dimensions
      const img = new Image()
      img.src = preview
      await new Promise((resolve) => {
        img.onload = resolve
      })

      const newImage: UploadedImage = {
        direction: selectedDirection,
        file,
        preview,
        landmarks: [],
        status: 'pending',
        dimensions: { width: img.naturalWidth, height: img.naturalHeight },
      }

      setImages((prev) => {
        // Replace if same direction already exists
        const filtered = prev.filter((i) => i.direction !== selectedDirection)
        return [...filtered, newImage]
      })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Auto move to next direction
      const currentIndex = DIRECTIONS.findIndex((d) => d.value === selectedDirection)
      if (currentIndex < DIRECTIONS.length - 1) {
        setSelectedDirection(DIRECTIONS[currentIndex + 1].value)
      }
    },
    [selectedDirection, language]
  )

  const handleRemoveImage = useCallback((direction: Direction) => {
    setImages((prev) => {
      const image = prev.find((i) => i.direction === direction)
      if (image) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter((i) => i.direction !== direction)
    })
  }, [])

  const analyzeImages = useCallback(async () => {
    if (images.length === 0) return

    setIsAnalyzing(true)

    const analyzedImages: UploadedImage[] = []

    for (const image of images) {
      // Update status to analyzing
      setImages((prev) =>
        prev.map((i) =>
          i.direction === image.direction ? { ...i, status: 'analyzing' } : i
        )
      )

      try {
        // Create an image element for detection
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = image.preview

        await new Promise((resolve) => {
          img.onload = resolve
        })

        // Detect pose
        const landmarks = await detectPoseFromImage(img)

        const updatedImage: UploadedImage = {
          ...image,
          landmarks,
          status: landmarks.length > 0 ? 'success' : 'error',
        }

        analyzedImages.push(updatedImage)

        setImages((prev) =>
          prev.map((i) =>
            i.direction === image.direction ? updatedImage : i
          )
        )
      } catch (error) {
        const updatedImage: UploadedImage = {
          ...image,
          status: 'error',
        }
        analyzedImages.push(updatedImage)

        setImages((prev) =>
          prev.map((i) =>
            i.direction === image.direction ? updatedImage : i
          )
        )
      }
    }

    setIsAnalyzing(false)

    // Check if at least one image was successfully analyzed
    const successfulImages = analyzedImages.filter((i) => i.status === 'success')
    if (successfulImages.length > 0) {
      onComplete(analyzedImages)
    }
  }, [images, detectPoseFromImage, onComplete])

  const getImageForDirection = (direction: Direction) => {
    return images.find((i) => i.direction === direction)
  }

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((image) => {
        URL.revokeObjectURL(image.preview)
      })
    }
  }, [])

  const allDirectionsHaveImages = DIRECTIONS.every((d) =>
    images.some((i) => i.direction === d.value)
  )

  const hasAtLeastOneImage = images.length > 0

  return (
    <div className="space-y-6">
      {/* Direction indicator */}
      <div className="flex items-center justify-center gap-4">
        {DIRECTIONS.map((dir, index) => {
          const image = getImageForDirection(dir.value)
          return (
            <div key={dir.value} className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDirection(dir.value)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all',
                  selectedDirection === dir.value
                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                    : image
                    ? 'bg-secondary text-white'
                    : 'bg-border text-text-secondary hover:bg-border/80'
                )}
              >
                {image ? <Check className="h-5 w-5" /> : index + 1}
              </button>
              <span
                className={cn(
                  'text-sm hidden sm:inline',
                  selectedDirection === dir.value
                    ? 'font-medium text-text-primary'
                    : 'text-text-secondary'
                )}
              >
                {language === 'ko' ? dir.labelKo : dir.label}
              </span>
              {index < DIRECTIONS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-text-secondary hidden sm:block" />
              )}
            </div>
          )
        })}
      </div>

      {/* Upload area and preview grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {DIRECTIONS.map((dir) => {
          const image = getImageForDirection(dir.value)
          const isSelected = selectedDirection === dir.value

          return (
            <Card
              key={dir.value}
              className={cn(
                'cursor-pointer transition-all overflow-hidden',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => !image && setSelectedDirection(dir.value)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-[3/4] bg-background">
                  {image ? (
                    <>
                      {/* Image preview */}
                      <img
                        ref={(el) => {
                          if (el) imageRefs.current.set(dir.value, el)
                        }}
                        src={image.preview}
                        alt={dir.label}
                        className="h-full w-full object-cover"
                      />

                      {/* Pose overlay */}
                      {image.landmarks.length > 0 && (
                        <PoseOverlay
                          landmarks={image.landmarks}
                          width={image.dimensions.width}
                          height={image.dimensions.height}
                          className="absolute inset-0 h-full w-full"
                        />
                      )}

                      {/* Status indicator */}
                      <div
                        className={cn(
                          'absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full',
                          image.status === 'success' && 'bg-secondary text-white',
                          image.status === 'error' && 'bg-error text-white',
                          image.status === 'analyzing' && 'bg-primary text-white',
                          image.status === 'pending' && 'bg-background text-text-secondary'
                        )}
                      >
                        {image.status === 'success' && <Check className="h-4 w-4" />}
                        {image.status === 'error' && <AlertCircle className="h-4 w-4" />}
                        {image.status === 'analyzing' && (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        )}
                        {image.status === 'pending' && <ImageIcon className="h-4 w-4" />}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(dir.value)
                        }}
                        className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Direction label */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-sm font-medium text-white">
                          {language === 'ko' ? dir.labelKo : dir.label}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div
                      className={cn(
                        'flex h-full flex-col items-center justify-center border-2 border-dashed transition-colors',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                      onClick={() => {
                        setSelectedDirection(dir.value)
                        fileInputRef.current?.click()
                      }}
                    >
                      <Upload
                        className={cn(
                          'h-10 w-10 mb-3',
                          isSelected ? 'text-primary' : 'text-text-secondary'
                        )}
                      />
                      <p className="text-sm font-medium text-text-primary">
                        {language === 'ko' ? dir.labelKo : dir.label}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {language === 'ko' ? '클릭하여 업로드' : 'Click to upload'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Instructions */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-text-primary mb-2">
            {language === 'ko' ? '이미지 업로드 안내' : 'Upload Guidelines'}
          </h4>
          <ul className="space-y-1 text-sm text-text-secondary">
            <li>
              •{' '}
              {language === 'ko'
                ? '전신이 보이는 사진을 업로드해주세요'
                : 'Upload photos showing your full body'}
            </li>
            <li>
              •{' '}
              {language === 'ko'
                ? '밝은 조명에서 촬영된 사진이 좋습니다'
                : 'Photos taken in good lighting work best'}
            </li>
            <li>
              •{' '}
              {language === 'ko'
                ? '정면, 측면, 후면 사진을 모두 업로드하면 더 정확한 분석이 가능합니다'
                : 'Uploading all three views (front, side, back) provides more accurate analysis'}
            </li>
            <li>
              •{' '}
              {language === 'ko'
                ? '최소 1장의 사진이 필요합니다'
                : 'At least one photo is required'}
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onCancel}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {language === 'ko' ? '뒤로' : 'Back'}
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
        >
          <Upload className="mr-2 h-4 w-4" />
          {language === 'ko' ? '사진 추가' : 'Add Photo'}
        </Button>

        <Button
          onClick={analyzeImages}
          disabled={!hasAtLeastOneImage || isAnalyzing || poseLoading}
        >
          {isAnalyzing || poseLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {language === 'ko' ? '분석 중...' : 'Analyzing...'}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {language === 'ko' ? '분석 시작' : 'Start Analysis'}
              {hasAtLeastOneImage && (
                <span className="ml-1 text-xs opacity-70">
                  ({images.length}/3)
                </span>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
