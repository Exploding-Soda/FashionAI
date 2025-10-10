"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { PaintBucket, ArrowLeft, Sparkles, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

export default function ExtractStripePage() {
  const router = useRouter()
  const [stripeUnits, setStripeUnits] = useState<EditableStripeUnit[]>([])
  const [payloadMeta, setPayloadMeta] = useState<{ generatedAt?: number; sourceImage?: string | null }>({})
  const [patternPreviewUrl, setPatternPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  const totalUnitWidth = useMemo(
    () => stripeUnits.reduce((acc, unit) => acc + Math.max(1, Math.round(unit.widthPx)), 0),
    [stripeUnits],
  )

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

  const handleGeneratePattern = useCallback(async () => {
    if (stripeUnits.length === 0) return
    setIsGenerating(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        requestAnimationFrame(() => {
          try {
            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")
            if (!context) {
              reject(new Error("Canvas is not supported in this environment"))
              return
            }

            const baseUnitWidth = totalUnitWidth || 1
            const repeats = Math.max(1, Math.round(512 / baseUnitWidth))
            const width = baseUnitWidth * repeats
            const height = width
            canvas.width = width
            canvas.height = height

            let currentX = 0
            while (currentX < width) {
              for (const unit of stripeUnits) {
                const stripeWidth = Math.max(1, Math.round(unit.widthPx))
                const remaining = width - currentX
                const drawWidth = Math.min(stripeWidth, remaining)
                context.fillStyle = `rgb(${clampChannel(unit.color.r)}, ${clampChannel(unit.color.g)}, ${clampChannel(unit.color.b)})`
                context.fillRect(currentX, 0, drawWidth, height)
                currentX += drawWidth
                if (currentX >= width) break
              }
            }

            resolve(canvas.toDataURL("image/png"))
          } catch (error) {
            reject(error)
          }
        })
      })
      setPatternPreviewUrl(dataUrl)
    } catch (error) {
      console.error("Failed to generate stripe pattern preview:", error)
    } finally {
      setIsGenerating(false)
    }
  }, [stripeUnits, totalUnitWidth])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Stripe Pattern Refinement</h1>
          <p className="text-muted-foreground mt-2">
            Fine-tune the minimal repeating stripe unit suggested by the extractor and generate a tiling preview.
          </p>
        </div>
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
                  <p className="text-sm text-muted-foreground">
                    Adjust each stripe&apos;s color and width to match the garment more closely.
                  </p>
                </div>
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {stripeUnits.length} stripes
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {stripeUnits.map((unit, index) => (
                  <div key={unit.id} className="rounded-lg border border-border/40 bg-muted/10 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Stripe {index + 1}</span>
                        <Badge variant="outline">
                          RGB {unit.color.r}, {unit.color.g}, {unit.color.b}
                        </Badge>
                      </div>
                      <input
                        type="color"
                        value={rgbToHex(unit.color.r, unit.color.g, unit.color.b)}
                        onChange={(event) => handleColorChange(unit.id, event.target.value)}
                        className="h-10 w-14 cursor-pointer appearance-none rounded border border-border/40 bg-transparent p-1"
                        aria-label={`Select color for stripe ${index + 1}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Label htmlFor={`stripe-width-${unit.id}`} className="text-muted-foreground">
                          Stripe width
                        </Label>
                        <span className="font-medium">{Math.round(unit.widthPx)} px</span>
                      </div>
                      <Slider
                        id={`stripe-width-${unit.id}`}
                        min={4}
                        max={240}
                        step={1}
                        value={[Math.round(unit.widthPx)]}
                        onValueChange={(value) => handleWidthChange(unit.id, value)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Generate Tiled Preview
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Combine the stripes into a near-square tile so you can validate the repeating pattern.
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Total unit width: {totalUnitWidth}px</p>
                {payloadMeta.generatedAt && (
                  <p>Captured {new Date(payloadMeta.generatedAt).toLocaleString()}</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button className="gap-2" onClick={handleGeneratePattern} disabled={isGenerating || stripeUnits.length === 0}>
                  <Sparkles className="size-4" />
                  {isGenerating ? "Generating…" : "Generate Pattern"}
                </Button>
                {payloadMeta.sourceImage && (
                  <Button variant="outline" onClick={() => setPatternPreviewUrl(payloadMeta.sourceImage ?? null)}>
                    View Source Extract
                  </Button>
                )}
              </div>
              <Separator />
              <div className="rounded-lg border border-border/40 bg-muted/10 p-6">
                {patternPreviewUrl ? (
                  <img
                    src={patternPreviewUrl}
                    alt="Generated stripe pattern preview"
                    className="mx-auto max-h-[480px] w-full rounded-md border border-border/40 object-contain"
                  />
                ) : (
                  <div className="flex h-72 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <Sparkles className="mb-4 size-10 animate-pulse text-muted-foreground/70" />
                    <p>No preview yet. Adjust the stripes and click “Generate Pattern”.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
