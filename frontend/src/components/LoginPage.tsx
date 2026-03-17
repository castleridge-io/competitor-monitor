import { useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'

export function LoginPage() {
  const { login } = useAuthContext()
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const success = await login(apiKey)
    if (!success) {
      setError('Invalid API key. Please check and try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Login
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Enter your API key to access the dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-gray-700"
            >
              API Key
            </label>
            <input
              type="password"
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 text-center">
          No API key? Contact your administrator.
        </p>
      </div>
    </div>
  )
}