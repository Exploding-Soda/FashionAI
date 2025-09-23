"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Upload,
  Download,
  Wand2,
  RotateCcw,
  Settings,
  Zap,
  ImageIcon,
  Palette,
  Scissors,
  CheckCircle,
  Clock,
  AlertCircle,
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
import Image from "next/image"

export default function RedesignPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [prompt, setPrompt] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState("")
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

  const handleProcess = async () => {
    if (!uploadedImage || !prompt) return

    setIsProcessing(true)
    setProgress(0)

    const steps = [
      "Analyzing garment structure...",
      "Processing modification request...",
      "Applying AI transformations...",
      "Generating final result...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i])
      setProgress((i + 1) * 25)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    setIsProcessing(false)
    setProcessingStep("")
  }

  const regions = [
    { id: "collar", name: "Collar", color: "bg-primary" },
    { id: "sleeves", name: "Sleeves", color: "bg-secondary" },
    { id: "body", name: "Body", color: "bg-accent" },
    { id: "pattern", name: "Pattern", color: "bg-chart-4" },
  ]

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

            {/* Region Selection */}
            {uploadedImage && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="size-5" />
                    Select Region
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {regions.map((region) => (
                      <Button
                        key={region.id}
                        variant={selectedRegion === region.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedRegion(region.id)}
                        className="justify-start gap-2"
                      >
                        <div className={`size-3 rounded-full ${region.color}`} />
                        {region.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Modification Prompt */}
            {uploadedImage && selectedRegion && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="size-5" />
                    Modification Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Describe the changes you want to make to the selected region..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modification Strength</label>
                    <Slider defaultValue={[75]} max={100} step={1} className="w-full" />
                  </div>
                  <Button onClick={handleProcess} disabled={!prompt || isProcessing} className="w-full gap-2">
                    {isProcessing ? (
                      <>
                        <Clock className="size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4" />
                        Apply Modifications
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
                      <Button variant="outline" size="sm">
                        <RotateCcw className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="size-4" />
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
                {uploadedImage ? (
                  <Tabs defaultValue="original" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="modified">Modified</TabsTrigger>
                    </TabsList>
                    <TabsContent value="original" className="mt-6">
                      <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-border">
                        <Image
                          src={uploadedImage || "/placeholder.svg"}
                          alt="Original garment"
                          fill
                          className="object-cover"
                        />
                        {selectedRegion && (
                          <div className="absolute inset-0 bg-primary/20 border-2 border-primary rounded-lg" />
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
