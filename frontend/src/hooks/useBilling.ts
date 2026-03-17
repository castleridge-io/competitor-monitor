import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

interface PlanFeatures {
  competitors: number
  scanFrequency: string
  reports: string
  aiNarratives: boolean
  historicalTrends: boolean
  realTimeAlerts: boolean
  apiAccess: boolean
  battlecards: boolean
}

interface Plan {
  id: string
  name: string
  price: number
  features: PlanFeatures
}

interface Subscription {
  id: string
  userId: string
  stripeSubscriptionId: string
  status: string
  currentPeriodEnd: string
  createdAt: string
  updatedAt: string
}

interface BillingState {
  plans: Plan[]
  currentTier: string
  subscription: Subscription | null
  loading: boolean
  error: string | null
}

interface UseBillingReturn extends BillingState {
  fetchPlans: () => Promise<void>
  fetchSubscription: (email: string) => Promise<void>
  createCheckout: (email: string, tier: string) => Promise<{ url: string } | null>
  createPortal: (email: string) => Promise<{ url: string } | null>
}

export function useBilling(): UseBillingReturn {
  const [state, setState] = useState<BillingState>({
    plans: [],
    currentTier: 'free',
    subscription: null,
    loading: false,
    error: null,
  })

  const fetchPlans = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch(`${API_BASE}/billing/plans`)
      if (!response.ok) {
        throw new Error('Failed to fetch plans')
      }
      const data = await response.json()
      setState((prev) => ({ ...prev, plans: data.plans, loading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch plans',
        loading: false,
      }))
    }
  }, [])

  const fetchSubscription = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch(`${API_BASE}/billing/subscription?email=${encodeURIComponent(email)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }
      const data = await response.json()
      setState((prev) => ({
        ...prev,
        currentTier: data.tier,
        subscription: data.subscription,
        loading: false,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch subscription',
        loading: false,
      }))
    }
  }, [])

  const createCheckout = useCallback(async (email: string, tier: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }
      const data = await response.json()
      setState((prev) => ({ ...prev, loading: false }))
      return { url: data.url }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
        loading: false,
      }))
      return null
    }
  }, [])

  const createPortal = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch(`${API_BASE}/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create portal session')
      }
      const data = await response.json()
      setState((prev) => ({ ...prev, loading: false }))
      return { url: data.url }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create portal session',
        loading: false,
      }))
      return null
    }
  }, [])

  // Fetch plans on mount
  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  return {
    ...state,
    fetchPlans,
    fetchSubscription,
    createCheckout,
    createPortal,
  }
}