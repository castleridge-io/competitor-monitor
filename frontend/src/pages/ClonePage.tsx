import { useState } from 'react'
import { apiClient } from '../utils/api'

interface CloneResult {
  detectedFeatures: {
    name: string
    url: string
    features: string[]
    techStack: string[]
    pricing: string | null
    metadata: {
      title?: string
      description?: string
      socialLinks?: {
        twitter?: string
        linkedin?: string
        facebook?: string
      }
    }
    scrapedAt: string
  }
  gapAnalysis?: {
    missingFeatures: string[]
    competitiveAdvantages: string[]
    recommendations: string[]
    overlapPercentage: number
    aiRecommendations?: string
    analysisId?: string
  }
}

interface QuickScanResult {
  summary: {
    name: string
    url: string
    featureCount: number
    techStackCount: number
    hasPricing: boolean
  }
  features: string[]
  techStack: string[]
  pricing: string | null
}

export function ClonePage() {
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [userFeatures, setUserFeatures] = useState('')
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null)
  const [quickScanResult, setQuickScanResult] = useState<QuickScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [quickScanning, setQuickScanning] = useState(false)
  const [addingToTracking, setAddingToTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddToTracking, setShowAddToTracking] = useState(false)

  // Analyze competitor
  const handleAnalyze = async () => {
    if (!competitorUrl.trim()) {
      setError('Please enter a competitor URL')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setCloneResult(null)
      setQuickScanResult(null)

      const features = userFeatures
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0)

      const payload: Record<string, unknown> = {
        url: competitorUrl.trim(),
      }

      if (features.length > 0) {
        payload.userFeatures = features
      }

      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze competitor')
      }

      const result: CloneResult = await response.json()
      setCloneResult(result)
      setShowAddToTracking(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze competitor')
    } finally {
      setLoading(false)
    }
  }

  // Quick scan
  const handleQuickScan = async () => {
    if (!competitorUrl.trim()) {
      setError('Please enter a competitor URL')
      return
    }

    try {
      setQuickScanning(true)
      setError(null)

      const response = await fetch('/api/clone/quick-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: competitorUrl.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to scan competitor')
      }

      const result: QuickScanResult = await response.json()
      setQuickScanResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan competitor')
    } finally {
      setQuickScanning(false)
    }
  }

  // Add to tracking
  const handleAddToTracking = async () => {
    if (!cloneResult) return

    try {
      setAddingToTracking(true)

      const response = await fetch('/api/clone/add-to-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cloneResult.detectedFeatures.name,
          url: cloneResult.detectedFeatures.url,
          features: cloneResult.detectedFeatures.features,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add to tracking')
      }

      const result = await response.json()
      alert(`Successfully added "${result.name}" to tracking!`)
      setShowAddToTracking(false)
      setCloneResult(null)
      setCompetitorUrl('')
      setUserFeatures('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to tracking')
      setShowAddToTracking(false)
    } finally {
      setAddingToTracking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clone Competitor</h1>
        <p className="text-gray-600 mt-1">
          Analyze a competitor's website to detect their features and identify gaps.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label htmlFor="competitorUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Competitor URL
          </label>
          <input
            type="url"
            id="competitorUrl"
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            placeholder="https://competitor.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="userFeatures" className="block text-sm font-medium text-gray-700 mb-1">
            Your Features (optional, for gap analysis)
          </label>
          <textarea
            id="userFeatures"
            value={userFeatures}
            onChange={(e) => setUserFeatures(e.target.value)}
            placeholder="Enter your features, one per line..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter one feature per line to compare with competitor's features
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleQuickScan}
            disabled={quickScanning}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {quickScanning ? 'Scanning...' : 'Quick Scan'}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Competitor'}
          </button>
        </div>
      </div>

      {/* Quick Scan Results */}
      {quickScanResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Scan Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Features</p>
              <p className="text-2xl font-bold text-gray-900">{quickScanResult.summary.featureCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Technologies</p>
              <p className="text-2xl font-bold text-gray-900">{quickScanResult.summary.techStackCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Pricing</p>
              <p className="text-2xl font-bold text-gray-900">
                {quickScanResult.summary.hasPricing ? '✓' : '—'}
              </p>
            </div>
          </div>

          {quickScanResult.features.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Detected Features</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {quickScanResult.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {quickScanResult.techStack.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {quickScanResult.techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Analysis Results */}
      {cloneResult && (
        <div className="space-y-6">
          {/* Detected Features */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Detected Features: {cloneResult?.detectedFeatures?.name || 'Unknown'}
            </h2>

            <div className="mb-4">
              <a
                href={cloneResult?.detectedFeatures?.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {cloneResult?.detectedFeatures?.url || 'URL not available'}
              </a>
            </div>

            {cloneResult?.detectedFeatures?.pricing && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Pricing</h3>
                <p className="text-gray-700 bg-green-50 px-3 py-2 rounded-md inline-block">
                  {cloneResult.detectedFeatures.pricing}
                </p>
              </div>
            )}

            {cloneResult?.detectedFeatures?.features && cloneResult.detectedFeatures.features.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Features</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {cloneResult.detectedFeatures.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {cloneResult?.detectedFeatures?.techStack && cloneResult.detectedFeatures.techStack.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {cloneResult.detectedFeatures.techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-md"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cloneResult?.detectedFeatures?.metadata?.description && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{cloneResult.detectedFeatures.metadata.description}</p>
              </div>
            )}
          </div>

          {/* Gap Analysis */}
          {cloneResult.gapAnalysis && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Gap Analysis</h2>

              {/* Overlap */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Feature Overlap</span>
                  <span className="text-sm font-bold text-blue-600">
                    {cloneResult.gapAnalysis.overlapPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${cloneResult.gapAnalysis.overlapPercentage}%` }}
                  />
                </div>
              </div>

              {/* Missing Features */}
              {cloneResult.gapAnalysis.missingFeatures.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-red-700 mb-2">
                    Missing Features ({cloneResult.gapAnalysis.missingFeatures.length})
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {cloneResult.gapAnalysis.missingFeatures.map((feature, idx) => (
                      <li key={idx} className="text-red-600">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Competitive Advantages */}
              {cloneResult.gapAnalysis.competitiveAdvantages.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-green-700 mb-2">
                    Your Advantages ({cloneResult.gapAnalysis.competitiveAdvantages.length})
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {cloneResult.gapAnalysis.competitiveAdvantages.map((feature, idx) => (
                      <li key={idx} className="text-green-600">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {cloneResult.gapAnalysis.recommendations.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Recommendations</h3>
                  <ul className="list-decimal list-inside space-y-1 text-gray-700">
                    {cloneResult.gapAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Recommendations */}
              {cloneResult.gapAnalysis.aiRecommendations && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-line">
                      {cloneResult.gapAnalysis.aiRecommendations}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add to Tracking */}
          {showAddToTracking && cloneResult?.detectedFeatures && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add to Tracking</h2>
              <p className="text-gray-600 mb-4">
                Would you like to start tracking this competitor for future changes?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAddToTracking}
                  disabled={addingToTracking}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingToTracking ? 'Adding...' : 'Add to Tracking'}
                </button>
                <button
                  onClick={() => {
                    setShowAddToTracking(false)
                    setCloneResult(null)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
