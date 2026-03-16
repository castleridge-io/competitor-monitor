export interface Competitor {
  id: string;
  name: string;
  url: string;
  selectors?: SelectorConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectorConfig {
  price?: string;
  features?: string;
  name?: string;
  [key: string]: string | undefined;
}

export interface Scrape {
  id: string;
  competitorId: string;
  data: ScrapeData;
  scrapedAt: Date;
}

export interface ScrapeData {
  price?: string;
  features?: string[];
  name?: string;
  raw?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Report {
  id: string;
  competitorId: string;
  scrapeId: string;
  htmlContent: string;
  jsonData: ScrapeData;
  isPublic: boolean;
  createdAt: Date;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  createdAt: Date;
}
