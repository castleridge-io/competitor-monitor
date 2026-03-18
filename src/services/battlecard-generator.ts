import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { getDb } from '../db/index.js';
import { battlecards, scrapes, competitors } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface BattlecardInput {
  competitorId: string;
}

export interface BattlecardData {
  id: string;
  competitorId: string;
  title: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  pricing: PricingComparison;
  features: FeatureComparison[];
  winStrategies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingComparison {
  competitor: string;
  ours: string;
  difference: string;
  analysis: string;
}

export interface FeatureComparison {
  feature: string;
  competitor: boolean;
  ours: boolean;
  notes?: string;
}

export interface SavedBattlecard {
  id: string;
  competitorId: string;
  title: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  pricing: PricingComparison;
  features: FeatureComparison[];
  winStrategies: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a competitive battlecard using AI.
 * Analyzes competitor data and creates actionable insights.
 */
export async function generateBattlecard(input: BattlecardInput): Promise<BattlecardData> {
  const db = getDb();

  // Get competitor info
  const competitorResult = await db
    .select()
    .from(competitors)
    .where(eq(competitors.id, input.competitorId));

  if (competitorResult.length === 0) {
    throw new Error('Competitor not found');
  }

  const competitor = competitorResult[0];

  // Get most recent scrape data
  const scrapeResult = await db
    .select()
    .from(scrapes)
    .where(eq(scrapes.competitorId, input.competitorId))
    .orderBy(desc(scrapes.scrapedAt))
    .limit(1);

  let scrapeData: Record<string, unknown> = {};
  if (scrapeResult.length > 0) {
    try {
      scrapeData = JSON.parse(scrapeResult[0].data);
    } catch {
      // Keep empty object if parse fails
    }
  }

  // Try AI generation first
  let battlecardData: Partial<BattlecardData>;
  if (process.env.OPENAI_API_KEY) {
    try {
      battlecardData = await generateWithAI(competitor, scrapeData);
    } catch (error) {
      console.error('AI generation failed, falling back to template:', error);
      battlecardData = generateTemplateBattlecard(competitor, scrapeData);
    }
  } else {
    battlecardData = generateTemplateBattlecard(competitor, scrapeData);
  }

  // Create battlecard record
  const id = uuidv4();
  const now = new Date();

  const battlecard: BattlecardData = {
    id,
    competitorId: input.competitorId,
    title: battlecardData.title || `Battlecard: ${competitor.name}`,
    summary: battlecardData.summary || '',
    strengths: battlecardData.strengths || [],
    weaknesses: battlecardData.weaknesses || [],
    pricing: battlecardData.pricing || {
      competitor: 'N/A',
      ours: 'N/A',
      difference: 'N/A',
      analysis: 'No pricing data available',
    },
    features: battlecardData.features || [],
    winStrategies: battlecardData.winStrategies || [],
    createdAt: now,
    updatedAt: now,
  };

  // Save to database
  await db.insert(battlecards).values({
    id,
    competitorId: input.competitorId,
    title: battlecard.title,
    summary: battlecard.summary,
    strengths: JSON.stringify(battlecard.strengths),
    weaknesses: JSON.stringify(battlecard.weaknesses),
    pricing: JSON.stringify(battlecard.pricing),
    features: JSON.stringify(battlecard.features),
    winStrategies: JSON.stringify(battlecard.winStrategies),
    createdAt: now,
    updatedAt: now,
  });

  return battlecard;
}

/**
 * Generate battlecard using OpenAI.
 */
async function generateWithAI(
  competitor: { name: string; url: string },
  scrapeData: Record<string, unknown>
): Promise<Partial<BattlecardData>> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = buildBattlecardPrompt(competitor, scrapeData);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a competitive intelligence analyst. Generate structured battlecards that help sales teams win against competitors.
Focus on actionable insights, not just data. Be specific and strategic.
Return ONLY valid JSON matching the schema provided.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const parsed = JSON.parse(content);

