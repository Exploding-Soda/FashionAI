"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Upload,
  Download,
  Wand2,
  Zap,
  ImageIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  Palette,
  Scissors,
  Paintbrush,
  Eraser,
  Undo,
  Redo,
  Minus,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CollapsibleHeader } from "@/components/collapsible-header"
import { Label } from "@/components/ui/label"
import NextImage from "next/image"
import { redesignApiClient, type RedesignResponse, type TaskStatusResponse } from "@/lib/redesign-api-client"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function RedesignPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [prompt, setPrompt] = useState("")
  const [processingStep, setProcessingStep] = useState("")
  const [taskId, setTaskId] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])
  
  // 绘画相关状态
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(10)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        // 重置绘画历史
        setHistory([])
        setHistoryIndex(-1)
        // 清除之前的结果和错误
        setResultImage(null)
        setError(null)
        setTaskId(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // 绘画功能
  const saveToHistory = () => {
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return
    
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return
    
    const imageData = ctx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      const overlayCanvas = overlayCanvasRef.current
      if (!overlayCanvas) return
      
      const ctx = overlayCanvas.getContext('2d')
      if (!ctx) return
      
      setHistoryIndex(historyIndex - 1)
      ctx.putImageData(history[historyIndex - 1], 0, 0)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const overlayCanvas = overlayCanvasRef.current
      if (!overlayCanvas) return
      
      const ctx = overlayCanvas.getContext('2d')
      if (!ctx) return
      
      setHistoryIndex(historyIndex + 1)
      ctx.putImageData(history[historyIndex + 1], 0, 0)
    }
  }

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return { x: 0, y: 0 }
    
    const rect = overlayCanvas.getBoundingClientRect()
    let clientX, clientY
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    // 计算相对于Canvas的坐标
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    return { x, y }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    saveToHistory()
    
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return
    
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return
    
    const pos = getMousePos(e)
    
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    
    if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#00ff00' // 纯绿色
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowBlur = 0
      ctx.shadowColor = 'transparent'
    } else {
      // 橡皮擦：在覆盖层上擦除
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.shadowBlur = 0
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    e.preventDefault()
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return
    
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return
    
    const pos = getMousePos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // 初始化Canvas
  useEffect(() => {
    if (uploadedImage && canvasRef.current && overlayCanvasRef.current) {
      const canvas = canvasRef.current
      const overlayCanvas = overlayCanvasRef.current
      const ctx = canvas.getContext('2d')
      const overlayCtx = overlayCanvas.getContext('2d')
      if (!ctx || !overlayCtx) return
      
      const img = new Image()
      img.onload = () => {
        // 保存原始图片引用
        originalImageRef.current = img
        
        // 获取容器的实际尺寸
        const container = canvas.parentElement
        if (!container) return
        
        const containerRect = container.getBoundingClientRect()
        const maxSize = Math.min(containerRect.width, containerRect.height)
        
        // 计算图片的显示尺寸，保持宽高比
        const aspectRatio = img.width / img.height
        let displayWidth, displayHeight
        
        if (aspectRatio > 1) {
          displayWidth = maxSize
          displayHeight = maxSize / aspectRatio
        } else {
          displayHeight = maxSize
          displayWidth = maxSize * aspectRatio
        }
        
        // 设置两个Canvas的显示尺寸
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`
        overlayCanvas.style.width = `${displayWidth}px`
        overlayCanvas.style.height = `${displayHeight}px`
        
        // 设置Canvas的实际像素尺寸（用于绘制）
        const dpr = window.devicePixelRatio || 1
        canvas.width = displayWidth * dpr
        canvas.height = displayHeight * dpr
        overlayCanvas.width = displayWidth * dpr
        overlayCanvas.height = displayHeight * dpr
        
        // 缩放上下文以匹配设备像素比
        ctx.scale(dpr, dpr)
        overlayCtx.scale(dpr, dpr)
        
        // 只在底层Canvas绘制原始图片
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight)
        
        // 清空覆盖层Canvas
        overlayCtx.clearRect(0, 0, displayWidth, displayHeight)
        
        // 保存初始状态到历史（只保存覆盖层）
        const imageData = overlayCtx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height)
        setHistory([imageData])
        setHistoryIndex(0)
      }
      img.src = uploadedImage
    }
  }, [uploadedImage])

  const handleProcess = async () => {
    if (!uploadedFile || !prompt || !isAuthenticated) return

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setResultImage(null)

    try {
      setProcessingStep("Uploading image...")
      setProgress(10)

      // Submit redesign request
      const response = await redesignApiClient.submitRedesign({
        prompt,
        image: uploadedFile,
      })

      setTaskId(response.taskId)
      setProcessingStep("Processing redesign request...")
      setProgress(30)

      // Poll for completion
      const finalStatus = await redesignApiClient.pollTaskCompletion(
        response.taskId,
        (status: TaskStatusResponse) => {
          setProcessingStep(status.message || "Processing...")
          if (status.progress) {
            setProgress(30 + (status.progress * 0.6)) // 30-90% range
          }
        }
      )

      if (finalStatus.status === 'SUCCESS') {
        setProcessingStep("Getting results...")
        setProgress(90)

        // Get the outputs
        const outputs = await redesignApiClient.getTaskOutputs(response.taskId)
        if (outputs.outputs && outputs.outputs.length > 0) {
          setResultImage(outputs.outputs[0])
          setProgress(100)
          setProcessingStep("Redesign completed!")
        } else {
          throw new Error("No output images received")
        }
      } else {
        throw new Error(finalStatus.message || "Redesign failed")
      }
    } catch (error) {
      console.error('Redesign error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during redesign')
      setProcessingStep("")
    } finally {
      setIsProcessing(false)
    }
  }


  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CollapsibleHeader
        title="Targeted Redesign"
        description="AI-powered garment modification"
        icon={<Wand2 className="size-4 text-primary-foreground" />}
        badge={{
          icon: <Zap className="size-3" />,
          text: "F1 Module"
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
                  Upload Garment
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
                      <p className="text-sm font-medium">Image uploaded successfully</p>
                      <p className="text-xs text-muted-foreground">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="size-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">Drop your garment image here</p>
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

            {/* Prompt Input Section */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="size-5" />
                  Redesign Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-sm font-medium">
                    Describe your redesign vision
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g., Change the color to navy blue, add a floral pattern, make it more elegant..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Start Processing */}
            {uploadedImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <motion.div
                      whileHover={!isProcessing && prompt.trim() ? { scale: 1.02 } : {}}
                      whileTap={!isProcessing && prompt.trim() ? { scale: 0.98 } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      <Button 
                        onClick={handleProcess} 
                        disabled={!prompt.trim() || isProcessing} 
                        className="w-full gap-2 relative overflow-hidden"
                      >
                        {isProcessing ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center gap-2"
                          >
                            <Clock className="size-4 animate-spin" />
                            <span>Processing...</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center gap-2"
                          >
                            <Wand2 className="size-4" />
                            <span>Start Processing</span>
                          </motion.div>
                        )}
                        
                        {/* 处理中的背景动画 */}
                        {isProcessing && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity, 
                              ease: "linear" 
                            }}
                          />
                        )}
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: !prompt.trim() ? 1 : 0, 
                        height: !prompt.trim() ? "auto" : 0 
                      }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Please enter a prompt to enable processing
                      </p>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
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
                      {taskId && `Task ID: ${taskId}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-4" />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-sm text-destructive mt-2">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Success Display */}
            {resultImage && !isProcessing && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="size-4" />
                    <span className="text-sm font-medium">Redesign Completed!</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your redesigned garment is ready for download.
                  </p>
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
                    Preview
                  </CardTitle>
                  {uploadedImage && (
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-2">
                        <Download className="size-4" />
                        Export
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* 绘画工具栏 */}
                {uploadedImage && (
                  <div className="flex items-center gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={tool === 'brush' ? 'default' : 'outline'}
                        onClick={() => setTool('brush')}
                        className="gap-1"
                      >
                        <Paintbrush className="size-3" />
                        Brush
                      </Button>
                      <Button
                        size="sm"
                        variant={tool === 'eraser' ? 'default' : 'outline'}
                        onClick={() => setTool('eraser')}
                        className="gap-1"
                      >
                        <Eraser className="size-3" />
                        Eraser
                      </Button>
                    </div>
                    
                    <div className="w-px h-6 bg-border" />
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="gap-1"
                      >
                        <Undo className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className="gap-1"
                      >
                        <Redo className="size-3" />
                      </Button>
                    </div>
                    
                    <div className="w-px h-6 bg-border" />
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBrushSize(Math.max(1, brushSize - 2))}
                        disabled={brushSize <= 1}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="text-sm font-medium min-w-[2rem] text-center">
                        {brushSize}px
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBrushSize(Math.min(50, brushSize + 2))}
                        disabled={brushSize >= 50}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    
                    <div className="w-px h-6 bg-border" />
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: tool === 'brush' ? '#00ff00' : '#ef4444',
                            opacity: tool === 'eraser' ? 0.5 : 1
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {tool === 'brush' ? 'Green Brush' : 'Eraser'}
                      </span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {uploadedImage ? (
                  <Tabs defaultValue="original" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="modified">Modified</TabsTrigger>
                    </TabsList>
                    <TabsContent value="original" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
                        {/* 底层Canvas - 显示原始图片 */}
                        <canvas
                          ref={canvasRef}
                          className="absolute"
                        />
                        {/* 覆盖层Canvas - 用于绘画 */}
                        <canvas
                          ref={overlayCanvasRef}
                          className="absolute cursor-crosshair"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          style={{ 
                            cursor: tool === 'brush' ? 'crosshair' : 'grab',
                            touchAction: 'none',
                            userSelect: 'none'
                          }}
                        />
                        {!uploadedImage && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <ImageIcon className="size-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Upload an image to start painting</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="modified" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
                        {isProcessing ? (
                          <div className="text-center space-y-4">
                            <div className="size-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm text-muted-foreground">Generating modified version...</p>
                          </div>
                        ) : resultImage ? (
                          <div className="w-full h-full">
                            <img 
                              src={resultImage} 
                              alt="Redesigned garment" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : error ? (
                          <div className="text-center space-y-2">
                            <AlertCircle className="size-8 text-destructive mx-auto" />
                            <p className="text-sm text-destructive">Failed to generate result</p>
                          </div>
                        ) : (
                          <div className="text-center space-y-2">
                            <AlertCircle className="size-8 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">Modified version will appear here</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
                    <div className="text-center space-y-4">
                      <ImageIcon className="size-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">No image uploaded</p>
                        <p className="text-sm text-muted-foreground">Upload a garment image to start redesigning</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { title: "Change Color", desc: "Modify garment colors", icon: Palette },
              { title: "Adjust Style", desc: "Update design elements", icon: Wand2 },
              { title: "Add Pattern", desc: "Apply new patterns", icon: Scissors },
              { title: "Export Result", desc: "Download final design", icon: Download },
            ].map((action, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4 text-center">
                    <action.icon className="size-8 text-muted-foreground group-hover:text-primary transition-colors mx-auto mb-2" />
                    <h4 className="font-medium mb-1">{action.title}</h4>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
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
