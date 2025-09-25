"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { 
  User,
  LogOut,
  Search,
  Send,
  Activity
} from "lucide-react"

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null // or show loading state
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground">
              <Activity className="size-4" />
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
      <main className="container max-w-4xl mx-auto py-16">
        {/* AI Chat Search */}
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-2xl">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask AI to help with your fashion design... (e.g., 'Create a vintage dress pattern' or 'Generate a modern suit design')"
                className="w-full pl-12 pr-16 py-4 text-base border border-border rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200 placeholder:text-muted-foreground shadow-sm hover:shadow-md"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <Button 
                  size="sm" 
                  className="rounded-lg shadow-sm"
                  disabled={!searchQuery.trim()}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Describe what you want to create and let AI help you design amazing fashion pieces
            </p>
          </div>
        </div>

      </main>
    </div>
  )
}