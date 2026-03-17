import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ReportsPage } from '../ReportsPage'

// Mock the api module
vi.mock('../../utils/api', () => ({
  apiClient: {
    getReports: vi.fn(),
    getCompetitors: vi.fn(),
    getReport: vi.fn(),
    updateReportVisibility: vi.fn(),
  },
}))

const { apiClient } = await import('../../utils/api')

const mockReports = [
  {
    id: 'report-1',
    competitorId: 'comp-1',
    isPublic: false,
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'report-2',
    competitorId: 'comp-2',
    isPublic: true,
    createdAt: new Date('2024-01-11'),
  },
  {
    id: 'report-3',
    competitorId: 'comp-1',
    isPublic: false,
    createdAt: new Date('2024-01-12'),
  },
]

const mockCompetitors = [
  {
    id: 'comp-1',
    name: 'Competitor A',
    url: 'https://example-a.com',
    selectors: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'comp-2',
    name: 'Competitor B',
    url: 'https://example-b.com',
    selectors: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
]

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>
  )
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state initially', () => {
    vi.mocked(apiClient.getReports).mockImplementation(() => new Promise(() => {}))
    vi.mocked(apiClient.getCompetitors).mockImplementation(() => new Promise(() => {}))

    renderWithRouter()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display list of reports', async () => {
    vi.mocked(apiClient.getReports).mockResolvedValue(mockReports)
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('report-1')).toBeInTheDocument()
    })

    expect(screen.getByText('report-2')).toBeInTheDocument()
    expect(screen.getByText('report-3')).toBeInTheDocument()
  })

  it('should display empty state when no reports', async () => {
    vi.mocked(apiClient.getReports).mockResolvedValue([])
    vi.mocked(apiClient.getCompetitors).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/no reports yet/i)).toBeInTheDocument()
    })
  })

  it('should filter reports by competitor', async () => {
    vi.mocked(apiClient.getReports).mockResolvedValue(mockReports)
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('report-1')).toBeInTheDocument()
    })

    // Find the competitor filter
    const filterSelect = screen.getByLabelText(/filter by competitor/i)
    await userEvent.selectOptions(filterSelect, 'comp-1')

    // Only reports for comp-1 should be visible
    expect(screen.getByText('report-1')).toBeInTheDocument()
    expect(screen.getByText('report-3')).toBeInTheDocument()
    expect(screen.queryByText('report-2')).not.toBeInTheDocument()
  })

  it('should toggle report visibility', async () => {
    vi.mocked(apiClient.getReports).mockResolvedValue(mockReports)
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.updateReportVisibility).mockResolvedValue({
      id: 'report-1',
      competitorId: 'comp-1',
      scrapeId: 'scrape-1',
      htmlContent: '',
      jsonData: {},
      isPublic: true,
      createdAt: new Date(),
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('report-1')).toBeInTheDocument()
    })

    // Find the toggle button for the first report
    const toggleButtons = screen.getAllByRole('button', { name: /make public/i })
    await userEvent.click(toggleButtons[0])

    expect(apiClient.updateReportVisibility).toHaveBeenCalledWith('report-1', true)
  })

  it('should display competitor name instead of ID', async () => {
    vi.mocked(apiClient.getReports).mockResolvedValue(mockReports)
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor A')).toBeInTheDocument()
    })

    expect(screen.getByText('Competitor B')).toBeInTheDocument()
  })

  it('should handle API errors', async () => {
    vi.mocked(apiClient.getReports).mockRejectedValue(new Error('Failed to fetch'))
    vi.mocked(apiClient.getCompetitors).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})