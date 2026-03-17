import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CompetitorsPage } from '../CompetitorsPage'

// Mock the api module
vi.mock('../../utils/api', () => ({
  apiClient: {
    getCompetitors: vi.fn(),
    createCompetitor: vi.fn(),
    updateCompetitor: vi.fn(),
    deleteCompetitor: vi.fn(),
    triggerScrape: vi.fn(),
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

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <CompetitorsPage />
    </MemoryRouter>
  )
}

describe('CompetitorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state initially', () => {
    vi.mocked(apiClient.getCompetitors).mockImplementation(() => new Promise(() => {}))

    renderWithRouter()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display list of competitors', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor A')).toBeInTheDocument()
    })

    expect(screen.getByText('Competitor B')).toBeInTheDocument()
    expect(screen.getByText('https://example-a.com')).toBeInTheDocument()
    expect(screen.getByText('https://example-b.com')).toBeInTheDocument()
  })

  it('should display empty state when no competitors', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/no competitors yet/i)).toBeInTheDocument()
    })
  })

  it('should open add competitor modal', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue([])

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/no competitors yet/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Add Competitor'))

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
  })

  it('should create a new competitor', async () => {
    vi.mocked(apiClient.getCompetitors)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '1',
          name: 'New Competitor',
          url: 'https://new.com',
          selectors: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

    vi.mocked(apiClient.createCompetitor).mockResolvedValue({
      id: '1',
      name: 'New Competitor',
      url: 'https://new.com',
      selectors: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/no competitors yet/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Add Competitor'))

    await userEvent.type(screen.getByLabelText(/name/i), 'New Competitor')
    await userEvent.type(screen.getByLabelText(/url/i), 'https://new.com')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(apiClient.createCompetitor).toHaveBeenCalledWith({
      name: 'New Competitor',
      url: 'https://new.com',
    })
  })

  it('should delete a competitor', async () => {
    window.confirm = vi.fn().mockReturnValue(true)
    vi.mocked(apiClient.getCompetitors)
      .mockResolvedValueOnce(mockCompetitors)
      .mockResolvedValueOnce([mockCompetitors[1]])

    vi.mocked(apiClient.deleteCompetitor).mockResolvedValue(undefined)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor A')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])

    expect(apiClient.deleteCompetitor).toHaveBeenCalledWith('1')
  })

  it('should trigger scrape for competitor', async () => {
    vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
    vi.mocked(apiClient.triggerScrape).mockResolvedValue({
      scrapeId: 'scrape-1',
      reportId: 'report-1',
      data: { price: 99.99 },
      reportUrl: '/public/reports/report-1',
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Competitor A')).toBeInTheDocument()
    })

    const scrapeButtons = screen.getAllByRole('button', { name: /scrape/i })
    await userEvent.click(scrapeButtons[0])

    expect(apiClient.triggerScrape).toHaveBeenCalledWith('1')
  })

  it('should display error message on API failure', async () => {
    vi.mocked(apiClient.getCompetitors).mockRejectedValue(new Error('Failed to fetch'))

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})