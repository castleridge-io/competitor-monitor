/**
 * Competitor Monitor Embed Widget
 * Embeddable JavaScript widget for competitor monitoring
 */

(function () {
  'use strict';

  // Configuration
  const WIDGET_API_BASE = window.CompetitorMonitorWidget?.apiBase || 'http://localhost:3000/api/v1/widgets';
  
  // Widget types
  const WIDGET_TYPES = {
    BADGE: 'badge',
    CARD: 'card', 
    TIMELINE: 'timeline'
  };

  /**
   * Initialize all widgets on the page
   */
  function initWidgets() {
    const widgetElements = document.querySelectorAll('[data-competitor-monitor-widget]');
    
    widgetElements.forEach(element => {
      const widgetType = element.getAttribute('data-competitor-monitor-widget');
      const competitorId = element.getAttribute('data-competitor-id');
      const theme = element.getAttribute('data-theme') || 'light';
      const limit = element.getAttribute('data-limit') || '5';
      
      if (competitorId && isValidWidgetType(widgetType)) {
        loadWidget(element, widgetType, competitorId, { theme, limit });
      } else {
        console.warn('Competitor Monitor Widget: Missing required attributes', element);
      }
    });
  }

  /**
   * Validate widget type
   */
  function isValidWidgetType(type) {
    return Object.values(WIDGET_TYPES).includes(type);
  }

  /**
   * Load widget data and render
   */
  async function loadWidget(element, type, competitorId, options) {
    try {
      const url = `${WIDGET_API_BASE}/${competitorId}/${type}`;
      const params = new URLSearchParams();
      
      if (type === WIDGET_TYPES.TIMELINE) {
        params.append('limit', options.limit);
      }
      
      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
      
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      renderWidget(element, type, data, options);
    } catch (error) {
      console.error('Competitor Monitor Widget error:', error);
      renderError(element, error.message);
    }
  }

  /**
   * Render widget based on type
   */
  function renderWidget(element, type, data, options) {
    switch (type) {
      case WIDGET_TYPES.BADGE:
        renderBadge(element, data, options);
        break;
      case WIDGET_TYPES.CARD:
        renderCard(element, data, options);
        break;
      case WIDGET_TYPES.TIMELINE:
        renderTimeline(element, data, options);
        break;
      default:
        renderError(element, `Unknown widget type: ${type}`);
    }
  }

  /**
   * Render price badge widget
   */
  function renderBadge(element, data, options) {
    const { currentPrice, previousPrice, priceChange, priceChangePercent, competitorName } = data;
    
    let changeIndicator = '';
    if (priceChange && priceChange !== 'none') {
      const arrow = priceChange === 'increase' ? '↑' : '↓';
      const percent = priceChangePercent !== null ? Math.abs(priceChangePercent) : '?';
      const color = priceChange === 'increase' ? '#ef4444' : '#10b981';
      changeIndicator = `<span style="color: ${color}; font-weight: bold;">${arrow}${percent}%</span>`;
    }
    
    const html = `
      <div class="cm-badge" style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 16px;
        background: ${options.theme === 'dark' ? '#1f2937' : '#f3f4f6'};
        color: ${options.theme === 'dark' ? '#f9fafb' : '#1f2937'};
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      ">
        <span style="font-weight: 600;">${competitorName}</span>
        ${currentPrice ? `<span>${currentPrice}</span>` : ''}
        ${changeIndicator}
        <span style="opacity: 0.6; margin-left: 8px;">Powered by Competitor Monitor</span>
      </div>
    `;
    
    element.innerHTML = html;
  }

  /**
   * Render comparison card widget
   */
  function renderCard(element, data, options) {
    const { competitorName, pricing, features, strengths, weaknesses } = data;
    
    const featureList = features.map(f => 
      `<li style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
        <span style="width: 12px; height: 12px; border-radius: 50%; background: ${f.competitor ? '#10b981' : '#ef4444'};"></span>
        ${f.feature}
      </li>`
    ).join('');
    
    const html = `
      <div class="cm-card" style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        border: 1px solid ${options.theme === 'dark' ? '#374151' : '#e5e7eb'};
        border-radius: 8px;
        background: ${options.theme === 'dark' ? '#111827' : '#ffffff'};
        color: ${options.theme === 'dark' ? '#f9fafb' : '#1f2937'};
        padding: 16px;
        max-width: 400px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${competitorName}</h3>
          <span style="font-size: 12px; opacity: 0.6;">Powered by Competitor Monitor</span>
        </div>
        
        ${pricing.competitor ? `<div style="margin-bottom: 12px;">
          <strong>Price:</strong> ${pricing.competitor}
        </div>` : ''}
        
        ${features.length > 0 ? `<div style="margin-bottom: 12px;">
          <strong>Features:</strong>
          <ul style="list-style: none; padding: 0; margin: 8px 0 0 0;">${featureList}</ul>
        </div>` : ''}
        
        ${strengths.length > 0 ? `<div style="margin-bottom: 12px;">
          <strong>Strengths:</strong>
          <ul style="list-style: disc; padding-left: 20px; margin: 4px 0 0 0;">${strengths.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>` : ''}
        
        ${weaknesses.length > 0 ? `<div>
          <strong>Weaknesses:</strong>
          <ul style="list-style: disc; padding-left: 20px; margin: 4px 0 0 0;">${weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
    `;
    
    element.innerHTML = html;
  }

  /**
   * Render timeline widget
   */
  function renderTimeline(element, data, options) {
    const { competitorName, changes } = data;
    
    const changeList = changes.map(change => {
      const date = new Date(change.date).toLocaleDateString();
      return `<div style="padding: 8px 0; border-bottom: 1px solid ${options.theme === 'dark' ? '#374151' : '#e5e7eb'};">
        <div style="font-weight: 600; margin-bottom: 4px;">${date}</div>
        <div>${change.narrative}</div>
      </div>`;
    }).join('');
    
    const html = `
      <div class="cm-timeline" style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        border: 1px solid ${options.theme === 'dark' ? '#374151' : '#e5e7eb'};
        border-radius: 8px;
        background: ${options.theme === 'dark' ? '#111827' : '#ffffff'};
        color: ${options.theme === 'dark' ? '#f9fafb' : '#1f2937'};
        padding: 16px;
        max-width: 400px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${competitorName} Timeline</h3>
          <span style="font-size: 12px; opacity: 0.6;">Powered by Competitor Monitor</span>
        </div>
        
        <div class="cm-timeline-changes" style="max-height: 300px; overflow-y: auto;">
          ${changeList}
        </div>
      </div>
    `;
    
    element.innerHTML = html;
  }

  /**
   * Render error state
   */
  function renderError(element, message) {
    element.innerHTML = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        padding: 12px;
        border-radius: 8px;
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
      ">
        Competitor Monitor Widget Error: ${message}
      </div>
    `;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    initWidgets();
  }

  // Expose global API for manual control
  window.CompetitorMonitorWidget = {
    refresh: initWidgets,
    version: '1.0.0'
  };

})();