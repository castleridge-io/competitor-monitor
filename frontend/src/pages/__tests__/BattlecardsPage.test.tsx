import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BattlecardsPage } from '../BattlecardsPage'
import { apiClient } from '../../utils/api'
import type { Competitor, Battlecard } from '../../types'

// Mock apiClient
vi.mock('../../utils/api', () => ({
  apiClient: {
    getCompetitors: vi.fn(),
    getBattlecards: vi.fn(),
    getBattlecard: vi.fn(),
    generateBattlecard: vi.fn(),
    updateBattlecard: vi.fn(),
    deleteBattlecard: vi.fn(),
    getBattlecardsForCompetitor: vi.fn(),
  },
}))

const mockCompetitors: Competitor[] = [
  {
    id: 'comp-1',
    name: 'Competitor Alpha',
    url: 'https://alpha.example.com',
    selectors: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'comp-2',
    name: 'Competitor Beta',
    url: 'https://beta.example.com',
    selectors: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const mockBattlecards: Battlecard[] = [
  {
    id: 'bc-1',
    competitorId: 'comp-1',
    competitorName: 'Competitor Alpha',
    title: 'Battlecard: Competitor Alpha',
    summary: 'Alpha is a strong competitor with market presence.',
    strengths: ['Strong brand recognition', 'Large customer base'],
    weaknesses: ['Higher pricing', 'Slower support response'],
    pricing: {
      competitor: '$199/month',
      ours: '$149/month',
      difference: '$50/month savings',
      analysis: 'We offer better value for money',
    },
    features: [
      { feature: 'API Access', competitor: true, ours: true, notes: 'Parity' },
      { feature: 'Advanced Analytics', competitor: true, ours: false, notes: 'Gap' },
    ],
    winStrategies: ['Emphasize cost savings', 'Highlight faster support'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
]

describe('BattlecardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading States', () => {
    it('should show loading state initially', async () => {
      vi.mocked(apiClient.getCompetitors).mockReturnValue(new Promise(() => {}))
      vi.mocked(apiClient.getBattlecards).mockReturnValue(new Promise(() => {}))

      render(<BattlecardsPage />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show message when no competitors exist', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue([])
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/No competitors available/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Battlecards List', () => {
    it('should display battlecards list', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Competitive Battlecards')).toBeInTheDocument()
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
        expect(screen.getByText('Alpha is a strong competitor with market presence.')).toBeInTheDocument()
      })
    })

    it('should show empty state when no battlecards exist', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText(/No battlecards yet/i)).toBeInTheDocument()
      })
    })

    it('should filter battlecards by competitor', async () => {
      const battlecards: Battlecard[] = [
        {
          id: 'bc-1',
          competitorId: 'comp-1',
          competitorName: 'Competitor Alpha',
          title: 'Alpha Battlecard',
          summary: 'Summary 1',
          strengths: [],
          weaknesses: [],
          pricing: { competitor: '', ours: '', difference: '', analysis: '' },
          features: [],
          winStrategies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bc-2',
          competitorId: 'comp-2',
          competitorName: 'Competitor Beta',
          title: 'Beta Battlecard',
          summary: 'Summary 2',
          strengths: [],
          weaknesses: [],
          pricing: { competitor: '', ours: '', difference: '', analysis: '' },
          features: [],
          winStrategies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(battlecards)

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Alpha Battlecard')).toBeInTheDocument()
        expect(screen.getByText('Beta Battlecard')).toBeInTheDocument()
      })

      // Filter by comp-1
      const filterSelect = document.getElementById('filter-competitor')
      if (filterSelect) {
        fireEvent.change(filterSelect, { target: { value: 'comp-1' } })
      }

      await waitFor(() => {
        expect(screen.getByText('Alpha Battlecard')).toBeInTheDocument()
        expect(screen.queryByText('Beta Battlecard')).not.toBeInTheDocument()
      })
    })
  })

  describe('Battlecard Detail View', () => {
    it('should display battlecard details when selected', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      // Click on battlecard
      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))

      await waitFor(() => {
        expect(screen.getByText('Strengths')).toBeInTheDocument()
        expect(screen.getByText('Weaknesses')).toBeInTheDocument()
        expect(screen.getByText('Win Strategies')).toBeInTheDocument()
        expect(screen.getByText('Strong brand recognition')).toBeInTheDocument()
      })
    })

    it('should show pricing comparison', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))

      await waitFor(() => {
        expect(screen.getByText('Pricing Comparison')).toBeInTheDocument()
        expect(screen.getByText('$199/month')).toBeInTheDocument()
        expect(screen.getByText('$149/month')).toBeInTheDocument()
      })
    })

    it('should show feature comparison table', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))

      await waitFor(() => {
        expect(screen.getByText('Feature Comparison')).toBeInTheDocument()
        expect(screen.getByText('API Access')).toBeInTheDocument()
        expect(screen.getByText('Advanced Analytics')).toBeInTheDocument()
      })
    })

    it('should show no selection message when no battlecard selected', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText(/No battlecard selected/i)).toBeInTheDocument()
      })
    })
  })

  describe('Generate Dialog', () => {
    it('should open generate dialog when clicking Generate New button', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Generate New')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Generate New'))

      await waitFor(() => {
        expect(screen.getByText('Generate Battlecard')).toBeInTheDocument()
        expect(screen.getByText('Select Competitor')).toBeInTheDocument()
      })
    })

    it('should generate battlecard from dialog', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])
      vi.mocked(apiClient.generateBattlecard).mockResolvedValue(mockBattlecards[0])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Generate New')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Generate New'))

      await waitFor(() => {
        expect(screen.getByText('Generate Battlecard')).toBeInTheDocument()
      })

      // Select competitor
      const select = document.getElementById('generate-competitor')
      if (select) {
        fireEvent.change(select, { target: { value: 'comp-1' } })
      }

      // Click generate
      fireEvent.click(screen.getByText('Generate'))

      await waitFor(() => {
        expect(apiClient.generateBattlecard).toHaveBeenCalledWith({
          competitorId: 'comp-1',
        })
      })
    })

    it('should show error when generating without selecting competitor', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Generate New')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Generate New'))

      await waitFor(() => {
        expect(screen.getByText('Generate Battlecard')).toBeInTheDocument()
      })

      // Don't select competitor, just click generate
      fireEvent.click(screen.getByText('Generate'))

      // Should not call API
      expect(apiClient.generateBattlecard).not.toHaveBeenCalled()
    })

    it('should close dialog on cancel', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Generate New')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Generate New'))

      await waitFor(() => {
        expect(screen.getByText('Generate Battlecard')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByText('Generate Battlecard')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edit Functionality', () => {
    it('should enter edit mode when clicking Edit button', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Edit'))

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
    })

    it('should save edits', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])
      vi.mocked(apiClient.updateBattlecard).mockResolvedValue({
        ...mockBattlecards[0],
        title: 'Updated Title',
      })

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))
      fireEvent.click(screen.getByText('Edit'))

      // Change title
      const titleInput = screen.getByDisplayValue('Battlecard: Competitor Alpha')
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

      // Save
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(apiClient.updateBattlecard).toHaveBeenCalled()
      })
    })

    it('should cancel edits', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))
      fireEvent.click(screen.getByText('Edit'))

      // Change title
      const titleInput = screen.getByDisplayValue('Battlecard: Competitor Alpha')
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

      // Cancel
      fireEvent.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
        expect(screen.queryByText('Save')).not.toBeInTheDocument()
      })
    })
  })

  describe('Delete Functionality', () => {
    it('should delete battlecard', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.deleteBattlecard).mockResolvedValue()
      vi.mocked(apiClient.getBattlecards).mockResolvedValueOnce(mockBattlecards).mockResolvedValue([])

      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      // Click delete button
      const deleteButton = screen.getByTitle('Delete')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(apiClient.deleteBattlecard).toHaveBeenCalledWith('bc-1')
      })
    })

    it('should not delete when user cancels', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)

      vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTitle('Delete')
      fireEvent.click(deleteButton)

      expect(apiClient.deleteBattlecard).not.toHaveBeenCalled()
    })
  })

  describe('Export Functionality', () => {
    it('should call window.print on export', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])

      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))

      await waitFor(() => {
        expect(screen.getByText('Export PDF')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Export PDF'))

      expect(printSpy).toHaveBeenCalled()

      printSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when loading fails', async () => {
      vi.mocked(apiClient.getCompetitors).mockRejectedValue(new Error('Failed to load'))

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument()
      })
    })

    it('should display error when generation fails', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])
      vi.mocked(apiClient.generateBattlecard).mockRejectedValue(new Error('Generation failed'))

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Generate New')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Generate New'))

      await waitFor(() => {
        expect(screen.getByText('Generate Battlecard')).toBeInTheDocument()
      })

      const select = document.getElementById('generate-competitor')
      if (select) {
        fireEvent.change(select, { target: { value: 'comp-1' } })
      }

      fireEvent.click(screen.getByText('Generate'))

      await waitFor(() => {
        expect(screen.getByText(/Generation failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('UI Elements', () => {
    it('should display all section headers', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)
      vi.mocked(apiClient.getBattlecard).mockResolvedValue(mockBattlecards[0])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Battlecard: Competitor Alpha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Battlecard: Competitor Alpha'))

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument()
        expect(screen.getByText('Strengths')).toBeInTheDocument()
        expect(screen.getByText('Weaknesses')).toBeInTheDocument()
        expect(screen.getByText('Pricing Comparison')).toBeInTheDocument()
        expect(screen.getByText('Feature Comparison')).toBeInTheDocument()
        expect(screen.getByText('Win Strategies')).toBeInTheDocument()
      })
    })

    it('should display Generate New button', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue([])

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(screen.getByText('Generate New')).toBeInTheDocument()
      })
    })

    it('should display filter dropdown', async () => {
      vi.mocked(apiClient.getCompetitors).mockResolvedValue(mockCompetitors)
      vi.mocked(apiClient.getBattlecards).mockResolvedValue(mockBattlecards)

      render(<BattlecardsPage />)

      await waitFor(() => {
        expect(document.getElementById('filter-competitor')).toBeInTheDocument()
      })
    })
  })
})
