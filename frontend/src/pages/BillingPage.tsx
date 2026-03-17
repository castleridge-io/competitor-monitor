import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBilling } from '../hooks/useBilling'
import { useAuthContext } from '../hooks/useAuthContext'

export function BillingPage() {
  const { currentTier, subscription, loading, error, fetchSubscription, createPortal, plans } = useBilling()
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (user?.email) {
      fetchSubscription(user.email)
    }
  }, [user?.email, fetchSubscription])

  const handleManageSubscription = async () => {
    if (!user?.email) return

    setPortalLoading(true)
    const result = await createPortal(user.email)
    setPortalLoading(false)

    if (result?.url) {
      window.location.href = result.url
    }
  }

  const handleUpgrade = () => {
    navigate('/dashboard/pricing')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'canceled':
        return 'text-red-600 bg-red-100'
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getCurrentPlan = () => {
    return plans.find((p) => p.id === currentTier)
  }

  if (loading && !subscription) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const currentPlan = getCurrentPlan()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-600 mt-1">Manage your subscription and billing details</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {currentPlan?.name || 'Free'} Plan
            </p>
            <p className="text-gray-600 mt-1">
              {currentPlan?.price === 0 ? 'No monthly charge' : `$${currentPlan?.price}/month`}
            </p>
          </div>

          {currentTier === 'free' ? (
            <button
              onClick={handleUpgrade}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Upgrade Plan
            </button>
          ) : (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              {portalLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}
        </div>
      </div>

      {/* Subscription Details */}
      {subscription && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h2>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span
                className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  subscription.status
                )}`}
              >
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Current Period End</span>
              <span className="text-gray-900">{formatDate(subscription.currentPeriodEnd)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Started</span>
              <span className="text-gray-900">{formatDate(subscription.createdAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Plan Features */}
      {currentPlan && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h2>

          <ul className="space-y-3">
            <li className="flex items-center text-gray-700">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {currentPlan.features.competitors === -1
                ? 'Unlimited competitors'
                : `${currentPlan.features.competitors} competitor${currentPlan.features.competitors !== 1 ? 's' : ''}`}
            </li>
            <li className="flex items-center text-gray-700">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {currentPlan.features.scanFrequency.charAt(0).toUpperCase() +
                currentPlan.features.scanFrequency.slice(1)}{' '}
              scans
            </li>
            {currentPlan.features.aiNarratives && (
              <li className="flex items-center text-gray-700">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                AI-powered change narratives
              </li>
            )}
            {currentPlan.features.historicalTrends && (
              <li className="flex items-center text-gray-700">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Historical trends analysis
              </li>
            )}
            {currentPlan.features.realTimeAlerts && (
              <li className="flex items-center text-gray-700">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Real-time alerts
              </li>
            )}
            {currentPlan.features.apiAccess && (
              <li className="flex items-center text-gray-700">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                API access
              </li>
            )}
            {currentPlan.features.battlecards && (
              <li className="flex items-center text-gray-700">
                <svg
                  className="h-5 w-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Battlecards
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Need help? */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Need help?</h3>
        <p className="text-sm text-gray-600">
          Contact our support team at{' '}
          <a href="mailto:support@example.com" className="text-primary-600 hover:text-primary-700">
            support@example.com
          </a>{' '}
          for any billing questions.
        </p>
      </div>
    </div>
  )
}