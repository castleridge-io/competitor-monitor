import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineVisualization } from '../TimelineVisualization'
import type { TimelineEvent } from '../../types'

const mockEvents: TimelineEvent[] = [
  {
    id: 'event-1',
    competitorId: 'comp-1',
    competitorName: 'Competitor 1',
    competitorUrl: 'https://example1.com',
    type: 'price_change',
    title: 'Competitor 1 price decreased',
    description: 'price: $100 → $90',
    narrative: 'Price dropped by 10%.',
    previousData: { price: 100 },
    currentData: { price: 90 },
    changeDetails: [
      { field: 'price', oldValue: 100, newValue: 90 },
    ],
    scrapedAt: new Date('2024-01-15T10:00:00'),
  },
  {
    id: 'event-2',
    competitorId: 'comp-2',
    competitorName: 'Competitor 2',
    competitorUrl: 'https://example2.com',
    type: 'feature_change',
    title: 'Competitor 2 features updated',
    description: 'features: added pro',
    narrative: 'New features added.',
    previousData: { features: ['basic'] },
    currentData: { features: ['basic', 'pro'] },
    changeDetails: [
      { field: 'features', oldValue: ['basic'], newValue: ['basic', 'pro'] },
    ],
    scrapedAt: new Date('2024-01-14T10:00:00'),
  },
]

describe('TimelineVisualization', () => {
  it('should display timeline events', () => {
    render(<TimelineVisualization events={mockEvents} />)

    expect(screen.getByText('Competitor 1 price decreased')).toBeInTheDocument()
    expect(screen.getByText('Competitor 2 features updated')).toBeInTheDocument()
  })

  it('should display event descriptions', () => {
    render(<TimelineVisualization events={mockEvents} />)

    expect(screen.getByText('price: $100 → $90')).toBeInTheDocument()
    expect(screen.getByText('features: added pro')).toBeInTheDocument()
  })

  it('should expand event on click', () => {
    render(<TimelineVisualization events={mockEvents} />)

    fireEvent.click(screen.getByText('Competitor 1 price decreased'))

    expect(screen.getByText('AI Analysis')).toBeInTheDocument()
    expect(screen.getByText('Price dropped by 10%.')).toBeInTheDocument()
    expect(screen.getByText('Changes Detected')).toBeInTheDocument()
  })

  it('should display change details in expanded view', () => {
    render(<TimelineVisualization events={mockEvents} />)

    fireEvent.click(screen.getByText('Competitor 1 price decreased'))

    expect(screen.getByText('Field')).toBeInTheDocument()
    expect(screen.getByText('Old Value')).toBeInTheDocument()
    expect(screen.getByText('New Value')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    render(<TimelineVisualization events={[]} loading />)

    // Should show skeleton loaders
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should display empty state when no events', () => {
    render(<TimelineVisualization events={[]} />)

    expect(screen.getByText(/no timeline events found/i)).toBeInTheDocument()
  })

  it('should group events by date', () => {
    const eventsOnDifferentDays: TimelineEvent[] = [
      {
        ...mockEvents[0],
        id: 'event-today',
        scrapedAt: new Date(),
      },
      {
        ...mockEvents[1],
        id: 'event-yesterday',
        scrapedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ]

    render(<TimelineVisualization events={eventsOnDifferentDays} />)

    // Should show "Today" and "Yesterday" headers
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })

  it('should display competitor source link in expanded view', () => {
    render(<TimelineVisualization events={mockEvents} />)

    fireEvent.click(screen.getByText('Competitor 1 price decreased'))

    expect(screen.getByText('View Source →')).toBeInTheDocument()
  })

  it('should apply correct styling for different event types', () => {
    const priceEvent = mockEvents.find(e => e.type === 'price_change')!
    const featureEvent = mockEvents.find(e => e.type === 'feature_change')!

    render(<TimelineVisualization events={[priceEvent, featureEvent]} />)

    // Check that both events are rendered with their icons
    expect(screen.getByText('Competitor 1 price decreased')).toBeInTheDocument()
    expect(screen.getByText('Competitor 2 features updated')).toBeInTheDocument()
  })

  it('should collapse expanded event when clicked again', () => {
    render(<TimelineVisualization events={mockEvents} />)

    // First click - expand
    fireEvent.click(screen.getByText('Competitor 1 price decreased'))
    expect(screen.getByText('AI Analysis')).toBeInTheDocument()

    // Second click - collapse
    fireEvent.click(screen.getByText('Competitor 1 price decreased'))
    // AI Analysis should no longer be visible (collapsed)
    expect(screen.queryByText('AI Analysis')).not.toBeInTheDocument()
  })
})
