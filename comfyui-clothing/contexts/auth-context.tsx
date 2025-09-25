"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient, LoginRequest, RegisterRequest } from '@/lib/api-client'

interface User {
  id: number
  username: string
  email: string | null
  tenant_id: number
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<boolean>
  register: (userData: RegisterRequest) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 检查是否为开发调试模式
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  // 从 localStorage 恢复认证状态
  useEffect(() => {
    // 如果是开发模式，直接设置模拟用户
    if (isDevMode) {
      const mockUser: User = {
        id: 1,
        username: 'dev_user',
        email: 'dev@example.com',
        tenant_id: 1,
        is_active: true
      }
      const mockToken = 'dev_token_' + Date.now()
      
      setUser(mockUser)
      setToken(mockToken)
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))
      setIsLoading(false)
      return
    }

    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Failed to restore auth state:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
    
    setIsLoading(false)
  }, [isDevMode])

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    // 如果是开发模式，直接返回成功
    if (isDevMode) {
      const mockUser: User = {
        id: 1,
        username: credentials.username || 'dev_user',
        email: 'dev@example.com',
        tenant_id: 1,
        is_active: true
      }
      const mockToken = 'dev_token_' + Date.now()
      
      setUser(mockUser)
      setToken(mockToken)
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))
      return true
    }

    try {
      setIsLoading(true)
      const response = await apiClient.login(credentials)
      
      setToken(response.access_token)
      localStorage.setItem('auth_token', response.access_token)
      
      // 获取用户信息
      const userInfo = await apiClient.getUserInfo(response.access_token)
      setUser(userInfo)
      localStorage.setItem('auth_user', JSON.stringify(userInfo))
      
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterRequest): Promise<boolean> => {
    // 如果是开发模式，直接返回成功
    if (isDevMode) {
      const mockUser: User = {
        id: 1,
        username: userData.username,
        email: 'dev@example.com',
        tenant_id: userData.tenant_id,
        is_active: true
      }
      const mockToken = 'dev_token_' + Date.now()
      
      setUser(mockUser)
      setToken(mockToken)
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))
      return true
    }

    try {
      setIsLoading(true)
      const response = await apiClient.register(userData)
      
      // 注册成功后自动登录
      const loginResponse = await apiClient.login({
        username: userData.username,
        password: userData.password
      })
      
      setToken(loginResponse.access_token)
      localStorage.setItem('auth_token', loginResponse.access_token)
      
      // 获取用户信息
      const userInfo = await apiClient.getUserInfo(loginResponse.access_token)
      setUser(userInfo)
      localStorage.setItem('auth_user', JSON.stringify(userInfo))
      
      return true
    } catch (error) {
      console.error('Registration failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  const isAuthenticated = !!user && !!token

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
