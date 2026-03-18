import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ClonePage } from '../ClonePage'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <ClonePage />
    </MemoryRouter>
  )
}

describe('ClonePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the clone page with input fields', () => {
    renderWithRouter()

    expect(screen.getByText('Clone Competitor')).toBeInTheDocument()
    expect(screen.getByLabelText('Competitor URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Features (optional, for gap analysis)')).toBeInTheDocument()
    expect(screen.getByText('Quick Scan')).toBeInTheDocument()
    expect(screen.getByText('Analyze Competitor')).toBeInTheDocument()
  })

  it('should display error when URL is empty', async () => {
    renderWithRouter()

    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Please enter a competitor URL')).toBeInTheDocument()
    })
  })

  it('should display error when quick scan URL is empty', async () => {
    renderWithRouter()

    await userEvent.click(screen.getByText('Quick Scan'))

    await waitFor(() => {
      expect(screen.getByText('Please enter a competitor URL')).toBeInTheDocument()
    })
  })

  it('should perform quick scan successfully', async () => {
    const mockQuickScanResponse = {
      summary: {
        name: 'Test Competitor',
        url: 'https://test.com',
        featureCount: 5,
        techStackCount: 3,
        hasPricing: true,
      },
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      techStack: ['React', 'Node.js', 'PostgreSQL'],
      pricing: '$99/month',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockQuickScanResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Quick Scan'))

    await waitFor(() => {
      expect(screen.getByText('Quick Scan Results')).toBeInTheDocument()
    })

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Feature 1')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('should display error when quick scan fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to scan' }),
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Quick Scan'))

    await waitFor(() => {
      expect(screen.getByText('Failed to scan')).toBeInTheDocument()
    })
  })

  it('should perform full analysis successfully', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Test Competitor',
        url: 'https://test.com',
        features: ['Feature A', 'Feature B', 'Feature C'],
        techStack: ['React', 'TypeScript'],
        pricing: '$49/month',
        metadata: {
          title: 'Test Site',
          description: 'A test competitor',
        },
        scrapedAt: new Date().toISOString(),
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Detected Features: Test Competitor')).toBeInTheDocument()
    })

    expect(screen.getByText('Feature A')).toBeInTheDocument()
    expect(screen.getByText('$49/month')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('should display gap analysis when user features provided', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Competitor X',
        url: 'https://competitor-x.com',
        features: ['Feature A', 'Feature B', 'Feature C'],
        techStack: ['React'],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
      gapAnalysis: {
        missingFeatures: ['Feature A', 'Feature B'],
        competitiveAdvantages: ['Feature D'],
        recommendations: ['Consider implementing Feature A'],
        overlapPercentage: 25,
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://competitor-x.com')
    await userEvent.type(
      screen.getByLabelText('Your Features (optional, for gap analysis)'),
      'Feature C\nFeature D'
    )
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Gap Analysis')).toBeInTheDocument()
    })

    expect(screen.getByText('Missing Features (2)')).toBeInTheDocument()
    expect(screen.getByText('Your Advantages (1)')).toBeInTheDocument()
    expect(screen.getByText('Feature Overlap')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('should show add to tracking option after analysis', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Test Competitor',
        url: 'https://test.com',
        features: ['Feature 1'],
        techStack: [],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add to Tracking' })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: 'Add to Tracking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not Now' })).toBeInTheDocument()
  })

  it('should add competitor to tracking successfully', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Test Competitor',
        url: 'https://test.com',
        features: ['Feature 1'],
        techStack: [],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
    }

    const mockAddResponse = {
      id: 'test-id',
      name: 'Test Competitor',
      url: 'https://test.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyzeResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAddResponse,
      })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add to Tracking' })).toBeInTheDocument()
    })

    // Mock alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

    await userEvent.click(screen.getByRole('button', { name: 'Add to Tracking' }))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Successfully added "Test Competitor" to tracking!')
    })

    alertMock.mockRestore()
  })

  it('should display error when add to tracking fails', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Test Competitor',
        url: 'https://test.com',
        features: ['Feature 1'],
        techStack: [],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyzeResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to add' }),
      })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add to Tracking' })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Add to Tracking' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to add')).toBeInTheDocument()
    })
  })

  it('should display loading state during analysis', async () => {
    // Create a promise that we can control
    let resolveFetch: () => void
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    mockFetch.mockImplementation(() => fetchPromise)

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    // Give React time to update state
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(screen.getByText('Analyzing...')).toBeInTheDocument()

    // Clean up - resolve the promise
    if (resolveFetch) resolveFetch()
  })

  it('should display loading state during quick scan', async () => {
    // Create a promise that we can control
    let resolveFetch: () => void
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    mockFetch.mockImplementation(() => fetchPromise)

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Quick Scan'))

    // Give React time to update state
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(screen.getByText('Scanning...')).toBeInTheDocument()

    // Clean up - resolve the promise
    if (resolveFetch) resolveFetch()
  })

  it('should not disable buttons when URL is empty (validation happens on click)', () => {
    renderWithRouter()

    // Buttons are not disabled - validation happens in the handler
    expect(screen.getByText('Quick Scan')).not.toBeDisabled()
    expect(screen.getByText('Analyze Competitor')).not.toBeDisabled()
  })

  it('should disable buttons during loading', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument()
    })

    expect(screen.getByText('Analyzing...')).toBeDisabled()
  })

  it('should display AI recommendations when available', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Competitor Y',
        url: 'https://competitor-y.com',
        features: ['Feature A'],
        techStack: [],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
      gapAnalysis: {
        missingFeatures: ['Feature A'],
        competitiveAdvantages: [],
        recommendations: ['Implement Feature A'],
        overlapPercentage: 0,
        aiRecommendations: 'Based on market analysis, Feature A is critical for competitive parity...',
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://competitor-y.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('AI Analysis')).toBeInTheDocument()
    })

    expect(screen.getByText(/Based on market analysis/)).toBeInTheDocument()
  })

  it('should display tech stack badges', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Tech Site',
        url: 'https://tech-site.com',
        features: [],
        techStack: ['React', 'Node.js', 'PostgreSQL'],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://tech-site.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Tech Stack')).toBeInTheDocument()
    })

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
  })

  it('should display pricing information when available', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Pricing Site',
        url: 'https://pricing-site.com',
        features: [],
        techStack: [],
        pricing: '$99/month - Enterprise plans available',
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://pricing-site.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Pricing')).toBeInTheDocument()
    })

    expect(screen.getByText('$99/month - Enterprise plans available')).toBeInTheDocument()
  })

  it('should clear results when starting new analysis', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Test',
        url: 'https://test.com',
        features: [],
        techStack: [],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Detected Features: Test')).toBeInTheDocument()
    })

    // Clear and start new analysis
    await userEvent.clear(screen.getByLabelText('Competitor URL'))
    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://new-test.com')
    
    // Create a pending promise for the second request
    let resolveFetch: () => void
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    mockFetch.mockImplementationOnce(() => fetchPromise)

    await userEvent.click(screen.getByText('Analyze Competitor'))

    // Give React time to update state
    await new Promise(resolve => setTimeout(resolve, 50))

    // Previous results should be cleared during loading
    expect(screen.getByText('Analyzing...')).toBeInTheDocument()

    // Clean up
    if (resolveFetch) resolveFetch()
  })

  it('should handle analysis error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Network error' }),
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://test.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should handle empty features array gracefully', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Empty Site',
        url: 'https://empty.com',
        features: [],
        techStack: [],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://empty.com')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('Detected Features: Empty Site')).toBeInTheDocument()
    })

    // Should not crash with empty arrays - component renders without errors
    expect(screen.getByText('https://empty.com')).toBeInTheDocument()
  })

  it('should display feature overlap progress bar', async () => {
    const mockAnalyzeResponse = {
      detectedFeatures: {
        name: 'Overlap Test',
        url: 'https://overlap.com',
        features: ['A', 'B', 'C'],
        techStack: [],
        pricing: null,
        metadata: {},
        scrapedAt: new Date().toISOString(),
      },
      gapAnalysis: {
        missingFeatures: ['A'],
        competitiveAdvantages: ['D'],
        recommendations: [],
        overlapPercentage: 50,
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyzeResponse,
    })

    renderWithRouter()

    await userEvent.type(screen.getByLabelText('Competitor URL'), 'https://overlap.com')
    await userEvent.type(screen.getByLabelText('Your Features (optional, for gap analysis)'), 'B\nD')
    await userEvent.click(screen.getByText('Analyze Competitor'))

    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    // Check progress bar exists
    const progressBar = document.querySelector('.bg-blue-600')
    expect(progressBar).toBeInTheDocument()
  })
})
