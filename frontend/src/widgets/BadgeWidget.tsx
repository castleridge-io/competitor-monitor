import React from 'react';

export interface BadgeWidgetProps {
  competitorName: string;
  currentPrice: string | null;
  previousPrice: string | null;
  priceChange: 'increase' | 'decrease' | 'none' | null;
  priceChangePercent: number | null;
  lastUpdated: Date;
  theme?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
}

export const BadgeWidget: React.FC<BadgeWidgetProps> = ({
  competitorName,
  currentPrice,
  priceChange,
  priceChangePercent,
  lastUpdated,
  theme = 'light',
  size = 'medium',
}) => {
  const sizeStyles = {
    small: { padding: '8px', fontSize: '12px' },
    medium: { padding: '12px', fontSize: '14px' },
    large: { padding: '16px', fontSize: '16px' },
  };

  const themeStyles = theme === 'dark' 
    ? { background: '#1a1a1a', color: '#fff', border: '1px solid #333' }
    : { background: '#fff', color: '#333', border: '1px solid #ddd' };

  const priceChangeColor = priceChange === 'increase' 
    ? '#dc2626' 
    : priceChange === 'decrease' 
      ? '#16a34a' 
      : '#666';

  const priceChangeText = priceChangePercent 
    ? `${priceChange === 'increase' ? '↑' : '↓'} ${priceChangePercent}%`
    : '';

  return (
    <div 
      className={`competitor-monitor-badge theme-${theme}`}
      style={{
        ...themeStyles,
        ...sizeStyles[size],
        borderRadius: '8px',
        marginBottom: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{competitorName}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{currentPrice || 'N/A'}</span>
        {priceChangeText && (
          <span style={{ color: priceChangeColor, fontWeight: 'bold' }}>
            {priceChangeText}
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>
        Updated: {new Date(lastUpdated).toLocaleDateString()}
      </div>
    </div>
  );
};
