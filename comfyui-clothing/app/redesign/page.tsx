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
import { redesignApiClient, type RedesignResponse, type TaskStatusResponse, type TaskHistoryItem } from "@/lib/redesign-api-client"
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
  const [resultImages, setResultImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [hasDrawings, setHasDrawings] = useState(false)
  const [activeTab, setActiveTab] = useState("original")
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showBrushPreview, setShowBrushPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 绘画功能
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [brushSize, setBrushSize] = useState(10)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  // Load task history on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadTaskHistory()
    }
  }, [isAuthenticated])


  // 全局滚轮事件处理，阻止在画板区域内的页面滚动
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // 检查鼠标是否在画板区域内
      const canvasContainer = document.querySelector('[data-canvas-container]')
      if (canvasContainer && canvasContainer.contains(e.target as Node)) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }
    }

    // 使用 passive: false 确保可以调用 preventDefault
    window.addEventListener('wheel', handleGlobalWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleGlobalWheel)
  }, [])

  const loadTaskHistory = async (page: number = 1, append: boolean = false) => {
    setIsLoadingHistory(true)
    try {
      const history = await redesignApiClient.getTaskHistory(page)
      if (append) {
        setTaskHistory(prev => [...prev, ...history])
      } else {
        setTaskHistory(history)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to load task history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setUploadedImage(result)
        setActiveTab("original")
        setResultImage(null)
        setResultImages([])
        setError(null)
        setTaskId(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // 合并原图和画板内容
  const mergeCanvasWithImage = async (): Promise<File> => {
    const canvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    
    if (!canvas || !overlayCanvas || !uploadedFile) {
      throw new Error("Canvas or image not available")
    }

    // 创建一个新的canvas来合并内容
    const mergedCanvas = document.createElement('canvas')
    const mergedCtx = mergedCanvas.getContext('2d')
    if (!mergedCtx) throw new Error("Failed to get canvas context")

    // 设置合并canvas的尺寸
    mergedCanvas.width = canvas.width
    mergedCanvas.height = canvas.height

    // 先绘制原图
    mergedCtx.drawImage(canvas, 0, 0)
    
    // 再绘制画板内容
    mergedCtx.drawImage(overlayCanvas, 0, 0)

    // 将合并后的canvas转换为Blob
    return new Promise((resolve, reject) => {
      mergedCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob from canvas"))
          return
        }
        
        // 创建File对象，保持原始文件名和类型
        const mergedFile = new File([blob], uploadedFile.name, {
          type: uploadedFile.type,
          lastModified: Date.now()
        })
        resolve(mergedFile)
      }, uploadedFile.type, 0.9) // 使用0.9质量以保持文件大小合理
    })
  }

  const handleProcess = async () => {
    if (!uploadedFile || !prompt.trim()) return

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setResultImage(null)
    setResultImages([])
    setProcessingStep("Merging image with drawings...")

    try {
      // 合并原图和画板内容
      const mergedImage = await mergeCanvasWithImage()
      setProgress(10)
      setProcessingStep("Uploading merged image...")

      // Upload merged image
      const uploadResponse = await redesignApiClient.uploadImage(mergedImage)
      setProgress(25)
      setProcessingStep("Processing image...")

      // Submit redesign request
      const completeResponse = await redesignApiClient.submitRedesign({
        prompt: prompt,
        image: mergedImage
      })
      setProgress(50)
      setProcessingStep("Waiting for completion...")

      // Poll for completion
      const finalStatus = await pollTaskStatus(completeResponse.taskId)
      setProgress(100)
      setProcessingStep("")

      if (finalStatus.status === 'SUCCESS') {
        // 获取任务结果
        const taskResult = await redesignApiClient.completeTask(completeResponse.taskId)
        if (taskResult.outputs && taskResult.outputs.length > 0) {
          setResultImage(taskResult.outputs[0])
          setResultImages(taskResult.outputs)
          setActiveTab("modified")
          setTaskId(finalStatus.taskId)
          } else {
          throw new Error("No output images received")
          }
      } else {
        throw new Error("Task failed")
      }
    } catch (error) {
      console.error('Redesign error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during redesign')
      setProcessingStep("")
    } finally {
      setIsProcessing(false)
    }
  }

  const pollTaskStatus = async (taskId: string): Promise<TaskStatusResponse> => {
    const maxAttempts = 60
    const delay = 2000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await redesignApiClient.getTaskStatus(taskId)
        if (status.status === 'SUCCESS' || status.status === 'FAILED') {
          return status
        }
        await new Promise(resolve => setTimeout(resolve, delay))
    } catch (error) {
        console.error('Error polling task status:', error)
        throw error
    }
    }
    throw new Error('Task processing timeout')
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

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在Original标签页且没有在输入框中时处理快捷键
      if (activeTab !== "original" || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, historyIndex, history.length, undo, redo])

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
    
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return
    
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return
    
    const pos = getMousePos(e)
    
    // 先设置画笔样式，再开始绘制路径
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
    
    // 设置完样式后再开始绘制路径
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
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
    
    // 标记有绘制内容
    setHasDrawings(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    // 绘制完成后保存历史状态
    saveToHistory()
  }

  // 处理鼠标移动，更新画笔预览位置
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePosition({ x, y })
  }

  // 处理鼠标滚轮，调整画笔大小
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    
    if (e.deltaY < 0) {
      // 向上滚动，增大画笔
      setBrushSize(prev => Math.min(50, prev + 2))
    } else {
      // 向下滚动，减小画笔
      setBrushSize(prev => Math.max(1, prev - 2))
    }
    
    return false
  }

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

  // 当切换到Original标签页时，重新初始化Canvas
  useEffect(() => {
    if (activeTab === "original" && uploadedImage) {
      // 延迟执行以确保DOM完全渲染
      setTimeout(() => {
        // 重新触发Canvas初始化
        if (canvasRef.current && overlayCanvasRef.current) {
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
        
            // 恢复绘画内容（如果有）
            if (history.length > 0 && historyIndex >= 0) {
              overlayCtx.putImageData(history[historyIndex], 0, 0)
            }
            
            // 重新设置画笔默认样式
            overlayCtx.globalCompositeOperation = 'source-over'
            overlayCtx.strokeStyle = '#00ff00' // 纯绿色
            overlayCtx.lineWidth = brushSize
            overlayCtx.lineCap = 'round'
            overlayCtx.lineJoin = 'round'
            overlayCtx.shadowBlur = 0
            overlayCtx.shadowColor = 'transparent'
      }
      img.src = uploadedImage
    }
      }, 150) // 增加延迟时间确保标签页完全切换
    }
  }, [activeTab, uploadedImage, history, historyIndex])

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
        
        // 设置画笔默认样式
        overlayCtx.globalCompositeOperation = 'source-over'
        overlayCtx.strokeStyle = '#00ff00' // 纯绿色
        overlayCtx.lineWidth = brushSize
        overlayCtx.lineCap = 'round'
        overlayCtx.lineJoin = 'round'
        overlayCtx.shadowBlur = 0
        overlayCtx.shadowColor = 'transparent'
        
        // 保存初始状态到历史（只保存覆盖层）
        const imageData = overlayCtx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height)
        setHistory([imageData])
        setHistoryIndex(0)
      }
      img.src = uploadedImage
    }
  }, [uploadedImage])

  const handleImageClick = (task: TaskHistoryItem) => {
    if (task.image_urls && task.image_urls.length > 0) {
      setSelectedImages(task.image_urls)
      setSelectedImage(task.image_urls[0])
      setIsImageModalOpen(true)
    }
  }

  const closeImageModal = () => {
    setIsImageModalOpen(false)
    setSelectedImage(null)
    setSelectedImages([])
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
        <div className="space-y-6">
          {/* Top Panel - Preview */}
          <div className="w-full">
            <Card className="border-border/50 h-[600px] mx-4">
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
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: '#00ff00' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
                  <TabsList className="grid w-full grid-cols-2 px-4 max-w-4xl mx-auto">
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="modified">Modified</TabsTrigger>
                    </TabsList>
                  <TabsContent value="original" className="mt-6 h-[400px] p-4">
                    <div 
                      data-canvas-container
                      className="relative w-full h-full max-w-full mx-auto rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center"
                      onWheel={handleWheel}
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setShowBrushPreview(true)}
                      onMouseLeave={() => setShowBrushPreview(false)}
                    >
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
                      {/* 画笔预览圆圈 */}
                      {showBrushPreview && uploadedImage && (
                        <div
                          className="absolute pointer-events-none border-2 border-primary/50 rounded-full"
                          style={{
                            left: mousePosition.x - brushSize / 2,
                            top: mousePosition.y - brushSize / 2,
                            width: brushSize,
                            height: brushSize,
                            opacity: 0.7
                          }}
                        />
                      )}
                        {!uploadedImage && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-muted/20 transition-colors rounded-lg"
                          onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="text-center space-y-2">
                              <ImageIcon className="size-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Upload an image to start painting</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  <TabsContent value="modified" className="mt-6 h-[400px] p-4">
                    <div className="relative w-full h-full max-w-full mx-auto rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
                        {isProcessing ? (
                          <div className="text-center space-y-4">
                            <div className="size-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm text-muted-foreground">Generating modified version...</p>
                          </div>
                        ) : resultImage ? (
                        <div className="w-full h-full relative">
                          {/* 主图片显示 */}
                          <div className="w-full h-full cursor-pointer" onClick={() => {
                            if (resultImages.length > 0) {
                              setSelectedImages(resultImages)
                              setSelectedImage(resultImage)
                              setIsImageModalOpen(true)
                            }
                          }}>
                            <img 
                              src={resultImage} 
                              alt="Modified garment"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          {/* 多图片导航 */}
                          {resultImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                              {resultImages.map((img, index) => (
                                <button
                                  key={index}
                                  onClick={() => setResultImage(img)}
                                  className={`w-8 h-8 rounded border-2 overflow-hidden ${
                                    img === resultImage ? 'border-primary' : 'border-border'
                                  }`}
                                >
                                  <img
                                    src={img}
                                    alt={`Result ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                          </div>
                        ) : (
                          <div className="text-center space-y-2">
                          <Wand2 className="size-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">No modified version yet</p>
                          <p className="text-xs text-muted-foreground">Upload an image and enter a prompt to get started</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Panel - Integrated Chat Input */}
          <div className="w-full mx-4">
            <div className="space-y-4">
              {/* 集成的聊天输入框 */}
              <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/30 max-w-4xl mx-auto">
                {/* 上传图标/状态 */}
                <div className="flex-shrink-0">
                  {uploadedImage ? (
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer"
                         onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="size-5 text-primary" />
                    </div>
                  ) : (
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center cursor-pointer"
                         onClick={() => fileInputRef.current?.click()}>
                      <Upload className="size-5 text-muted-foreground" />
                      </div>
                  )}
                    </div>
                
                {/* 输入框 */}
                <div className="flex-1">
               <Textarea
                 id="prompt"
                 placeholder="Describe your redesign vision... (e.g., Change the color to navy blue, add a floral pattern, make it more elegant)"
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="min-h-[60px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
               />
                  </div>
                
                {/* 发送按钮 */}
                <Button 
                  onClick={handleProcess} 
                  disabled={!prompt.trim() || isProcessing || !uploadedImage}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {isProcessing ? (
                    <Clock className="size-4 animate-spin" />
                  ) : (
                    <Wand2 className="size-4" />
                  )}
                </Button>
                
                {/* 隐藏的文件输入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              
              {/* 绘制内容提示 */}
              {hasDrawings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <Paintbrush className="size-4 text-blue-600" />
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Your drawings will be included in the processing
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <Card className="border-primary/50 bg-primary/5 mx-4">
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
            <Card className="border-destructive/50 bg-destructive/5 mx-4">
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
            <Card className="border-green-500/50 bg-green-500/5 mx-4">
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

        {/* Task History */}
          <div className="mt-8 mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task History</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadTaskHistory(1, false)}
              disabled={isLoadingHistory}
              className="gap-2"
            >
              {isLoadingHistory ? (
                <Clock className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
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
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {taskHistory.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-border/50 hover:border-primary/50 transition-colors group cursor-pointer">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {/* 状态和日期 */}
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant={task.status === 'SUCCESS' ? 'default' : 'secondary'}
                              className="text-xs px-1.5 py-0.5"
                            >
                              {task.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.created_at).toLocaleDateString('zh-CN', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          
                          {/* 任务类型 */}
                          <div className="text-xs font-medium text-center truncate">
                            {task.task_type === 'targeted_redesign' ? 'Redesign' : task.task_type}
                          </div>
                          
                          {/* 图片预览 */}
                          {task.image_urls && task.image_urls.length > 0 ? (
                              <div className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                                   onClick={() => handleImageClick(task)}>
                              <img
                                src={task.image_urls[0]}
                                alt={`Result`}
                                className="w-full h-full object-cover"
                              />
                              {task.image_urls.length > 1 && (
                                <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                                  +{task.image_urls.length - 1}
                                </div>
                              )}
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
              
                {/* Load More Button */}
              {hasMoreHistory && (
                <div className="flex justify-center mt-6">
                  <Button 
                    variant="outline" 
                      onClick={() => loadTaskHistory(currentPage + 1, true)}
                    disabled={isLoadingHistory}
                    className="gap-2"
                  >
                    {isLoadingHistory ? (
                      <Clock className="size-4 animate-spin" />
                    ) : (
                      <Wand2 className="size-4" />
                    )}
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center">
                <ImageIcon className="size-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium mb-2">No tasks yet</h4>
                <p className="text-sm text-muted-foreground">
                  Complete your first redesign to see it here
                </p>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && selectedImage && selectedImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full">
            {/* 主图片显示 */}
            <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Enlarged view"
                className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
              
              {/* 关闭按钮 */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 bg-black/50 text-white border-white/20 hover:bg-black/70"
              onClick={closeImageModal}
            >
              ✕
            </Button>
              
              {/* 图片计数器 */}
              {selectedImages.length > 1 && (
                <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded">
                  {selectedImages.findIndex(img => img === selectedImage) + 1} / {selectedImages.length}
          </div>
              )}
        </div>
            
            {/* 多图片时的导航按钮 */}
            {selectedImages.length > 1 && (
              <>
                {/* 上一张按钮 */}
                {selectedImages.findIndex(img => img === selectedImage) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white border-white/20 hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = selectedImages.findIndex(img => img === selectedImage)
                      setSelectedImage(selectedImages[currentIndex - 1])
                    }}
                  >
                    ‹
                  </Button>
                )}
                
                {/* 下一张按钮 */}
                {selectedImages.findIndex(img => img === selectedImage) < selectedImages.length - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white border-white/20 hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = selectedImages.findIndex(img => img === selectedImage)
                      setSelectedImage(selectedImages[currentIndex + 1])
                    }}
                  >
                    ›
                  </Button>
                )}
                
                {/* 缩略图导航（如果图片较多） */}
                {selectedImages.length <= 4 && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {selectedImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImage(img)
                        }}
                        className={`w-8 h-8 rounded border-2 overflow-hidden ${
                          img === selectedImage ? 'border-white' : 'border-white/50'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}