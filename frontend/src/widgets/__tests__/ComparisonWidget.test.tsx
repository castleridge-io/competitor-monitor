import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonWidget } from '../ComparisonWidget';

describe('ComparisonWidget', () => {
  const defaultProps = {
    competitorName: 'Test Competitor',
    summary: 'A test competitor for testing',
    pricing: {
      competitor: '$99/month',
    },
    features: [
      { feature: 'API', competitor: true, ours: false },
      { feature: 'Dashboard', competitor: true, ours: true },
      { feature: 'Analytics', competitor: false, ours: true },
    ],
  };

  it('should render competitor name', () => {
    render(<ComparisonWidget {...defaultProps} />);
    expect(screen.getByText('Test Competitor')).toBeInTheDocument();
  });

  it('should render summary', () => {
    render(<ComparisonWidget {...defaultProps} />);
    expect(screen.getByText('A test competitor for testing')).toBeInTheDocument();
  });

  it('should render pricing information', () => {
    render(<ComparisonWidget {...defaultProps} />);
    expect(screen.getByText(/\$99\/month/)).toBeInTheDocument();
  });

  it('should render feature list', () => {
    render(<ComparisonWidget {...defaultProps} />);
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('should render checkmark for competitor features', () => {
    const { container } = render(<ComparisonWidget {...defaultProps} />);
    const checkmarks = container.querySelectorAll('tbody tr td:nth-child(2)');
    expect(checkmarks[0]?.textContent).toBe('✓'); // API - competitor has it
    expect(checkmarks[1]?.textContent).toBe('✓'); // Dashboard - competitor has it
    expect(checkmarks[2]?.textContent).toBe('✗'); // Analytics - competitor doesn't have it
  });

  it('should render checkmark for our features', () => {
    const { container } = render(<ComparisonWidget {...defaultProps} />);
    const checkmarks = container.querySelectorAll('tbody tr td:nth-child(3)');
    expect(checkmarks[0]?.textContent).toBe('✗'); // API - we don't have it
    expect(checkmarks[1]?.textContent).toBe('✓'); // Dashboard - we have it
    expect(checkmarks[2]?.textContent).toBe('✓'); // Analytics - we have it
  });

  it('should apply light theme by default', () => {
    const { container } = render(<ComparisonWidget {...defaultProps} />);
    const widget = container.querySelector('.competitor-monitor-comparison');
    expect(widget).toHaveClass('theme-light');
  });

  it('should apply dark theme when specified', () => {
    const { container } = render(<ComparisonWidget {...defaultProps} theme="dark" />);
    const widget = container.querySelector('.competitor-monitor-comparison');
    expect(widget).toHaveClass('theme-dark');
  });

  it('should render without summary', () => {
    render(<ComparisonWidget {...defaultProps} summary={undefined} />);
    expect(screen.getByText('Test Competitor')).toBeInTheDocument();
    expect(screen.queryByText('A test competitor for testing')).not.toBeInTheDocument();
  });

  it('should render without pricing', () => {
    render(<ComparisonWidget {...defaultProps} pricing={undefined} />);
    expect(screen.getByText('Test Competitor')).toBeInTheDocument();
    expect(screen.queryByText(/\$99\/month/)).not.toBeInTheDocument();
  });

  it('should handle empty features array', () => {
    render(<ComparisonWidget {...defaultProps} features={[]} />);
    expect(screen.getByText('Test Competitor')).toBeInTheDocument();
  });
});
