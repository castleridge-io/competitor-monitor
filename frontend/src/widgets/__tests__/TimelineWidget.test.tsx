import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineWidget } from '../TimelineWidget';

describe('TimelineWidget', () => {
  const defaultProps = {
    competitorName: 'Test Competitor',
    changes: [
      {
        id: '1',
        narrative: 'Price changed from $89 to $99',
        date: new Date('2024-01-15'),
      },
      {
        id: '2',
        narrative: 'New feature added',
        date: new Date('2024-01-10'),
      },
    ],
  };

  it('should render competitor name', () => {
    render(<TimelineWidget {...defaultProps} />);
    expect(screen.getByText('Test Competitor')).toBeInTheDocument();
  });

  it('should render all changes', () => {
    render(<TimelineWidget {...defaultProps} />);
    expect(screen.getByText('Price changed from $89 to $99')).toBeInTheDocument();
    expect(screen.getByText('New feature added')).toBeInTheDocument();
  });

  it('should render change dates', () => {
    render(<TimelineWidget {...defaultProps} />);
    expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    expect(screen.getByText('1/10/2024')).toBeInTheDocument();
  });

  it('should apply light theme by default', () => {
    const { container } = render(<TimelineWidget {...defaultProps} />);
    const widget = container.querySelector('.competitor-monitor-timeline');
    expect(widget).toHaveClass('theme-light');
  });

  it('should apply dark theme when specified', () => {
    const { container } = render(<TimelineWidget {...defaultProps} theme="dark" />);
    const widget = container.querySelector('.competitor-monitor-timeline');
    expect(widget).toHaveClass('theme-dark');
  });

  it('should handle empty changes array', () => {
    render(<TimelineWidget {...defaultProps} changes={[]} />);
    expect(screen.getByText('Test Competitor')).toBeInTheDocument();
  });

  it('should render single change', () => {
    render(<TimelineWidget {...defaultProps} changes={[defaultProps.changes[0]]} />);
    expect(screen.getByText('Price changed from $89 to $99')).toBeInTheDocument();
    expect(screen.queryByText('New feature added')).not.toBeInTheDocument();
  });
});
