import { scrapeCompetitor, ScrapeResult } from './scraper.js';
import { analyzeFeatureGaps, FeatureGapInput, GapAnalysis } from './feature-gap-analyzer.js';

export interface CloneResult {
  name: string;
  url: string;
  features: string[];
  techStack: string[];
  pricing: string | null;
  metadata: {
    title?: string;
    description?: string;
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      facebook?: string;
    };
  };
  scrapedAt: string;
}

export interface GapReport {
  missingFeatures: string[];
  competitiveAdvantages: string[];
  recommendations: string[];
  overlapPercentage: number;
}

/**
 * Analyze a competitor website and extract features, tech stack, and pricing.
 */
export async function analyzeCompetitorWebsite(url: string): Promise<CloneResult> {
  // Validate URL
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL provided');
  }

  // Normalize URL
  const normalizedUrl = normalizeUrl(url);

  // Scrape the competitor website
  const scrapeResult = await scrapeCompetitor({
    id: `clone-${Date.now()}`,
    name: 'Clone Target',
    url: normalizedUrl,
  });

  // Extract and structure the data
  return {
    name: scrapeResult.name || extractDomain(url),
    url: normalizedUrl,
    features: detectFeatures(scrapeResult),
    techStack: detectTechStack(scrapeResult),
    pricing: detectPricing(scrapeResult),
    metadata: extractMetadata(scrapeResult),
    scrapedAt: scrapeResult.scrapedAt,
  };
}

/**
 * Detect features from scraped content.
 */
export function detectFeatures(scrapeResult: ScrapeResult): string[] {
  const features: string[] = [];

  // Use features from scrape result
  if (scrapeResult.features && scrapeResult.features.length > 0) {
    features.push(...scrapeResult.features);
  }

  // Extract features from raw data
  if (scrapeResult.raw) {
    // Check for feature list in raw data
    if (typeof scrapeResult.raw.featureList === 'string') {
      const featureLines = scrapeResult.raw.featureList.split('\n').filter(line => line.trim());
      features.push(...featureLines);
    }

    // Check for features array in raw data
    if (Array.isArray(scrapeResult.raw.features)) {
      features.push(...scrapeResult.raw.features);
    }
  }

  // Deduplicate and normalize
  const normalized = features.map(f => normalizeFeatureText(f));
  const unique = [...new Set(normalized)];

  return unique.filter(f => f.length > 0);
}

/**
 * Detect tech stack from scraped content.
 */
export function detectTechStack(scrapeResult: ScrapeResult): string[] {
  const techStack: string[] = [];

  // Check if techStack is already provided
  if ('techStack' in scrapeResult && Array.isArray((scrapeResult as any).techStack)) {
    return (scrapeResult as any).techStack;
  }

  const raw = scrapeResult.raw || {};

  // Detect frontend frameworks
  const scripts = typeof raw.scripts === 'string' ? raw.scripts.toLowerCase() : '';
  const styles = typeof raw.styles === 'string' ? raw.styles.toLowerCase() : '';

  // Frontend frameworks
  if (scripts.includes('react')) techStack.push('React');
  if (scripts.includes('vue')) techStack.push('Vue.js');
  if (scripts.includes('angular')) techStack.push('Angular');
  if (scripts.includes('svelte')) techStack.push('Svelte');
  if (scripts.includes('next')) techStack.push('Next.js');
  if (scripts.includes('nuxt')) techStack.push('Nuxt.js');

  // CSS frameworks
  if (styles.includes('tailwind')) techStack.push('Tailwind CSS');
  if (styles.includes('bootstrap')) techStack.push('Bootstrap');
  if (styles.includes('material')) techStack.push('Material UI');
  if (styles.includes('chakra')) techStack.push('Chakra UI');

  // Backend detection (from headers or server info)
  const server = typeof raw.server === 'string' ? raw.server.toLowerCase() : '';
  const headers = typeof raw.headers === 'string' ? raw.headers.toLowerCase() : '';

  if (server.includes('express') || headers.includes('x-powered-by: express')) {
    techStack.push('Express.js');
  }
  if (server.includes('nginx')) techStack.push('Nginx');
  if (server.includes('apache')) techStack.push('Apache');

  // Check for Node.js
  if (headers.includes('node') || server.includes('node')) {
    techStack.push('Node.js');
  }

  // Add TypeScript if detected
  if (scripts.includes('.ts') || scripts.includes('typescript')) {
    techStack.push('TypeScript');
  }

  return [...new Set(techStack)];
}

/**
 * Detect pricing information from scraped content.
 */
export function detectPricing(scrapeResult: ScrapeResult): string | null {
  // Check if price is already provided
  if (scrapeResult.price) {
    return scrapeResult.price;
  }

  const raw = scrapeResult.raw || {};

  // Check for pricing text in raw data
  if (typeof raw.pricingText === 'string') {
    return extractPriceFromString(raw.pricingText);
  }

  // Check for price in other common fields
  for (const key of ['price', 'cost', 'amount', 'subscription']) {
    if (typeof raw[key] === 'string') {
      return extractPriceFromString(raw[key]);
    }
  }

  return null;
}

