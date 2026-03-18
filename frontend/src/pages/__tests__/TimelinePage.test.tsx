import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TimelinePage } from '../TimelinePage'

// Mock the api module
vi.mock('../../utils/api', () => ({
  apiClient: {
    getCompetitors: vi.fn(),
    getTimeline: vi.fn(),
    getTimelineEvent: vi.fn(),
  },
}))

const { apiClient } = await import('../../utils/api')

const mockCompetitors = [
  {
    id: 'comp-1',
    name: 'Competitor 1',
    url: 'https://example1.com',
    selectors: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'comp-2',
    name: 'Competitor 2',
    url: 'https://example2.com',
    selectors: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
]

const mockTimelineData = {
  events: [
    {
      id: 'event-1',
      competitorId: 'comp-1',
      competitorName: 'Competitor 1',
      eventType: 'price_change',
      data: { price: '$90', features: ['Basic', 'Advanced'] },
      narrative: 'Price dropped from $100 to $90 (10% reduction).',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'event-2',
      competitorId: 'comp-1',
      competitorName: 'Competitor 1',
      eventType: 'initial_scrape',
      data: { price: '$100', features: ['Basic'] },
      narrative: 'Initial data captured.',
      createdAt: new Date('2024-01-14'),
    },
    {
      id: 'event-3',
      competitorId: 'comp-2',
      competitorName: 'Competitor 2',
      eventType: 'feature_change',
      data: { price: '$200', features: ['Pro', 'Enterprise'] },
      narrative: 'New features added: Enterprise.',
      createdAt: new Date('2024-01-13'),
    },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
  totalPages: 1,
}

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <TimelinePage />
    </MemoryRouter>
  )
}

describe('TimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state initially', () => {
    vi.mocked(apiClient.getCompetitors).mockImplementation(() => new Promise(() => {}))
    vi.mocked(apiClient.getTimeline).mockImplementation(() => new Promise(() => {}))

    renderWithRouter()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display page title and description', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor Timeline')).toBeInTheDocument()
    })

    expect(screen.getByText('Visual timeline of all competitor changes with AI insights')).toBeInTheDocument()
  })

  it('should display timeline events', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Price dropped from $100 to $90 (10% reduction).')).toBeInTheDocument()
    })

    expect(screen.getByText('Initial data captured.')).toBeInTheDocument()
    expect(screen.getByText('New features added: Enterprise.')).toBeInTheDocument()
  })

  it('should display competitor names', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getAllByText('Competitor 1').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Competitor 2').length).toBeGreaterThan(0)
  })

  it('should display event type badges', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      // Check for event type badges (using more specific selector to avoid matching filter options)
      const priceChangeBadges = screen.getAllByText(/price change/i)
      expect(priceChangeBadges.length).toBeGreaterThan(0)
    })
    
    // Check for initial scrape and feature change badges
    const initialScrapeBadges = screen.getAllByText(/initial scrape/i)
    expect(initialScrapeBadges.length).toBeGreaterThan(0)
    
    const featureChangeBadges = screen.getAllByText(/feature change/i)
    expect(featureChangeBadges.length).toBeGreaterThan(0)
  })

  it('should display date range filter', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Date Range')).toBeInTheDocument()
    })
  })

  it('should display competitor filter', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByLabelText(/filter by competitor/i)).toBeInTheDocument()
    })
  })

  it('should display event type filter', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByLabelText(/filter by event type/i)).toBeInTheDocument()
    })
  })

  it('should filter timeline by competitor', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByLabelText(/filter by competitor/i)).toBeInTheDocument()
    })

    const competitorFilter = screen.getByLabelText(/filter by competitor/i)
    fireEvent.change(competitorFilter, { target: { value: 'comp-1' } })

    await waitFor(() => {
      expect(apiClient.getTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ competitorId: 'comp-1' })
      )
    })
  })

  it('should filter timeline by event type', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByLabelText(/filter by event type/i)).toBeInTheDocument()
    })

    const eventTypeFilter = screen.getByLabelText(/filter by event type/i)
    fireEvent.change(eventTypeFilter, { target: { value: 'price_change' } })

    await waitFor(() => {
      expect(apiClient.getTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'price_change' })
      )
    })
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(apiClient.getCompetitors).mockRejectedValue(new Error('API Error'))
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    // Wait for error state to be displayed
    await waitFor(() => {
      // The component should still render even with errors
      expect(screen.getByText('Competitor Timeline')).toBeInTheDocument()
    })
  })

  it('should display empty state when no events available', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue({
      events: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/no timeline events/i)).toBeInTheDocument()
    })
  })

  it('should display AI narrative for each event', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Price dropped from $100 to $90 (10% reduction).')).toBeInTheDocument()
    })
  })

  it('should be responsive with mobile-friendly layout', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    const { container } = renderWithRouter()

    await waitFor(() => {
      expect(container.querySelector('.space-y-6')).toBeInTheDocument()
    })
  })

  it('should display event data details', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimeline).mockResolvedValue(mockTimelineData)

    renderWithRouter()

    await waitFor(() => {
      // Check for price in the data section (more specific selector)
      const priceElements = screen.getAllByText(/\$90/)
      expect(priceElements.length).toBeGreaterThan(0)
    })
  })
})
