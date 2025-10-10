"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { PaintBucket, ArrowLeft, Sparkles, AlertTriangle, SplitSquareVertical, Ruler, X, ZoomIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PaletteGroup, StripePatternUnit } from "@/lib/extract-api-client"

const STRIPE_STORAGE_KEY = "extract_stripe_payload"

interface StripePayload {
  stripePatternUnit: StripePatternUnit[]
  paletteGroups?: PaletteGroup[]
  sourceImage?: string | null
  generatedAt?: number
}

interface EditableStripeUnit extends StripePatternUnit {
  id: string
}

interface PatternVariant {
  hueShift: number
  label: string
  previews: string[]
}

const HUE_VARIANTS = [
  { shift: 0, label: "Base Hue" },
  { shift: 60, label: "+60° Warm" },
  { shift: 150, label: "+150° Vivid" },
  { shift: 240, label: "+240° Cool" },
]

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("")}`

const hexToRgb = (hex: string) => {
  const normalised = hex.replace("#", "")
  const value = Number.parseInt(normalised.length === 3 ? normalised.repeat(2) : normalised, 16)
  if (Number.isNaN(value)) return { r: 0, g: 0, b: 0 }
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const delta = max - min
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / delta + 2
        break
      case b:
      default:
        h = (r - g) / delta + 4
        break
    }
    h /= 6
  }
  return { h: h * 360, s, l }
}

const hslToRgb = (h: number, s: number, l: number) => {
  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const normalizedH = ((h % 360) + 360) % 360 / 360
  let r = l
  let g = l
  let b = l
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, normalizedH + 1 / 3)
    g = hueToRgb(p, q, normalizedH)
    b = hueToRgb(p, q, normalizedH - 1 / 3)
  }
  return {
    r: clampChannel(Math.round(r * 255)),
    g: clampChannel(Math.round(g * 255)),
    b: clampChannel(Math.round(b * 255)),
  }
}

const applyHueShift = (color: { r: number; g: number; b: number }, shift: number) => {
  const { h, s, l } = rgbToHsl(color.r, color.g, color.b)
  return hslToRgb(h + shift, s, l)
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const generateVariantWidths = (count: number, baseSeed: number, targetCycleWidth: number) => {
  if (count <= 0) return []
  const raw = Array.from({ length: count }, (_, idx) => {
    const randomness = seededRandom(baseSeed + idx * 13.37)
    // Produce values in roughly [0.4, 2.0] range to create noticeable variation.
    return 0.4 + randomness * 1.6
  })
  const sum = raw.reduce((acc, value) => acc + value, 0) || 1
  const rounded: number[] = []
  let accumulated = 0
  for (let i = 0; i < count; i += 1) {
    if (i === count - 1) {
      rounded.push(Math.max(1, targetCycleWidth - accumulated))
    } else {
      const proportional = (raw[i] / sum) * targetCycleWidth
      const width = Math.max(1, Math.round(proportional))
      rounded.push(width)
      accumulated += width
    }
  }
  if (rounded.length > 0) {
    const totalRounded = rounded.reduce((acc, value) => acc + value, 0)
    const delta = targetCycleWidth - totalRounded
    rounded[rounded.length - 1] = Math.max(1, rounded[rounded.length - 1] + delta)
  }
  return rounded
}

export default function ExtractStripePage() {
  const router = useRouter()
  const [stripeUnits, setStripeUnits] = useState<EditableStripeUnit[]>([])
  const [payloadMeta, setPayloadMeta] = useState<{ generatedAt?: number; sourceImage?: string | null }>({})
  const [patternVariants, setPatternVariants] = useState<PatternVariant[]>([])
  const [isRendering, setIsRendering] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [globalHueShift, setGlobalHueShift] = useState(0)
  const [activeStripeId, setActiveStripeId] = useState<string | null>(null)
  const [draggingStripeId, setDraggingStripeId] = useState<string | null>(null)
  const dragOverIdRef = useRef<string | null>(null)
  const [basePatternPreviewUrl, setBasePatternPreviewUrl] = useState<string | null>(null)
  const [previewLightbox, setPreviewLightbox] = useState<{ src: string; title: string } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.sessionStorage.getItem(STRIPE_STORAGE_KEY)
    if (!raw) {
      setLoadError("No stripe pattern data found. Please run the extract workflow again.")
      return
    }
    try {
      const parsed = JSON.parse(raw) as StripePayload
      if (!Array.isArray(parsed?.stripePatternUnit) || parsed.stripePatternUnit.length === 0) {
        setLoadError("The stripe pattern payload is incomplete. Please try extracting again.")
        return
      }
      const enriched = parsed.stripePatternUnit.map((unit, idx) => ({
        id: `${idx}-${Date.now()}`,
        color: {
          r: clampChannel(unit?.color?.r ?? 0),
          g: clampChannel(unit?.color?.g ?? 0),
          b: clampChannel(unit?.color?.b ?? 0),
        },
        widthPx: Math.max(1, Math.round(unit?.widthPx ?? 10)),
      }))
      setStripeUnits(enriched)
      setPayloadMeta({ generatedAt: parsed.generatedAt, sourceImage: parsed.sourceImage })
    } catch (error) {
      console.error("Failed to parse stripe payload:", error)
      setLoadError("Unable to parse stripe pattern data. Please try again.")
    }
  }, [])

  const handleColorChange = useCallback((id: string, hex: string) => {
    const rgb = hexToRgb(hex)
    setStripeUnits((prev) =>
      prev.map((unit) => (unit.id === id ? { ...unit, color: { r: rgb.r, g: rgb.g, b: rgb.b } } : unit)),
    )
  }, [])

  const handleWidthChange = useCallback((id: string, value: number[]) => {
    const [width] = value
    setStripeUnits((prev) => prev.map((unit) => (unit.id === id ? { ...unit, widthPx: Math.max(1, Math.round(width)) } : unit)))
  }, [])

  const handleReorderStripe = useCallback((id: string, targetIndex: number) => {
    setStripeUnits((prev) => {
      const currentIndex = prev.findIndex((unit) => unit.id === id)
      if (currentIndex === -1) return prev
      const clampedTarget = Math.max(0, Math.min(prev.length - 1, targetIndex))
      if (currentIndex === clampedTarget) return prev
      const next = [...prev]
      const [moved] = next.splice(currentIndex, 1)
      next.splice(clampedTarget, 0, moved)
      return next
    })
  }, [])

  const selectedStripe = useMemo(
    () => (activeStripeId ? stripeUnits.find((unit) => unit.id === activeStripeId) ?? null : null),
    [activeStripeId, stripeUnits],
  )

  const selectedStripeIndex = useMemo(
    () => (activeStripeId ? stripeUnits.findIndex((unit) => unit.id === activeStripeId) : -1),
    [activeStripeId, stripeUnits],
  )

  useEffect(() => {
    if (activeStripeId && !stripeUnits.some((unit) => unit.id === activeStripeId)) {
      setActiveStripeId(null)
    }
  }, [activeStripeId, stripeUnits])

  const handleStripeClick = useCallback(
    (id: string) => {
      if (draggingStripeId) return
      setActiveStripeId(id)
    },
    [draggingStripeId],
  )

  const handleRemoveStripe = useCallback(
    (id: string) => {
      setStripeUnits((prev) => prev.filter((unit) => unit.id !== id))
      if (activeStripeId === id) {
        setActiveStripeId(null)
      }
    },
    [activeStripeId],
  )

  const handleStripeDragStart = useCallback((event: React.DragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.effectAllowed = "move"
    try {
      event.dataTransfer.setData("text/plain", id)
    } catch {
      // some browsers may throw if dataTransfer is not available in this context
    }
    dragOverIdRef.current = null
    setDraggingStripeId(id)
  }, [])

  const handleStripeDragOver = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, id: string) => {
      event.preventDefault()
      if (!draggingStripeId || id === draggingStripeId) return
      if (dragOverIdRef.current === id) return
      dragOverIdRef.current = id
      const targetIndex = stripeUnits.findIndex((unit) => unit.id === id)
      if (targetIndex >= 0) {
        handleReorderStripe(draggingStripeId, targetIndex)
      }
    },
    [draggingStripeId, handleReorderStripe, stripeUnits],
  )

  const handleStripeDragEnd = useCallback(() => {
    setDraggingStripeId(null)
    dragOverIdRef.current = null
  }, [])

  const totalUnitWidth = useMemo(
    () => stripeUnits.reduce((acc, unit) => acc + Math.max(1, unit.widthPx), 0),
    [stripeUnits],
  )

  useEffect(() => {
    if (stripeUnits.length === 0) {
      setPatternVariants([])
      setBasePatternPreviewUrl(null)
      return
    }
    let cancelledPreview = false
    const baseCycle = () => {
      const cycleSourceWidth = Math.max(
        1,
        totalUnitWidth || stripeUnits.reduce((acc, unit) => acc + Math.max(1, unit.widthPx), 0),
      )
      const cycleWidth = Math.max(240, Math.round(cycleSourceWidth)) || stripeUnits.length * 80
      const baseWidths: number[] = []
      let accumulated = 0
      for (let i = 0; i < stripeUnits.length; i += 1) {
        let width = Math.max(
          1,
          cycleSourceWidth === 0
            ? Math.round(cycleWidth / Math.max(1, stripeUnits.length))
            : Math.round((stripeUnits[i].widthPx / cycleSourceWidth) * cycleWidth),
        )
        if (i === stripeUnits.length - 1) {
          width = Math.max(1, cycleWidth - accumulated)
        }
        baseWidths.push(width)
        accumulated += width
      }
      if (baseWidths.length > 0) {
        const roundedTotal = baseWidths.reduce((acc, value) => acc + value, 0)
        const delta = cycleWidth - roundedTotal
        baseWidths[baseWidths.length - 1] = Math.max(1, baseWidths[baseWidths.length - 1] + delta)
      }
      window.requestAnimationFrame(() => {
        try {
          const repeatCount = 4
          const tileWidth = cycleWidth * repeatCount
          const tileHeight = tileWidth
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            setBasePatternPreviewUrl(null)
            return
          }

          canvas.width = tileWidth
          canvas.height = tileHeight
          ctx.fillStyle = "rgba(15, 23, 42, 0.04)"
          ctx.fillRect(0, 0, tileWidth, tileHeight)

          let currentX = 0
          for (let repeat = 0; repeat < repeatCount; repeat += 1) {
            for (let stripeIndex = 0; stripeIndex < stripeUnits.length; stripeIndex += 1) {
              if (currentX >= tileWidth) break
              const unit = stripeUnits[stripeIndex]
              const width = Math.min(baseWidths[stripeIndex], tileWidth - currentX)
              ctx.fillStyle = `rgb(${clampChannel(unit.color.r)}, ${clampChannel(unit.color.g)}, ${clampChannel(unit.color.b)})`
              ctx.fillRect(currentX, 0, width, tileHeight)
              currentX += width
            }
          }

          if (currentX < tileWidth && stripeUnits.length > 0) {
            const last = stripeUnits[stripeUnits.length - 1]
            ctx.fillStyle = `rgb(${clampChannel(last.color.r)}, ${clampChannel(last.color.g)}, ${clampChannel(last.color.b)})`
            ctx.fillRect(currentX, 0, tileWidth - currentX, tileHeight)
          }

          const url = canvas.toDataURL("image/png")
          if (!cancelledPreview) {
            setBasePatternPreviewUrl(url)
          }
        } catch (error) {
          console.error("Failed to render base stripe preview:", error)
          if (!cancelledPreview) {
            setBasePatternPreviewUrl(null)
          }
        }
      })
    }
    baseCycle()

    let cancelled = false
    setIsRendering(true)

    const render = async () => {
      const variants: PatternVariant[] = []
      for (const variant of HUE_VARIANTS) {
        const previews: string[] = []
        for (let i = 0; i < 4; i += 1) {
          const seed = variant.shift * 17.11 + i * 19.87
          const stripeCount = stripeUnits.length
          const cycleWidth = Math.max(240, Math.round(totalUnitWidth) || stripeUnits.length * 80)
          const variantWidths = generateVariantWidths(stripeCount, seed, cycleWidth)
          const repeatCount = Math.max(2, Math.ceil(640 / cycleWidth))
          const tileWidth = cycleWidth * repeatCount
          const tileHeight = tileWidth
          const dataUrl = await new Promise<string>((resolve, reject) => {
            requestAnimationFrame(() => {
              try {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                  reject(new Error("Canvas unsupported"))
                  return
                }
                canvas.width = tileWidth
                canvas.height = tileHeight
                let currentX = 0
                for (let repeat = 0; repeat < repeatCount; repeat += 1) {
                  for (let stripeIndex = 0; stripeIndex < stripeCount; stripeIndex += 1) {
                    if (currentX >= tileWidth) break
                    const unit = stripeUnits[stripeIndex]
                    const baseWidth = variantWidths[stripeIndex]
                    const jitter =
                      0.85 + seededRandom(seed + repeat * 23.17 + stripeIndex * 31.73) * 0.3
                    let width = Math.max(1, Math.round(baseWidth * jitter))
                    const remaining = tileWidth - currentX
                    if (stripeIndex === stripeCount - 1 && repeat === repeatCount - 1) {
                      width = remaining
                    } else {
                      width = Math.min(width, remaining)
                    }
                    const hueShiftTotal = globalHueShift + variant.shift
                    const shiftedColor = applyHueShift(unit.color, hueShiftTotal)
                    ctx.fillStyle = `rgb(${shiftedColor.r}, ${shiftedColor.g}, ${shiftedColor.b})`
                    ctx.fillRect(currentX, 0, width, tileHeight)
                    currentX += width
                  }
                }
                if (currentX < tileWidth) {
                  const fallback = stripeUnits[stripeUnits.length - 1]
                  const hueShiftTotal = globalHueShift + variant.shift
                  const baseColor = applyHueShift(fallback.color, hueShiftTotal)
                  ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`
                  ctx.fillRect(currentX, 0, tileWidth - currentX, tileHeight)
                }
                resolve(canvas.toDataURL("image/png"))
              } catch (error) {
                reject(error)
              }
            })
          })
          previews.push(dataUrl)
        }
        variants.push({ hueShift: variant.shift, label: variant.label, previews })
      }
      if (!cancelled) {
        setPatternVariants(variants)
        setIsRendering(false)
      }
    }

    render().catch((error) => {
      console.error("Failed to render stripe previews:", error)
      if (!cancelled) {
        setPatternVariants([])
        setIsRendering(false)
      }
    })

    return () => {
      cancelled = true
      cancelledPreview = true
    }
  }, [stripeUnits, totalUnitWidth, globalHueShift])

  const handleBackToExtract = useCallback(() => {
    router.push("/extract")
  }, [router])

  const handleReset = useCallback(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.removeItem(STRIPE_STORAGE_KEY)
    router.refresh()
  }, [router])

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2" onClick={handleBackToExtract}>
          <ArrowLeft className="size-4" />
          Back to Extract
        </Button>
      </div>

      {loadError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Unable to load stripe data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="destructive" onClick={handleReset}>
              Clear cached payload
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <motion.div layout>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PaintBucket className="size-5 text-primary" />
                    Stripe Unit Palette
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Tweak stripe colors and widths, then apply a Hue Shift.</p>
                </div>
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {stripeUnits.length} stripes
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-md border border-border/30 bg-muted/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label htmlFor="global-hue-slider" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Hue Shift
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        
                      </p>
                    </div>
                    <div className="flex flex-1 items-center gap-3 sm:max-w-md">
                      <Slider
                        id="global-hue-slider"
                        min={-180}
                        max={180}
                        step={1}
                        value={[globalHueShift]}
                        onValueChange={(value) => setGlobalHueShift(Math.round(value[0] ?? 0))}
                      />
                      <span className="w-14 text-right text-xs font-medium text-muted-foreground">
                        {globalHueShift >= 0 ? "+" : ""}
                        {globalHueShift}°
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        基础条纹构成
                      </Label>
                      <p className="text-sm text-muted-foreground">点击任意色块，打开对话框微调颜色与宽度。</p>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Ruler className="size-3.5" />
                      {Math.round(totalUnitWidth)}px
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/60 p-4">
                    {stripeUnits.length > 0 ? (
                      <div className="flex h-24 w-full overflow-hidden rounded-md border border-border/40 shadow-inner">
                        {stripeUnits.map((unit, index) => (
                          <button
                            key={unit.id}
                            type="button"
                            draggable
                            onClick={() => handleStripeClick(unit.id)}
                            onDragStart={(event) => handleStripeDragStart(event, unit.id)}
                            onDragOver={(event) => handleStripeDragOver(event, unit.id)}
                            onDragEnd={handleStripeDragEnd}
                            onDrop={(event) => event.preventDefault()}
                            className={`group relative flex h-full min-w-[32px] flex-1 cursor-pointer items-end justify-center border-r border-white/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:brightness-110 ${
                              draggingStripeId === unit.id ? "z-10 scale-[1.02] ring-2 ring-primary/70" : ""
                            }`}
                            style={{
                              flexGrow: Math.max(1, unit.widthPx),
                              flexBasis: 0,
                              backgroundColor: `rgb(${unit.color.r}, ${unit.color.g}, ${unit.color.b})`,
                            }}
                            aria-label={`调整条纹 ${index + 1}`}
                          >
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                handleRemoveStripe(unit.id)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  handleRemoveStripe(unit.id)
                                }
                              }}
                              onMouseDown={(event) => event.stopPropagation()}
                              onDragStart={(event) => event.stopPropagation()}
                              className="group/close absolute right-1 top-1 hidden cursor-pointer rounded-full bg-black/60 p-0.5 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 group-hover:flex"
                              aria-label={`移除条纹 ${index + 1}`}
                            >
                              <X className="size-3.5" />
                            </span>
                            <span className="pointer-events-none absolute top-1 left-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/90">
                              #{index + 1}
                            </span>
                            <span className="pointer-events-none mb-2 rounded-md bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white/90">
                              {Math.round(unit.widthPx)}px
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border/40 text-xs text-muted-foreground">
                        无可用条纹数据，请先从提取流程获取结果。
                      </div>
                    )}
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    预览条纹比例与排列，选择目标色块以弹出细节调整窗。
                  </p>
                  {basePatternPreviewUrl && (
                    <div className="mx-auto w-full max-w-[220px] space-y-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewLightbox({
                            src: basePatternPreviewUrl,
                            title: "基础循环预览（4×重复）",
                          })
                        }
                        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-md border border-border/40 bg-background shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={basePatternPreviewUrl}
                            alt="Stripe base pattern preview"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                            <ZoomIn className="size-6 text-white opacity-0 transition group-hover:opacity-100" />
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <SplitSquareVertical className="size-5 text-primary" />
                  Stripe Variations Preview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Separator />
              <div className="space-y-6">
                {isRendering && (
                  <div className="rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                    <Sparkles className="mx-auto mb-4 size-10 animate-spin text-muted-foreground/70" />
                    Generating preview variations…
                  </div>
                )}
                {!isRendering && patternVariants.length === 0 && (
                  <div className="rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                    Adjust the stripes above to see live pattern previews in multiple hue families.
                  </div>
                )}
              {!isRendering &&
                patternVariants.map((variant) => (
                  <div key={variant.hueShift} className="rounded-lg border border-border/40 bg-muted/5 p-4">
                    <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
                      {variant.previews.map((preview, idx) => (
                        <button
                          key={`${variant.hueShift}-${idx}`}
                          type="button"
                          onClick={() =>
                            setPreviewLightbox({
                              src: preview,
                              title: variant.label,
                            })
                          }
                          className="group space-y-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                        >
                          <div className="relative aspect-square overflow-hidden rounded-md border border-border/40 bg-background shadow-sm">
                            <img
                              src={preview}
                              alt={`${variant.label} stripe preview`}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                              <ZoomIn className="size-6 text-white opacity-0 transition group-hover:opacity-100" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
      <Dialog open={Boolean(selectedStripe)} onOpenChange={(open) => { if (!open) setActiveStripeId(null) }}>
        <DialogContent className="max-w-md">
          {selectedStripe && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  调整条纹 #{stripeUnits.indexOf(selectedStripe) + 1}
                </DialogTitle>
                <DialogDescription>
                  微调颜色与宽度会立即反映到基础条纹与所有预览中。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div
                  className="h-20 w-full rounded-md border border-border/40 shadow-inner"
                  style={{ backgroundColor: `rgb(${selectedStripe.color.r}, ${selectedStripe.color.g}, ${selectedStripe.color.b})` }}
                />
                <div className="space-y-2">
                  <Label htmlFor={`dialog-color-${selectedStripe.id}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    颜色
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      id={`dialog-color-${selectedStripe.id}`}
                      type="color"
                      value={rgbToHex(selectedStripe.color.r, selectedStripe.color.g, selectedStripe.color.b)}
                      onChange={(event) => handleColorChange(selectedStripe.id, event.target.value)}
                      className="h-10 w-12 cursor-pointer appearance-none rounded border border-border/40 bg-transparent p-0.5"
                    />
                    <span className="text-sm text-muted-foreground">
                      RGB {selectedStripe.color.r}, {selectedStripe.color.g}, {selectedStripe.color.b}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Label
                      htmlFor={`dialog-width-${selectedStripe.id}`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      宽度
                    </Label>
                    <span className="font-medium text-foreground">{Math.round(selectedStripe.widthPx)} px</span>
                  </div>
                  <Slider
                    id={`dialog-width-${selectedStripe.id}`}
                    min={4}
                    max={240}
                    step={1}
                    value={[Math.round(selectedStripe.widthPx)]}
                    onValueChange={(value) => handleWidthChange(selectedStripe.id, value)}
                  />
                </div>
                {selectedStripeIndex >= 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Label
                        htmlFor={`dialog-order-${selectedStripe.id}`}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        顺序
                      </Label>
                      <span className="font-medium text-foreground">
                        第 {selectedStripeIndex + 1} 位 / {stripeUnits.length}
                      </span>
                    </div>
                    <Slider
                      id={`dialog-order-${selectedStripe.id}`}
                      min={1}
                      max={Math.max(1, stripeUnits.length)}
                      step={1}
                      value={[selectedStripeIndex + 1]}
                      onValueChange={(value) => {
                        const raw = Array.isArray(value) ? value[0] : value
                        const nextPosition = Math.max(1, Math.min(stripeUnits.length, Math.round(raw ?? selectedStripeIndex + 1)))
                        handleReorderStripe(selectedStripe.id, nextPosition - 1)
                      }}
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setActiveStripeId(null)}>
                  完成
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(previewLightbox)} onOpenChange={(open) => { if (!open) setPreviewLightbox(null) }}>
        <DialogContent className="max-w-4xl">
          {previewLightbox && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">{previewLightbox.title}</DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-hidden rounded-md border border-border/40 bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewLightbox.src}
                  alt={previewLightbox.title}
                  className="h-full w-full object-contain"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewLightbox(null)}>
                  关闭预览
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

