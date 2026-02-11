import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  email: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedEmail = localStorage.getItem('email')
    if (token && savedEmail) {
      setIsAuthenticated(true)
      setEmail(savedEmail)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const response = await api.login(email, password)

    if (response.success && response.data) {
      api.setToken(response.data.token)
      setIsAuthenticated(true)
      setEmail(response.data.tenant.email)
      localStorage.setItem('email', response.data.tenant.email)
      return true
    }

    return false
  }

  const register = async (email: string, password: string): Promise<boolean> => {
    const response = await api.register(email, password)

    if (response.success && response.data) {
      api.setToken(response.data.token)
      setIsAuthenticated(true)
      setEmail(response.data.tenant.email)
      localStorage.setItem('email', response.data.tenant.email)
      return true
    }

    return false
  }

  const logout = () => {
    api.clearToken()
    localStorage.removeItem('email')
    setIsAuthenticated(false)
    setEmail(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, email, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