/**
 * Extract metadata from scraped content.
 */
export function extractMetadata(scrapeResult: ScrapeResult): CloneResult['metadata'] {
  const raw = scrapeResult.raw || {};
  const metadata: CloneResult['metadata'] = {};

  // Title
  if (typeof raw.title === 'string') {
    metadata.title = raw.title;
  } else if (scrapeResult.name) {
    metadata.title = scrapeResult.name;
  }

  // Description
  if (typeof raw.description === 'string') {
    metadata.description = raw.description;
  }

  // Social links
  const socialLinks: NonNullable<CloneResult['metadata']['socialLinks']> = {};

  if (typeof raw.twitter === 'string') {
    socialLinks.twitter = raw.twitter;
  }
  if (typeof raw.linkedin === 'string') {
    socialLinks.linkedin = raw.linkedin;
  }
  if (typeof raw.facebook === 'string') {
    socialLinks.facebook = raw.facebook;
  }

  if (Object.keys(socialLinks).length > 0) {
    metadata.socialLinks = socialLinks;
  }

  return metadata;
}

/**
 * Generate a gap report comparing competitor features with user features.
 */
export function generateGapReport(
  competitorFeatures: string[],
  userFeatures: string[]
): GapReport {
  const competitorSet = new Set(competitorFeatures.map(f => f.toLowerCase().trim()));
  const userSet = new Set(userFeatures.map(f => f.toLowerCase().trim()));

  // Find missing features (competitor has, user doesn't)
  const missingFeatures = competitorFeatures.filter(
    f => !userSet.has(f.toLowerCase().trim())
  );

  // Find competitive advantages (user has, competitor doesn't)
  const competitiveAdvantages = userFeatures.filter(
    f => !competitorSet.has(f.toLowerCase().trim())
  );

  // Calculate overlap percentage
  const totalFeatures = new Set([...competitorFeatures, ...userFeatures]).size;
  const overlappingFeatures = competitorFeatures.filter(
    f => userSet.has(f.toLowerCase().trim())
  ).length;
  const overlapPercentage = totalFeatures > 0
    ? Math.round((overlappingFeatures / totalFeatures) * 100)
    : 0;

  // Generate recommendations
  const recommendations = generateRecommendations(missingFeatures, competitiveAdvantages);

  return {
    missingFeatures,
    competitiveAdvantages,
    recommendations,
    overlapPercentage,
  };
}

/**
 * Generate recommendations based on gap analysis.
 */
function generateRecommendations(missingFeatures: string[], advantages: string[]): string[] {
  const recommendations: string[] = [];

  if (missingFeatures.length === 0 && advantages.length === 0) {
    recommendations.push('Your product has feature parity with this competitor.');
    return recommendations;
  }

  if (missingFeatures.length === 0) {
    recommendations.push('You have all the features this competitor offers, plus additional capabilities.');
    recommendations.push(`Competitive advantages: ${advantages.join(', ')}`);
    return recommendations;
  }

  if (missingFeatures.length <= 2) {
    recommendations.push(`Consider implementing: ${missingFeatures.join(', ')}`);
    recommendations.push('These features may be important for competitive parity.');
  } else {
    recommendations.push(`You're missing ${missingFeatures.length} features that this competitor offers.`);
    recommendations.push('Prioritize based on:');
    recommendations.push('1. Customer demand and feedback');
    recommendations.push('2. Strategic importance to your product vision');
    recommendations.push('3. Implementation complexity and resources required');
  }

  if (advantages.length > 0) {
    recommendations.push(`Leverage your advantages: ${advantages.join(', ')}`);
  }

  return recommendations;
}

/**
 * Run full gap analysis using the existing feature-gap-analyzer service.
 */
export async function runGapAnalysis(
  competitorName: string,
  competitorFeatures: string[],
  userFeatures: string[]
): Promise<GapAnalysis> {
  const input: FeatureGapInput = {
    competitorId: `clone-${Date.now()}`,
    competitorName,
    competitorFeatures,
    userFeatures,
  };

  return analyzeFeatureGaps(input);
}

/**
 * Validate URL format.
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize URL (remove trailing slashes, etc.).
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash from pathname (except for root)
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL.
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Normalize feature text (trim, capitalize, etc.).
 */
function normalizeFeatureText(text: string): string {
  return text
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract price from a string using regex.
 */
function extractPriceFromString(text: string): string | null {
  // Match common pricing patterns
  const pricePattern = /\$[\d,.]+(?:\/(?:month|year|user))?/i;
  const match = text.match(pricePattern);
  return match ? match[0] : null;
}
