import { useEffect, useState } from 'react'
import { apiClient } from '../utils/api'
import type { Competitor, FeatureGap } from '../types'

export function GapsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>('')
  const [userFeatures, setUserFeatures] = useState<string>('')
  const [gapAnalysis, setGapAnalysis] = useState<FeatureGap | null>(null)
  const [allGaps, setAllGaps] = useState<FeatureGap[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load competitors and existing gap analyses
  useEffect(() => {
    async function loadData() {
      try {
        const [competitorsData, gapsData] = await Promise.all([
          apiClient.getCompetitors(),
          apiClient.getAllGapAnalyses(),
        ])
        setCompetitors(competitorsData)
        setAllGaps(gapsData)
        if (competitorsData.length > 0) {
          setSelectedCompetitorId(competitorsData[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Analyze feature gaps
  const handleAnalyze = async () => {
    if (!selectedCompetitorId || !userFeatures.trim()) {
      setError('Please select a competitor and enter your features')
      return
    }

    try {
      setAnalyzing(true)
      setError(null)

      const features = userFeatures
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0)

      const result = await apiClient.analyzeFeatureGaps({
        competitorId: selectedCompetitorId,
        userFeatures: features,
      })

      setGapAnalysis(result)

      // Refresh the list of all gaps
      const gapsData = await apiClient.getAllGapAnalyses()
      setAllGaps(gapsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze feature gaps')
    } finally {
      setAnalyzing(false)
    }
  }

  // View existing gap analysis
  const handleViewGap = async (competitorId: string) => {
    try {
      setLoading(true)
      const result = await apiClient.getGapAnalysis(competitorId)
      setGapAnalysis(result)
      setSelectedCompetitorId(competitorId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gap analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading && competitors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Gap Analysis</h1>
          <p className="text-gray-600 mt-1">Identify missing features compared to competitors</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">
            No competitors available. Add competitors first to analyze feature gaps.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feature Gap Analysis</h1>
        <p className="text-gray-600 mt-1">Identify missing features compared to competitors</p>
      </div>

      {/* Analysis Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Analyze Competitor</h2>

        <div className="space-y-4">
          {/* Competitor Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Competitor
            </label>
            <select
              value={selectedCompetitorId}
              onChange={(e) => setSelectedCompetitorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a competitor...</option>
              {competitors.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Features Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Product Features
            </label>
            <textarea
              value={userFeatures}
              onChange={(e) => setUserFeatures(e.target.value)}
              placeholder="Enter your product features, one per line..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter each feature on a new line
            </p>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !selectedCompetitorId || !userFeatures.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Gaps'}
          </button>
        </div>
      </div>

      {/* Gap Analysis Results */}
      {gapAnalysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Gap Analysis Results
          </h2>

          {/* Missing Features */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Missing Features ({gapAnalysis.missingFeatures.length})
            </h3>
            {gapAnalysis.missingFeatures.length === 0 ? (
              <p className="text-green-600">
                ✓ No feature gaps detected! Your product has feature parity or advantage.
              </p>
            ) : (
              <ul className="space-y-2">
                {gapAnalysis.missingFeatures.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start space-x-2 text-gray-700"
                  >
                    <span className="text-red-500 mt-1">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              AI Recommendations
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {gapAnalysis.recommendations}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Previous Analyses */}
      {allGaps.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Previous Analyses
          </h2>
          <div className="space-y-3">
            {allGaps.map((gap) => (
              <div
                key={gap.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer"
                onClick={() => handleViewGap(gap.competitorId)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {gap.competitorName || 'Unknown Competitor'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {gap.missingFeatures.length} missing feature{gap.missingFeatures.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(gap.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="text-gray-900">Analyzing feature gaps...</div>
          </div>
        </div>
      )}
    </div>
  )
}
