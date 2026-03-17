import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { getDb } from '../db/index.js';
import { changeNarratives } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface NarrativeInput {
  competitorId: string;
  competitorName: string;
  previousData: Record<string, unknown> | null;
  currentData: Record<string, unknown>;
}

export interface SavedNarrative {
  id: string;
  competitorId: string;
  narrative: string;
  createdAt: Date;
}

/**
 * Generate a human-readable narrative explaining what changed and why it matters.
 * Uses OpenAI API if available, otherwise falls back to simple templates.
 */
export async function generateNarrative(input: NarrativeInput): Promise<string> {
  // Try OpenAI if API key is available
  if (process.env.OPENAI_API_KEY) {
    const openAINarrative = await tryOpenAINarrative(input);
    if (openAINarrative) {
      return openAINarrative;
    }
  }

  // Fallback to template-based generation
  return generateTemplateNarrative(input);
}

/**
 * Try to generate narrative using OpenAI API.
 * Returns null if API call fails or returns empty response.
 */
async function tryOpenAINarrative(input: NarrativeInput): Promise<string | null> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = buildOpenAIPrompt(input);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a competitive intelligence analyst. Generate concise, insightful narratives about competitor changes. Focus on business implications and strategic insights. Keep responses to 1-2 sentences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || null;
  } catch {
    return null;
  }
}

/**
 * Build the prompt for OpenAI API.
 */
function buildOpenAIPrompt(input: NarrativeInput): string {
  const { competitorName, previousData, currentData } = input;

  if (!previousData) {
    return `Competitor "${competitorName}" has been scraped for the first time.
Current data: ${JSON.stringify(currentData, null, 2)}
Generate a brief narrative noting this is their baseline/initial data.`;
  }

  return `Competitor "${competitorName}" has changed.
Previous data: ${JSON.stringify(previousData, null, 2)}
Current data: ${JSON.stringify(currentData, null, 2)}
Generate a brief narrative explaining what changed and potential business implications.`;
}

/**
 * Generate narrative using simple templates.
 */
function generateTemplateNarrative(input: NarrativeInput): string {
  const { competitorName, previousData, currentData } = input;

  // First scrape - no previous data
  if (!previousData) {
    return `${competitorName} has been added to monitoring. Initial data captured: ${formatDataSummary(currentData)}. This establishes a baseline for future change detection.`;
  }

  const changes: string[] = [];

  // Check for price changes
  const priceChange = detectPriceChange(previousData, currentData);
  if (priceChange) {
    changes.push(priceChange);
  }

  // Check for feature changes
  const featureChange = detectFeatureChange(previousData, currentData);
  if (featureChange) {
    changes.push(featureChange);
  }

  // No changes detected
  if (changes.length === 0) {
    return `${competitorName} data shows no significant changes since the last scrape. Monitoring continues.`;
  }

  return `${competitorName}: ${changes.join(' ')}`;
}

/**
 * Detect and describe price changes.
 */
function detectPriceChange(
  previousData: Record<string, unknown>,
  currentData: Record<string, unknown>
): string | null {
  const prevPrice = extractPrice(previousData.price);
  const currPrice = extractPrice(currentData.price);

  if (prevPrice === null || currPrice === null) {
    return null;
  }

  if (currPrice < prevPrice) {
    const percentChange = Math.round((1 - currPrice / prevPrice) * 100);
    return `Price dropped from ${previousData.price} to ${currentData.price} (${percentChange}% reduction). This could indicate pricing pressure or a shift to volume-based strategy.`;
  }

  if (currPrice > prevPrice) {
    const percentChange = Math.round((currPrice / prevPrice - 1) * 100);
    return `Price increased from ${previousData.price} to ${currentData.price} (${percentChange}% increase). This may reflect premium positioning or cost adjustments.`;
  }

  return null;
}

/**
 * Extract numeric price from string.
 */
function extractPrice(priceValue: unknown): number | null {
  if (typeof priceValue !== 'string') {
    return null;
  }

  const match = priceValue.match(/[\d,.]+/);
  if (!match) {
    return null;
  }

  const num = parseFloat(match[0].replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Detect and describe feature changes.
 */
function detectFeatureChange(
  previousData: Record<string, unknown>,
  currentData: Record<string, unknown>
): string | null {
  const prevFeatures = extractFeatures(previousData.features);
  const currFeatures = extractFeatures(currentData.features);

  if (prevFeatures.length === 0 && currFeatures.length === 0) {
    return null;
  }

  const added = currFeatures.filter(f => !prevFeatures.includes(f));
  const removed = prevFeatures.filter(f => !currFeatures.includes(f));

  if (added.length > 0 && removed.length > 0) {
    return `Features updated: added ${added.join(', ')} and removed ${removed.join(', ')}. This suggests a product strategy shift.`;
  }

  if (added.length > 0) {
    return `New features added: ${added.join(', ')}. This could indicate product expansion or competitive response.`;
  }

  if (removed.length > 0) {
    return `Features removed: ${removed.join(', ')}. This may indicate simplification or tier restructuring.`;
  }

  return null;
}

/**
 * Extract features array from data.
 */
function extractFeatures(featuresValue: unknown): string[] {
  if (!Array.isArray(featuresValue)) {
    return [];
  }

  return featuresValue.filter((f): f is string => typeof f === 'string');
}

/**
 * Format data summary for display.
 */
function formatDataSummary(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.price) {
    parts.push(`price: ${data.price}`);
  }

  if (Array.isArray(data.features) && data.features.length > 0) {
    parts.push(`${data.features.length} features`);
  }

  return parts.length > 0 ? parts.join(', ') : 'basic data';
}

/**
 * Save a narrative to the database.
 */
export async function saveNarrative(input: {
  competitorId: string;
  narrative: string;
}): Promise<SavedNarrative> {
  const db = getDb();
  const id = uuidv4();
  const createdAt = new Date();

  await db.insert(changeNarratives).values({
    id,
    competitorId: input.competitorId,
    narrative: input.narrative,
    createdAt,
  });

  return {
    id,
    competitorId: input.competitorId,
    narrative: input.narrative,
    createdAt,
  };
}

/**
 * Get narratives for a competitor, ordered by most recent first.
 */
export async function getNarrativesForCompetitor(
  competitorId: string,
  limit = 10
): Promise<SavedNarrative[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(changeNarratives)
    .where(eq(changeNarratives.competitorId, competitorId))
    .orderBy(desc(changeNarratives.createdAt))
    .limit(limit);

  return results.map(r => ({
    id: r.id,
    competitorId: r.competitorId,
    narrative: r.narrative,
    createdAt: r.createdAt,
  }));
}