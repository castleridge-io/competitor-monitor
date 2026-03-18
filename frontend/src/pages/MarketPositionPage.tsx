import { useEffect, useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { apiClient } from '../utils/api'
import type { MarketPosition } from '../types'

const QUADRANT_COLORS = {
  Budget: '#3b82f6',    // blue
  Premium: '#8b5cf6',   // purple
  Value: '#10b981',     // green
  Enterprise: '#f59e0b', // amber
}

export function MarketPositionPage() {
  const [data, setData] = useState<MarketPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const result = await apiClient.getMarketPositions()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load market position data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading market position data...</div>
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Position Map</h1>
          <p className="text-gray-600 mt-1">Visualize competitor positioning by price and features</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">
            No competitors available. Add competitors and run scrapes to view market positioning.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Market Position Map</h1>
        <p className="text-gray-600 mt-1">Visualize competitor positioning by price and features</p>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitor Positioning</h3>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Price"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Price (Low to High)',
                  position: 'bottom',
                  offset: 40,
                  fontSize: 14,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Features"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Feature Count (Basic to Comprehensive)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 40,
                  fontSize: 14,
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as MarketPosition
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-gray-900">{point.name}</p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Quadrant:</span> {point.quadrant}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Avg Price:</span> ${point.avgPrice.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Features:</span> {point.featureCount}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              {/* Quadrant divider lines */}
              <ReferenceLine x={50} stroke="#9ca3af" strokeDasharray="5 5" />
              <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="5 5" />
              <Scatter name="Competitors" data={data}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={QUADRANT_COLORS[entry.quadrant]}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Quadrant Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(QUADRANT_COLORS).map(([quadrant, color]) => (
            <div key={quadrant} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-700">{quadrant}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Competitor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quadrant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Features
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${QUADRANT_COLORS[item.quadrant]}20`,
                      color: QUADRANT_COLORS[item.quadrant],
                    }}
                  >
                    {item.quadrant}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${item.avgPrice.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.featureCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}