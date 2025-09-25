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
  Video,
  Shuffle,
  User,
  Play,
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

export default function VideoGenerationPage() {
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const [videoLength, setVideoLength] = useState(5) // seconds
  const [fps, setFps] = useState(24)
  const [loopVideo, setLoopVideo] = useState(true)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setInputImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleVideoGeneration = async () => {
    if (!inputImage || !prompt.trim()) return

    setIsProcessing(true)
    setProgress(0)

    const steps = [
      "Analyzing input image...",
      "Processing prompt...",
      "Generating video frames...",
      "Creating video sequence...",
      "Finalizing output...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i])
      setProgress(((i + 1) / steps.length) * 100)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    setIsProcessing(false)
    setProcessingStep("")
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CollapsibleHeader
        title="Video Generation"
        description="AI-powered virtual try-on video creation"
        icon={<Video className="size-4 text-white" />}
        badge={{
          icon: <Zap className="size-3" />,
          text: "F5 Module"
        }}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Prompt Input */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5" />
                  Video Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-sm font-medium">Describe your video</Label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A person walking in a red dress, cinematic lighting, slow motion..."
                    className="w-full min-h-[100px] px-3 py-2 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe the video you want to generate based on your image
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="size-5" />
                  Input Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {inputImage ? (
                    <div className="space-y-2">
                      <CheckCircle className="size-6 text-primary mx-auto" />
                      <p className="text-sm font-medium">Image uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="size-6 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Upload image</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, or WebP</p>
                    </div>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Video Settings */}
            {inputImage && prompt.trim() && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="size-5" />
                    Video Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Video Length (seconds)</Label>
                    <Slider 
                      value={[videoLength]} 
                      onValueChange={(value) => setVideoLength(value[0])}
                      max={30} 
                      min={2}
                      step={1} 
                      className="w-full" 
                    />
                    <p className="text-xs text-muted-foreground">{videoLength} seconds</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frame Rate (FPS)</Label>
                    <Slider 
                      value={[fps]} 
                      onValueChange={(value) => setFps(value[0])}
                      max={60} 
                      min={12}
                      step={6} 
                      className="w-full" 
                    />
                    <p className="text-xs text-muted-foreground">{fps} FPS</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Loop Video</Label>
                    <Switch checked={loopVideo} onCheckedChange={setLoopVideo} />
                  </div>

                  <Button onClick={handleVideoGeneration} disabled={isProcessing} className="w-full gap-2">
                    {isProcessing ? (
                      <>
                        <Clock className="size-4 animate-spin" />
                        Generating Video...
                      </>
                    ) : (
                      <>
                        <Video className="size-4" />
                        Generate Video
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
                      Video generation may take longer (~{Math.ceil(((100 - progress) / 25) * 3)}s remaining)
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
                    <Video className="size-5" />
                    Video Preview
                  </CardTitle>
                  {inputImage && prompt.trim() && (
                    <div className="flex gap-2">
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
                {inputImage && prompt.trim() ? (
                  <Tabs defaultValue="result" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="input">Input</TabsTrigger>
                      <TabsTrigger value="result">Video</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="input" className="mt-6">
                      <div className="space-y-4">
                        <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-lg overflow-hidden border border-border">
                          <Image
                            src={inputImage || "/placeholder.svg"}
                            alt="Input image"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium mb-2">Input Image</p>
                          <p className="text-xs text-muted-foreground">{prompt}</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="result" className="mt-6">
                      <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-lg overflow-hidden border border-border bg-muted/20">
                        {isProcessing ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <div className="size-12 border-2 border-chart-4 border-t-transparent rounded-full animate-spin mx-auto" />
                              <p className="text-sm text-muted-foreground">
                                Generating video...
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <Video className="size-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">
                                Generated video will appear here
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="mt-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium">Video Length</p>
                            <p className="text-2xl font-bold text-primary">{videoLength}s</p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium">Frame Rate</p>
                            <p className="text-2xl font-bold text-primary">{fps} FPS</p>
                          </div>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-sm font-medium">Loop Video</p>
                          <p className="text-sm text-muted-foreground">
                            {loopVideo ? "Enabled" : "Disabled"}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="flex gap-4 justify-center">
                        <div className="text-center">
                          <Zap className="size-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Enter Prompt</p>
                        </div>
                        <ArrowRight className="size-6 text-muted-foreground mt-1" />
                        <div className="text-center">
                          <Camera className="size-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Upload Image</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-lg font-medium">Enter prompt and upload image to start</p>
                        <p className="text-sm text-muted-foreground">
                          Describe the video you want to generate
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Video Gallery */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Video Gallery</h3>
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
                      <Video className="size-8 text-muted-foreground group-hover:text-chart-4 transition-colors" />
                    </div>
                    <h4 className="font-medium mb-1">Video {i}</h4>
                    <p className="text-xs text-muted-foreground mb-2">Model A • Blue Dress • 5s</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="size-8 p-0">
                        <Eye className="size-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="size-8 p-0">
                        <Download className="size-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="size-8 p-0">
                        <Play className="size-3" />
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
