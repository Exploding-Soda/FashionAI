"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
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
  ChevronLeft,
  ChevronRight,
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
  const MAX_HISTORY_ITEMS = 10
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  // 多张图片状态管理
  const [imageData, setImageData] = useState<Array<{
    id: string
    image: string
    file: File
    prompt: string
    hasDrawings: boolean
    history: ImageData[]
    historyIndex: number
  }>>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [maxImages] = useState(4) // 最多4张图片
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
  const [historyLimit, setHistoryLimit] = useState<number>(MAX_HISTORY_ITEMS)
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

  // 下载当前结果图片
  const downloadCurrentResult = async () => {
    if (!resultImage) return
    try {
      const link = document.createElement('a')
      link.href = resultImage
      const ts = new Date().toISOString().replace(/[:.]/g, "-")
      link.download = `redesign-${ts}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Download failed:', e)
    }
  }

  // 将当前结果作为新的原图并重置到单图编辑
  const useResultAsOriginal = async () => {
    if (!resultImage) return
    try {
      const res = await fetch(resultImage)
      const blob = await res.blob()
      const fileName = `redesign-base-${Date.now()}.png`
      const file = new File([blob], fileName, { type: blob.type || 'image/png' })
      const objectUrl = URL.createObjectURL(blob)

      const newData = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        image: objectUrl,
        file: file,
        prompt: "",
        hasDrawings: false,
        history: [],
        historyIndex: -1
      }

      setImageData([newData])
      setCurrentImageIndex(0)
      setUploadedImage(objectUrl)
      setUploadedFile(file)
      setPrompt("")
      setHasDrawings(false)
      setHistory([])
      setHistoryIndex(-1)

      // 清空结果并切回原图页签，方便继续添加/编辑
      setResultImage(null)
      setResultImages([])
      setSelectedImages([])
      setIsImageModalOpen(false)
      setActiveTab("original")
    } catch (e) {
      console.error('Use result as original failed:', e)
    }
  }

  // 全局快捷键：在 Modified 有结果时按 "d" 触发下载
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA'
      if (isTyping) return
      if (activeTab === 'modified' && resultImage) {
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault()
          downloadCurrentResult()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab, resultImage])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])


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

  const loadTaskHistory = useCallback(async (page: number = 1) => {
    if (historyLimit <= 0) return
    setIsLoadingHistory(true)
    try {
      const history = await redesignApiClient.getTaskHistory(page, 'targeted_redesign', historyLimit)
      setTaskHistory(history)
      setCurrentPage(page)
      setHasMoreHistory(history.length === historyLimit)
    } catch (error) {
      console.error('Failed to load task history:', error)
      setHasMoreHistory(false)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [historyLimit])

  useEffect(() => {
    const computeLimit = () => {
      if (typeof window === "undefined") return
      const width = window.innerWidth
      const cardWidth = 132 // approx card width plus gap
      const padding = 96
      const available = Math.max(0, width - padding)
      const limit = Math.min(
        MAX_HISTORY_ITEMS,
        Math.max(1, Math.floor((available + 12) / cardWidth))
      )
      setHistoryLimit(prev => (prev !== limit ? limit : prev))
    }

    computeLimit()
    window.addEventListener("resize", computeLimit)
    return () => window.removeEventListener("resize", computeLimit)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadTaskHistory(1)
    }
  }, [historyLimit, isAuthenticated, loadTaskHistory])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && imageData.length < maxImages) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        const newImageData = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          image: result,
          file: file,
          prompt: "",
          hasDrawings: false,
          history: [],
          historyIndex: -1
        }
        
        setImageData(prev => [...prev, newImageData])
        setCurrentImageIndex(imageData.length)
        setUploadedImage(result)
        setUploadedFile(file)
        setPrompt("") // 清空prompt输入框
        setActiveTab("original")
        setResultImage(null)
        setResultImages([])
        setError(null)
        setTaskId(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // 更新当前图片的prompt
  const updateCurrentImagePrompt = (prompt: string) => {
    setImageData(prev => prev.map((img, index) => 
      index === currentImageIndex ? { ...img, prompt } : img
    ))
  }

  // 更新当前图片的绘制状态
  const updateCurrentImageDrawings = (hasDrawings: boolean, history: ImageData[], historyIndex: number) => {
    setImageData(prev => prev.map((img, index) => 
      index === currentImageIndex ? { ...img, hasDrawings, history, historyIndex } : img
    ))
  }

  // 切换到指定图片
  const switchToImage = (index: number) => {
    if (index >= 0 && index < imageData.length) {
      // 先保存当前图片的状态
      if (currentImageIndex >= 0 && currentImageIndex < imageData.length) {
        updateCurrentImagePrompt(prompt)
        updateCurrentImageDrawings(hasDrawings, history, historyIndex)
      }
      
      setCurrentImageIndex(index)
      const imgData = imageData[index]
      setUploadedImage(imgData.image)
      setUploadedFile(imgData.file)
      setPrompt(imgData.prompt)
      setHasDrawings(imgData.hasDrawings)
      setHistory(imgData.history)
      setHistoryIndex(imgData.historyIndex)
      
      // 确保切换到original标签页
      setActiveTab("original")
    }
  }

  // 删除图片
  const removeImage = (index: number) => {
    if (imageData.length > 1) {
      const newImageData = imageData.filter((_, i) => i !== index)
      setImageData(newImageData)
      
      // 如果删除的是当前图片，切换到其他图片
      if (index === currentImageIndex) {
        const newIndex = Math.min(index, newImageData.length - 1)
        switchToImage(newIndex)
      } else if (index < currentImageIndex) {
        setCurrentImageIndex(currentImageIndex - 1)
      }
    }
  }

  // 生成最终的prompt
  const generateFinalPrompt = () => {
    const prompts = imageData
      .map((img, index) => {
        if (img.prompt.trim()) {
          // return `图${index + 1}：${img.prompt.trim()}`
          return `${img.prompt.trim()}`
        } else {
          // return `Ignore image ${index + 1}`
          return ""
        }
      })
      .filter((line) => line !== "")

    // while (prompts.length < 4) {
    //   prompts.push(`Ignore image ${prompts.length + 1}`)
    // }

    const referenceSection = prompts.length
      ? `${prompts.join("\n")}
`
      : ""

    return `${referenceSection}
`
  }

  // 合并原图和画板内容
  const mergeCanvasWithImage = async (targetFile?: File): Promise<File> => {
    const canvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    const fileToUse = targetFile || uploadedFile
    
    if (!canvas || !overlayCanvas || !fileToUse) {
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
        const mergedFile = new File([blob], fileToUse.name, {
          type: fileToUse.type,
          lastModified: Date.now()
        })
        resolve(mergedFile)
      }, fileToUse.type, 0.9) // 使用0.9质量以保持文件大小合理
    })
  }

  // 为特定图片合并canvas内容
  const mergeCanvasForImage = async (imgData: any): Promise<File> => {
    // 创建临时canvas来合并特定图片的内容
    const tempCanvas = document.createElement('canvas')
    const tempOverlayCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    const tempOverlayCtx = tempOverlayCanvas.getContext('2d')
    
    if (!tempCtx || !tempOverlayCtx) {
      throw new Error("Failed to create temporary canvas context")
    }

    // 加载图片
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imgData.image
    })

    // 设置canvas尺寸
    const displayWidth = 800 // 固定尺寸用于处理
    const displayHeight = 600
    tempCanvas.width = displayWidth
    tempCanvas.height = displayHeight
    tempOverlayCanvas.width = displayWidth
    tempOverlayCanvas.height = displayHeight

    // 绘制原图
    tempCtx.drawImage(img, 0, 0, displayWidth, displayHeight)
    
    // 绘制覆盖层（如果有绘制内容）
    if (imgData.history && imgData.history.length > 0 && imgData.historyIndex >= 0) {
      const historyData = imgData.history[imgData.historyIndex]
      tempOverlayCtx.putImageData(historyData, 0, 0)
    }

    // 合并两个canvas
    const mergedCanvas = document.createElement('canvas')
    const mergedCtx = mergedCanvas.getContext('2d')
    if (!mergedCtx) throw new Error("Failed to get merged canvas context")

    mergedCanvas.width = displayWidth
    mergedCanvas.height = displayHeight

    // 先绘制原图
    mergedCtx.drawImage(tempCanvas, 0, 0)
    // 再绘制覆盖层
    mergedCtx.drawImage(tempOverlayCanvas, 0, 0)

    // 转换为Blob
    return new Promise((resolve, reject) => {
      mergedCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob from canvas"))
          return
        }
        
        const mergedFile = new File([blob], imgData.file.name, {
          type: imgData.file.type,
          lastModified: Date.now()
        })
        resolve(mergedFile)
      }, imgData.file.type, 0.9)
    })
  }

  const handleProcess = async () => {
    if (imageData.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setResultImage(null)
    setResultImages([])
    setProcessingStep("Processing images...")

    try {
      // 生成最终prompt
      const finalPrompt = generateFinalPrompt()
      
      // 准备多张图片文件
      const imageFiles: File[] = []
      
      for (let i = 0; i < imageData.length; i++) {
        const imgData = imageData[i]
        
        setProgress((i + 1) * 20 / imageData.length)
        setProcessingStep(`Processing image ${i + 1}/${imageData.length}...`)
        
        // 为每张图片独立合并canvas内容
        const mergedImage = await mergeCanvasForImage(imgData)
        imageFiles.push(mergedImage)
      }
      
      setProgress(20)
      setProcessingStep("Uploading images...")

      // 上传所有图片
      const uploadPromises = imageFiles.map(file => redesignApiClient.uploadImage(file))
      const uploadResponses = await Promise.all(uploadPromises)
      
      setProgress(40)
      setProcessingStep("Submitting redesign request...")

      // 提交重新设计请求（使用多张图片）
      const completeResponse = await redesignApiClient.submitRedesign({
        prompt: finalPrompt,
        image: imageFiles[0], // 主图片
        image_2: imageFiles[1] || null,
        image_3: imageFiles[2] || null,
        image_4: imageFiles[3] || null
      })
      
      setProgress(60)
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
      
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      ctx.putImageData(history[newIndex], 0, 0)
      const hasDrawingsNow = newIndex > 0
      setHasDrawings(hasDrawingsNow)
      updateCurrentImageDrawings(hasDrawingsNow, history, newIndex)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const overlayCanvas = overlayCanvasRef.current
      if (!overlayCanvas) return
      
      const ctx = overlayCanvas.getContext('2d')
      if (!ctx) return
      
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      ctx.putImageData(history[newIndex], 0, 0)
      const hasDrawingsNow = newIndex > 0
      setHasDrawings(hasDrawingsNow)
      updateCurrentImageDrawings(hasDrawingsNow, history, newIndex)
    }
  }

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在Original标签页且没有在输入框中时处理快捷键
      if (activeTab !== "original" || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      // 工具切换快捷键
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setTool('eraser')
        return
      }
      
      if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'v') {
        e.preventDefault()
        setTool('brush')
        return
      }

      // Ctrl/Cmd + Z 撤销/重做
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
  }, [activeTab, historyIndex, history.length, undo, redo, tool])

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
    const result = saveToHistory()
    if (result) {
      const { history: updatedHistory, index: updatedIndex } = result
      const hasDrawingsNow = updatedIndex > 0
      setHasDrawings(hasDrawingsNow)
      // 更新当前图片的绘制状态
      updateCurrentImageDrawings(hasDrawingsNow, updatedHistory, updatedIndex)
    }
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

  const saveToHistory = (): { history: ImageData[]; index: number } | null => {
    const overlayCanvas = overlayCanvasRef.current
    if (!overlayCanvas) return null
    
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return null
    
    const imageData = ctx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    const newIndex = newHistory.length - 1
    setHistory(newHistory)
    setHistoryIndex(newIndex)
    return { history: newHistory, index: newIndex }
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
        const containerWidth = containerRect.width
        const containerHeight = containerRect.height
        
        // 计算图片适应画板区域的缩放比例，保持宽高比
        const imageAspectRatio = img.width / img.height
        const containerAspectRatio = containerWidth / containerHeight
        
        let displayWidth, displayHeight
        
        if (imageAspectRatio > containerAspectRatio) {
          // 图片更宽，以宽度为准
          displayWidth = containerWidth
          displayHeight = containerWidth / imageAspectRatio
        } else {
          // 图片更高，以高度为准
          displayHeight = containerHeight
          displayWidth = containerHeight * imageAspectRatio
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
        const containerWidth = containerRect.width
        const containerHeight = containerRect.height

        // 计算图片适应画板区域的缩放比例，保持宽高比
        const imageAspectRatio = img.width / img.height
        const containerAspectRatio = containerWidth / containerHeight

        let displayWidth, displayHeight

        if (imageAspectRatio > containerAspectRatio) {
          // 图片更宽，以宽度为准
          displayWidth = containerWidth
          displayHeight = containerWidth / imageAspectRatio
        } else {
          // 图片更高，以高度为准
          displayHeight = containerHeight
          displayWidth = containerHeight * imageAspectRatio
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

        const currentImageEntry = imageData[currentImageIndex]
        const storedHistory = currentImageEntry?.history ?? []
        const storedHistoryIndex = currentImageEntry?.historyIndex ?? -1
        const storedHasDrawings = currentImageEntry?.hasDrawings ?? false

        if (storedHistory.length > 0 && storedHistoryIndex >= 0) {
          try {
            overlayCtx.putImageData(storedHistory[storedHistoryIndex], 0, 0)
          } catch (error) {
            console.warn('Failed to restore drawing history:', error)
          }
          setHistory(storedHistory)
          setHistoryIndex(storedHistoryIndex)
          setHasDrawings(storedHasDrawings || storedHistoryIndex > 0)
        } else {
          const blankState = overlayCtx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height)
          setHistory([blankState])
          setHistoryIndex(0)
          setHasDrawings(false)
          if (currentImageEntry) {
            updateCurrentImageDrawings(false, [blankState], 0)
          }
        }

        // 设置画笔默认样式
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
  }, [uploadedImage, currentImageIndex])

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
            <Card className="border-border/50 h-[700px] mx-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="size-5" />
                    Preview
                    {imageData.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {currentImageIndex + 1}/{imageData.length}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                
                {/* 图片管理工具栏 */}
                {imageData.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {/* 图片切换标签 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {imageData.map((imgData, index) => (
                        <div
                          key={imgData.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            index === currentImageIndex
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 border-border hover:bg-muted'
                          }`}
                          onClick={() => switchToImage(index)}
                        >
                          <span className="text-sm font-medium">image {index + 1}</span>
                          {imageData.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground ml-auto"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeImage(index)
                              }}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      {/* Add Image按钮放在图片tab右侧 */}
                      {imageData.length < maxImages && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="size-4" />
                          Add Image
                        </Button>
                      )}
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
                  <TabsContent value="original" className="mt-6 h-[480px] p-4">
                    <div className="flex w-full h-full gap-4">
                      {/* 左侧画笔工具栏 */}
                      {uploadedImage && (
                        <div className="flex flex-col items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          {/* 工具选择 */}
                          <div className="flex flex-col gap-2">
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
                          
                          <div className="w-px h-4 bg-border" />
                          
                          {/* 撤销重做 */}
                          <div className="flex flex-col gap-2">
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
                          
                          <div className="w-px h-4 bg-border" />
                          
                          {/* 画笔大小调整 */}
                          <div className="flex flex-col items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBrushSize(Math.min(50, brushSize + 2))}
                              disabled={brushSize >= 50}
                            >
                              <Plus className="size-3" />
                            </Button>
                            <span className="text-sm font-medium min-w-[2rem] text-center">
                              {brushSize}px
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBrushSize(Math.max(1, brushSize - 2))}
                              disabled={brushSize <= 1}
                            >
                              <Minus className="size-3" />
                            </Button>
                          </div>
                          
                          <div className="w-px h-4 bg-border" />
                          
                          {/* 颜色指示器 */}
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
                      
                      {/* 画板区域 */}
                      <div 
                        data-canvas-container
                        className="relative flex-1 rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center"
                        onWheel={handleWheel}
                        onMouseMove={handleMouseMove}
                        onMouseEnter={() => setShowBrushPreview(true)}
                        onMouseLeave={() => setShowBrushPreview(false)}
                      >
                        {/* 移除当前图片按钮 */}
                        {imageData.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-4 right-4 z-10 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              if (imageData.length >= 2) {
                                // 如果图片数量大于等于2，直接删除当前tab
                                removeImage(currentImageIndex)
                              } else {
                                // 如果只有1张图片，清空所有状态回到初始状态
                                setImageData([])
                                setCurrentImageIndex(0)
                                setUploadedImage(null)
                                setUploadedFile(null)
                                setPrompt("")
                                setHasDrawings(false)
                                setHistory([])
                                setHistoryIndex(-1)
                                setResultImage(null)
                                setResultImages([])
                                setError(null)
                                setTaskId(null)
                                
                                // 清空canvas
                                if (canvasRef.current && overlayCanvasRef.current) {
                                  const canvas = canvasRef.current
                                  const overlayCanvas = overlayCanvasRef.current
                                  const ctx = canvas.getContext('2d')
                                  const overlayCtx = overlayCanvas.getContext('2d')
                                  
                                  if (ctx && overlayCtx) {
                                    ctx.clearRect(0, 0, canvas.width, canvas.height)
                                    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
                                  }
                                }
                              }
                            }}
                          >
                            ×
                          </Button>
                        )}
                      {/* 工具状态显示 */}
                      <div className="absolute top-4 left-4 z-10">
                        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${tool === 'brush' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm font-medium">
                              {tool === 'brush' ? 'Brush' : 'Eraser'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Size: {brushSize}px
                          </div>
                        </div>
                      </div>
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
                        {imageData.length === 0 && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-muted/20 transition-colors rounded-lg"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="text-center space-y-2">
                            <ImageIcon className="size-8 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">Upload an image to start creating</p>
                            <p className="text-xs text-muted-foreground">You can add up to {maxImages} images</p>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                    </TabsContent>
                  <TabsContent value="modified" className="mt-6 h-[480px] p-4">
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
                          
                          {/* 操作工具条：下载、用作原图 */}
                          <div className="absolute top-4 right-4 flex gap-2">
                            <Button size="sm" variant="outline" onClick={downloadCurrentResult} title="Download (D)">
                              Download
                            </Button>
                            {/* Gradient-stroked Refine button without solid fill */}
                            <button
                              type="button"
                              onClick={useResultAsOriginal}
                              title="Refine"
                              className="inline-flex items-center rounded-lg border border-transparent px-3 py-1.5 bg-transparent focus:outline-none"
                              style={{
                                // Gradient border only; interior stays fully transparent
                                borderImage: 'linear-gradient(90deg, #0ea5e9, #7dd3fc, #38bdf8) 1',
                                borderImageSlice: 1 as any,
                              }}
                            >
                              <span className="text-sky-500 text-sm font-medium">
                                Refine
                              </span>
                            </button>
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
                  {isProcessing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-4 animate-spin" />
                        <span>{processingStep}</span>
                      </div>
                      <Progress value={progress} className="w-full h-2" />
                      {taskId && (
                        <p className="text-xs text-muted-foreground">
                          Task ID: {taskId}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      id="prompt"
                      placeholder="What part of the image should we reference?"
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value)
                        updateCurrentImagePrompt(e.target.value)
                      }}
                      className="min-h-[60px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    />
                  )}
                </div>
                
                {/* 发送按钮 */}
                <Button 
                  onClick={handleProcess} 
                  disabled={imageData.length === 0 || isProcessing}
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


        {/* Task History */}
          <div className="mt-8 mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task History</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadTaskHistory(currentPage)}
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
              <div className="flex flex-nowrap justify-center gap-3">
                {taskHistory.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex-none"
                  >
                    <Card className="w-[120px] border-border/50 hover:border-primary/50 transition-colors group cursor-pointer">
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
                          <div className="text-[11px] font-medium text-center truncate">
                            {task.task_type === 'targeted_redesign' ? 'Redesign' : task.task_type}
                          </div>
                          
                          {/* 图片预览 */}
                          {task.image_urls && task.image_urls.length > 0 ? (
                              <div className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                                   onClick={() => handleImageClick(task)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={task.thumbnail_urls?.[0] ?? task.image_urls[0]}
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

              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTaskHistory(Math.max(1, currentPage - 1))}
                  disabled={isLoadingHistory || currentPage === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="size-4" />
                  Prev
                </Button>

                <span className="text-sm text-muted-foreground">Page {currentPage}</span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTaskHistory(currentPage + 1)}
                  disabled={isLoadingHistory || !hasMoreHistory}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
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
