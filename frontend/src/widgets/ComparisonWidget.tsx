import React from 'react';

export interface Feature {
  feature: string;
  competitor: boolean;
  ours: boolean;
}

export interface ComparisonWidgetProps {
  competitorName: string;
  summary?: string;
  pricing?: {
    competitor: string;
    ours?: string;
    difference?: string;
    analysis?: string;
  };
  features: Feature[];
  theme?: 'light' | 'dark';
}

export const ComparisonWidget: React.FC<ComparisonWidgetProps> = ({
  competitorName,
  summary,
  pricing,
  features,
  theme = 'light',
}) => {
  const themeStyles = theme === 'dark' 
    ? { background: '#1a1a1a', color: '#fff', border: '1px solid #333' }
    : { background: '#fff', color: '#333', border: '1px solid #ddd' };

  return (
    <div 
      className={`competitor-monitor-comparison theme-${theme}`}
      style={{
        ...themeStyles,
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '18px' }}>
        {competitorName}
      </div>
      
      {summary && (
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
          {summary}
        </div>
      )}
      
      {pricing?.competitor && (
        <div 
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <strong>Pricing:</strong> {pricing.competitor}
        </div>
      )}
      
      {features && features.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${theme === 'dark' ? '#444' : '#ddd'}` }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Feature</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Competitor</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Us</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, index) => {
              const competitorColor = f.competitor ? '#16a34a' : '#dc2626';
              const oursColor = f.ours ? '#16a34a' : '#dc2626';
              
              return (
                <tr 
                  key={index}
                  style={{ borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#eee'}` }}
                >
                  <td style={{ padding: '8px' }}>{f.feature}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: competitorColor }}>
                    {f.competitor ? '✓' : '✗'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: oursColor }}>
                    {f.ours ? '✓' : '✗'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
