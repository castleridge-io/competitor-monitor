import { useState } from 'react'
import clsx from 'clsx'
import type { TimelineEvent, TimelineChangeDetail } from '../types'

interface TimelineVisualizationProps {
  events: TimelineEvent[]
  loading?: boolean
  className?: string
}

const eventTypeConfig = {
  price_change: {
    icon: '💰',
    color: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    iconBg: 'bg-yellow-500',
  },
  feature_change: {
    icon: '⚡',
    color: 'bg-blue-100 border-blue-400 text-blue-800',
    iconBg: 'bg-blue-500',
  },
  availability_change: {
    icon: '📦',
    color: 'bg-purple-100 border-purple-400 text-purple-800',
    iconBg: 'bg-purple-500',
  },
  new_scrape: {
    icon: '🆕',
    color: 'bg-green-100 border-green-400 text-green-800',
    iconBg: 'bg-green-500',
  },
  other: {
    icon: '📊',
    color: 'bg-gray-100 border-gray-400 text-gray-800',
    iconBg: 'bg-gray-500',
  },
}

export function TimelineVisualization({ events, loading, className }: TimelineVisualizationProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className={clsx('space-y-4', className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <div className="text-4xl mb-4">📭</div>
        <p className="text-gray-500 text-lg">No timeline events found</p>
        <p className="text-gray-400 text-sm mt-2">
          Try adjusting your filters or add competitors to start monitoring
        </p>
      </div>
    )
  }

  // Group events by date
  const eventsByDate = groupEventsByDate(events)

  return (
    <div className={clsx('space-y-8', className)}>
      {Object.entries(eventsByDate).map(([date, dateEvents]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {formatDateHeader(date)}
          </h3>
          <div className="space-y-4">
            {dateEvents.map((event, index) => {
              const isExpanded = expandedEventId === event.id
              const config = eventTypeConfig[event.type]

              return (
                <div
                  key={event.id}
                  className="relative pl-8"
                >
                  {/* Timeline line */}
                  {index < dateEvents.length - 1 && (
                    <div className="absolute left-[19px] top-10 w-0.5 h-full bg-gray-200"></div>
                  )}

                  {/* Event icon */}
                  <div
                    className={clsx(
                      'absolute left-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg',
                      config.iconBg
                    )}
                  >
                    {config.icon}
                  </div>

                  {/* Event card */}
                  <div
                    onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                    className={clsx(
                      'bg-white rounded-lg border-2 p-4 cursor-pointer transition-all',
                      config.color,
                      isExpanded && 'ring-2 ring-offset-2'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {event.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTime(event.scrapedAt)}
                        </p>
                      </div>
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-transform"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-current/20">
                        {/* AI Narrative */}
                        <div className="bg-white/50 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🤖</span>
                            <span className="text-sm font-semibold text-gray-700">AI Analysis</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {event.narrative}
                          </p>
                        </div>

                        {/* Change Details */}
                        <div className="space-y-2">
                          <h5 className="text-sm font-semibold text-gray-700">Changes Detected</h5>
                          <div className="bg-white/50 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50/50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Field
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Old Value
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    New Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {event.changeDetails.map((change, i) => (
                                  <ChangeRow key={i} change={change} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                          <a
                            href={event.competitorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            View Source →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChangeRow({ change }: { change: TimelineChangeDetail }) {
  const hasChange = change.oldValue !== null && change.oldValue !== undefined

  return (
    <tr>
      <td className="px-3 py-2 text-sm font-medium text-gray-900">
        {formatFieldName(change.field)}
      </td>
      <td className={clsx(
        'px-3 py-2 text-sm',
        hasChange ? 'text-red-600 line-through' : 'text-gray-400'
      )}>
        {formatChangeValue(change.oldValue)}
      </td>
      <td className={clsx(
        'px-3 py-2 text-sm font-medium',
        hasChange ? 'text-green-600' : 'text-gray-900'
      )}>
        {formatChangeValue(change.newValue)}
      </td>
    </tr>
  )
}

function groupEventsByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const grouped: Record<string, TimelineEvent[]> = {}

  for (const event of events) {
    const date = new Date(event.scrapedAt).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(event)
  }

  return grouped
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today'
  }

  if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim()
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') {
    const str = JSON.stringify(value)
    return str.length > 50 ? str.slice(0, 47) + '...' : str
  }
  return String(value)
}
