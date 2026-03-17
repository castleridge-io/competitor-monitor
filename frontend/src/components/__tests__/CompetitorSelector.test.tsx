import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompetitorSelector } from '../CompetitorSelector'
import type { Competitor } from '../../types'

const mockCompetitors: Competitor[] = [
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
  {
    id: 'comp-3',
    name: 'Competitor 3',
    url: 'https://example3.com',
    selectors: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
]

describe('CompetitorSelector', () => {
  it('should render all competitors as checkboxes', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={[]}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByLabelText('Competitor 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Competitor 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Competitor 3')).toBeInTheDocument()
  })

  it('should check selected competitors', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={['comp-1', 'comp-2']}
        onChange={mockOnChange}
      />
    )

    const checkbox1 = screen.getByLabelText('Competitor 1') as HTMLInputElement
    const checkbox2 = screen.getByLabelText('Competitor 2') as HTMLInputElement
    const checkbox3 = screen.getByLabelText('Competitor 3') as HTMLInputElement

    expect(checkbox1.checked).toBe(true)
    expect(checkbox2.checked).toBe(true)
    expect(checkbox3.checked).toBe(false)
  })

  it('should call onChange when checkbox is toggled', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={['comp-1']}
        onChange={mockOnChange}
      />
    )

    const checkbox2 = screen.getByLabelText('Competitor 2')
    fireEvent.click(checkbox2)

    expect(mockOnChange).toHaveBeenCalledWith(['comp-1', 'comp-2'])
  })

  it('should remove competitor when unchecked', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={['comp-1', 'comp-2']}
        onChange={mockOnChange}
      />
    )

    const checkbox1 = screen.getByLabelText('Competitor 1')
    fireEvent.click(checkbox1)

    expect(mockOnChange).toHaveBeenCalledWith(['comp-2'])
  })

  it('should display "Select All" button', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={[]}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Select All')).toBeInTheDocument()
  })

  it('should select all competitors when "Select All" is clicked', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={[]}
        onChange={mockOnChange}
      />
    )

    const selectAllButton = screen.getByText('Select All')
    fireEvent.click(selectAllButton)

    expect(mockOnChange).toHaveBeenCalledWith(['comp-1', 'comp-2', 'comp-3'])
  })

  it('should display "Clear All" button when some competitors are selected', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={['comp-1']}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('should clear all competitors when "Clear All" is clicked', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={['comp-1', 'comp-2']}
        onChange={mockOnChange}
      />
    )

    const clearAllButton = screen.getByText('Clear All')
    fireEvent.click(clearAllButton)

    expect(mockOnChange).toHaveBeenCalledWith([])
  })

  it('should display count of selected competitors', () => {
    const mockOnChange = vi.fn()
    render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={['comp-1', 'comp-2']}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument()
  })

  it('should apply custom className if provided', () => {
    const mockOnChange = vi.fn()
    const { container } = render(
      <CompetitorSelector
        competitors={mockCompetitors}
        selectedIds={[]}
        onChange={mockOnChange}
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})