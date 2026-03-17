import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardOverview } from '../DashboardOverview'

// Mock the api module
vi.mock('../../utils/api', () => ({
  apiClient: {
    getCompetitors: vi.fn(),
    getReports: vi.fn(),
    getScrapeHistory: vi.fn(),
  },
}))

const { apiClient } = await import('../../utils/api')

const mockCompetitors = [
  {
    id: '1',
    name: 'Competitor A',
    url: 'https://example-a.com',
    selectors: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Competitor B',
    url: 'https://example-b.com',
    selectors: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
]

const mockReports = [
  {
    id: 'report-1',
    competitorId: '1',
    isPublic: false,
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'report-2',
    competitorId: '2',
    isPublic: true,
    createdAt: new Date('2024-01-11'),
  },
]

const mockScrapes = [
  {
    id: 'scrape-1',
    competitorId: '1',
    data: { price: 99.99 },
    scrapedAt: new Date('2024-01-10'),
  },
]

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <DashboardOverview />
    </MemoryRouter>
  )
}

describe('DashboardOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state initially', () => {
    vi.mocked(apiClient.getCompetitors).mockImplementation(() => new Promise(() => {}))
    vi.mocked(apiClient.getReports).mockResolvedValue([])
    vi.mocked(apiClient.getScrapeHistory).mockResolvedValue([])

    renderWithRouter()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display dashboard stats after loading', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getReports).mockResolvedValue(mockReports)
    vi.mocked(apiClient.getScrapeHistory).mockResolvedValue(mockScrapes)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Total competitors
    })

    expect(screen.getByText('Total Competitors')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Total reports
    expect(screen.getByText('Total Reports')).toBeInTheDocument()
  })

  it('should display recent activity section', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getReports).mockResolvedValue(mockReports)
    vi.mocked(apiClient.getScrapeHistory).mockResolvedValue(mockScrapes)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })
  })

  it('should display quick actions section', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.getReports).mockResolvedValue(mockReports)
    vi.mocked(apiClient.getScrapeHistory).mockResolvedValue(mockScrapes)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    expect(screen.getByText('Add Competitor')).toBeInTheDocument()
    expect(screen.getByText('Run Scrape')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(apiClient.getCompetitors).mockRejectedValue(new Error('API Error'))
    vi.mocked(apiClient.getReports).mockResolvedValue([])
    vi.mocked(apiClient.getScrapeHistory).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})