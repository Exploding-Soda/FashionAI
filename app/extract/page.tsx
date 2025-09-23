"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Upload,
  Download,
  Scissors,
  RotateCcw,
  Settings,
  Zap,
  ImageIcon,
  Layers,
  Grid3X3,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Copy,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CollapsibleHeader } from "@/components/collapsible-header"
import Image from "next/image"

export default function ExtractPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractionMode, setExtractionMode] = useState("full")
  const [processingStep, setProcessingStep] = useState("")
  const [extractedPatterns, setExtractedPatterns] = useState<any[]>([])
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleExtract = async () => {
    if (!uploadedImage) return

    setIsProcessing(true)
    setProgress(0)

    const steps = [
      "Analyzing image structure...",
      "Detecting pattern elements...",
      "Extracting pattern variations...",
      "Generating transparent outputs...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i])
      setProgress((i + 1) * 25)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    // Simulate extracted patterns
    setExtractedPatterns([
      { id: 1, name: "Full Pattern", type: "complete", size: "2048x2048" },
      { id: 2, name: "Repeating Unit", type: "tile", size: "512x512" },
      { id: 3, name: "Border Element", type: "border", size: "1024x256" },
      { id: 4, name: "Corner Detail", type: "corner", size: "256x256" },
    ])

    setIsProcessing(false)
    setProcessingStep("")
  }

  const extractionModes = [
    { value: "full", label: "Full Pattern", desc: "Extract complete pattern design" },
    { value: "tile", label: "Repeating Tile", desc: "Extract seamless tile pattern" },
    { value: "elements", label: "Pattern Elements", desc: "Extract individual elements" },
    { value: "variants", label: "Generate Variants", desc: "Create pattern variations" },
  ]

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
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Section */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="size-5" />
                  Upload Model Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadedImage ? (
                    <div className="space-y-2">
                      <CheckCircle className="size-8 text-primary mx-auto" />
                      <p className="text-sm font-medium">Model image uploaded</p>
                      <p className="text-xs text-muted-foreground">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="size-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Drop model image here</p>
                      <p className="text-xs text-muted-foreground">or click to browse</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Extraction Settings */}
            {uploadedImage && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="size-5" />
                    Extraction Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Extraction Mode</label>
                    <Select value={extractionMode} onValueChange={setExtractionMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {extractionModes.map((mode) => (
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
                    <label className="text-sm font-medium">Pattern Sensitivity</label>
                    <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Background Removal</label>
                    <Slider defaultValue={[90]} max={100} step={1} className="w-full" />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Generate Variants</label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">High Resolution</label>
                    <Switch defaultChecked />
                  </div>

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
                </CardContent>
              </Card>
            )}

            {/* Processing Status */}
            {isProcessing && (
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
            )}

            {/* Extracted Patterns List */}
            {extractedPatterns.length > 0 && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="size-5" />
                    Extracted Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {extractedPatterns.map((pattern, i) => (
                    <div
                      key={pattern.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPattern === i ? "border-primary bg-primary/5" : "border-border hover:border-border/60"
                      }`}
                      onClick={() => setSelectedPattern(i)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{pattern.name}</p>
                          <p className="text-xs text-muted-foreground">{pattern.size}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="size-8 p-0">
                            <Eye className="size-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="size-8 p-0">
                            <Copy className="size-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="size-8 p-0">
                            <Download className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    Pattern Preview
                  </CardTitle>
                  {uploadedImage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Grid3X3 className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="size-4" />
                      </Button>
                      <Button size="sm" className="gap-2">
                        <Download className="size-4" />
                        Export All
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {uploadedImage ? (
                  <Tabs defaultValue="original" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="extracted">Extracted</TabsTrigger>
                      <TabsTrigger value="variants">Variants</TabsTrigger>
                    </TabsList>

                    <TabsContent value="original" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border">
                        <Image
                          src={uploadedImage || "/placeholder.svg"}
                          alt="Original model image"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="extracted" className="mt-6">
                      <div className="space-y-4">
                        {extractedPatterns.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {extractedPatterns.map((pattern, i) => (
                              <div
                                key={pattern.id}
                                className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                  selectedPattern === i
                                    ? "border-primary ring-2 ring-primary/20"
                                    : "border-border hover:border-border/60"
                                }`}
                                onClick={() => setSelectedPattern(i)}
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                  <div className="text-center">
                                    <Scissors className="size-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-xs font-medium">{pattern.name}</p>
                                    <p className="text-xs text-muted-foreground">{pattern.size}</p>
                                  </div>
                                </div>
                                <Badge className="absolute top-2 right-2 text-xs">{pattern.type}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
                            <div className="text-center space-y-2">
                              <AlertCircle className="size-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Extracted patterns will appear here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="variants" className="mt-6">
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center"
                          >
                            <div className="text-center">
                              <Layers className="size-6 text-muted-foreground mx-auto mb-1" />
                              <p className="text-xs text-muted-foreground">Variant {i}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
                    <div className="text-center space-y-4">
                      <ImageIcon className="size-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">No image uploaded</p>
                        <p className="text-sm text-muted-foreground">Upload a model image to extract patterns</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pattern Library */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pattern Library</h3>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Trash2 className="size-4" />
              Clear All
            </Button>
          </div>
          <div className="grid md:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-3">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 mb-2 flex items-center justify-center">
                      <Scissors className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs font-medium text-center">Pattern {i}</p>
                    <p className="text-xs text-muted-foreground text-center">512x512</p>
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
