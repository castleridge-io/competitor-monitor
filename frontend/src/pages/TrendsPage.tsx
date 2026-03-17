import { useEffect, useState } from 'react'
import { apiClient } from '../utils/api'
import { DateRangeFilter } from '../components/DateRangeFilter'
import { CompetitorSelector } from '../components/CompetitorSelector'
import { MultiCompetitorChart } from '../components/MultiCompetitorChart'
import type { Competitor } from '../types'

interface TrendDataPoint {
  id: string
  competitorId: string
  competitorName: string
  data: Record<string, unknown>
  scrapedAt: Date
}

export function TrendsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>([])
  const [dateRange, setDateRange] = useState(30)
  const [trendsData, setTrendsData] = useState<TrendDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load competitors
  useEffect(() => {
    async function loadCompetitors() {
      try {
        const data = await apiClient.getCompetitors()
        setCompetitors(data)
        // Select all competitors by default
        setSelectedCompetitorIds(data.map(c => c.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load competitors')
      } finally {
        setLoading(false)
      }
    }

    loadCompetitors()
  }, [])

  // Load trends data when competitors or date range changes
  useEffect(() => {
    async function loadTrends() {
      if (selectedCompetitorIds.length === 0) {
        setTrendsData([])
        return
      }

      try {
        setLoading(true)
        const data = await apiClient.getHistoricalTrends({
          competitorIds: selectedCompetitorIds.join(','),
          days: dateRange,
        })
        setTrendsData(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trends data')
      } finally {
        setLoading(false)
      }
    }

    if (competitors.length > 0) {
      loadTrends()
    }
  }, [selectedCompetitorIds, dateRange, competitors.length])

  if (loading && competitors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading trends...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Historical Trends</h1>
          <p className="text-gray-600 mt-1">Track competitor price changes over time</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">
            No competitors available. Add competitors first to view trends.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historical Trends</h1>
        <p className="text-gray-600 mt-1">Track competitor price changes over time</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Date Range Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Date Range</h3>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* Competitor Selector */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Competitors</h3>
          <CompetitorSelector
            competitors={competitors}
            selectedIds={selectedCompetitorIds}
            onChange={setSelectedCompetitorIds}
          />
        </div>
      </div>

      {/* Chart */}
      <MultiCompetitorChart data={trendsData} />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="text-gray-900">Loading trends data...</div>
          </div>
        </div>
      )}
    </div>
  )
}