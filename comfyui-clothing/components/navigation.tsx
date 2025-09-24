"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home,
  Wand2,
  Scissors,
  Palette,
  Shirt,
  FileText,
  Settings,
  User,
  Menu,
  X,
  Activity,
  ChevronDown,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true)
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()

  // 检查是否在首页
  const isHomePage = pathname === "/" || pathname === ""

  useEffect(() => {
    if (pathname !== "/" && pathname !== "") {
      setIsDesktopCollapsed(false)
    }
  }, [pathname])

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Targeted Redesign",
      href: "/redesign",
      icon: Wand2,
      badge: "F1",
    },
    {
      name: "Pattern Extraction",
      href: "/extract",
      icon: Scissors,
      badge: "F2",
    },
    {
      name: "Pattern Application",
      href: "/apply",
      icon: Palette,
      badge: "F3",
    },
    {
      name: "Virtual Try-On",
      href: "/try-on",
      icon: Shirt,
      badge: "F4",
    },
    {
      name: "CAD Integration",
      href: "/cad",
      icon: FileText,
      badge: "F5",
    },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Desktop Navigation */}
      {!isHomePage && (
        <motion.nav
          initial={false}
          animate={{
            width: isDesktopCollapsed ? 80 : 256,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="hidden lg:flex fixed left-0 top-0 h-full bg-card border-r border-border flex-col z-40"
        >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <Activity className="size-4 text-white" />
            </div>
            {!isDesktopCollapsed && (
              <div>
                <h1 className="font-bold text-lg">FashionAI</h1>
                <p className="text-xs text-muted-foreground">Design Studio</p>
              </div>
            )}
          </Link>
        </div>

        <div className="px-4 py-2 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className="w-full justify-center"
          >
            {isDesktopCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-4 rounded-lg transition-colors group ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="size-5 flex-shrink-0" />
                {!isDesktopCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{item.name}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          {isDesktopCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-center p-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="size-4 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user?.username || "User"}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="size-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 p-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{user?.username || "User"}</p>
                  </div>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user?.username || "User"}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="size-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        </motion.nav>
      )}

      {/* Mobile Navigation */}
      {!isHomePage && (
        <div className="lg:hidden">
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-50" style={{ width: '100vw', maxWidth: '100vw' }}>
          <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 60px)' }}>
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <Activity className="size-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm truncate">FashionAI</h1>
              <p className="text-xs text-muted-foreground truncate">Design Studio</p>
            </div>
          </Link>

          <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex-shrink-0">
            {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu */}
        <motion.nav
          initial={{ x: "-100%" }}
          animate={{ x: isMobileMenuOpen ? 0 : "-100%" }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="fixed left-0 top-16 bottom-0 w-full max-w-80 bg-card border-r border-border z-50 flex flex-col"
        >
          <div className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-3 py-6 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="size-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{user?.username || "User"}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-2" 
              onClick={logout}
            >
              <LogOut className="size-4 mr-2" />
              Sign out
            </Button>
          </div>
        </motion.nav>
        </div>
      )}
    </>
  )
}