  return {
    title: parsed.title || `Battlecard: ${competitor.name}`,
    summary: parsed.summary || '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    pricing: parsed.pricing || {},
    features: Array.isArray(parsed.features) ? parsed.features : [],
    winStrategies: Array.isArray(parsed.winStrategies) ? parsed.winStrategies : [],
  };
}

/**
 * Build the prompt for AI battlecard generation.
 */
function buildBattlecardPrompt(
  competitor: { name: string; url: string },
  scrapeData: Record<string, unknown>
): string {
  return `Generate a competitive battlecard for "${competitor.name}" (${competitor.url}).

Available competitor data:
${JSON.stringify(scrapeData, null, 2)}

Return a JSON object with this exact structure:
{
  "title": "Battlecard: [Competitor Name]",
  "summary": "Brief 2-3 sentence overview of the competitor and their positioning",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "pricing": {
    "competitor": "Their pricing",
    "ours": "Our pricing",
    "difference": "Key difference",
    "analysis": "Strategic analysis"
  },
  "features": [
    {"feature": "Feature name", "competitor": true/false, "ours": true/false, "notes": "Optional notes"}
  ],
  "winStrategies": ["Strategy 1", "Strategy 2", "Strategy 3"]
}

Make the insights specific and actionable for sales conversations.`;
}

/**
 * Generate battlecard using templates (fallback when AI unavailable).
 */
function generateTemplateBattlecard(
  competitor: { name: string; url: string },
  scrapeData: Record<string, unknown>
): Partial<BattlecardData> {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const winStrategies: string[] = [];

  // Analyze available data
  if (scrapeData.price) {
    strengths.push(`Competitive pricing at ${scrapeData.price}`);
    winStrategies.push('Emphasize value over price - highlight ROI and total cost of ownership');
  }

  if (Array.isArray(scrapeData.features) && scrapeData.features.length > 0) {
    const featureCount = scrapeData.features.length;
    strengths.push(`Offers ${featureCount} key features`);
    weaknesses.push('Feature breadth may come at the expense of depth');
    winStrategies.push('Focus on our superior implementation and support for core features');
  }

  // Add generic insights
  if (strengths.length === 0) {
    strengths.push('Established market presence');
    strengths.push('Brand recognition');
  }

  if (weaknesses.length === 0) {
    weaknesses.push('May lack flexibility for custom requirements');
    weaknesses.push('Support response times can be slower');
  }

  if (winStrategies.length === 0) {
    winStrategies.push('Highlight our customer success stories');
    winStrategies.push('Emphasize our superior support and onboarding');
    winStrategies.push('Demonstrate ease of use and faster time-to-value');
  }

  return {
    title: `Battlecard: ${competitor.name}`,
    summary: `${competitor.name} is a competitor in the market. This battlecard provides key insights for competitive positioning.`,
    strengths,
    weaknesses,
    pricing: {
      competitor: scrapeData.price?.toString() || 'Contact for pricing',
      ours: 'Contact for pricing',
      difference: 'Varies by use case',
      analysis: 'Schedule a discovery call to understand specific pricing needs',
    },
    features: Array.isArray(scrapeData.features)
      ? (scrapeData.features as string[]).map(f => ({
          feature: f,
          competitor: true,
          ours: true,
          notes: 'Feature parity',
        }))
      : [],
    winStrategies,
  };
}

/**
 * Get a battlecard by ID.
 */
export async function getBattlecard(id: string): Promise<SavedBattlecard | null> {
  const db = getDb();

  const results = await db
    .select()
    .from(battlecards)
    .where(eq(battlecards.id, id))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const row = results[0];
  return parseBattlecardRow(row);
}

/**
 * Get all battlecards.
 */
export async function getAllBattlecards(): Promise<SavedBattlecard[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(battlecards)
    .orderBy(desc(battlecards.createdAt));

  return results.map(parseBattlecardRow);
}

/**
 * Get battlecards for a specific competitor.
 */
export async function getBattlecardsForCompetitor(
  competitorId: string
): Promise<SavedBattlecard[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(battlecards)
    .where(eq(battlecards.competitorId, competitorId))
    .orderBy(desc(battlecards.createdAt));

  return results.map(parseBattlecardRow);
}

/**
 * Update a battlecard.
 */
export async function updateBattlecard(
  id: string,
  data: Partial<BattlecardData>
): Promise<SavedBattlecard | null> {
  const db = getDb();
  const now = new Date();

  // Get existing battlecard
  const existing = await getBattlecard(id);
  if (!existing) {
    return null;
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.strengths !== undefined) updateData.strengths = JSON.stringify(data.strengths);
  if (data.weaknesses !== undefined) updateData.weaknesses = JSON.stringify(data.weaknesses);
  if (data.pricing !== undefined) updateData.pricing = JSON.stringify(data.pricing);
  if (data.features !== undefined) updateData.features = JSON.stringify(data.features);
  if (data.winStrategies !== undefined)
    updateData.winStrategies = JSON.stringify(data.winStrategies);

  await db
    .update(battlecards)
    .set(updateData)
    .where(eq(battlecards.id, id));

  return getBattlecard(id);
}

/**
 * Delete a battlecard.
 */
export async function deleteBattlecard(id: string): Promise<boolean> {
  const db = getDb();

  // Check if battlecard exists
  const existing = await getBattlecard(id);
  if (!existing) {
    return false;
  }

  try {
    await db
      .delete(battlecards)
      .where(eq(battlecards.id, id));
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a database row into a Battlecard object.
 */
function parseBattlecardRow(row: typeof battlecards.$inferSelect): SavedBattlecard {
  const defaultPricing: PricingComparison = {
    competitor: 'N/A',
    ours: 'N/A',
    difference: 'N/A',
    analysis: 'No pricing data available',
  };

  return {
    id: row.id,
    competitorId: row.competitorId,
    title: row.title,
    summary: row.summary,
    strengths: safeJsonParse(row.strengths, []),
    weaknesses: safeJsonParse(row.weaknesses, []),
    pricing: safeJsonParse(row.pricing, defaultPricing),
    features: safeJsonParse(row.features, []),
    winStrategies: safeJsonParse(row.winStrategies, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Safely parse JSON with fallback.
 */
function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
