"use client"

import React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Upload,
  Scissors,
  Settings,
  Zap,
  ImageIcon,
  Layers,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CollapsibleHeader } from "@/components/collapsible-header"
import Image from "next/image"
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
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("original")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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
      const resp = await extractApiClient.submitExtract(uploadedFile)
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

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      loadTaskHistory()
    }
  }, [isLoading, isAuthenticated])

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

            {/* Extracted Patterns List removed */}
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
                  {/* 去掉九宫格、刷新、导出按钮 */}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {uploadedImage ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                        {extractedImages.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {extractedImages.map((url, i) => (
                              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`extracted-${i}`} className="w-full h-full object-cover" />
                                <Badge className="absolute top-2 right-2 text-xs">extracted</Badge>
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
