"use client"

import { usePathname } from "next/navigation"

interface MainWrapperProps {
  children: React.ReactNode
}

export function MainWrapper({ children }: MainWrapperProps) {
  const pathname = usePathname()
  const isHomePage = pathname === "/" || pathname === ""

  return (
    <main className={isHomePage ? "transition-all duration-300" : "lg:ml-20 xl:ml-64 transition-all duration-300"}>
      {children}
    </main>
  )
}
