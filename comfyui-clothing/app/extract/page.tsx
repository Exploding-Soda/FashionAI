"use client"

import React from "react"

import { useState, useRef, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Scissors,
  Zap,
  ImageIcon,
  Layers,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  RefreshCw,
  ZoomIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CollapsibleHeader } from "@/components/collapsible-header"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { extractApiClient } from "@/lib/extract-api-client"
import type { PaletteGroup, StripePatternUnit, TaskHistoryItem } from "@/lib/extract-api-client"
import { useAuth } from "@/contexts/auth-context"

const STRIPE_STORAGE_KEY = "extract_stripe_payload"

export default function ExtractPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const [extractedPatterns, setExtractedPatterns] = useState<any[]>([])
  const [extractedImages, setExtractedImages] = useState<string[]>([])
  const [paletteGroups, setPaletteGroups] = useState<PaletteGroup[]>([])
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0)
  const [originalPaletteGroups, setOriginalPaletteGroups] = useState<PaletteGroup[]>([])
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [draggedColorIndex, setDraggedColorIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("original")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const extractedFileInputRef = useRef<HTMLInputElement>(null)
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const variantsSectionRef = useRef<HTMLDivElement | null>(null)
  const [variantCompositeUrl, setVariantCompositeUrl] = useState<string | null>(null)
  const [isGeneratingVariant, setIsGeneratingVariant] = useState(false)
  const [variantTaskId, setVariantTaskId] = useState<string | null>(null)
  const [variantResultImages, setVariantResultImages] = useState<string[]>([])
  const [isLoadingVariantResult, setIsLoadingVariantResult] = useState(false)
  const [variantTaskStatus, setVariantTaskStatus] = useState<"PENDING" | "SUCCESS" | "FAILED" | null>(null)
  const [isLoadingPalette, setIsLoadingPalette] = useState(false)
  const [isStripePattern, setIsStripePattern] = useState(false)
  const [stripePatternUnit, setStripePatternUnit] = useState<StripePatternUnit[] | null>(null)
  const fetchedVariantResultTaskRef = useRef<string | null>(null)
  const clonePaletteGroups = useCallback(
    (groups: PaletteGroup[]) =>
      groups.map((group) => ({
        ...group,
        colors: group.colors.map((color) => ({ ...color })),
      })),
    [],
  )
  const currentStripePayload = useMemo(() => {
    if (!isStripePattern || !stripePatternUnit || stripePatternUnit.length === 0) return null
    return {
      stripePatternUnit,
      paletteGroups,
      sourceImage: extractedImages[0] ?? null,
      generatedAt: Date.now(),
    }
  }, [isStripePattern, stripePatternUnit, paletteGroups, extractedImages])
  const normalizeStatus = useCallback(
    (status?: string | null): "PENDING" | "SUCCESS" | "FAILED" => {
      const upper = (status ?? "").trim().toUpperCase()
      if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "COMPLETE", "DONE", "FINISHED"].includes(upper)) {
        return "SUCCESS"
      }
      if (["FAILED", "FAIL", "ERROR", "CANCELLED", "CANCELED"].includes(upper)) {
        return "FAILED"
      }
      return "PENDING"
    },
    [],
  )
  const generateCompositeImage = useCallback(
    (baseSrc: string, colors: Array<{ r: number; g: number; b: number }>) =>
      new Promise<string>((resolve, reject) => {
        const baseImage = new window.Image()
        baseImage.crossOrigin = "anonymous"
        baseImage.onload = () => {
          if (!colors || colors.length === 0) {
            resolve(baseSrc)
            return
          }

          const MAX_BASE_DIMENSION = 1600
          const originalWidth = baseImage.width
          const originalHeight = baseImage.height
          const scale =
            Math.max(originalWidth, originalHeight) > MAX_BASE_DIMENSION
              ? MAX_BASE_DIMENSION / Math.max(originalWidth, originalHeight)
              : 1
          const baseWidth = Math.round(originalWidth * scale)
          const baseHeight = Math.round(originalHeight * scale)
          const baseDiagonal = Math.sqrt(baseWidth * baseHeight)
          const cellSize = Math.max(48, Math.round(baseDiagonal / 5))
          const columns = Math.min(2, Math.max(1, colors.length))
          const rows = Math.ceil(colors.length / columns)
          const overlayWidth = columns * cellSize
          const overlayHeight = rows * cellSize
          const gap = Math.round(cellSize * 0.35)

          const canvas = document.createElement("canvas")
          canvas.width = overlayWidth + gap + baseWidth
          canvas.height = Math.max(baseHeight, overlayHeight)

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("无法创建画布上下文"))
            return
          }

          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          ctx.fillStyle = "#f9fafb"
          ctx.strokeStyle = "rgba(15, 23, 42, 0.1)"
          ctx.lineWidth = 1
          ctx.fillRect(0, 0, overlayWidth, overlayHeight)
          ctx.strokeRect(0.5, 0.5, overlayWidth - 1, overlayHeight - 1)

          colors.forEach((color, index) => {
            const col = index % columns
            const row = Math.floor(index / columns)
            const x = col * cellSize
            const y = row * cellSize
            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
            ctx.fillRect(x, y, cellSize, cellSize)
            ctx.strokeStyle = "rgba(15, 23, 42, 0.25)"
            ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1)
          })

          ctx.drawImage(
            baseImage,
            0,
            0,
            originalWidth,
            originalHeight,
            overlayWidth + gap,
            0,
            baseWidth,
            baseHeight,
          )
          resolve(canvas.toDataURL("image/jpeg", 0.9))
        }
        baseImage.onerror = () => reject(new Error("加载基础图像失败"))
        baseImage.src = baseSrc
      }),
    [],
  )

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setUploadedFile(file)
    }
  }

  const handleExtractedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    setActiveTab("extracted")
    setVariantCompositeUrl(null)
    setVariantTaskId(null)
    setVariantResultImages([])
    setIsLoadingVariantResult(false)
    fetchedVariantResultTaskRef.current = null

    try {
      setIsLoadingPalette(true)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("读取图片失败"))
        reader.readAsDataURL(file)
      })

      setExtractedImages([dataUrl])
      setPaletteGroups([])
      setIsStripePattern(false)
      setStripePatternUnit(null)

      const palette = await extractApiClient.requestColorPalettes(file)
      const groups = Array.isArray(palette?.groups) ? palette.groups : []
      setPaletteGroups(groups)
      setOriginalPaletteGroups(clonePaletteGroups(groups))
      setSelectedPaletteIndex(0)
      setIsStripePattern(Boolean(palette?.isStripePattern))
      setStripePatternUnit(
        Array.isArray(palette?.stripePatternUnit) ? palette.stripePatternUnit.filter(unit => unit && typeof unit.widthPx === "number") : null,
      )
    } catch (error) {
      console.error("Extracted upload error:", error)
    } finally {
      setIsLoadingPalette(false)
      input.value = ""
    }
  }

  const handleExtract = async () => {
    if (!uploadedFile) return

    setIsProcessing(true)
    setProgress(0)
    setProcessingStep("Submitting extract task...")

    try {
      // 并行：提交提取任务 + 发送图片到LLM获取配色
      const extractPromise = extractApiClient.submitExtract(uploadedFile)
      const palettePromise = extractApiClient.requestColorPalettes(uploadedFile).catch((e)=>{
        console.warn('Palette request failed:', e)
        return { groups: [] }
      })

      const resp = await extractPromise
      setProgress(25)
      setProcessingStep("Waiting task to complete...")

      // poll status
      const maxAttempts = 60
      const delay = 2000
      let status
      for (let i = 0; i < maxAttempts; i++) {
        status = await extractApiClient.getTaskStatus(resp.taskId)
        if (status.status === 'SUCCESS' || status.status === 'FAILED') break
        await new Promise(r => setTimeout(r, delay))
      }

      if (!status || status.status !== 'SUCCESS') {
        throw new Error('提取任务失败')
      }

      setProgress(75)
      setProcessingStep("Downloading results...")
      const outputs = await extractApiClient.completeTask(resp.taskId)
      setExtractedImages(outputs.outputs)
      setExtractedPatterns(outputs.outputs.map((url, idx) => ({ id: idx + 1, name: `Pattern ${idx + 1}`, type: 'extracted', size: 'auto' })))

      // 等待并设置配色结果
      const palette = await palettePromise
      const groups = Array.isArray(palette?.groups) ? palette.groups : []
      setPaletteGroups(groups)
      setOriginalPaletteGroups(clonePaletteGroups(groups))
      setSelectedPaletteIndex(0)
      setIsStripePattern(Boolean(palette?.isStripePattern))
      setStripePatternUnit(
        Array.isArray(palette?.stripePatternUnit) ? palette.stripePatternUnit.filter(unit => unit && typeof unit.widthPx === "number") : null,
      )
      setActiveTab("extracted")
      // 刷新任务历史
      void loadTaskHistory()
    } catch (e) {
      console.error('Extract error:', e)
    } finally {
      setIsProcessing(false)
      setProcessingStep("")
      setProgress(100)
    }
  }

  const loadTaskHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const history = await extractApiClient.getTaskHistory(1)
      setTaskHistory(history)
    } catch (e) {
      console.error("Load task history error:", e)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const handleGenerateVariants = async () => {
    if (!extractedImages.length || isGeneratingVariant) return
    if (currentStripePayload) {
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(STRIPE_STORAGE_KEY, JSON.stringify(currentStripePayload))
        }
        router.push("/extract_stripe")
      } catch (error) {
        console.error("Navigate to stripe editor failed:", error)
      }
      return
    }
    try {
      setIsGeneratingVariant(true)
      setVariantCompositeUrl(null)
      setVariantTaskId(null)
      setVariantTaskStatus(null)
      setVariantResultImages([])
      setIsLoadingVariantResult(false)
      fetchedVariantResultTaskRef.current = null
      const colors = paletteGroups[selectedPaletteIndex]?.colors || []
      const composite = await generateCompositeImage(extractedImages[0], colors)
      setVariantCompositeUrl(composite)
      const response = await extractApiClient.submitVariantOverlay(composite)
      setVariantTaskId(response.taskId)
      setVariantTaskStatus(normalizeStatus(response.status))
      void loadTaskHistory()
      setActiveTab("variants")
      requestAnimationFrame(() => {
        variantsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    } catch (err) {
      console.error("Generate variants failed:", err)
    } finally {
      setIsGeneratingVariant(false)
    }
  }

  const handlePaletteNavigate = (direction: "prev" | "next") => {
    setSelectedPaletteIndex((prev) => {
      if (paletteGroups.length === 0) return 0
      const nextIndex = direction === "next" ? prev + 1 : prev - 1
      if (nextIndex < 0) return paletteGroups.length - 1
      if (nextIndex >= paletteGroups.length) return 0
      return nextIndex
    })
  }

  const handleColorChannelChange = (
    groupIndex: number,
    colorIndex: number,
    channel: "r" | "g" | "b",
    value: number,
  ) => {
    const clampedValue = Math.max(0, Math.min(255, Math.round(value)))
    setPaletteGroups((prevGroups) =>
      prevGroups.map((group, gi) => {
        if (gi !== groupIndex) return group
        return {
          ...group,
          colors: group.colors.map((color, ci) => {
            if (ci !== colorIndex) return color
            return {
              ...color,
              [channel]: clampedValue,
            }
          }),
        }
      }),
    )
  }

  const handleAddColor = (groupIndex: number) => {
    setPaletteGroups((prevGroups) =>
      prevGroups.map((group, gi) => {
        if (gi !== groupIndex) return group
        if (group.colors.length >= 6) return group
        return {
          ...group,
          colors: [...group.colors, { r: 128, g: 128, b: 128 }],
        }
      }),
    )
  }

  const handleRemoveColor = (groupIndex: number, colorIndex: number) => {
    const confirmed = window.confirm("This will permanently remove the selected color from this palette group. Continue?")
    if (!confirmed) return
    setPaletteGroups((prevGroups) =>
      prevGroups.map((group, gi) => {
        if (gi !== groupIndex) return group
        return {
          ...group,
          colors: group.colors.filter((_, ci) => ci !== colorIndex),
        }
      }),
    )
  }

  const handleColorDragStart = (colorIndex: number) => {
    setDraggedColorIndex(colorIndex)
  }

  const handleColorDragEnd = () => {
    setDraggedColorIndex(null)
  }

  const handleColorReorder = (groupIndex: number, targetIndex: number) => {
    if (draggedColorIndex === null || draggedColorIndex === targetIndex) return
    setPaletteGroups(prevGroups =>
      prevGroups.map((group, gi) => {
        if (gi !== groupIndex) return group
        const colors = [...group.colors]
        const [moved] = colors.splice(draggedColorIndex, 1)
        colors.splice(targetIndex, 0, moved)
        return {
          ...group,
          colors,
        }
      }),
    )
    setDraggedColorIndex(null)
  }

  const handleOpenPreview = (url: string) => {
    setPreviewImageUrl(url)
    setIsPreviewOpen(true)
  }

  const handleResetCurrentPalette = (groupIndex: number) => {
    const originalGroup = originalPaletteGroups[groupIndex]
    if (!originalGroup) return
    const confirmed = window.confirm("Reset this palette group to its original recommended colors? All changes will be lost.")
    if (!confirmed) return
    setPaletteGroups((prevGroups) =>
      prevGroups.map((group, gi) => {
        if (gi !== groupIndex) return group
        return {
          ...group,
          colors: originalGroup.colors.map((color) => ({ ...color })),
        }
      }),
    )
  }

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void loadTaskHistory()
    }
  }, [isLoading, isAuthenticated, loadTaskHistory])

  React.useEffect(() => {
    if (paletteGroups.length === 0 && selectedPaletteIndex !== 0) {
      setSelectedPaletteIndex(0)
    } else if (selectedPaletteIndex >= paletteGroups.length && paletteGroups.length > 0) {
      setSelectedPaletteIndex(paletteGroups.length - 1)
    }
  }, [paletteGroups, selectedPaletteIndex])

  React.useEffect(() => {
    if (!isPreviewOpen) {
      setPreviewImageUrl(null)
    }
  }, [isPreviewOpen])

  React.useEffect(() => {
    setVariantCompositeUrl(null)
    setVariantTaskId(null)
    setVariantTaskStatus(null)
  }, [selectedPaletteIndex, paletteGroups, extractedImages])

  React.useEffect(() => {
    if (!variantTaskId) return
    if (typeof window === "undefined") return

    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 200
    const POLL_INTERVAL = 3000
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const statusResponse = await extractApiClient.getTaskStatus(variantTaskId)
        const nextStatus = normalizeStatus(statusResponse?.status)
        if (cancelled) return

        setVariantTaskStatus(nextStatus)

        if (nextStatus === "PENDING" && attempts < MAX_ATTEMPTS) {
          attempts += 1
          timeoutId = window.setTimeout(poll, POLL_INTERVAL)
        } else {
          void loadTaskHistory()
        }
      } catch (error) {
        console.error("Variant overlay status error:", error)
        if (!cancelled) {
          setVariantTaskStatus("FAILED")
          void loadTaskHistory()
        }
      }
    }

    poll()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [variantTaskId, normalizeStatus, loadTaskHistory])

  React.useEffect(() => {
    if (!variantTaskId) return
    if (variantTaskStatus !== "SUCCESS") return
    if (variantResultImages.length > 0) return
    if (fetchedVariantResultTaskRef.current === variantTaskId) return

    let active = true
    fetchedVariantResultTaskRef.current = variantTaskId
    setIsLoadingVariantResult(true)

    const loadOutputs = async () => {
      try {
        const { outputs } = await extractApiClient.completeTask(variantTaskId)
        if (active) {
          setVariantResultImages(Array.isArray(outputs) ? outputs : [])
        }
      } catch (error) {
        console.error("Variant overlay result error:", error)
      } finally {
        if (active) {
          setIsLoadingVariantResult(false)
        }
      }
    }

    void loadOutputs()

    return () => {
      active = false
    }
  }, [variantTaskId, variantTaskStatus, variantResultImages.length])

  // Settings 部分已简化，仅保留操作按钮

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CollapsibleHeader
        title="Pattern Extraction"
        description="AI-powered pattern isolation and extraction"
        icon={<Scissors className="size-4 text-primary-foreground" />}
        badge={{
          icon: <Zap className="size-3" />,
          text: "F2 Module"
        }}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-8">
          {/* Right Panel - Preview */}
          <div className="lg:col-span-3">
            <Card className="border-border/50 h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="size-5" />
                    Pattern Preview
                  </CardTitle>
                  {/* 去掉九宫格、刷新、导出按钮 */}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <input
                  ref={extractedFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleExtractedImageUpload}
                  className="hidden"
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="extracted">Extracted</TabsTrigger>
                    <TabsTrigger value="variants">Variants</TabsTrigger>
                  </TabsList>

                  <TabsContent value="original" className="mt-6">
                    {uploadedImage ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="relative mx-auto block aspect-square w-full max-w-md overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 group"
                        aria-label="Change model image"
                      >
                        <Image
                          src={uploadedImage || "/placeholder.svg"}
                          alt="Original model image"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-sm font-medium text-white">Click to change image</span>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-96 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center space-y-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Upload model image"
                      >
                        <ImageIcon className="size-12 text-muted-foreground mx-auto" />
                        <div>
                          <p className="text-lg font-medium">Upload a model image</p>
                          <p className="text-sm text-muted-foreground">Generate extracted patterns and color groups</p>
                        </div>
                      </button>
                    )}
                  </TabsContent>

                  <TabsContent value="extracted" className="mt-6">
                    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                      <DialogContent className="max-w-3xl border-border/70 bg-background/95">
                        {previewImageUrl && (
                          <div className="relative mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-lg border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImageUrl} alt="Pattern preview enlarged" className="h-full w-full object-contain" />
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <div className="flex flex-col items-center space-y-6">
                      {extractedImages.length > 0 ? (
                        <div className="grid w-full max-w-3xl grid-cols-2 gap-4 justify-items-center md:grid-cols-3">
                          {extractedImages.map((url, i) => (
                            <div key={i} className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-lg border">
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(url)}
                                className="h-full w-full"
                                aria-label={`Preview extracted pattern ${i + 1}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`extracted-${i}`} className="h-full w-full object-cover" />
                              </button>
                              <Badge className="absolute top-2 right-2 text-xs">extracted</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => extractedFileInputRef.current?.click()}
                          className="flex h-96 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center space-y-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-label="Upload extracted image"
                        >
                          <ImageIcon className="mx-auto size-12 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium">Upload an extracted image</p>
                            <p className="text-sm text-muted-foreground">Analyze color groups without rerunning extraction</p>
                          </div>
                        </button>
                      )}

                      {isLoadingPalette && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="size-4 animate-spin" />
                          <span>Analyzing color groups…</span>
                        </div>
                      )}

                      {paletteGroups.length > 0 && paletteGroups[selectedPaletteIndex] && (
                        <div className="w-full max-w-xl space-y-4">
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePaletteNavigate("prev")}
                              aria-label="Previous color group"
                              disabled={paletteGroups.length <= 1}
                            >
                              <ChevronLeft className="size-4" />
                            </Button>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                                <span>Suggested Color Groups</span>
                                <Badge variant="secondary">RGB</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Group {selectedPaletteIndex + 1} of {paletteGroups.length}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePaletteNavigate("next")}
                              aria-label="Next color group"
                              disabled={paletteGroups.length <= 1}
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap justify-center gap-4">
                            {paletteGroups[selectedPaletteIndex].colors.map((c, ci) => {
                              const swatchIdBase = `color-${selectedPaletteIndex}-${ci}`
                              return (
                                <Popover key={swatchIdBase}>
                                  <div
                                    className="group relative"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                      event.preventDefault()
                                      handleColorReorder(selectedPaletteIndex, ci)
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        draggable
                                        onDragStart={() => handleColorDragStart(ci)}
                                        onDragEnd={handleColorDragEnd}
                                        className="h-12 w-12 cursor-grab rounded-md border shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:cursor-grabbing"
                                        style={{ backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})` }}
                                        aria-label={`Adjust color ${ci + 1}`}
                                      />
                                    </PopoverTrigger>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleRemoveColor(selectedPaletteIndex, ci)
                                      }}
                                      className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 text-muted-foreground shadow opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                                      aria-label={`Remove color ${ci + 1}`}
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </div>
                                  <PopoverContent className="w-64 space-y-4" align="center">
                                    <div className="space-y-2">
                                      <div className="text-sm font-semibold">Adjust Color</div>
                                      <div className="flex items-center gap-3">
                                        <div
                                          className="h-10 w-10 rounded border"
                                          style={{ backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})` }}
                                        />
                                        <div className="text-xs text-muted-foreground">
                                          rgb({c.r}, {c.g}, {c.b})
                                        </div>
                                      </div>
                                    </div>

                                    {(["r", "g", "b"] as const).map((channel) => {
                                      const sliderId = `${swatchIdBase}-${channel}`
                                      const channelValue = c[channel]
                                      return (
                                        <div key={channel} className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <Label htmlFor={sliderId} className="uppercase">
                                              {channel}
                                            </Label>
                                            <span className="text-xs text-muted-foreground">{channelValue}</span>
                                          </div>
                                          <Slider
                                            id={sliderId}
                                            max={255}
                                            min={0}
                                            step={1}
                                            value={[channelValue]}
                                            onValueChange={(value) =>
                                              handleColorChannelChange(
                                                selectedPaletteIndex,
                                                ci,
                                                channel,
                                                value[0] ?? channelValue,
                                              )
                                            }
                                          />
                                        </div>
                                      )
                                    })}
                                  </PopoverContent>
                                </Popover>
                              )
                            })}

                            <div className="flex items-center gap-2">
                              {paletteGroups[selectedPaletteIndex].colors.length < 6 && (
                                <button
                                  type="button"
                                  onClick={() => handleAddColor(selectedPaletteIndex)}
                                  className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground shadow-sm transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                  aria-label="Add new color"
                                >
                                  <Plus className="size-5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResetCurrentPalette(selectedPaletteIndex)}
                                className="flex h-12 w-12 items-center justify-center rounded-md border border-border text-green-600 shadow-sm transition hover:border-green-500 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Reset colors to recommended palette"
                                disabled={!originalPaletteGroups[selectedPaletteIndex]}
                              >
                                <RefreshCw className="size-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="variants" className="mt-6" ref={variantsSectionRef}>
                    <div className="flex flex-col items-center space-y-6">
                      {isGeneratingVariant ? (
                        <div className="flex h-64 w-full max-w-xl items-center justify-center rounded-lg border border-border">
                          <div className="space-y-3 text-center">
                            <Clock className="size-10 animate-spin text-primary mx-auto" />
                            <p className="text-sm text-muted-foreground">Generating composite preview…</p>
                          </div>
                        </div>
                      ) : variantCompositeUrl ? (
                        <div className="w-full max-w-3xl space-y-4">
                          <div className="relative mx-auto overflow-hidden rounded-lg border border-border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={variantCompositeUrl}
                              alt="Variant composite preview"
                              className="h-auto w-full object-contain"
                            />
                          </div>
                          <div className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Layers className="size-4" />
                              <span>
                                Composite preview merging the extracted image with the active color group tiles positioned at the
                                top-left outside the garment. Adjust the palette above and regenerate to refresh this image.
                              </span>
                            </div>
                            {variantTaskId && (
                              <div className="mt-2 space-y-1 text-xs text-muted-foreground/80">
                                <p>Task ID: {variantTaskId}</p>
                                <div className="flex items-center justify-center gap-1">
                                  {variantTaskStatus === "SUCCESS" ? (
                                    <CheckCircle className="size-3 text-emerald-500" />
                                  ) : variantTaskStatus === "FAILED" ? (
                                    <AlertCircle className="size-3 text-destructive" />
                                  ) : (
                                    <Clock className="size-3 animate-spin" />
                                  )}
                                  <span>
                                    Status:{" "}
                                    {variantTaskStatus === "SUCCESS"
                                      ? "Completed"
                                      : variantTaskStatus === "FAILED"
                                        ? "Failed"
                                        : "Pending"}
                                  </span>
                                </div>
                              </div>
                            )}
                            {variantTaskStatus === "SUCCESS" && isLoadingVariantResult && (
                              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <Clock className="size-3 animate-spin" />
                                <span>Loading generated outputs…</span>
                              </div>
                            )}

                            {variantResultImages.length > 0 ? (
                              <div className="mt-4 space-y-2 text-left">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Generated outputs</h4>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                  {variantResultImages.map((url, idx) => (
                                    <button
                                      key={url || idx}
                                      type="button"
                                      onClick={() => handleOpenPreview(url)}
                                      className="group relative overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={url} alt={`variant-result-${idx}`} className="h-full w-full object-cover" />
                                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
                                        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                                          <ZoomIn className="size-3" />
                                          Zoom In
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              variantTaskStatus === "SUCCESS" &&
                              !isLoadingVariantResult && (
                                <div className="mt-4 text-xs text-muted-foreground">
                                  未收到生成图片。尝试刷新任务或重新生成变体。
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ) : extractedImages.length > 0 ? (
                        <div className="flex h-96 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center space-y-4">
                          <Layers className="mx-auto size-12 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium">Generate a variant preview</p>
                            <p className="text-sm text-muted-foreground">
                              Combine the extracted image with the active color group to view results.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-96 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center space-y-4">
                          <AlertCircle className="mx-auto size-12 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium">Upload an image and run extraction</p>
                            <p className="text-sm text-muted-foreground">Generate extracted patterns before creating variants.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 w-full max-w-3xl mx-auto">
                  {activeTab === "original" && (
                    <Button onClick={handleExtract} disabled={isProcessing} className="w-full gap-2">
                      {isProcessing ? (
                        <>
                          <Clock className="size-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Scissors className="size-4" />
                          Extract Patterns
                        </>
                      )}
                    </Button>
                  )}
                  {activeTab === "extracted" && (
                    <Button
                      onClick={handleGenerateVariants}
                      disabled={isProcessing || isGeneratingVariant || isLoadingPalette || extractedImages.length === 0 || variantTaskStatus === "PENDING"}
                      className="w-full gap-2"
                    >
                      {isGeneratingVariant ? (
                        <>
                          <Clock className="size-4 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Layers className="size-4" />
                          Generate Variants
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isProcessing && (
                  <div className="mt-6 rounded-lg border border-primary/50 bg-primary/5 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-medium">{processingStep}</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      <p className="text-xs text-muted-foreground">
                        Processing time: ~{Math.ceil(((100 - progress) / 25) * 1.5)}s remaining
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Task History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task History</h3>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={loadTaskHistory} disabled={isLoadingHistory}>
              {isLoadingHistory ? <Clock className="size-4 animate-spin" /> : <Scissors className="size-4" />}
              Refresh
            </Button>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading history...</p>
              </div>
            </div>
          ) : taskHistory.length > 0 ? (
            <div className="grid md:grid-cols-6 gap-4">
              {taskHistory.map((task, idx) => (
                <motion.div key={task.tenant_task_id || idx} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                  <Card className="border-border/50 hover:border-primary/50 transition-colors">
                    <CardContent className="p-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={task.status === 'SUCCESS' ? 'default' : task.status === 'FAILED' ? 'destructive' : 'secondary'}>
                            {task.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {task.created_at ? new Date(task.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                        <div className="text-xs font-medium truncate">
                          {task.task_type}
                        </div>
                        {task.image_urls && task.image_urls.length > 0 ? (
                          <div className="aspect-square rounded-md overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={task.image_urls[0]} alt="Result" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-square rounded-md bg-muted flex items-center justify-center">
                            <ImageIcon className="size-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center">
                <ImageIcon className="size-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium mb-2">No tasks yet</h4>
                <p className="text-sm text-muted-foreground">Run an extraction to see history here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}



