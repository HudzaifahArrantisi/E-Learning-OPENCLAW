// src/hooks/useAuth.js
// Centralized Auth Context — verifies token ONCE, shared across all components.
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Provider: wrap this around your app (inside App.jsx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const hasVerified = useRef(false) // Prevent double-call from StrictMode

  // Function untuk verify token — only runs ONCE
  const verifyToken = useCallback(async () => {
    // Guard: skip if already verified (StrictMode protection)
    if (hasVerified.current) return
    hasVerified.current = true

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await api.get('/api/auth/verify')
      
      if (response.data.success) {
        setUser(response.data.data.user || response.data.data) // Handle both structures
        setError(null)
      } else {
        throw new Error(response.data.message || 'Token verification failed')
      }
    } catch (error) {
      console.error('Verify token error:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      delete api.defaults.headers.common['Authorization']
      setError(error.response?.data?.message || 'Session expired, please login again')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cek token saat pertama kali load — ONLY ONCE
  useEffect(() => {
    verifyToken()
  }, [verifyToken])

  const login = async (identifier, password) => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.post('/api/auth/login', {
        identifier,
        password
      })

      if (response.data.success) {
        const { token, user, role, redirect } = response.data.data

        localStorage.setItem('token', token)
        localStorage.setItem('role', role)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        // Set user dengan data yang konsisten
        const userData = user || { role, email: identifier } // Fallback jika user tidak ada
        setUser(userData)

        return { success: true, redirect, user: userData }
      } else {
        throw new Error(response.data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      const message = error.response?.data?.message || 'Login gagal. Periksa koneksi atau kredensial.'
      setError(message)
      return { success: false, message }
    } finally {
      setLoading(false)
    }
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    setError(null)
    hasVerified.current = false // Allow re-verify on next login
  }, [])

  const refreshAuth = useCallback(() => {
    setLoading(true)
    hasVerified.current = false // Allow re-verify
    verifyToken()
  }, [verifyToken])

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshAuth,
    isAuthenticated: !!user && !!localStorage.getItem('token')
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook: use this in any component to access auth state (NO extra API calls)
const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth