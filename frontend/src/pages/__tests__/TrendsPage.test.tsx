import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TrendsPage } from '../TrendsPage'

// Mock the api module
vi.mock('../../utils/api', () => ({
  apiClient: {
    getCompetitors: vi.fn(),
    getHistoricalTrends: vi.fn(),
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

const mockTrendsData = [
  {
    id: 'scrape-1',
    competitorId: 'comp-1',
    competitorName: 'Competitor 1',
    data: { price: 100 },
    scrapedAt: new Date('2024-01-01'),
  },
  {
    id: 'scrape-2',
    competitorId: 'comp-2',
    competitorName: 'Competitor 2',
    data: { price: 200 },
    scrapedAt: new Date('2024-01-01'),
  },
]

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <TrendsPage />
    </MemoryRouter>
  )
}

describe('TrendsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state initially', () => {
    vi.mocked(apiClient.getCompetitors).mockImplementation(() => new Promise(() => {}))
    vi.mocked(apiClient.getHistoricalTrends).mockImplementation(() => new Promise(() => {}))

    renderWithRouter()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display page title and description', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Historical Trends')).toBeInTheDocument()
    })

    expect(screen.getByText('Track competitor price changes over time')).toBeInTheDocument()
  })

  it('should display date range filter', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument()
    })
    expect(screen.getByText('30d')).toBeInTheDocument()
    expect(screen.getByText('90d')).toBeInTheDocument()
    expect(screen.getByText('1y')).toBeInTheDocument()
  })

  it('should display competitor selector', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByLabelText('Competitor 1')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Competitor 2')).toBeInTheDocument()
  })

  it('should fetch trends data when competitors are selected', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue(mockTrendsData)

    renderWithRouter()

    await waitFor(() => {
      expect(apiClient.getHistoricalTrends).toHaveBeenCalled()
    })
  })

  it('should update date range when filter is changed', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument()
    })

    const button7d = screen.getByText('7d')
    fireEvent.click(button7d)

    await waitFor(() => {
      expect(apiClient.getHistoricalTrends).toHaveBeenCalledWith(
        expect.objectContaining({ days: 7 })
      )
    })
  })

  it('should display chart when data is loaded', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue(mockTrendsData)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Price Trends')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(apiClient.getCompetitors).mockRejectedValue(new Error('API Error'))
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('should display empty state when no competitors available', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue([])
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/no competitors available/i)).toBeInTheDocument()
    })
  })

  it('should be responsive with mobile-friendly layout', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getHistoricalTrends).mockResolvedValue(mockTrendsData)

    const { container } = renderWithRouter()

    await waitFor(() => {
      expect(container.querySelector('.space-y-6')).toBeInTheDocument()
    })
  })
})