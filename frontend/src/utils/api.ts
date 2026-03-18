import type {
  Competitor,
  NewCompetitor,
  UpdateCompetitor,
  Report,
  ReportListItem,
  Scrape,
  Subscription,
  NewSubscription,
  TimelineResponse,
  TimelineEvent,
} from '../types'

const API_BASE = '/api'

function getApiKey(): string | null {
  return localStorage.getItem('apiKey')
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  const apiKey = getApiKey()
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(response.statusText || 'Request failed')
  }
  return response.json()
}

export const apiClient = {
  // Competitors
  async getCompetitors(): Promise<Competitor[]> {
    const response = await fetch(`${API_BASE}/competitors`, {
      headers: getHeaders(),
    })
    return handleResponse<Competitor[]>(response)
  },

  async getCompetitor(id: string): Promise<Competitor> {
    const response = await fetch(`${API_BASE}/competitors/${id}`, {
      headers: getHeaders(),
    })
    return handleResponse<Competitor>(response)
  },

  async createCompetitor(data: NewCompetitor): Promise<Competitor> {
    const response = await fetch(`${API_BASE}/competitors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<Competitor>(response)
  },

  async updateCompetitor(id: string, data: UpdateCompetitor): Promise<Competitor> {
    const response = await fetch(`${API_BASE}/competitors/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<Competitor>(response)
  },

  async deleteCompetitor(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/competitors/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error(response.statusText || 'Delete failed')
    }
  },

  // Reports
  async getReports(): Promise<ReportListItem[]> {
    const response = await fetch(`${API_BASE}/reports`, {
      headers: getHeaders(),
    })
    return handleResponse<ReportListItem[]>(response)
  },

  async getReport(id: string): Promise<Report> {
    const response = await fetch(`${API_BASE}/reports/${id}`, {
      headers: getHeaders(),
    })
    return handleResponse<Report>(response)
  },

  async updateReportVisibility(id: string, isPublic: boolean): Promise<Report> {
    const response = await fetch(`${API_BASE}/reports/${id}/public`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ isPublic }),
    })
    return handleResponse<Report>(response)
  },

  // Scrapes
  async triggerScrape(competitorId: string): Promise<{
    scrapeId: string
    reportId: string
    data: Record<string, unknown>
    reportUrl: string
  }> {
    const response = await fetch(`${API_BASE}/scrape/${competitorId}`, {
      method: 'POST',
      headers: getHeaders(),
    })
    return handleResponse(response)
  },

  async getScrapeHistory(competitorId: string): Promise<Scrape[]> {
    const response = await fetch(`${API_BASE}/scrape/${competitorId}`, {
      headers: getHeaders(),
    })
    return handleResponse<Scrape[]>(response)
  },

  // Subscriptions
  async createSubscription(data: NewSubscription): Promise<Subscription> {
    const response = await fetch(`${API_BASE}/subscriptions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<Subscription>(response)
  },

  async deleteSubscription(email: string, competitorId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/subscriptions`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ email, competitorId }),
    })
    if (!response.ok) {
      throw new Error(response.statusText || 'Unsubscribe failed')
    }
  },

  async getSubscriptions(email: string): Promise<Subscription[]> {
    const response = await fetch(`${API_BASE}/subscriptions/${encodeURIComponent(email)}`, {
      headers: getHeaders(),
    })
    return handleResponse<Subscription[]>(response)
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch('/health')
    return handleResponse(response)
  },

  // Trends
  async getHistoricalTrends(params?: {
    competitorIds?: string
    startDate?: string
    endDate?: string
    days?: number
  }): Promise<Array<{
    id: string
    competitorId: string
    competitorName: string
    data: Record<string, unknown>
    scrapedAt: Date
  }>> {
    const queryParts: string[] = []
    if (params?.competitorIds) {
      queryParts.push(`competitorIds=${encodeURIComponent(params.competitorIds)}`)
    }
    if (params?.startDate) {
      queryParts.push(`startDate=${encodeURIComponent(params.startDate)}`)
    }
    if (params?.endDate) {
      queryParts.push(`endDate=${encodeURIComponent(params.endDate)}`)
    }
    if (params?.days) {
      queryParts.push(`days=${params.days}`)
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
    const response = await fetch(`${API_BASE}/trends/historical${queryString}`, {
      headers: getHeaders(),
    })
    return handleResponse(response)
  },

  // Feature Gaps
  async analyzeFeatureGaps(data: NewFeatureGapAnalysis): Promise<FeatureGap> {
    const response = await fetch(`${API_BASE}/gaps/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse<FeatureGap>(response)
  },

  async getGapAnalysis(competitorId: string): Promise<FeatureGap> {
    const response = await fetch(`${API_BASE}/gaps/${competitorId}`, {
      headers: getHeaders(),
    })
    return handleResponse<FeatureGap>(response)
  },

  async getAllGapAnalyses(): Promise<FeatureGap[]> {
    const response = await fetch(`${API_BASE}/gaps`, {
      headers: getHeaders(),
    })
    return handleResponse<FeatureGap[]>(response)
  },

  // Timeline
  async getTimeline(params?: {
    competitorId?: string
    startDate?: string
    endDate?: string
    eventType?: string
    page?: number
    pageSize?: number
  }): Promise<TimelineResponse> {
    const queryParts: string[] = []
    if (params?.competitorId) {
      queryParts.push(`competitorId=${encodeURIComponent(params.competitorId)}`)
    }
    if (params?.startDate) {
      queryParts.push(`startDate=${encodeURIComponent(params.startDate)}`)
    }
    if (params?.endDate) {
      queryParts.push(`endDate=${encodeURIComponent(params.endDate)}`)
    }
    if (params?.eventType) {
      queryParts.push(`eventType=${encodeURIComponent(params.eventType)}`)
    }
    if (params?.page) {
      queryParts.push(`page=${params.page}`)
    }
    if (params?.pageSize) {
      queryParts.push(`pageSize=${params.pageSize}`)
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
    const response = await fetch(`${API_BASE}/timeline${queryString}`, {
      headers: getHeaders(),
    })
    return handleResponse<TimelineResponse>(response)
  },

  async getTimelineEvent(id: string): Promise<TimelineEvent> {
    const response = await fetch(`${API_BASE}/timeline/${id}`, {
      headers: getHeaders(),
    })
    return handleResponse<TimelineEvent>(response)
  },
}