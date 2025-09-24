"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Scissors, 
  Palette, 
  Shirt, 
  Sparkles, 
  Zap, 
  Download,
  ArrowRight,
  User,
  LogOut
} from "lucide-react"

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null // or show loading state
  }

  const features = [
    {
      title: "Pattern Extraction",
      description: "Extract intricate patterns from clothing images with AI precision.",
      icon: <Scissors className="size-6" />,
      path: "/extract",
      color: "bg-blue-500/10 text-blue-600"
    },
    {
      title: "Pattern Application", 
      description: "Apply extracted patterns to new garments seamlessly.",
      icon: <Palette className="size-6" />,
      path: "/apply",
      color: "bg-purple-500/10 text-purple-600"
    },
    {
      title: "Virtual Try-On",
      description: "See how garments look on models with realistic AI fitting.",
      icon: <Shirt className="size-6" />,
      path: "/try-on",
      color: "bg-green-500/10 text-green-600"
    },
    {
      title: "Material & Style",
      description: "Transform fabric textures and styles while maintaining structure.",
      icon: <Sparkles className="size-6" />,
      path: "/material",
      color: "bg-orange-500/10 text-orange-600"
    },
    {
      title: "Smart Editing",
      description: "Edit clothing designs with brush tools and text prompts.",
      icon: <Zap className="size-6" />,
      path: "/edit",
      color: "bg-yellow-500/10 text-yellow-600"
    },
    {
      title: "Export Results",
      description: "Get high-quality fashion designs in seconds.",
      icon: <Download className="size-6" />,
      path: "/results",
      color: "bg-red-500/10 text-red-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground">
              <Scissors className="size-4" />
            </div>
            <span>FashionAI Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              Welcome, {user?.username}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="rounded-full"
            >
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-muted-foreground">
            Start using AI-powered fashion design tools to create amazing works.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tenant ID</p>
                  <p className="text-2xl font-bold">{user?.tenant_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Sparkles className="size-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">AI Tools</p>
                  <p className="text-2xl font-bold">6</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Download className="size-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing Speed</p>
                  <p className="text-2xl font-bold">2.3s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Tools Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">AI Design Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-full flex items-center justify-center ${feature.color}`}>
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <Button 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    variant="outline"
                    onClick={() => router.push(feature.path)}
                  >
                    Get Started
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Sparkles className="size-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Welcome to FashionAI</p>
                  <p className="text-sm text-muted-foreground">Start your AI design journey</p>
                </div>
                <Badge variant="secondary">New User</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}