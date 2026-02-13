'use client'

import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { MultiView3DAnalysisResult, ViewAngle, PoseLandmark } from '@/types/analysis-result'

interface ViewImageData {
  imageDataUrl: string | null
  landmarks2D: PoseLandmark[] | null
  imageWidth: number | null
  imageHeight: number | null
}

interface PDFReportData {
  analysisResult: MultiView3DAnalysisResult
  viewImages: Record<ViewAngle, ViewImageData>
  language: 'ko' | 'en'
  userName?: string
}

// Helper function to format date
const formatDate = (lang: 'ko' | 'en') => {
  const now = new Date()
  if (lang === 'ko') {
    return now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format numeric value with toFixed(1) and safe font for decimal point rendering
const fmtNum = (value: number, unit: string = ''): string => {
  const formatted = Number(value).toFixed(1)
  return `<span style="font-family: Helvetica, Arial, sans-serif;">${formatted}${unit}</span>`
}

// Wrap decimal numbers found in text with safe font for html2canvas rendering
const safeDecimal = (text: string): string => {
  return text.replace(/(\d+\.\d+)/g, '<span style="font-family: Helvetica, Arial, sans-serif;">$1</span>')
}

// Helper function to get score color
const getScoreColorHex = (score: number): string => {
  if (score >= 80) return '#10B981' // emerald-500
  if (score >= 50) return '#F59E0B' // amber-500
  return '#EF4444' // red-500
}

// Helper function to get risk color
const getRiskColorHex = (level: string): string => {
  if (level === 'danger') return '#EF4444'
  if (level === 'warning') return '#F59E0B'
  return '#10B981'
}

// Text translations
const translations = {
  ko: {
    title: '자세 분석 리포트',
    subtitle: 'AI 3D 자세 분석 결과',
    analysisDate: '분석일',
    overallScore: '종합 점수',
    frontView: '정면',
    sideView: '측면',
    backView: '후면',
    riskAnalysis: '부위별 위험도 분석',
    normal: '유지',
    warning: '경계',
    danger: '심각',
    measured: '측정값',
    threshold: '기준값',
    conditionsTitle: '예측 질환',
    recommendationsTitle: '추천 운동',
    priority: '우선순위',
    high: '높음',
    medium: '중간',
    low: '낮음',
    disclaimer: '※ 본 분석 결과는 AI 모델에 의해 추정된 참고 자료이며, 전문 의료 진단을 대체하지 않습니다. 정확한 진단은 전문의와 상담하시기 바랍니다.',
    poweredBy: 'Powered by PostureAI',
  },
  en: {
    title: 'Posture Analysis Report',
    subtitle: 'AI 3D Posture Analysis Result',
    analysisDate: 'Analysis Date',
    overallScore: 'Overall Score',
    frontView: 'Front View',
    sideView: 'Side View',
    backView: 'Back View',
    riskAnalysis: 'Risk Analysis by Body Part',
    normal: 'Maintain',
    warning: 'Caution',
    danger: 'Severe',
    measured: 'Measured',
    threshold: 'Threshold',
    conditionsTitle: 'Predicted Conditions',
    recommendationsTitle: 'Recommended Exercises',
    priority: 'Priority',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    disclaimer: '※ This analysis result is estimated by an AI model and is for reference only. It does not replace professional medical diagnosis. Please consult a specialist for accurate diagnosis.',
    poweredBy: 'Powered by PostureAI',
  },
}

// HTML 템플릿 생성 (섹션별 ID 포함)
function createReportHTML(data: PDFReportData): string {
  const { analysisResult, viewImages, language, userName } = data
  const t = translations[language]

  const scoreColor = getScoreColorHex(analysisResult.overallScore)

  // Collect all risks
  const allRisks: Array<{ name: string; nameKo: string; level: string; measuredValue: number; unit: string }> = []
  if (analysisResult.frontMetrics) {
    allRisks.push(analysisResult.frontMetrics.shoulderRisk)
    allRisks.push(analysisResult.frontMetrics.pelvisRisk)
    if (analysisResult.frontMetrics.legRisk) {
      allRisks.push(analysisResult.frontMetrics.legRisk)
    }
  }
  if (analysisResult.sideMetrics) {
    allRisks.push(analysisResult.sideMetrics.neckRisk)
    if (analysisResult.sideMetrics.thoracicKyphosisRisk) {
      allRisks.push(analysisResult.sideMetrics.thoracicKyphosisRisk)
    }
    if (analysisResult.sideMetrics.lumbarLordosisRisk) {
      allRisks.push(analysisResult.sideMetrics.lumbarLordosisRisk)
    }
    if (!analysisResult.sideMetrics.thoracicKyphosisRisk && !analysisResult.sideMetrics.lumbarLordosisRisk) {
      allRisks.push(analysisResult.sideMetrics.spineRisk)
    }
    if (analysisResult.sideMetrics.roundShoulderRisk) {
      allRisks.push(analysisResult.sideMetrics.roundShoulderRisk)
    }
  }
  if (analysisResult.backMetrics) {
    allRisks.push(analysisResult.backMetrics.spineRisk)
    allRisks.push(analysisResult.backMetrics.scapulaRisk)
  }

  const risksHTML = allRisks.map(risk => {
    const color = getRiskColorHex(risk.level)
    const label = risk.level === 'danger' ? t.danger : risk.level === 'warning' ? t.warning : t.normal
    const riskName = language === 'ko' ? risk.nameKo : risk.name
    return `
      <div style="background: #F9FAFB; border-radius: 6px; padding: 8px 10px; border-left: 3px solid ${color};">
        <div style="font-weight: 600; font-size: 11px; color: #111827;">${safeDecimal(riskName)}</div>
        <div style="font-size: 10px; color: ${color}; margin-top: 2px;">${fmtNum(risk.measuredValue, risk.unit)} - ${label}</div>
      </div>
    `
  }).join('')

  const conditionsHTML = (analysisResult.conditions || []).slice(0, 6).map(condition => {
    const color = condition.probability >= 70 ? '#EF4444' : condition.probability >= 40 ? '#F59E0B' : '#10B981'
    const condName = language === 'ko' ? condition.nameKo : condition.name
    return `
      <div style="background: #F9FAFB; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: 600; font-size: 10px; color: #111827; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
          ${safeDecimal(condName)}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 60px; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden;">
            <div style="width: ${Math.min(Math.round(condition.probability), 100)}%; height: 100%; background: ${color};"></div>
          </div>
          <span style="font-size: 10px; font-weight: 600; color: ${color}; min-width: 28px; font-family: Helvetica, Arial, sans-serif;">${Math.round(condition.probability)}%</span>
        </div>
      </div>
    `
  }).join('')

  const recommendationsHTML = (analysisResult.recommendations || []).slice(0, 4).map(rec => {
    const color = rec.priority === 'high' ? '#EF4444' : rec.priority === 'medium' ? '#F59E0B' : '#10B981'
    const priorityLabel = rec.priority === 'high' ? t.high : rec.priority === 'medium' ? t.medium : t.low
    const exercises = rec.exercises.map(ex => language === 'ko' ? ex.nameKo : ex.name).join(', ')
    const recTitle = language === 'ko' ? rec.titleKo : rec.title
    return `
      <div style="background: #F5F5FF; border-radius: 6px; padding: 10px;">
        <div style="font-weight: 600; font-size: 11px; color: #111827;">${safeDecimal(recTitle)}</div>
        <div style="font-size: 9px; color: ${color}; margin-top: 3px;">${t.priority}: ${priorityLabel}</div>
        <div style="font-size: 9px; color: #6B7280; margin-top: 3px;">${safeDecimal(exercises)}</div>
      </div>
    `
  }).join('')

  const viewScoresHTML = [
    { label: t.frontView, score: analysisResult.frontScore },
    { label: t.sideView, score: analysisResult.sideScore },
    { label: t.backView, score: analysisResult.backScore },
  ].map(vs => {
    const vsColor = vs.score ? getScoreColorHex(vs.score) : '#9CA3AF'
    return `
      <div style="text-align: center;">
        <div style="font-size: 10px; color: #6B7280;">${vs.label}</div>
        <div style="font-size: 16px; font-weight: 700; color: ${vsColor};">${vs.score ?? '-'}</div>
      </div>
    `
  }).join('')

  return `
    <div id="pdf-report" style="width: 595px; font-family: 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; background: white; color: #111827;">
      <!-- Header Section -->
      <div id="pdf-section-header" style="background: #6366F1; padding: 20px 24px; color: white;">
        <div style="font-size: 24px; font-weight: 700;">${t.title}</div>
        <div style="font-size: 12px; margin-top: 6px; display: flex; justify-content: space-between;">
          <span>${t.analysisDate}: ${formatDate(language)}</span>
          ${userName ? `<span>${userName}</span>` : ''}
        </div>
      </div>

      <!-- Score Section -->
      <div id="pdf-section-score" style="background: white; padding: 20px 24px 0;">
        <div style="background: #F9FAFB; border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 24px;">
          <div>
            <div style="font-size: 12px; font-weight: 600; color: #6B7280;">${t.overallScore}</div>
            <div style="font-size: 36px; font-weight: 700; color: ${scoreColor};">${analysisResult.overallScore}<span style="font-size: 14px; color: #9CA3AF;">/100</span></div>
          </div>
          <div style="display: flex; gap: 20px; margin-left: auto;">
            ${viewScoresHTML}
          </div>
        </div>
      </div>

      <!-- Photos Section -->
      <div id="pdf-section-photos" style="background: white; padding: 16px 24px 0;">
        <div style="display: flex; gap: 10px;">
          ${(['front', 'side', 'back'] as ViewAngle[]).map(view => {
            const img = viewImages[view]
            const label = view === 'front' ? t.frontView : view === 'side' ? t.sideView : t.backView
            return `
              <div style="flex: 1; position: relative; background: #000; border-radius: 8px; overflow: hidden; aspect-ratio: 3/4;">
                ${img.imageDataUrl
                  ? `<img src="${img.imageDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" />`
                  : `<div style="width: 100%; height: 100%; background: #E5E7EB;"></div>`
                }
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); padding: 4px; text-align: center;">
                  <span style="color: white; font-size: 10px;">${label}</span>
                </div>
              </div>
            `
          }).join('')}
        </div>
      </div>

      <!-- Risk Analysis Section -->
      <div id="pdf-section-risks" style="background: white; padding: 20px 24px 0;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">${t.riskAnalysis}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${risksHTML}
        </div>
      </div>

      <!-- Conditions Section -->
      ${(analysisResult.conditions || []).length > 0 ? `
        <div id="pdf-section-conditions" style="background: white; padding: 20px 24px 0;">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">${t.conditionsTitle}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${conditionsHTML}
          </div>
        </div>
      ` : ''}

      <!-- Recommendations Section -->
      ${(analysisResult.recommendations || []).length > 0 ? `
        <div id="pdf-section-recommendations" style="background: white; padding: 20px 24px 0;">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">${t.recommendationsTitle}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${recommendationsHTML}
          </div>
        </div>
      ` : ''}

      <!-- Footer Section -->
      <div id="pdf-section-footer" style="background: #F9FAFB; padding: 16px 24px;">
        <div style="font-size: 9px; color: #6B7280; line-height: 1.5;">${t.disclaimer}</div>
        <div style="text-align: center; margin-top: 10px; font-size: 10px; color: #6366F1; font-weight: 600;">${t.poweredBy}</div>
      </div>
    </div>
  `
}

export async function generateReportPDF(data: PDFReportData): Promise<void> {
  const { language } = data

  // 임시 컨테이너 생성
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.innerHTML = createReportHTML(data)
  document.body.appendChild(container)

  const reportElement = container.querySelector('#pdf-report') as HTMLElement
  if (!reportElement) {
    document.body.removeChild(container)
    throw new Error('Failed to create report element')
  }

  try {
    // PDF 생성
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = 210  // A4 width in mm
    const pageHeight = 297 // A4 height in mm

    // 섹션별로 캡처하여 PDF에 배치
    const contentSectionIds = [
      'pdf-section-header',
      'pdf-section-score',
      'pdf-section-photos',
      'pdf-section-risks',
      'pdf-section-conditions',
      'pdf-section-recommendations',
    ]

    let currentY = 0

    const html2canvasOptions = {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    }

    // 콘텐츠 섹션 렌더링
    for (const sectionId of contentSectionIds) {
      const sectionElement = reportElement.querySelector(`#${sectionId}`) as HTMLElement
      if (!sectionElement) continue

      const bgColor = sectionId === 'pdf-section-header' ? '#6366F1' : '#ffffff'

      const canvas = await html2canvas(sectionElement, {
        ...html2canvasOptions,
        backgroundColor: bgColor,
      })

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      // 현재 페이지에 맞지 않으면 새 페이지 추가
      if (currentY > 0 && currentY + imgHeight > pageHeight) {
        pdf.addPage()
        currentY = 0
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', 0, currentY, imgWidth, imgHeight)
      currentY += imgHeight
    }

    // 푸터 섹션 렌더링
    const footerElement = reportElement.querySelector('#pdf-section-footer') as HTMLElement
    if (footerElement) {
      const footerCanvas = await html2canvas(footerElement, {
        ...html2canvasOptions,
        backgroundColor: '#F9FAFB',
      })

      const footerWidth = pageWidth
      const footerHeight = (footerCanvas.height * pageWidth) / footerCanvas.width

      // 푸터 전 여백 추가 (약 5mm)
      currentY += 5

      // 현재 페이지에 맞지 않으면 새 페이지
      if (currentY + footerHeight > pageHeight) {
        pdf.addPage()
        currentY = 0
      }

      // 푸터를 페이지 하단에 고정 배치 (단, 콘텐츠와 너무 떨어지지 않도록)
      const bottomAlignedY = pageHeight - footerHeight
      const footerY = Math.max(currentY, bottomAlignedY)

      const footerImgData = footerCanvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(footerImgData, 'JPEG', 0, footerY, footerWidth, footerHeight)
    }

    // 파일 저장
    const fileName = language === 'ko'
      ? `자세분석리포트_${new Date().toISOString().split('T')[0]}.pdf`
      : `PostureAnalysisReport_${new Date().toISOString().split('T')[0]}.pdf`

    pdf.save(fileName)
  } finally {
    // 임시 컨테이너 제거
    document.body.removeChild(container)
  }
}

// 레거시 함수 (DOM 요소에서 직접 PDF 생성)
export async function generatePDFFromElement(
  elementId: string,
  fileName: string,
  options?: { scale?: number }
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`)
  }

  const canvas = await html2canvas(element, {
    scale: options?.scale || 2,
    useCORS: true,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const pageHeight = 297
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(fileName)
}
