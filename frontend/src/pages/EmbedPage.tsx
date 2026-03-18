import React, { useState, useEffect } from 'react';
import { BadgeWidget } from '../widgets/BadgeWidget';
import { TimelineWidget } from '../widgets/TimelineWidget';
import { ComparisonWidget } from '../widgets/ComparisonWidget';

interface Competitor {
  id: string;
  name: string;
}

interface WidgetPreview {
  type: 'badge' | 'timeline' | 'comparison';
  competitorId: string;
  theme: 'light' | 'dark';
  size: 'small' | 'medium' | 'large';
  limit?: number;
}

export const EmbedPage: React.FC = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [preview, setPreview] = useState<WidgetPreview>({
    type: 'badge',
    competitorId: '',
    theme: 'light',
    size: 'medium',
    limit: 5,
  });
  const [previewData, setPreviewData] = useState<any>(null);
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState('your-api-key-here');

  useEffect(() => {
    fetchCompetitors();
  }, []);

  useEffect(() => {
    if (preview.competitorId) {
      fetchPreviewData();
      generateEmbedCode();
    }
  }, [preview]);

  const fetchCompetitors = async () => {
    try {
      const response = await fetch('/api/competitors');
      if (response.ok) {
        const data = await response.json();
        setCompetitors(data);
        if (data.length > 0) {
          setPreview(prev => ({ ...prev, competitorId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
    }
  };

  const fetchPreviewData = async () => {
    try {
      const endpoint = `/api/v1/embed/${preview.type}?competitors=${preview.competitorId}&apiKey=${apiKey}`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.widgets?.[0] || null);
      }
    } catch (error) {
      console.error('Error fetching preview data:', error);
    }
  };

  const generateEmbedCode = () => {
    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/api/v1/embed/${preview.type}?competitors=${preview.competitorId}&apiKey=${apiKey}&theme=${preview.theme}${preview.size ? `&size=${preview.size}` : ''}${preview.limit ? `&limit=${preview.limit}` : ''}`;
    
    // Generate iframe embed code
    const iframeCode = `<iframe src="${embedUrl}" width="400" height="300" frameborder="0" style="border: none;"></iframe>`;
    
    setEmbedCode(iframeCode);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const renderPreview = () => {
    if (!previewData) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading preview...</div>;

    switch (preview.type) {
      case 'badge':
        return (
          <BadgeWidget
            competitorName={previewData.competitorName}
            currentPrice={previewData.currentPrice}
            previousPrice={previewData.previousPrice}
            priceChange={previewData.priceChange}
            priceChangePercent={previewData.priceChangePercent}
            lastUpdated={previewData.lastUpdated}
            theme={preview.theme}
            size={preview.size}
          />
        );
      case 'timeline':
        return (
          <TimelineWidget
            competitorName={previewData.competitorName}
            changes={previewData.changes}
            theme={preview.theme}
          />
        );
      case 'comparison':
        return (
          <ComparisonWidget
            competitorName={previewData.competitorName}
            summary={previewData.summary}
            pricing={previewData.pricing}
            features={previewData.features}
            theme={preview.theme}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>Embed Widgets</h1>
      <p style={{ marginBottom: '30px', color: '#666' }}>
        Generate embeddable widgets to display competitor data on your website.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Configuration Panel */}
        <div>
          <h2 style={{ marginBottom: '20px' }}>Configuration</h2>
          
          {/* API Key */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Widget Type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Widget Type
            </label>
            <select
              value={preview.type}
              onChange={(e) => setPreview(prev => ({ ...prev, type: e.target.value as any }))}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="badge">Price Change Badge</option>
              <option value="timeline">Timeline Widget</option>
              <option value="comparison">Comparison Card</option>
            </select>
          </div>

          {/* Competitor Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Competitor
            </label>
            <select
              value={preview.competitorId}
              onChange={(e) => setPreview(prev => ({ ...prev, competitorId: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {competitors.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Theme
            </label>
            <select
              value={preview.theme}
              onChange={(e) => setPreview(prev => ({ ...prev, theme: e.target.value as any }))}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Size (for badge) */}
          {preview.type === 'badge' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Size
              </label>
              <select
                value={preview.size}
                onChange={(e) => setPreview(prev => ({ ...prev, size: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          )}

          {/* Limit (for timeline) */}
          {preview.type === 'timeline' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Number of Changes
              </label>
              <input
                type="number"
                value={preview.limit}
                onChange={(e) => setPreview(prev => ({ ...prev, limit: parseInt(e.target.value) || 5 }))}
                min="1"
                max="10"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div>
          <h2 style={{ marginBottom: '20px' }}>Preview</h2>
          <div 
            style={{
              padding: '20px',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              minHeight: '300px',
              background: preview.theme === 'dark' ? '#1a1a1a' : '#f9f9f9',
            }}
          >
            {renderPreview()}
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', marginTop: '8px' }}>
              Powered by Competitor Monitor
            </div>
          </div>

          {/* Embed Code */}
          <div style={{ marginTop: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>Embed Code</h2>
            <div style={{ position: 'relative' }}>
              <textarea
                value={embedCode}
                readOnly
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
              <button
                onClick={copyToClipboard}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '6px 12px',
                  background: copied ? '#16a34a' : '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
              Copy and paste this code into your website's HTML to embed the widget.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
