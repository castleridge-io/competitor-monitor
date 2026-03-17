import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiCompetitorChart } from '../MultiCompetitorChart'

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
    competitorId: 'comp-1',
    competitorName: 'Competitor 1',
    data: { price: 110 },
    scrapedAt: new Date('2024-01-02'),
  },
  {
    id: 'scrape-3',
    competitorId: 'comp-2',
    competitorName: 'Competitor 2',
    data: { price: 200 },
    scrapedAt: new Date('2024-01-01'),
  },
  {
    id: 'scrape-4',
    competitorId: 'comp-2',
    competitorName: 'Competitor 2',
    data: { price: 210 },
    scrapedAt: new Date('2024-01-02'),
  },
]

describe('MultiCompetitorChart', () => {
  it('should render chart container', () => {
    render(<MultiCompetitorChart data={mockTrendsData} />)

    expect(screen.getByText('Price Trends')).toBeInTheDocument()
  })

  it('should display message when no data available', () => {
    render(<MultiCompetitorChart data={[]} />)

    expect(screen.getByText('No price history available. Select competitors and run scrapes to collect data.')).toBeInTheDocument()
  })

  it('should filter out data points without price', () => {
    const dataWithoutPrice = [
      {
        id: 'scrape-1',
        competitorId: 'comp-1',
        competitorName: 'Competitor 1',
        data: { title: 'Product' }, // no price
        scrapedAt: new Date('2024-01-01'),
      },
    ]

    render(<MultiCompetitorChart data={dataWithoutPrice} />)

    expect(screen.getByText('No price history available. Select competitors and run scrapes to collect data.')).toBeInTheDocument()
  })

  it('should apply custom className if provided', () => {
    const { container } = render(<MultiCompetitorChart data={mockTrendsData} className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should render chart with multiple competitors', () => {
    const { container } = render(<MultiCompetitorChart data={mockTrendsData} />)

    // Check that the chart container is rendered
    const chartContainer = container.querySelector('.recharts-wrapper')
    expect(chartContainer).toBeInTheDocument()
  })

  it('should handle data for single competitor', () => {
    const singleCompetitorData = mockTrendsData.filter(d => d.competitorId === 'comp-1')

    const { container } = render(<MultiCompetitorChart data={singleCompetitorData} />)

    const chartContainer = container.querySelector('.recharts-wrapper')
    expect(chartContainer).toBeInTheDocument()
  })

  it('should sort data by date', () => {
    const unsortedData = [
      {
        id: 'scrape-1',
        competitorId: 'comp-1',
        competitorName: 'Competitor 1',
        data: { price: 110 },
        scrapedAt: new Date('2024-01-02'),
      },
      {
        id: 'scrape-2',
        competitorId: 'comp-1',
        competitorName: 'Competitor 1',
        data: { price: 100 },
        scrapedAt: new Date('2024-01-01'),
      },
    ]

    const { container } = render(<MultiCompetitorChart data={unsortedData} />)

    // Chart should still render without errors
    const chartContainer = container.querySelector('.recharts-wrapper')
    expect(chartContainer).toBeInTheDocument()
  })
})