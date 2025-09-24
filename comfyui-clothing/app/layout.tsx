import type React from "react"
import "@/styles/globals.css"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Navigation } from "@/components/navigation"
import { MainWrapper } from "@/components/main-wrapper"
import { AuthProvider } from "@/contexts/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FashionAI - AI-Powered Fashion Design Studio",
  description:
    "Transform fashion design with AI. Extract patterns, apply designs, virtual try-on, and generate CAD files with cutting-edge AI technology.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Navigation />
            <MainWrapper>{children}</MainWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
