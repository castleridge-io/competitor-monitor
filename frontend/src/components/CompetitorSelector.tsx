import clsx from 'clsx'
import type { Competitor } from '../types'

interface CompetitorSelectorProps {
  competitors: Competitor[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  className?: string
}

export function CompetitorSelector({
  competitors,
  selectedIds,
  onChange,
  className,
}: CompetitorSelectorProps) {
  const handleToggle = (competitorId: string) => {
    if (selectedIds.includes(competitorId)) {
      onChange(selectedIds.filter(id => id !== competitorId))
    } else {
      onChange([...selectedIds, competitorId])
    }
  }

  const handleSelectAll = () => {
    onChange(competitors.map(c => c.id))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const allSelected = selectedIds.length === competitors.length
  const someSelected = selectedIds.length > 0

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {selectedIds.length} of {competitors.length} selected
        </span>
        <div className="flex gap-2">
          {!allSelected && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Select All
            </button>
          )}
          {someSelected && (
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {competitors.map((competitor) => (
          <label
            key={competitor.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(competitor.id)}
              onChange={() => handleToggle(competitor.id)}
              aria-label={competitor.name}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-900">
              {competitor.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}