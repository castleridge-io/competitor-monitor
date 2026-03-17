import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { apiClient } from '../utils/api'
import type { Scrape, PriceHistoryPoint } from '../types'

interface PriceHistoryChartProps {
  competitorId: string
  competitorName?: string
}

export function PriceHistoryChart({ competitorId, competitorName }: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true)
        const scrapes = await apiClient.getScrapeHistory(competitorId)

        const priceData = scrapes
          .filter((s: Scrape) => s.data?.price !== undefined)
          .map((s: Scrape) => ({
            date: new Date(s.scrapedAt).toLocaleDateString(),
            price: s.data.price as number,
            competitorName: competitorName ?? competitorId,
          }))
          .reverse()

        setData(priceData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load price history')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [competitorId, competitorName])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">Loading price history...</div>
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

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No price history available. Run a scrape to collect data.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Price History</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={{ transform: 'translate(0, 6)' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              name={competitorName ?? 'Price'}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}