"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Palette,
  Scissors,
  Shirt,
  Wand2,
  Activity,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CollapsibleHeader } from "@/components/collapsible-header"
import Link from "next/link"

export default function DashboardPage() {
  const [activeModule, setActiveModule] = useState("overview")

  const modules = [
    {
      id: "redesign",
      name: "Targeted Redesign",
      description: "AI-powered garment modification",
      icon: Wand2,
      color: "bg-primary",
      href: "/redesign",
      stats: { processed: 156, success: 94 },
    },
    {
      id: "extract",
      name: "Pattern Extraction",
      description: "Extract patterns from clothing",
      icon: Scissors,
      color: "bg-primary",
      href: "/extract",
      stats: { processed: 89, success: 97 },
    },
    {
      id: "apply",
      name: "Pattern Application",
      description: "Apply patterns to garments",
      icon: Palette,
      color: "bg-secondary",
      href: "/apply",
      stats: { processed: 203, success: 91 },
    },
    {
      id: "tryon",
      name: "Virtual Try-On",
      description: "AI virtual fitting technology",
      icon: Shirt,
      color: "bg-chart-4",
      href: "/try-on",
      stats: { processed: 342, success: 89 },
    },
    {
      id: "cad",
      name: "CAD Integration",
      description: "Generate technical drawings",
      icon: FileText,
      color: "bg-accent",
      href: "/cad",
      stats: { processed: 67, success: 96 },
    },
  ]

  const recentProjects = [
    {
      id: 1,
      name: "Summer Collection Redesign",
      module: "Targeted Redesign",
      status: "completed",
      time: "2 hours ago",
    },
    {
      id: 2,
      name: "Floral Pattern Extraction",
      module: "Pattern Extraction",
      status: "processing",
      time: "5 minutes ago",
    },
    { id: 3, name: "Dress Virtual Try-On", module: "Virtual Try-On", status: "completed", time: "1 hour ago" },
    { id: 4, name: "Technical Drawing Export", module: "CAD Integration", status: "completed", time: "3 hours ago" },
    { id: 5, name: "Pattern Application Test", module: "Pattern Application", status: "failed", time: "4 hours ago" },
  ]

  const quickStats = [
    { label: "Total Projects", value: "1,247", change: "+12%", icon: BarChart3 },
    { label: "Success Rate", value: "92.4%", change: "+2.1%", icon: TrendingUp },
    { label: "Active Users", value: "89", change: "+5", icon: Users },
    { label: "Processing Time", value: "2.3s", change: "-0.4s", icon: Zap },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <CollapsibleHeader
        title="AI Fashion Studio"
        description="Comprehensive fashion design platform"
        icon={<Activity className="size-4 text-primary-foreground" />}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Settings className="size-4" />
              Settings
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              New Project
            </Button>
          </>
        }
      />

      <div className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-primary">{stat.change}</p>
                    </div>
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <stat.icon className="size-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI Modules */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5" />
                  AI Fashion Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {modules.map((module, i) => (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link href={module.href}>
                        <Card className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group h-full">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div
                                className={`size-12 rounded-lg ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                              >
                                <module.icon className="size-6 text-white" />
                              </div>
                              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="font-semibold mb-2">{module.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{module.stats.processed} processed</span>
                              <span>{module.stats.success}% success</span>
                            </div>
                            <Progress value={module.stats.success} className="mt-2" />
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Recent Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentProjects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`size-2 rounded-full ${
                            project.status === "completed"
                              ? "bg-primary"
                              : project.status === "processing"
                                ? "bg-secondary animate-pulse"
                                : "bg-destructive"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{project.module}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            project.status === "completed"
                              ? "default"
                              : project.status === "processing"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {project.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{project.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Status */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Models</span>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-primary">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Processing Queue</span>
                  <span className="text-sm text-muted-foreground">3 jobs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Used</span>
                  <span className="text-sm text-muted-foreground">2.4 GB</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span>34%</span>
                  </div>
                  <Progress value={34} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>67%</span>
                  </div>
                  <Progress value={67} />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Wand2 className="size-4" />
                  Start Redesign
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Scissors className="size-4" />
                  Extract Pattern
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Shirt className="size-4" />
                  Virtual Try-On
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <FileText className="size-4" />
                  Generate CAD
                </Button>
              </CardContent>
            </Card>

            {/* Usage Analytics */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5" />
                  Usage This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modules.slice(0, 3).map((module, i) => (
                    <div key={module.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{module.name}</span>
                        <span>{Math.floor(Math.random() * 50) + 10} uses</span>
                      </div>
                      <Progress value={Math.floor(Math.random() * 80) + 20} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
