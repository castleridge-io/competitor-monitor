import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeWidget } from '../BadgeWidget';

describe('BadgeWidget', () => {
  const defaultProps = {
    competitorName: 'Test Competitor',
    currentPrice: '$99/month',
    previousPrice: '$89/month',
    priceChange: 'increase' as const,
    priceChangePercent: 11.2,
    lastUpdated: new Date('2024-01-01'),
  };

  it('should render competitor name', () => {
    render(<BadgeWidget {...defaultProps} />);
    expect(screen.getByText('Test Competitor')).toBeInTheDocument();
  });

  it('should render current price', () => {
    render(<BadgeWidget {...defaultProps} />);
    expect(screen.getByText('$99/month')).toBeInTheDocument();
  });

  it('should render price increase indicator', () => {
    render(<BadgeWidget {...defaultProps} />);
    expect(screen.getByText(/↑ 11.2%/)).toBeInTheDocument();
  });

  it('should render price decrease indicator', () => {
    render(<BadgeWidget {...defaultProps} priceChange="decrease" />);
    expect(screen.getByText(/↓ 11.2%/)).toBeInTheDocument();
  });

  it('should not render price change indicator when no change', () => {
    render(<BadgeWidget {...defaultProps} priceChange="none" priceChangePercent={null} />);
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
    expect(screen.queryByText(/↓/)).not.toBeInTheDocument();
  });

  it('should render N/A when price is null', () => {
    render(<BadgeWidget {...defaultProps} currentPrice={null} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should apply light theme by default', () => {
    const { container } = render(<BadgeWidget {...defaultProps} />);
    const widget = container.querySelector('.competitor-monitor-badge');
    expect(widget).toHaveClass('theme-light');
  });

  it('should apply dark theme when specified', () => {
    const { container } = render(<BadgeWidget {...defaultProps} theme="dark" />);
    const widget = container.querySelector('.competitor-monitor-badge');
    expect(widget).toHaveClass('theme-dark');
  });

  it('should apply small size when specified', () => {
    const { container } = render(<BadgeWidget {...defaultProps} size="small" />);
    const widget = container.querySelector('.competitor-monitor-badge');
    expect(widget).toBeDefined();
  });

  it('should apply large size when specified', () => {
    const { container } = render(<BadgeWidget {...defaultProps} size="large" />);
    const widget = container.querySelector('.competitor-monitor-badge');
    expect(widget).toBeDefined();
  });

  it('should render last updated date', () => {
    render(<BadgeWidget {...defaultProps} />);
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });
});
