import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '../utils/api'

interface UseAuthReturn {
  isAuthenticated: boolean
  apiKey: string | null
  login: (key: string) => Promise<boolean>
  logout: () => void
  setApiKey: (key: string) => void
}

export function useAuth(): UseAuthReturn {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    return localStorage.getItem('apiKey')
  })

  const isAuthenticated = apiKey !== null

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('apiKey', apiKey)
    } else {
      localStorage.removeItem('apiKey')
    }
  }, [apiKey])

  const login = useCallback(async (key: string): Promise<boolean> => {
    try {
      // Temporarily set the key to test it
      localStorage.setItem('apiKey', key)
      await apiClient.healthCheck()
      setApiKeyState(key)
      return true
    } catch {
      localStorage.removeItem('apiKey')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setApiKeyState(null)
    localStorage.removeItem('apiKey')
  }, [])

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key)
  }, [])

  return {
    isAuthenticated,
    apiKey,
    login,
    logout,
    setApiKey,
  }
}