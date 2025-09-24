"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Upload,
  Download,
  FileText,
  Settings,
  Zap,
  ImageIcon,
  Layers,
  Grid3X3,
  CheckCircle,
  Clock,
  Eye,
  Ruler,
  PenTool,
  Square,
  Circle,
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

export default function CADPage() {
  const [modelImage, setModelImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const [analysisMode, setAnalysisMode] = useState("structure")
  const [outputFormat, setOutputFormat] = useState("dwg")
  const [detailLevel, setDetailLevel] = useState([75])
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setModelImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyze = async () => {
    if (!modelImage) return

    setIsProcessing(true)
    setProgress(0)

    const steps = [
      "Analyzing garment structure...",
      "Extracting design elements...",
      "Generating technical drawings...",
      "Creating CAD specifications...",
      "Exporting CAD files...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i])
      setProgress(((i + 1) / steps.length) * 100)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    // Simulate generated CAD files
    setGeneratedFiles([
      { id: 1, name: "Technical_Drawing.dwg", type: "DWG", size: "2.4 MB", status: "ready" },
      { id: 2, name: "Pattern_Pieces.dxf", type: "DXF", size: "1.8 MB", status: "ready" },
      { id: 3, name: "Measurements.pdf", type: "PDF", size: "856 KB", status: "ready" },
      { id: 4, name: "3D_Model.step", type: "STEP", size: "3.2 MB", status: "ready" },
    ])

    setIsProcessing(false)
    setProcessingStep("")
  }

  const analysisModes = [
    { value: "structure", label: "Structure Analysis", desc: "Analyze garment construction and seams" },
    { value: "pattern", label: "Pattern Generation", desc: "Generate sewing patterns and pieces" },
    { value: "technical", label: "Technical Drawing", desc: "Create detailed technical specifications" },
    { value: "3d", label: "3D Modeling", desc: "Generate 3D CAD models" },
  ]

  const outputFormats = [
    { value: "dwg", label: "AutoCAD (DWG)", desc: "Industry standard CAD format" },
    { value: "dxf", label: "Drawing Exchange (DXF)", desc: "Universal CAD exchange format" },
    { value: "step", label: "STEP File", desc: "3D model exchange format" },
    { value: "pdf", label: "PDF Drawing", desc: "Portable document format" },
  ]

  const cadTools = [
    { name: "Measure", icon: Ruler, active: false },
    { name: "Draw", icon: PenTool, active: true },
    { name: "Rectangle", icon: Square, active: false },
    { name: "Circle", icon: Circle, active: false },
    { name: "Grid", icon: Grid3X3, active: false },
    { name: "Layers", icon: Layers, active: false },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CollapsibleHeader
        title="CAD Integration"
        description="AI-powered technical drawing generation"
        icon={<FileText className="size-4 text-accent-foreground" />}
        badge={{
          icon: <Zap className="size-3" />,
          text: "F5 Module"
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
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {modelImage ? (
                    <div className="space-y-2">
                      <CheckCircle className="size-8 text-accent mx-auto" />
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

            {/* Analysis Settings */}
            {modelImage && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="size-5" />
                    Analysis Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Analysis Mode</Label>
                    <Select value={analysisMode} onValueChange={setAnalysisMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {analysisModes.map((mode) => (
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
                    <Label className="text-sm font-medium">Output Format</Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {outputFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div>
                              <div className="font-medium">{format.label}</div>
                              <div className="text-xs text-muted-foreground">{format.desc}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Detail Level: {detailLevel[0]}%</Label>
                    <Slider
                      value={detailLevel}
                      onValueChange={setDetailLevel}
                      max={100}
                      min={25}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Include Measurements</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Generate Patterns</Label>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">3D Model Export</Label>
                    <Switch />
                  </div>

                  <Button onClick={handleAnalyze} disabled={isProcessing} className="w-full gap-2">
                    {isProcessing ? (
                      <>
                        <Clock className="size-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <FileText className="size-4" />
                        Generate CAD Files
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <Card className="border-accent/50 bg-accent/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-accent animate-pulse" />
                      <span className="text-sm font-medium">{processingStep}</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">CAD generation may take several minutes</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Files */}
            {generatedFiles.length > 0 && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-5" />
                    Generated Files
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {generatedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-lg border border-border hover:border-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.type} • {file.size}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="size-8 p-0">
                            <Eye className="size-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="size-8 p-0">
                            <Download className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full mt-4 gap-2 bg-transparent">
                    <Download className="size-4" />
                    Download All Files
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - CAD Workspace */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="size-5" />
                    CAD Workspace
                  </CardTitle>
                  {modelImage && (
                    <div className="flex gap-2">
                      {cadTools.map((tool, i) => (
                        <Button key={i} variant={tool.active ? "default" : "outline"} size="sm" className="size-8 p-0">
                          <tool.icon className="size-4" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {modelImage ? (
                  <Tabs defaultValue="analysis" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="analysis">Analysis</TabsTrigger>
                      <TabsTrigger value="technical">Technical</TabsTrigger>
                      <TabsTrigger value="pattern">Patterns</TabsTrigger>
                      <TabsTrigger value="3d">3D Model</TabsTrigger>
                    </TabsList>

                    <TabsContent value="analysis" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border">
                        <Image
                          src={modelImage || "/placeholder.svg"}
                          alt="Model analysis"
                          fill
                          className="object-cover"
                        />
                        {/* Analysis overlay */}
                        <div className="absolute inset-0 bg-accent/10">
                          <svg className="w-full h-full" viewBox="0 0 400 400">
                            <defs>
                              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path
                                  d="M 20 0 L 0 0 0 20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="0.5"
                                  opacity="0.3"
                                />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                            {/* Analysis lines */}
                            <line x1="100" y1="50" x2="300" y2="50" stroke="hsl(var(--accent))" strokeWidth="2" />
                            <line x1="100" y1="150" x2="300" y2="150" stroke="hsl(var(--accent))" strokeWidth="2" />
                            <line x1="100" y1="250" x2="300" y2="250" stroke="hsl(var(--accent))" strokeWidth="2" />
                            <line x1="100" y1="350" x2="300" y2="350" stroke="hsl(var(--accent))" strokeWidth="2" />
                          </svg>
                        </div>
                        <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                          Structure Analysis
                        </Badge>
                      </div>
                    </TabsContent>

                    <TabsContent value="technical" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-white">
                        {generatedFiles.length > 0 ? (
                          <div className="absolute inset-0 p-4">
                            <svg className="w-full h-full" viewBox="0 0 400 400">
                              {/* Technical drawing simulation */}
                              <rect x="50" y="50" width="300" height="200" fill="none" stroke="#000" strokeWidth="2" />
                              <rect x="50" y="250" width="150" height="100" fill="none" stroke="#000" strokeWidth="1" />
                              <rect
                                x="200"
                                y="250"
                                width="150"
                                height="100"
                                fill="none"
                                stroke="#000"
                                strokeWidth="1"
                              />
                              <line x1="50" y1="50" x2="350" y2="50" stroke="#000" strokeWidth="1" />
                              <text x="200" y="40" textAnchor="middle" fontSize="12" fill="#000">
                                Technical Drawing
                              </text>
                              <text x="125" y="310" textAnchor="middle" fontSize="10" fill="#000">
                                Front View
                              </text>
                              <text x="275" y="310" textAnchor="middle" fontSize="10" fill="#000">
                                Side View
                              </text>
                            </svg>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-2">
                              <FileText className="size-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Technical drawing will appear here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="pattern" className="mt-6">
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center"
                          >
                            <div className="text-center">
                              <Layers className="size-6 text-muted-foreground mx-auto mb-1" />
                              <p className="text-xs text-muted-foreground">Pattern Piece {i}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="3d" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Square className="size-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">3D model preview will appear here</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
                    <div className="text-center space-y-4">
                      <FileText className="size-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">No image uploaded</p>
                        <p className="text-sm text-muted-foreground">Upload a model image to generate CAD files</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CAD File Library */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">CAD File Library</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border/50 hover:border-accent/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-accent/10 to-primary/10 mb-3 flex items-center justify-center">
                      <FileText className="size-8 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                    <h4 className="font-medium mb-1">CAD File {i}</h4>
                    <p className="text-xs text-muted-foreground mb-2">Technical drawing • DWG</p>
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
