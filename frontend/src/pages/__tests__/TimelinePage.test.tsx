import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TimelinePage } from '../TimelinePage'

// Mock the api module
vi.mock('../../utils/api', () => ({
  apiClient: {
    getCompetitors: vi.fn(),
    getTimelineEvents: vi.fn(),
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

const mockTimelineEvents = [
  {
    id: 'event-1',
    competitorId: 'comp-1',
    competitorName: 'Competitor 1',
    competitorUrl: 'https://example1.com',
    type: 'price_change',
    title: 'Competitor 1 price decreased',
    description: 'price: $100 → $90',
    narrative: 'Competitor 1 price dropped by 10% ($100 → $90). Monitor for competitive positioning changes.',
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
    description: 'features: ["basic"] → ["basic", "pro"]',
    narrative: 'Competitor 2 features have changed: features. Consider updating your competitive analysis.',
    previousData: { features: ['basic'] },
    currentData: { features: ['basic', 'pro'] },
    changeDetails: [
      { field: 'features', oldValue: ['basic'], newValue: ['basic', 'pro'] },
    ],
    scrapedAt: new Date('2024-01-14T10:00:00'),
  },
  {
    id: 'event-3',
    competitorId: 'comp-1',
    competitorName: 'Competitor 1',
    competitorUrl: 'https://example1.com',
    type: 'new_scrape',
    title: 'Competitor 1 added to monitoring',
    description: 'price: $100',
    narrative: 'Competitor 1 has been added to monitoring. Initial data captured for price.',
    previousData: null,
    currentData: { price: 100 },
    changeDetails: [
      { field: 'price', oldValue: null, newValue: 100 },
    ],
    scrapedAt: new Date('2024-01-10T10:00:00'),
  },
]

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

  it('should display page title and description', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor Timeline')).toBeInTheDocument()
    })

    expect(screen.getByText('Track all competitor changes with AI-generated insights')).toBeInTheDocument()
  })

  it('should display quick stats', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue(mockTimelineEvents)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument()
    })
    // Stats cards appear in the stats section - use getAllBy to handle duplicates
    expect(screen.getAllByText('Price Changes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Feature Updates').length).toBeGreaterThan(0)
    expect(screen.getAllByText('New Competitors').length).toBeGreaterThan(0)
  })

  it('should display date range filter', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument()
    })
    expect(screen.getByText('30d')).toBeInTheDocument()
    expect(screen.getByText('90d')).toBeInTheDocument()
    expect(screen.getByText('1y')).toBeInTheDocument()
  })

  it('should display event type filter', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('All Events')).toBeInTheDocument()
    })
    // Filter buttons also contain the text
    const filterButtons = screen.getAllByText('Price Changes')
    expect(filterButtons.length).toBeGreaterThan(0)
    const featureButtons = screen.getAllByText('Feature Changes')
    expect(featureButtons.length).toBeGreaterThan(0)
  })

  it('should display competitor selector', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByLabelText('Competitor 1')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Competitor 2')).toBeInTheDocument()
  })

  it('should fetch timeline events when filters change', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue(mockTimelineEvents)

    renderWithRouter()

    await waitFor(() => {
      expect(apiClient.getTimelineEvents).toHaveBeenCalled()
    })
  })

  it('should display timeline events', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue(mockTimelineEvents)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor 1 price decreased')).toBeInTheDocument()
    })
    expect(screen.getByText('Competitor 2 features updated')).toBeInTheDocument()
  })

  it('should expand event details on click', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue(mockTimelineEvents)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor 1 price decreased')).toBeInTheDocument()
    })

    // Click on event to expand
    fireEvent.click(screen.getByText('Competitor 1 price decreased'))

    await waitFor(() => {
      expect(screen.getByText('AI Analysis')).toBeInTheDocument()
    })
    expect(screen.getByText('Changes Detected')).toBeInTheDocument()
  })

  it('should update filter when date range button clicked', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument()
    })

    // Click 7d button
    fireEvent.click(screen.getByText('7d'))

    await waitFor(() => {
      expect(apiClient.getTimelineEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(String),
        })
      )
    })
  })

  it('should filter by event type', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue(mockTimelineEvents)

    renderWithRouter()

    await waitFor(() => {
      // Check that stats are displayed (confirms data loaded)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    // Click Price Changes filter button (first occurrence in filter section)
    const priceFilterButtons = screen.getAllByText('Price Changes')
    // The filter button is the one in the event type section
    fireEvent.click(priceFilterButtons[priceFilterButtons.length - 1])

    await waitFor(() => {
      expect(apiClient.getTimelineEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'price_change',
        })
      )
    })
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(apiClient.getCompetitors).mockRejectedValue(new Error('API Error'))
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no events', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/no timeline events found/i)).toBeInTheDocument()
    })
  })

  it('should display correct stats from events', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue(mockTimelineEvents)

    renderWithRouter()

    await waitFor(() => {
      // Total events: 3
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('should be responsive with mobile filter toggle', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getTimelineEvents).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/show filters|hide filters/i)).toBeInTheDocument()
    })
  })
})
