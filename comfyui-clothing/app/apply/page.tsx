"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Upload,
  Download,
  Palette,
  Zap,
  ImageIcon,
  Layers,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CollapsibleHeader } from "@/components/collapsible-header"
import Image from "next/image"
import { redesignApiClient, type TaskStatusResponse } from "@/lib/redesign-api-client"

const APPLICATION_PROMPT = "将图片2中的印花款式迁移到图片1的衣服上"

export default function ApplyPage() {
  const [modelImage, setModelImage] = useState<string | null>(null)
  const [patternImage, setPatternImage] = useState<string | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [patternFile, setPatternFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const [activeTab, setActiveTab] = useState("model")
  const [resultImages, setResultImages] = useState<string[]>([])
  const [taskId, setTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)
  const patternInputRef = useRef<HTMLInputElement>(null)

  const handleModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setModelFile(file)
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
      setPatternFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPatternImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const pollTaskStatus = async (id: string): Promise<TaskStatusResponse> => {
    const maxAttempts = 60
    const delay = 2000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await redesignApiClient.getTaskStatus(id)
      if (status.status === "SUCCESS" || status.status === "FAILED") {
        return status
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    throw new Error("Task processing timeout")
  }

  const handleApply = async () => {
    if (!modelFile || !patternFile) {
      setError("Please upload both model and pattern images before applying.")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setProcessingStep("Submitting application...")
    setError(null)
    setResultImages([])
    setTaskId(null)
    setActiveTab("result")

    try {
      const response = await redesignApiClient.submitRedesign({
        prompt: APPLICATION_PROMPT,
        image: modelFile,
        image_2: patternFile,
      })

      setTaskId(response.taskId)
      setProgress(30)
      setProcessingStep("Waiting for completion...")

      const finalStatus = await pollTaskStatus(response.taskId)
      if (finalStatus.status !== "SUCCESS") {
        throw new Error("Task failed to complete successfully.")
      }

      setProgress(80)
      setProcessingStep("Fetching results...")
      const outputs = await redesignApiClient.completeTask(response.taskId)
      if (!outputs.outputs || outputs.outputs.length === 0) {
        throw new Error("No output images received.")
      }

      setResultImages(outputs.outputs)
      setProgress(100)
      setProcessingStep("")
    } catch (err) {
      console.error("Application error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
      setProcessingStep("")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (resultImages.length === 0) return

    try {
      const link = document.createElement("a")
      link.href = resultImages[0]
      link.download = `application-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error("Download failed:", err)
    }
  }

  const openImageModal = (imageUrl: string | null) => {
    if (!imageUrl) return
    setModalImage(imageUrl)
    setIsModalOpen(true)
  }

  const closeImageModal = () => {
    setIsModalOpen(false)
    setModalImage(null)
  }

  return (
    <>
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

              </CardContent>
            </Card>

            {/* Application Action */}
            {modelImage && patternImage && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="size-5" />
                    Apply Pattern
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {error && <p className="text-sm text-destructive text-center">{error}</p>}
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
                        {taskId ? `Task ID: ${taskId}` : "Waiting for task assignment..."}
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
                  {modelImage && patternImage && resultImages.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                      <Download className="size-4" />
                      Download
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {modelImage && patternImage ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="model">Model</TabsTrigger>
                      <TabsTrigger value="pattern">Pattern</TabsTrigger>
                      <TabsTrigger value="result">Result</TabsTrigger>
                    </TabsList>

                    <TabsContent value="model" className="mt-6">
                      <div
                        className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border cursor-zoom-in"
                        onClick={() => openImageModal(modelImage)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openImageModal(modelImage)
                          }
                        }}
                      >
                        <Image src={modelImage || "/placeholder.svg"} alt="Model image" fill className="object-cover" />
                      </div>
                    </TabsContent>

                    <TabsContent value="pattern" className="mt-6">
                      <div
                        className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border cursor-zoom-in"
                        onClick={() => openImageModal(patternImage)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openImageModal(patternImage)
                          }
                        }}
                      >
                        <Image
                          src={patternImage || "/placeholder.svg"}
                          alt="Pattern image"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="result" className="mt-6">
                      {isProcessing ? (
                        <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <div className="size-12 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm text-muted-foreground">Generating result...</p>
                          </div>
                        </div>
                      ) : resultImages.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {resultImages.map((url, index) => (
                            <div
                              key={index}
                              className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/20 cursor-zoom-in"
                              onClick={() => openImageModal(url)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  openImageModal(url)
                                }
                              }}
                            >
                              <img src={url} alt={`Result ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <AlertCircle className="size-8 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">Final result will appear here</p>
                          </div>
                        </div>
                      )}
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

    {isModalOpen && modalImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={closeImageModal}
        role="presentation"
      >
        <div className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center">
          <img
            src={modalImage}
            alt="Enlarged view"
            className="h-auto w-auto max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 bg-black/50 text-white border-white/20 hover:bg-black/70"
            onClick={closeImageModal}
          >
            Close
          </Button>
        </div>
      </div>
    )}
    </>
  )
}
