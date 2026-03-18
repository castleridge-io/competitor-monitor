import { useEffect, useState } from 'react'
import { apiClient } from '../utils/api'
import { TimelineVisualization } from '../components/TimelineVisualization'
import { CompetitorSelector } from '../components/CompetitorSelector'
import type { Competitor, TimelineEvent, TimelineEventType } from '../types'

const EVENT_TYPES: Array<{ value: TimelineEventType | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'All Events', icon: '📊' },
  { value: 'price_change', label: 'Price Changes', icon: '💰' },
  { value: 'feature_change', label: 'Feature Changes', icon: '⚡' },
  { value: 'availability_change', label: 'Availability', icon: '📦' },
  { value: 'new_scrape', label: 'New Competitors', icon: '🆕' },
]

export function TimelinePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<TimelineEventType | 'all'>('all')
  const [dateRange, setDateRange] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

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
      }
    }

    loadCompetitors()
  }, [])

  // Load timeline events
  useEffect(() => {
    async function loadTimeline() {
      if (competitors.length === 0) return

      try {
        setLoading(true)
        
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - dateRange)
        startDate.setHours(0, 0, 0, 0)

        const data = await apiClient.getTimelineEvents({
          competitorId: selectedCompetitorIds.length > 0 
            ? selectedCompetitorIds.join(',') 
            : undefined,
          startDate: startDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          type: selectedType,
        })
        
        setEvents(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline')
      } finally {
        setLoading(false)
      }
    }

    loadTimeline()
  }, [selectedCompetitorIds, dateRange, selectedType, competitors.length])

  // Calculate stats
  const stats = {
    total: events.length,
    priceChanges: events.filter(e => e.type === 'price_change').length,
    featureChanges: events.filter(e => e.type === 'feature_change').length,
    newCompetitors: events.filter(e => e.type === 'new_scrape').length,
  }

  if (error && competitors.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitor Timeline</h1>
          <p className="text-gray-600 mt-1">
            Track all competitor changes with AI-generated insights
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Events"
          value={stats.total}
          icon="📊"
          loading={loading}
        />
        <StatCard
          label="Price Changes"
          value={stats.priceChanges}
          icon="💰"
          loading={loading}
        />
        <StatCard
          label="Feature Updates"
          value={stats.featureChanges}
          icon="⚡"
          loading={loading}
        />
        <StatCard
          label="New Competitors"
          value={stats.newCompetitors}
          icon="🆕"
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className={clsx('bg-white rounded-lg shadow', showFilters ? 'block' : 'hidden md:block')}>
        <div className="p-6 space-y-6">
          {/* Date Range & Type Filters */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Date Range */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Date Range</h3>
              <div className="flex gap-2">
                {[7, 30, 90, 365].map(days => (
                  <button
                    key={days}
                    onClick={() => setDateRange(days)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      dateRange === days
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {days === 365 ? '1y' : `${days}d`}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Type Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Event Type</h3>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                      selectedType === type.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Competitor Selector */}
          {competitors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Competitors</h3>
              <CompetitorSelector
                competitors={competitors}
                selectedIds={selectedCompetitorIds}
                onChange={setSelectedCompetitorIds}
              />
            </div>
          )}
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="bg-white rounded-lg shadow p-6">
        <TimelineVisualization events={events} loading={loading} />
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: string
  loading?: boolean
}

function StatCard({ label, value, icon, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {loading ? '...' : value}
          </p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

function clsx(...args: (string | boolean | undefined | null)[]): string {
  return args.filter(Boolean).join(' ')
}
