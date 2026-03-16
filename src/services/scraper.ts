import { chromium, Browser, Page } from 'playwright';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export interface ScraperInput {
  id: string;
  name: string;
  url: string;
  selectors?: {
    price?: string;
    features?: string;
    name?: string;
    [key: string]: string | undefined;
  };
}

export interface ScrapeResult {
  price?: string;
  features?: string[];
  name?: string;
  raw: Record<string, string | string[] | undefined>;
  scrapedAt: string;
  url: string;
}

export async function scrapeCompetitor(competitor: ScraperInput): Promise<ScrapeResult> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();
  
  try {
    // Navigate to page
    await page.goto(competitor.url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    const result: ScrapeResult = {
      raw: {},
      scrapedAt: new Date().toISOString(),
      url: competitor.url,
    };
    
    // If selectors provided, use them
    if (competitor.selectors) {
      for (const [key, selector] of Object.entries(competitor.selectors)) {
        if (selector) {
          const value = await extractText(page, selector);
          result.raw[key] = value;
        }
      }
      
      // Map common fields
      if (competitor.selectors.price) {
        result.price = result.raw.price as string;
      }
      if (competitor.selectors.features) {
        const featuresText = result.raw.features as string;
        result.features = featuresText ? featuresText.split('\n').filter(Boolean) : [];
      }
      if (competitor.selectors.name) {
        result.name = result.raw.name as string;
      }
    } else {
      // Auto-detect pricing page elements
      result.price = await autoDetectPrice(page);
      result.features = await autoDetectFeatures(page);
      result.name = await page.title();
    }
    
    return result;
  } finally {
    await page.close();
  }
}

async function extractText(page: Page, selector: string): Promise<string | undefined> {
  try {
    const element = await page.$(selector);
    if (!element) return undefined;
    
    return await element.textContent() || undefined;
  } catch {
    return undefined;
  }
}

async function autoDetectPrice(page: Page): Promise<string | undefined> {
  // Common pricing patterns
  const priceSelectors = [
    '[class*="price"]',
    '[class*="pricing"]',
    '[data-testid*="price"]',
    '.price',
    '#price',
  ];
  
  for (const selector of priceSelectors) {
    const text = await extractText(page, selector);
    if (text && /\$[\d,.]+/.test(text)) {
      return text.trim();
    }
  }
  
  return undefined;
}

async function autoDetectFeatures(page: Page): Promise<string[]> {
  // Common feature list patterns
  const featureSelectors = [
    '[class*="feature"] li',
    '[class*="features"] li',
    '.feature-list li',
    'ul.features li',
  ];
  
  for (const selector of featureSelectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        const features: string[] = [];
        for (const el of elements) {
          const text = await el.textContent();
          if (text && text.trim()) {
            features.push(text.trim());
          }
        }
        if (features.length > 0) return features;
      }
    } catch {
      continue;
    }
  }
  
  return [];
}
