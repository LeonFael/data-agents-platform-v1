import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'
import { setAuthToken } from '../services/api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const AUTH_BASE = `${BASE}/api/v1/auth`

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // El token vive SOLO en memoria — nunca en localStorage (riesgo XSS).
  // Esto significa que al recargar la página se pierde la sesión;
  // es la decisión correcta de seguridad para v1.
  const [token, _setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  const isAuthenticated = !!token && !!user

  // Cada vez que cambia el token, se sincroniza con el interceptor de axios en api.js
  const setToken = useCallback(t => {
    _setToken(t)
    setAuthToken(t)
  }, [])

  async function register(email, password, fullName) {
    setLoading(true)
    try {
      const { data } = await axios.post(`${AUTH_BASE}/register`, {
        email, password, full_name: fullName || null,
      })
      setToken(data.access_token)
      setUser(data.user)
      return { success: true }
    } catch (e) {
      return { success: false, error: e?.response?.data?.detail || 'Error al registrarse' }
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    setLoading(true)
    try {
      const { data } = await axios.post(`${AUTH_BASE}/login`, { email, password })
      setToken(data.access_token)
      setUser(data.user)
      return { success: true }
    } catch (e) {
      return { success: false, error: e?.response?.data?.detail || 'Error al iniciar sesión' }
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      token, user, isAuthenticated, loading,
      register, login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
