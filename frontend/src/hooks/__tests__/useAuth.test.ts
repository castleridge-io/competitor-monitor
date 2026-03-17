import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../useAuth'

// Mock the api module
vi.mock('../../utils/api', () => ({
  apiClient: {
    healthCheck: vi.fn(),
  },
}))

const { apiClient } = await import('../../utils/api')

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should start unauthenticated when no API key exists', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.apiKey).toBe(null)
  })

  it('should start authenticated when API key exists in localStorage', () => {
    localStorage.setItem('apiKey', 'existing-key')

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.apiKey).toBe('existing-key')
  })

  it('should authenticate with valid API key', async () => {
    vi.mocked(apiClient.healthCheck).mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const success = await result.current.login('test-api-key')
      expect(success).toBe(true)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.apiKey).toBe('test-api-key')
    expect(localStorage.getItem('apiKey')).toBe('test-api-key')
  })

  it('should not authenticate with invalid API key', async () => {
    vi.mocked(apiClient.healthCheck).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const success = await result.current.login('invalid-key')
      expect(success).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('apiKey')).toBe(null)
  })

  it('should logout and clear API key', () => {
    localStorage.setItem('apiKey', 'existing-key')

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.apiKey).toBe(null)
    expect(localStorage.getItem('apiKey')).toBe(null)
  })

  it('should update API key', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.setApiKey('new-key')
    })

    expect(result.current.apiKey).toBe('new-key')
    expect(localStorage.getItem('apiKey')).toBe('new-key')
  })
})