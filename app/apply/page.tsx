"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Upload,
  Download,
  Palette,
  RotateCcw,
  Settings,
  Zap,
  ImageIcon,
  Layers,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CollapsibleHeader } from "@/components/collapsible-header"
import Image from "next/image"

export default function ApplyPage() {
  const [modelImage, setModelImage] = useState<string | null>(null)
  const [patternImage, setPatternImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [applicationMode, setApplicationMode] = useState("full")
  const [processingStep, setProcessingStep] = useState("")
  const [patternScale, setPatternScale] = useState([100])
  const [patternOpacity, setPatternOpacity] = useState([80])
  const [patternRotation, setPatternRotation] = useState([0])
  const modelInputRef = useRef<HTMLInputElement>(null)
  const patternInputRef = useRef<HTMLInputElement>(null)

  const handleModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setModelImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePatternUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPatternImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleApply = async () => {
    if (!modelImage || !patternImage) return

    setIsProcessing(true)
    setProgress(0)

    const steps = [
      "Analyzing model structure...",
      "Processing pattern placement...",
      "Applying pattern transformations...",
      "Generating final composition...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i])
      setProgress((i + 1) * 25)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    setIsProcessing(false)
    setProcessingStep("")
  }

  const applicationModes = [
    { value: "full", label: "Full Coverage", desc: "Apply pattern to entire garment" },
    { value: "partial", label: "Partial Application", desc: "Apply to selected areas" },
    { value: "border", label: "Border Pattern", desc: "Apply as border decoration" },
    { value: "accent", label: "Accent Placement", desc: "Strategic accent positioning" },
  ]

  const presetPatterns = [
    { id: 1, name: "Floral", preview: "/placeholder.svg?height=100&width=100" },
    { id: 2, name: "Geometric", preview: "/placeholder.svg?height=100&width=100" },
    { id: 3, name: "Abstract", preview: "/placeholder.svg?height=100&width=100" },
    { id: 4, name: "Stripes", preview: "/placeholder.svg?height=100&width=100" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CollapsibleHeader
        title="Pattern Application"
        description="Apply patterns to garments with AI precision"
        icon={<Palette className="size-4 text-secondary-foreground" />}
        badge={{
          icon: <Zap className="size-3" />,
          text: "F3 Module"
        }}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Model Upload */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="size-5" />
                  Model Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => modelInputRef.current?.click()}
                >
                  {modelImage ? (
                    <div className="space-y-2">
                      <CheckCircle className="size-6 text-primary mx-auto" />
                      <p className="text-sm font-medium">Model uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Upload model</p>
                    </div>
                  )}
                </div>
                <input
                  ref={modelInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleModelUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Pattern Upload */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="size-5" />
                  Pattern Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-secondary/50 transition-colors"
                  onClick={() => patternInputRef.current?.click()}
                >
                  {patternImage ? (
                    <div className="space-y-2">
                      <CheckCircle className="size-6 text-secondary mx-auto" />
                      <p className="text-sm font-medium">Pattern uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Palette className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Upload pattern</p>
                    </div>
                  )}
                </div>
                <input
                  ref={patternInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePatternUpload}
                  className="hidden"
                />

                {/* Preset Patterns */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Or choose preset:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {presetPatterns.map((pattern) => (
                      <div
                        key={pattern.id}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border cursor-pointer hover:border-secondary/50 transition-colors"
                        onClick={() => setPatternImage(pattern.preview)}
                      >
                        <Image
                          src={pattern.preview || "/placeholder.svg"}
                          alt={pattern.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-medium">{pattern.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Settings */}
            {modelImage && patternImage && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="size-5" />
                    Application Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Application Mode</Label>
                    <Select value={applicationMode} onValueChange={setApplicationMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {applicationModes.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            <div>
                              <div className="font-medium">{mode.label}</div>
                              <div className="text-xs text-muted-foreground">{mode.desc}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pattern Scale: {patternScale[0]}%</Label>
                    <Slider
                      value={patternScale}
                      onValueChange={setPatternScale}
                      max={200}
                      min={25}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pattern Opacity: {patternOpacity[0]}%</Label>
                    <Slider
                      value={patternOpacity}
                      onValueChange={setPatternOpacity}
                      max={100}
                      min={10}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pattern Rotation: {patternRotation[0]}°</Label>
                    <Slider
                      value={patternRotation}
                      onValueChange={setPatternRotation}
                      max={360}
                      min={0}
                      step={15}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Seamless Tiling</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Preserve Shadows</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Auto Blend</Label>
                    <Switch defaultChecked />
                  </div>

                  <Button onClick={handleApply} disabled={isProcessing} className="w-full gap-2">
                    {isProcessing ? (
                      <>
                        <Clock className="size-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Palette className="size-4" />
                        Apply Pattern
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <Card className="border-secondary/50 bg-secondary/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-secondary animate-pulse" />
                      <span className="text-sm font-medium">{processingStep}</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      Processing time: ~{Math.ceil(((100 - progress) / 25) * 1.5)}s remaining
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="size-5" />
                    Application Preview
                  </CardTitle>
                  {modelImage && patternImage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Maximize2 className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="size-4" />
                      </Button>
                      <Button size="sm" className="gap-2">
                        <Download className="size-4" />
                        Export
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {modelImage && patternImage ? (
                  <Tabs defaultValue="preview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="model">Model</TabsTrigger>
                      <TabsTrigger value="pattern">Pattern</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="result">Result</TabsTrigger>
                    </TabsList>

                    <TabsContent value="model" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border">
                        <Image src={modelImage || "/placeholder.svg"} alt="Model image" fill className="object-cover" />
                      </div>
                    </TabsContent>

                    <TabsContent value="pattern" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border">
                        <Image
                          src={patternImage || "/placeholder.svg"}
                          alt="Pattern image"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                          Scale: {patternScale[0]}% | Opacity: {patternOpacity[0]}%
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted/20">
                        {isProcessing ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <div className="size-12 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
                              <p className="text-sm text-muted-foreground">Generating preview...</p>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <Palette className="size-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Live preview will appear here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="result" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <AlertCircle className="size-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">Final result will appear here</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="flex gap-4 justify-center">
                        <div className="text-center">
                          <ImageIcon className="size-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Model Image</p>
                        </div>
                        <ArrowRight className="size-6 text-muted-foreground mt-1" />
                        <div className="text-center">
                          <Palette className="size-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Pattern Image</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-medium">Upload both images to start</p>
                        <p className="text-sm text-muted-foreground">Upload a model image and pattern to apply</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Application History */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border/50 hover:border-secondary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-secondary/10 to-primary/10 mb-3 flex items-center justify-center">
                      <Palette className="size-8 text-muted-foreground group-hover:text-secondary transition-colors" />
                    </div>
                    <h4 className="font-medium mb-1">Application {i}</h4>
                    <p className="text-xs text-muted-foreground mb-2">Floral pattern on dress</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="size-8 p-0">
                        <Eye className="size-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="size-8 p-0">
                        <Download className="size-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
