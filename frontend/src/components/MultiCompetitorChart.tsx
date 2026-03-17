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
import clsx from 'clsx'

interface TrendDataPoint {
  id: string
  competitorId: string
  competitorName: string
  data: Record<string, unknown>
  scrapedAt: Date
}

interface MultiCompetitorChartProps {
  data: TrendDataPoint[]
  className?: string
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
]

export function MultiCompetitorChart({ data, className }: MultiCompetitorChartProps) {
  // Filter and transform data
  const priceData = data.filter(d => d.data?.price !== undefined)

  if (priceData.length === 0) {
    return (
      <div className={clsx('bg-white rounded-lg shadow p-6', className)}>
        <p className="text-gray-500">
          No price history available. Select competitors and run scrapes to collect data.
        </p>
      </div>
    )
  }

  // Get unique competitors
  const competitors = Array.from(
    new Set(priceData.map(d => d.competitorId))
  )

  // Transform data for recharts - group by date
  const dateMap = new Map<string, Record<string, unknown>>()

  priceData.forEach(point => {
    const dateStr = new Date(point.scrapedAt).toLocaleDateString()
    const existing = dateMap.get(dateStr) || { date: dateStr }
    dateMap.set(dateStr, {
      ...existing,
      [point.competitorName]: point.data.price,
    })
  })

  const chartData = Array.from(dateMap.values()).sort((a, b) => {
    const dateA = new Date(a.date as string)
    const dateB = new Date(b.date as string)
    return dateA.getTime() - dateB.getTime()
  })

  // Get competitor names for legend
  const competitorNames = Array.from(
    new Set(priceData.map(d => d.competitorName))
  )

  return (
    <div className={clsx('bg-white rounded-lg shadow p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Trends</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            {competitorNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                name={name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}