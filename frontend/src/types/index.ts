// API Types - mirrors backend schema

export interface Competitor {
  id: string
  name: string
  url: string
  selectors: SelectorConfig | null
  createdAt: Date
  updatedAt: Date
}

export interface SelectorConfig {
  price?: string
  title?: string
  description?: string
  availability?: string
  [key: string]: string | undefined
}

export interface NewCompetitor {
  name: string
  url: string
  selectors?: SelectorConfig
}

export interface UpdateCompetitor {
  name?: string
  url?: string
  selectors?: SelectorConfig
}

export interface Scrape {
  id: string
  competitorId: string
  data: ScrapeData
  scrapedAt: Date
}

export interface ScrapeData {
  price?: number
  title?: string
  description?: string
  availability?: boolean
  url?: string
  scrapedAt?: string
  [key: string]: string | number | boolean | undefined
}

export interface Report {
  id: string
  competitorId: string
  scrapeId: string
  htmlContent: string
  jsonData: Record<string, unknown>
  isPublic: boolean
  createdAt: Date
}

export interface ReportListItem {
  id: string
  competitorId: string
  isPublic: boolean
  createdAt: Date
}

export interface Subscription {
  id: string
  competitorId: string
  createdAt: Date
  competitorName?: string
  competitorUrl?: string
}

export interface NewSubscription {
  email: string
  competitorId: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Dashboard stats
export interface DashboardStats {
  totalCompetitors: number
  totalReports: number
  recentScrapes: number
  activeSubscriptions: number
}

// Settings types
export interface AlertSettings {
  emailNotifications: boolean
  emailAddress: string
  telegramNotifications: boolean
  telegramChatId: string
  notificationFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
}

// Chart data types
export interface PriceHistoryPoint {
  date: string
  price: number
  competitorName: string
}

// Feature gap analysis types
export interface FeatureGap {
  id: string
  competitorId: string
  competitorName?: string
  missingFeatures: string[]
  recommendations: string
  createdAt: Date
}

export interface NewFeatureGapAnalysis {
  competitorId: string
  userFeatures: string[]
}

// Timeline types
export interface TimelineEvent {
  id: string
  competitorId: string
  competitorName: string
  eventType: 'price_change' | 'feature_change' | 'initial_scrape' | 'data_update'
  data: Record<string, unknown>
  narrative: string
  createdAt: Date
}

export interface TimelineResponse {
  events: TimelineEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Market position types
export interface MarketPosition {
  id: string
  name: string
  x: number // normalized price (0-100)
  y: number // normalized feature count (0-100)
  quadrant: 'Budget' | 'Premium' | 'Value' | 'Enterprise'
  avgPrice: number
  featureCount: number
}