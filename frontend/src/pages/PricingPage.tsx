import { useState } from 'react'
import { useBilling } from '../hooks/useBilling'
import { useAuthContext } from '../hooks/useAuthContext'

export function PricingPage() {
  const { plans, loading, error, createCheckout } = useBilling()
  const { user } = useAuthContext()
  const [processingTier, setProcessingTier] = useState<string | null>(null)

  const handleSubscribe = async (tier: string) => {
    if (tier === 'free') return

    if (!user?.email) {
      alert('Please log in to subscribe')
      return
    }

    setProcessingTier(tier)
    const result = await createCheckout(user.email, tier)
    setProcessingTier(null)

    if (result?.url) {
      window.location.href = result.url
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    return `$${price}/mo`
  }

  const getFeatureLabel = (key: string, value: unknown): string => {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗'
    }
    if (key === 'competitors') {
      return value === -1 ? 'Unlimited' : String(value)
    }
    if (key === 'scanFrequency') {
      return String(value).charAt(0).toUpperCase() + String(value).slice(1)
    }
    return String(value)
  }

  const featureLabels: Record<string, string> = {
    competitors: 'Competitors',
    scanFrequency: 'Scan Frequency',
    reports: 'Reports',
    aiNarratives: 'AI Narratives',
    historicalTrends: 'Historical Trends',
    realTimeAlerts: 'Real-time Alerts',
    apiAccess: 'API Access',
    battlecards: 'Battlecards',
  }

  const getFeatureKeys = () => {
    if (plans.length === 0) return []
    return Object.keys(plans[0].features)
  }

  if (loading && plans.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Pricing</h1>
        <p className="mt-4 text-lg text-gray-600">
          Choose the plan that fits your competitive intelligence needs
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow-lg overflow-hidden ${
              plan.id === 'pro' ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            {plan.id === 'pro' && (
              <div className="bg-primary-500 text-white text-center py-1 text-sm font-medium">
                Most Popular
              </div>
            )}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">
                  {formatPrice(plan.price)}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-500">/month</span>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {getFeatureKeys().map((key) => (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{featureLabels[key] || key}</span>
                    <span
                      className={`font-medium ${
                        typeof plan.features[key as keyof typeof plan.features] === 'boolean' &&
                        plan.features[key as keyof typeof plan.features]
                          ? 'text-green-600'
                          : typeof plan.features[key as keyof typeof plan.features] === 'boolean' &&
                            !plan.features[key as keyof typeof plan.features]
                          ? 'text-gray-400'
                          : 'text-gray-900'
                      }`}
                    >
                      {getFeatureLabel(key, plan.features[key as keyof typeof plan.features])}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={plan.id === 'free' || processingTier !== null}
                className={`mt-8 w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.id === 'free'
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.id === 'pro'
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } ${processingTier !== null && processingTier !== plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {processingTier === plan.id ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : plan.id === 'free' ? (
                  'Current Plan'
                ) : (
                  'Subscribe'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-gray-600 text-sm max-w-2xl mx-auto">
        <p>
          All plans include a 14-day free trial. No credit card required to start.
          Cancel anytime.
        </p>
      </div>
    </div>
  )
}