// Re-export types from schema for backwards compatibility
export type { 
  Competitor, 
  NewCompetitor,
  Scrape, 
  Report, 
  WaitlistEntry,
  Subscription
} from '../db/schema.js';

// Re-export types from services
export type { ScrapeData } from '../services/reporter.js';
export type { ScraperInput, ScrapeResult } from '../services/scraper.js';
