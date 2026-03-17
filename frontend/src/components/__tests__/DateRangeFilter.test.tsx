import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeFilter } from '../DateRangeFilter'

describe('DateRangeFilter', () => {
  it('should render all date range buttons', () => {
    const mockOnChange = vi.fn()
    render(<DateRangeFilter value={30} onChange={mockOnChange} />)

    expect(screen.getByText('7d')).toBeInTheDocument()
    expect(screen.getByText('30d')).toBeInTheDocument()
    expect(screen.getByText('90d')).toBeInTheDocument()
    expect(screen.getByText('1y')).toBeInTheDocument()
  })

  it('should highlight the selected date range', () => {
    const mockOnChange = vi.fn()
    render(<DateRangeFilter value={30} onChange={mockOnChange} />)

    const button30d = screen.getByText('30d')
    expect(button30d).toHaveClass('bg-primary-600')
    expect(button30d).toHaveClass('text-white')
  })

  it('should call onChange when button is clicked', () => {
    const mockOnChange = vi.fn()
    render(<DateRangeFilter value={30} onChange={mockOnChange} />)

    const button7d = screen.getByText('7d')
    fireEvent.click(button7d)

    expect(mockOnChange).toHaveBeenCalledWith(7)
  })

  it('should update highlight when value changes', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<DateRangeFilter value={30} onChange={mockOnChange} />)

    let button7d = screen.getByText('7d')
    expect(button7d).not.toHaveClass('bg-primary-600')

    rerender(<DateRangeFilter value={7} onChange={mockOnChange} />)

    button7d = screen.getByText('7d')
    expect(button7d).toHaveClass('bg-primary-600')

    const button30d = screen.getByText('30d')
    expect(button30d).not.toHaveClass('bg-primary-600')
  })

  it('should have accessible labels', () => {
    const mockOnChange = vi.fn()
    render(<DateRangeFilter value={30} onChange={mockOnChange} />)

    expect(screen.getByLabelText('7 days')).toBeInTheDocument()
    expect(screen.getByLabelText('30 days')).toBeInTheDocument()
    expect(screen.getByLabelText('90 days')).toBeInTheDocument()
    expect(screen.getByLabelText('1 year')).toBeInTheDocument()
  })

  it('should apply custom className if provided', () => {
    const mockOnChange = vi.fn()
    const { container } = render(
      <DateRangeFilter value={30} onChange={mockOnChange} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})