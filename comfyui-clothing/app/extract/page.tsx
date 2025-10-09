"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Scissors,
  Zap,
  ImageIcon,
  Layers,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  RefreshCw,
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
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { extractApiClient } from "@/lib/extract-api-client"
import type { TaskHistoryItem } from "@/lib/extract-api-client"
import { useAuth } from "@/contexts/auth-context"

export default function ExtractPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const [extractedPatterns, setExtractedPatterns] = useState<any[]>([])
  const [extractedImages, setExtractedImages] = useState<string[]>([])
  const [paletteGroups, setPaletteGroups] = useState<Array<{ colors: Array<{ r:number; g:number; b:number }> }>>([])
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0)
  const [originalPaletteGroups, setOriginalPaletteGroups] = useState<Array<{ colors: Array<{ r:number; g:number; b:number }> }>>([])
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [draggedColorIndex, setDraggedColorIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("original")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const variantsSectionRef = useRef<HTMLDivElement | null>(null)
  const [variantCompositeUrl, setVariantCompositeUrl] = useState<string | null>(null)
  const [isGeneratingVariant, setIsGeneratingVariant] = useState(false)
  const clonePaletteGroups = useCallback(
    (groups: Array<{ colors: Array<{ r:number; g:number; b:number }> }>) =>
      groups.map((group) => ({
        ...group,
        colors: group.colors.map((color) => ({ ...color })),
      })),
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

          const baseWidth = baseImage.width
          const baseHeight = baseImage.height
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

          ctx.drawImage(baseImage, overlayWidth + gap, 0, baseWidth, baseHeight)
          resolve(canvas.toDataURL("image/png"))
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
      setActiveTab("extracted")
      // 刷新任务历史
      loadTaskHistory()
    } catch (e) {
      console.error('Extract error:', e)
    } finally {
      setIsProcessing(false)
      setProcessingStep("")
      setProgress(100)
    }
  }

  const loadTaskHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const history = await extractApiClient.getTaskHistory(1, 'pattern_extract')
      setTaskHistory(history)
    } catch (e) {
      console.error('Load task history error:', e)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleGenerateVariants = async () => {
    if (!extractedImages.length || isGeneratingVariant) return
    try {
      setIsGeneratingVariant(true)
      setVariantCompositeUrl(null)
      const colors = paletteGroups[selectedPaletteIndex]?.colors || []
      const composite = await generateCompositeImage(extractedImages[0], colors)
      setVariantCompositeUrl(composite)
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
      loadTaskHistory()
    }
  }, [isLoading, isAuthenticated])

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
  }, [selectedPaletteIndex, paletteGroups, extractedImages])

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
        <div className="grid lg:grid-cols-3 gap-8">
          {isProcessing && (
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Right Panel - Preview */}
          <div className={isProcessing ? "lg:col-span-2" : "lg:col-span-3"}>
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
                {uploadedImage ? (
                  <>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="original">Original</TabsTrigger>
                        <TabsTrigger value="extracted">Extracted</TabsTrigger>
                        <TabsTrigger value="variants">Variants</TabsTrigger>
                      </TabsList>

                      <TabsContent value="original" className="mt-6">
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
                            <div className="flex h-64 w-full max-w-xl items-center justify-center rounded-lg border-2 border-dashed border-border">
                              <div className="space-y-2 text-center">
                                <AlertCircle className="size-8 text-muted-foreground mx-auto" />
                                <p className="text-sm text-muted-foreground">Extracted patterns will appear here</p>
                              </div>
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
                                            <div className="text-xs font-medium text-muted-foreground">
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
                              </div>
                            </div>
                          ) : extractedImages.length > 0 ? (
                            <div className="flex h-64 w-full max-w-xl items-center justify-center rounded-lg border-2 border-dashed border-border">
                              <div className="space-y-2 text-center">
                                <Layers className="size-8 text-muted-foreground mx-auto" />
                                <p className="text-sm text-muted-foreground">
                                  Generate a variant preview to see the extracted image merged with the active color group.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-64 w-full max-w-xl items-center justify-center rounded-lg border-2 border-dashed border-border">
                              <div className="space-y-2 text-center">
                                <AlertCircle className="size-8 text-muted-foreground mx-auto" />
                                <p className="text-sm text-muted-foreground">
                                  Upload an image and run extraction before generating variants.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="mt-6 w-full max-w-sm mx-auto">
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
                          disabled={isProcessing || isGeneratingVariant || extractedImages.length === 0}
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
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-96 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center space-y-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Upload model image"
                  >
                    <ImageIcon className="size-12 text-muted-foreground mx-auto" />
                    <div>
                      <p className="text-lg font-medium">No image uploaded</p>
                      <p className="text-sm text-muted-foreground">Upload a model image to extract patterns</p>
                    </div>
                  </button>
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
