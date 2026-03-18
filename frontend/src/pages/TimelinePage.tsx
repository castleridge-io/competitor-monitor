import { useEffect, useState } from 'react'
import { apiClient } from '../utils/api'
import { DateRangeFilter } from '../components/DateRangeFilter'
import type { Competitor, TimelineEvent } from '../types'

export function TimelinePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [dateRange, setDateRange] = useState(30)
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('')
  const [selectedEventType, setSelectedEventType] = useState<string>('')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Load competitors
  useEffect(() => {
    async function loadCompetitors() {
      try {
        const data = await apiClient.getCompetitors()
        setCompetitors(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load competitors')
      }
    }

    loadCompetitors()
  }, [])

  // Load timeline events
  useEffect(() => {
    async function loadTimeline() {
      try {
        setLoading(true)
        
        // Calculate date range
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - dateRange)

        const params: any = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          page,
          pageSize: 20,
        }

        if (selectedCompetitor) {
          params.competitorId = selectedCompetitor
        }

        if (selectedEventType) {
          params.eventType = selectedEventType
        }

        const response = await apiClient.getTimeline(params)
        setEvents(response.events)
        setTotalPages(response.totalPages)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline')
      } finally {
        setLoading(false)
      }
    }

    loadTimeline()
  }, [dateRange, selectedCompetitor, selectedEventType, page])

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'price_change':
        return 'bg-blue-100 text-blue-800'
      case 'feature_change':
        return 'bg-purple-100 text-purple-800'
      case 'initial_scrape':
        return 'bg-green-100 text-green-800'
      case 'data_update':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'price_change':
        return '💰'
      case 'feature_change':
        return '✨'
      case 'initial_scrape':
        return '🎯'
      case 'data_update':
        return '📊'
      default:
        return '📝'
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading timeline...</div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Competitor Timeline</h1>
        <p className="text-gray-600 mt-1">Visual timeline of all competitor changes with AI insights</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>

          {/* Competitor Filter */}
          <div>
            <label htmlFor="competitor-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Competitor
            </label>
            <select
              id="competitor-filter"
              value={selectedCompetitor}
              onChange={(e) => setSelectedCompetitor(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Competitors</option>
              {competitors.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div>
            <label htmlFor="event-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Event Type
            </label>
            <select
              id="event-type-filter"
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              <option value="price_change">Price Change</option>
              <option value="feature_change">Feature Change</option>
              <option value="initial_scrape">Initial Scrape</option>
              <option value="data_update">Data Update</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">No timeline events available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getEventTypeIcon(event.eventType)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.competitorName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(event.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getEventTypeColor(
                    event.eventType
                  )}`}
                >
                  {event.eventType.replace('_', ' ')}
                </span>
              </div>

              {/* AI Narrative */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">🤖</span>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">AI Insight</p>
                    <p className="text-sm text-blue-800">{event.narrative}</p>
                  </div>
                </div>
              </div>

              {/* Event Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.data.price && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Price</p>
                    <p className="text-lg font-semibold text-gray-900">{event.data.price}</p>
                  </div>
                )}
                {Array.isArray(event.data.features) && event.data.features.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {event.data.features.map((feature: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && events.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="text-gray-900">Loading timeline...</div>
          </div>
        </div>
      )}
    </div>
  )
}
