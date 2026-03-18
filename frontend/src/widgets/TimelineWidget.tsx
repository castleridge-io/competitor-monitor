import React from 'react';

export interface TimelineChange {
  id: string;
  narrative: string;
  date: Date;
}

export interface TimelineWidgetProps {
  competitorName: string;
  changes: TimelineChange[];
  theme?: 'light' | 'dark';
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({
  competitorName,
  changes,
  theme = 'light',
}) => {
  const themeStyles = theme === 'dark' 
    ? { background: '#1a1a1a', color: '#fff', border: '1px solid #333' }
    : { background: '#fff', color: '#333', border: '1px solid #ddd' };

  return (
    <div 
      className={`competitor-monitor-timeline theme-${theme}`}
      style={{
        ...themeStyles,
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '8px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '16px' }}>
        {competitorName}
      </div>
      <div className="timeline">
        {changes.map((change, index) => (
          <div 
            key={change.id}
            style={{
              padding: '12px 0',
              borderBottom: index < changes.length - 1 
                ? `1px solid ${theme === 'dark' ? '#333' : '#eee'}`
                : 'none',
            }}
          >
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
              {new Date(change.date).toLocaleDateString()}
            </div>
            <div style={{ fontSize: '14px' }}>{change.narrative}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
