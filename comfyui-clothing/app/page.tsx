"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Check,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  ArrowRight,
  Star,
  Zap,
  Scissors,
  Palette,
  Shirt,
  Sparkles,
  Download,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { LoginModal } from "@/components/login-modal"
import { RegisterModal } from "@/components/register-modal"
import { useAuth } from "@/contexts/auth-context"

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDemo, setActiveDemo] = useState("extract")
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowLoginModal(true)
  }

  const handleStartCreating = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isAuthenticated) {
      // 已登录用户直接跳转到dashboard
      router.push("/dashboard")
    } else {
      // 未登录用户显示登录弹窗
      setShowLoginModal(true)
    }
  }

  const handleSwitchToRegister = () => {
    setShowLoginModal(false)
    setShowRegisterModal(true)
  }

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false)
    setShowLoginModal(true)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const features = [
    {
      title: "Pattern Extraction",
      description: "Extract intricate patterns from clothing images with AI precision for reuse and modification.",
      icon: <Scissors className="size-5" />,
      path: "/extract",
    },
    {
      title: "Pattern Application",
      description: "Apply extracted patterns to new garments seamlessly with intelligent placement algorithms.",
      icon: <Palette className="size-5" />,
      path: "/apply",
    },
    {
      title: "Virtual Try-On",
      description: "See how garments look on models with realistic AI-powered virtual fitting technology.",
      icon: <Shirt className="size-5" />,
      path: "/try-on",
    },
    {
      title: "Material & Style",
      description: "Transform fabric textures and styles while maintaining garment structure and fit.",
      icon: <Sparkles className="size-5" />,
      path: "/material",
    },
    {
      title: "Smart Editing",
      description: "Edit clothing designs with brush tools and text prompts for precise modifications.",
      icon: <Zap className="size-5" />,
      path: "/edit",
    },
    {
      title: "Instant Results",
      description: "Get high-quality fashion designs in seconds with our optimized AI processing pipeline.",
      icon: <Download className="size-5" />,
      path: "/results",
    },
  ]

  const demoFeatures = [
    {
      id: "extract",
      title: "Pattern Extraction",
      description: "Upload a clothing image and watch AI extract patterns instantly",
      icon: <Scissors className="size-5" />,
      beforeImage: "/placeholder.svg?height=300&width=300",
      afterImage: "/placeholder.svg?height=300&width=300",
    },
    {
      id: "apply",
      title: "Pattern Application",
      description: "Apply extracted patterns to new garments with perfect placement",
      icon: <Palette className="size-5" />,
      beforeImage: "/placeholder.svg?height=300&width=300",
      afterImage: "/placeholder.svg?height=300&width=300",
    },
    {
      id: "tryOn",
      title: "Virtual Try-On",
      description: "See how garments look on different models realistically",
      icon: <Shirt className="size-5" />,
      beforeImage: "/placeholder.svg?height=300&width=300",
      afterImage: "/placeholder.svg?height=300&width=300",
    },
    {
      id: "material",
      title: "Material Transform",
      description: "Change fabric textures while maintaining garment structure",
      icon: <Sparkles className="size-5" />,
      beforeImage: "/placeholder.svg?height=300&width=300",
      afterImage: "/placeholder.svg?height=300&width=300",
    },
  ]

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center">
      <header
        className={`sticky top-0 z-50 w-full backdrop-blur-lg transition-all duration-300 ${isScrolled ? "bg-background/80 shadow-sm" : "bg-transparent"}`}
      >
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground">
              <Scissors className="size-4" />
            </div>
            <span>FashionAI</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#demo"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Demo
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
          </nav>
          <div className="hidden md:flex gap-4 items-center">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {mounted && theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            {isAuthenticated ? (
              // 已登录用户显示用户信息和退出按钮
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  Welcome, {user?.username}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout}
                  className="rounded-full"
                >
                  Logout
                </Button>
              </div>
            ) : (
              // 未登录用户显示登录按钮
              <>
                <button
                  onClick={handleLoginClick}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log in
                </button>
                <Button onClick={handleLoginClick} className="rounded-full">
                  Try Free Demo
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {mounted && theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-16 inset-x-0 bg-background/95 backdrop-blur-lg border-b"
          >
            <div className="container max-w-7xl mx-auto py-4 flex flex-col gap-4">
              <Link href="#features" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
              <Link href="#demo" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Demo
              </Link>
              <Link href="#pricing" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="#faq" className="py-2 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </Link>
              <div className="flex flex-col gap-2 pt-2 border-t">
                {isAuthenticated ? (
                  // 已登录用户显示用户信息和退出按钮
                  <>
                    <div className="py-2">
                      <span className="text-sm font-medium text-foreground">
                        Welcome, {user?.username}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="rounded-full" 
                      onClick={() => {
                        setMobileMenuOpen(false)
                        logout()
                      }}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  // 未登录用户显示登录按钮
                  <>
                    <button 
                      className="py-2 text-sm font-medium text-left" 
                      onClick={() => {
                        setMobileMenuOpen(false)
                        setShowLoginModal(true)
                      }}
                    >
                      Log in
                    </button>
                    <Button 
                      className="rounded-full" 
                      onClick={() => {
                        setMobileMenuOpen(false)
                        setShowLoginModal(true)
                      }}
                    >
                      Try Free Demo
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 overflow-hidden">
          <div className="container max-w-7xl mx-auto px-4 md:px-6 relative">
            <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-4xl mx-auto mb-12"
            >
              <Badge className="mb-4 rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                AI-Powered Fashion Design
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                Transform Fashion Design with AI
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance">
                Extract patterns, apply designs, try on garments, and edit fashion pieces with cutting-edge AI
                technology. Revolutionize your creative workflow in seconds, not hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="rounded-full h-12 px-8 text-base"
                  onClick={handleStartCreating}
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Creating Now"}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button size="lg" variant="outline" className="rounded-full h-12 px-8 text-base bg-transparent">
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>No signup required</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>Instant results</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>Professional quality</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative mx-auto max-w-5xl"
            >
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border/40 bg-gradient-to-b from-background to-muted/20">
                <Image
                  src="/placeholder.svg?height=720&width=1280"
                  width={1280}
                  height={720}
                  alt="FashionAI platform interface"
                  className="w-full h-auto"
                  priority
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
              </div>
              <div className="absolute -bottom-6 -right-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-3xl opacity-70"></div>
              <div className="absolute -top-6 -left-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 blur-3xl opacity-70"></div>
            </motion.div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="w-full py-12 border-y bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Trusted by leading fashion brands and designers
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
                {["Zara", "H&M", "Nike", "Adidas", "Gucci"].map((brand, i) => (
                  <div
                    key={i}
                    className="h-8 px-6 flex items-center justify-center text-muted-foreground/70 font-medium text-lg opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  >
                    {brand}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section id="demo" className="w-full py-20 md:py-32">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                Interactive Demo
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">See AI Fashion Design in Action</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg text-balance">
                Experience the power of our AI tools with interactive demos. Click on any feature below to see real-time
                transformations.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Demo Controls */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold mb-6">Choose a Demo</h3>
                {demoFeatures.map((demo) => (
                  <Card
                    key={demo.id}
                    className={`cursor-pointer transition-all duration-300 ${
                      activeDemo === demo.id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border/40 hover:border-border/60 hover:shadow-sm"
                    }`}
                    onClick={() => setActiveDemo(demo.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center ${
                            activeDemo === demo.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {demo.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{demo.title}</h4>
                          <p className="text-sm text-muted-foreground">{demo.description}</p>
                        </div>
                        {activeDemo === demo.id && <div className="size-2 rounded-full bg-primary animate-pulse"></div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="pt-6">
                  <Card className="border-dashed border-2 border-border/40 bg-muted/20">
                    <CardContent className="p-6 text-center">
                      <Upload className="size-8 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold mb-2">Try with Your Own Images</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload your fashion images to see AI transformations in real-time
                      </p>
                      <Button className="rounded-full">
                        Upload Image
                        <Upload className="ml-2 size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Demo Visualization */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="lg:sticky lg:top-24"
              >
                <Card className="overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-semibold">{demoFeatures.find((demo) => demo.id === activeDemo)?.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        Live Demo
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Before</p>
                        <div className="aspect-square rounded-lg overflow-hidden border border-border/40">
                          <Image
                            src={demoFeatures.find((demo) => demo.id === activeDemo)?.beforeImage || ""}
                            width={300}
                            height={300}
                            alt="Before transformation"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">After</p>
                        <div className="aspect-square rounded-lg overflow-hidden border border-border/40 relative">
                          <Image
                            src={demoFeatures.find((demo) => demo.id === activeDemo)?.afterImage || ""}
                            width={300}
                            height={300}
                            alt="After transformation"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary text-primary-foreground text-xs">AI Generated</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Processing Time</span>
                        <span className="font-medium">2.3 seconds</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Quality Score</span>
                        <span className="font-medium text-primary">98.5%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Resolution</span>
                        <span className="font-medium">2048x2048</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border/40 mt-6">
                      <Button className="w-full rounded-full">
                        Try This Feature
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-16 text-center"
            >
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">2.3s</div>
                  <p className="text-sm text-muted-foreground">Average Processing Time</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">98.5%</div>
                  <p className="text-sm text-muted-foreground">Quality Accuracy</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">4K</div>
                  <p className="text-sm text-muted-foreground">Output Resolution</p>
                </div>
              </div>
              <Button size="lg" className="rounded-full">
                Start Your Free Trial
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                AI Features
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">5 Powerful AI Tools for Fashion Design</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg text-balance">
                Transform your creative workflow with our comprehensive suite of AI-powered fashion design tools. From
                pattern extraction to virtual try-ons, everything you need in one platform.
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            >
              {/* Pattern Extraction */}
              <motion.div variants={item} className="lg:col-span-1">
                <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-lg group">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="size-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                      <Scissors className="size-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Pattern Extraction</h3>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      Extract intricate patterns and designs from clothing images with AI precision. Perfect for reusing
                      and modifying existing designs.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Transparent PNG output</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>High-resolution results</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Batch processing</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pattern Application */}
              <motion.div variants={item} className="lg:col-span-1">
                <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-lg group">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="size-12 rounded-full bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center text-secondary mb-4 group-hover:scale-110 transition-transform">
                      <Palette className="size-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Pattern Application</h3>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      Apply extracted patterns to new garments seamlessly with intelligent placement algorithms and
                      natural blending.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-secondary" />
                        <span>Smart pattern placement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-secondary" />
                        <span>Natural blending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-secondary" />
                        <span>Multiple pattern support</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Virtual Try-On - Featured */}
              <motion.div variants={item} className="lg:col-span-1 lg:row-span-2">
                <Card className="h-full overflow-hidden border-primary/40 bg-gradient-to-b from-primary/5 to-primary/10 backdrop-blur transition-all hover:shadow-xl group relative">
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="size-16 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                      <Shirt className="size-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Virtual Try-On</h3>
                    <p className="text-muted-foreground mb-6 flex-grow">
                      See how garments look on models with realistic AI-powered virtual fitting technology. Perfect for
                      e-commerce and design validation.
                    </p>
                    <div className="space-y-3 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Realistic fabric simulation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Multiple body types</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Pose-aware fitting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Lighting adaptation</span>
                      </div>
                    </div>
                    <Button className="w-full rounded-full">
                      Try Virtual Fitting
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Material & Style */}
              <motion.div variants={item} className="lg:col-span-1">
                <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-lg group">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="size-12 rounded-full bg-accent/10 dark:bg-accent/20 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
                      <Sparkles className="size-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Material & Style</h3>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      Transform fabric textures and styles while maintaining garment structure and fit. Change materials
                      instantly.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-accent" />
                        <span>Fabric texture library</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-accent" />
                        <span>Style transfer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-accent" />
                        <span>Structure preservation</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Smart Editing */}
              <motion.div variants={item} className="lg:col-span-1">
                <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-lg group">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="size-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="size-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Smart Editing</h3>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      Edit clothing designs with brush tools and text prompts for precise modifications. AI understands
                      your creative intent.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Brush-based editing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Text-to-edit prompts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3 text-primary" />
                        <span>Undo/redo support</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-16 text-center"
            >
              <h3 className="text-2xl font-bold mb-4">Complete Design Workflow</h3>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Use our tools individually or combine them for a complete fashion design workflow. From concept to final
                product.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <Badge variant="outline" className="px-3 py-1">
                  Extract → Apply
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  Design → Try-On
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  Edit → Transform
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  Style → Export
                </Badge>
              </div>
              <Button size="lg" className="rounded-full">
                Start Your Design Journey
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-20 md:py-32 bg-muted/30 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]"></div>

          <div className="container max-w-7xl mx-auto px-4 md:px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                How It Works
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple Process, Powerful Results</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Get started in minutes and see the difference our platform can make for your business.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0"></div>

              {[
                {
                  step: "01",
                  title: "Upload Your Images",
                  description:
                    "Simply drag and drop your fashion images or use our camera integration for instant capture.",
                },
                {
                  step: "02",
                  title: "Choose AI Tool",
                  description: "Select from our 5 powerful AI tools based on your creative needs and design goals.",
                },
                {
                  step: "03",
                  title: "Get Instant Results",
                  description:
                    "Watch AI transform your designs in seconds with professional-quality output ready to use.",
                },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative z-10 flex flex-col items-center text-center space-y-4"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-20 md:py-32">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                Testimonials
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Loved by Fashion Designers Worldwide</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                See how fashion professionals are transforming their creative process with our AI tools.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  quote:
                    "FashionAI has revolutionized our design process. What used to take hours now takes minutes, and the quality is incredible.",
                  author: "Sarah Chen",
                  role: "Creative Director, ModernWear",
                  rating: 5,
                },
                {
                  quote:
                    "The pattern extraction tool is a game-changer. I can now reuse and modify designs from my archive effortlessly.",
                  author: "Marcus Rodriguez",
                  role: "Fashion Designer, Independent",
                  rating: 5,
                },
                {
                  quote:
                    "Virtual try-on has transformed our e-commerce. Customers can see exactly how garments look before purchasing.",
                  author: "Emily Watson",
                  role: "E-commerce Manager, StyleHub",
                  rating: 5,
                },
                {
                  quote:
                    "The AI understands fashion better than any tool I've used. It preserves the artistic intent while enhancing creativity.",
                  author: "David Kim",
                  role: "Senior Designer, LuxeFashion",
                  rating: 5,
                },
                {
                  quote:
                    "Material transformation is incredible. I can experiment with different fabrics without physical samples.",
                  author: "Lisa Patel",
                  role: "Textile Designer, FabricLab",
                  rating: 5,
                },
                {
                  quote:
                    "The speed and quality of results have increased our productivity by 300%. It's like having a design team of AI assistants.",
                  author: "James Wilson",
                  role: "Design Director, TrendForward",
                  rating: 5,
                },
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-md">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex mb-4">
                        {Array(testimonial.rating)
                          .fill(0)
                          .map((_, j) => (
                            <Star key={j} className="size-4 text-yellow-500 fill-yellow-500" />
                          ))}
                      </div>
                      <p className="text-lg mb-6 flex-grow">{testimonial.quote}</p>
                      <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border/40">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-foreground font-medium">
                          {testimonial.author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{testimonial.author}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-20 md:py-32 bg-muted/30 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]"></div>

          <div className="container max-w-7xl mx-auto px-4 md:px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                Pricing
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Choose the plan that fits your creative needs. All plans include access to our AI tools.
              </p>
            </motion.div>

            <div className="mx-auto max-w-5xl">
              <Tabs defaultValue="monthly" className="w-full">
                <div className="flex justify-center mb-8">
                  <TabsList className="rounded-full p-1">
                    <TabsTrigger value="monthly" className="rounded-full px-6">
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value="annually" className="rounded-full px-6">
                      Annually (Save 20%)
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="monthly">
                  <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                    {[
                      {
                        name: "Creator",
                        price: "$19",
                        description: "Perfect for individual designers and freelancers.",
                        features: ["50 AI generations/month", "All 5 AI tools", "HD output quality", "Email support"],
                        cta: "Start Free Trial",
                      },
                      {
                        name: "Professional",
                        price: "$49",
                        description: "Ideal for design teams and small studios.",
                        features: [
                          "500 AI generations/month",
                          "All 5 AI tools",
                          "4K output quality",
                          "Priority support",
                          "Batch processing",
                        ],
                        cta: "Start Free Trial",
                        popular: true,
                      },
                      {
                        name: "Enterprise",
                        price: "$149",
                        description: "For large teams and fashion brands.",
                        features: [
                          "Unlimited generations",
                          "All 5 AI tools",
                          "8K output quality",
                          "24/7 phone support",
                          "Custom integrations",
                          "API access",
                        ],
                        cta: "Contact Sales",
                      },
                    ].map((plan, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                      >
                        <Card
                          className={`relative overflow-hidden h-full ${plan.popular ? "border-primary shadow-lg" : "border-border/40 shadow-md"} bg-gradient-to-b from-background to-muted/10 backdrop-blur`}
                        >
                          {plan.popular && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                              Most Popular
                            </div>
                          )}
                          <CardContent className="p-6 flex flex-col h-full">
                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                            <div className="flex items-baseline mt-4">
                              <span className="text-4xl font-bold">{plan.price}</span>
                              <span className="text-muted-foreground ml-1">/month</span>
                            </div>
                            <p className="text-muted-foreground mt-2">{plan.description}</p>
                            <ul className="space-y-3 my-6 flex-grow">
                              {plan.features.map((feature, j) => (
                                <li key={j} className="flex items-center">
                                  <Check className="mr-2 size-4 text-primary" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            <Button
                              className={`w-full mt-auto rounded-full ${plan.popular ? "bg-primary hover:bg-primary/90" : "bg-muted hover:bg-muted/80"}`}
                              variant={plan.popular ? "default" : "outline"}
                            >
                              {plan.cta}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="annually">
                  <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                    {[
                      {
                        name: "Creator",
                        price: "$15",
                        description: "Perfect for individual designers and freelancers.",
                        features: ["50 AI generations/month", "All 5 AI tools", "HD output quality", "Email support"],
                        cta: "Start Free Trial",
                      },
                      {
                        name: "Professional",
                        price: "$39",
                        description: "Ideal for design teams and small studios.",
                        features: [
                          "500 AI generations/month",
                          "All 5 AI tools",
                          "4K output quality",
                          "Priority support",
                          "Batch processing",
                        ],
                        cta: "Start Free Trial",
                        popular: true,
                      },
                      {
                        name: "Enterprise",
                        price: "$119",
                        description: "For large teams and fashion brands.",
                        features: [
                          "Unlimited generations",
                          "All 5 AI tools",
                          "8K output quality",
                          "24/7 phone support",
                          "Custom integrations",
                          "API access",
                        ],
                        cta: "Contact Sales",
                      },
                    ].map((plan, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                      >
                        <Card
                          className={`relative overflow-hidden h-full ${plan.popular ? "border-primary shadow-lg" : "border-border/40 shadow-md"} bg-gradient-to-b from-background to-muted/10 backdrop-blur`}
                        >
                          {plan.popular && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                              Most Popular
                            </div>
                          )}
                          <CardContent className="p-6 flex flex-col h-full">
                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                            <div className="flex items-baseline mt-4">
                              <span className="text-4xl font-bold">{plan.price}</span>
                              <span className="text-muted-foreground ml-1">/month</span>
                            </div>
                            <p className="text-muted-foreground mt-2">{plan.description}</p>
                            <ul className="space-y-3 my-6 flex-grow">
                              {plan.features.map((feature, j) => (
                                <li key={j} className="flex items-center">
                                  <Check className="mr-2 size-4 text-primary" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            <Button
                              className={`w-full mt-auto rounded-full ${plan.popular ? "bg-primary hover:bg-primary/90" : "bg-muted hover:bg-muted/80"}`}
                              variant={plan.popular ? "default" : "outline"}
                            >
                              {plan.cta}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-20 md:py-32">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                FAQ
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Find answers to common questions about our AI fashion design platform.
              </p>
            </motion.div>

            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                {[
                  {
                    question: "How accurate are the AI-generated results?",
                    answer:
                      "Our AI models achieve 98.5% accuracy in pattern extraction and design applications. We continuously train our models on high-quality fashion datasets to ensure professional-grade results.",
                  },
                  {
                    question: "What image formats do you support?",
                    answer:
                      "We support all major image formats including JPG, PNG, WEBP, and TIFF. For best results, we recommend high-resolution images (at least 1024x1024 pixels) with good lighting and clear details.",
                  },
                  {
                    question: "Can I use the generated designs commercially?",
                    answer:
                      "Yes, all designs generated through our platform are yours to use commercially. You retain full ownership and rights to your creations and can use them for any commercial purpose.",
                  },
                  {
                    question: "How long does AI processing take?",
                    answer:
                      "Most AI operations complete within 2-5 seconds. Complex transformations like virtual try-ons may take up to 10 seconds. Processing time depends on image resolution and complexity.",
                  },
                  {
                    question: "Do you offer API access for developers?",
                    answer:
                      "Yes, our Enterprise plan includes full API access with comprehensive documentation. You can integrate our AI tools directly into your applications and workflows.",
                  },
                  {
                    question: "Is there a free trial available?",
                    answer:
                      "Yes, we offer a 14-day free trial with access to all features. No credit card required to start. You can explore all our AI tools and see the quality of results before committing to a plan.",
                  },
                ].map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <AccordionItem value={`item-${i}`} className="border-b border-border/40 py-2">
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 md:py-32 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

          <div className="container max-w-7xl mx-auto px-4 md:px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-6 text-center"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                Ready to Transform Your Fashion Design Process?
              </h2>
              <p className="mx-auto max-w-[700px] text-primary-foreground/80 md:text-xl">
                Join thousands of fashion designers and brands who are already using AI to create stunning designs in
                seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="rounded-full h-12 px-8 text-base"
                  onClick={handleLoginClick}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full h-12 px-8 text-base bg-transparent border-white text-white hover:bg-white/10"
                >
                  Watch Demo
                </Button>
              </div>
              <p className="text-sm text-primary-foreground/80 mt-4">
                No credit card required. 14-day free trial. Cancel anytime.
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background/95 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto flex flex-col gap-8 px-4 py-10 md:px-6 lg:py-16">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold">
                <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground">
                  <Scissors className="size-4" />
                </div>
                <span>FashionAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Revolutionize fashion design with AI. Extract patterns, apply designs, and create stunning garments
                instantly.
              </p>
              <div className="flex gap-4">
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                  <span className="sr-only">Twitter</span>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect width="4" height="12" x="2" y="9"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  <span className="sr-only">LinkedIn</span>
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold">AI Tools</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Pattern Extraction
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Pattern Application
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Virtual Try-On
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Material Transform
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row justify-between items-center border-t border-border/40 pt-8">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} FashionAI. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  )
}
