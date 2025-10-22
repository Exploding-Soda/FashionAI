"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Download,
  Shirt,
  RotateCcw,
  Settings,
  Zap,
  ImageIcon,
  Users,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Camera,
  Shuffle,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CollapsibleHeader } from "@/components/collapsible-header"
import Image from "next/image"

export default function TryOnPage() {
  const [modelImages, setModelImages] = useState<string[]>([])
  const [garmentImage, setGarmentImage] = useState<string | null>(null)
  const [accessoryImages, setAccessoryImages] = useState<string[]>([])
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const modelInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)
  const accessoryInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  const handleModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setModelImages((prev) => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleGarmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setGarmentImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAccessoryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAccessoryImages((prev) => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTryOn = async () => {
    if (modelImages.length === 0 || !garmentImage) return

    setIsProcessing(true)
    setProgress(0)

    const steps = [
      "Analyzing model structure...",
      "Processing garment fitting...",
      "Applying realistic shadows...",
      "Generating final composition...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i])
      setProgress(((i + 1) / steps.length) * 100)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    setIsProcessing(false)
    setProcessingStep("")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CollapsibleHeader
        title="Virtual Try-On"
        description="AI-powered virtual fitting and styling"
        icon={<Shirt className="size-4 text-white" />}
        badge={{
          icon: <Zap className="size-3" />,
          text: "F4 Module"
        }}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Model Selection */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Model Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => modelInputRef.current?.click()}
                >
                  {modelImages.length > 0 ? (
                    <div className="space-y-2">
                      <CheckCircle className="size-6 text-primary mx-auto" />
                      <p className="text-sm font-medium">{modelImages.length} model(s) uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <User className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Upload model images</p>
                      <p className="text-xs text-muted-foreground">Support multiple poses</p>
                    </div>
                  )}
                </div>
                <input
                  ref={modelInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleModelUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Garment Selection */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="size-5" />
                  Garment Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-chart-4/50 transition-colors"
                  onClick={() => garmentInputRef.current?.click()}
                >
                  {garmentImage ? (
                    <div className="space-y-2">
                      <CheckCircle className="size-6 text-chart-4 mx-auto" />
                      <p className="text-sm font-medium">Garment uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Shirt className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Upload garment</p>
                    </div>
                  )}
                </div>
                <input
                  ref={garmentInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGarmentUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Try-On Settings */}
            {modelImages.length > 0 && garmentImage && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="size-5" />
                    Try-On Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Realistic Shadows</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Fabric Physics</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Fit Adjustment</Label>
                    <Slider defaultValue={[50]} max={100} step={1} className="w-full" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Lighting Match</Label>
                    <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
                  </div>

                  <Button onClick={handleTryOn} disabled={isProcessing} className="w-full gap-2">
                    {isProcessing ? (
                      <>
                        <Clock className="size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Camera className="size-4" />
                        Try On Garment
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <Card className="border-chart-4/50 bg-chart-4/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-chart-4 animate-pulse" />
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
                    Try-On Preview
                  </CardTitle>
                  {modelImages.length > 0 && garmentImage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Shuffle className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="size-4" />
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
                {modelImages.length > 0 && garmentImage ? (
                  <Tabs defaultValue="result" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="model">Model</TabsTrigger>
                      <TabsTrigger value="garment">Garment</TabsTrigger>
                      <TabsTrigger value="result">Result</TabsTrigger>
                      <TabsTrigger value="comparison">Compare</TabsTrigger>
                    </TabsList>

                    <TabsContent value="model" className="mt-6">
                      <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-lg overflow-hidden border border-border">
                        <Image
                          src={modelImages[0] || "/placeholder.svg"}
                          alt="Selected model"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="garment" className="mt-6">
                      <div className="relative aspect-square max-w-sm mx-auto rounded-lg overflow-hidden border border-border">
                        <Image
                          src={garmentImage || "/placeholder.svg"}
                          alt="Selected garment"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="result" className="mt-6">
                      <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-lg overflow-hidden border border-border bg-muted/20">
                        {isProcessing ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <div className="size-12 border-2 border-chart-4 border-t-transparent rounded-full animate-spin mx-auto" />
                              <p className="text-sm text-muted-foreground">
                                Creating try-on...
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <Shirt className="size-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">
                                Try-on result will appear here
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="comparison" className="mt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-center">Before</p>
                          <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border">
                            <Image
                              src={modelImages[0] || "/placeholder.svg"}
                              alt="Before"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-center">After</p>
                          <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <AlertCircle className="size-6 text-muted-foreground mx-auto" />
                              <p className="text-xs text-muted-foreground">After try-on</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="flex gap-4 justify-center">
                        <div className="text-center">
                          <User className="size-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Select Model</p>
                        </div>
                        <ArrowRight className="size-6 text-muted-foreground mt-1" />
                        <div className="text-center">
                          <Shirt className="size-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Select Garment</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-medium">Select model and garment to start</p>
                        <p className="text-sm text-muted-foreground">
                          Upload a model and garment to begin virtual try-on
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Try-On Gallery */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Try-On Gallery</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border/50 hover:border-chart-4/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-chart-4/10 to-primary/10 mb-3 flex items-center justify-center">
                      <Shirt className="size-8 text-muted-foreground group-hover:text-chart-4 transition-colors" />
                    </div>
                    <h4 className="font-medium mb-1">Try-On {i}</h4>
                    <p className="text-xs text-muted-foreground mb-2">Model A • Blue Dress</p>
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
