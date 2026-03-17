import clsx from 'clsx'

interface DateRangeFilterProps {
  value: number
  onChange: (days: number) => void
  className?: string
}

const DATE_RANGES = [
  { label: '7d', days: 7, ariaLabel: '7 days' },
  { label: '30d', days: 30, ariaLabel: '30 days' },
  { label: '90d', days: 90, ariaLabel: '90 days' },
  { label: '1y', days: 365, ariaLabel: '1 year' },
]

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  return (
    <div className={clsx('flex gap-2', className)}>
      {DATE_RANGES.map((range) => (
        <button
          key={range.days}
          onClick={() => onChange(range.days)}
          aria-label={range.ariaLabel}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            value === range.days
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}