import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { getDb } from '../db/index.js';
import { featureGaps } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface FeatureGapInput {
  competitorId: string;
  competitorName: string;
  competitorFeatures: string[];
  userFeatures: string[];
}

export interface GapAnalysis {
  id: string;
  competitorId: string;
  missingFeatures: string[];
  recommendations: string;
  createdAt: Date;
}

/**
 * Analyze feature gaps between user's product and competitor.
 * Identifies features the competitor has that the user doesn't.
 * Uses OpenAI API if available, otherwise falls back to template-based analysis.
 */
export async function analyzeFeatureGaps(input: FeatureGapInput): Promise<GapAnalysis> {
  // Find missing features (features competitor has that user doesn't)
  const missingFeatures = findMissingFeatures(input.competitorFeatures, input.userFeatures);

  // Generate recommendations
  let recommendations: string;
  
  if (process.env.OPENAI_API_KEY) {
    const aiRecommendations = await tryOpenAIRecommendations(input, missingFeatures);
    recommendations = aiRecommendations || generateTemplateRecommendations(input, missingFeatures);
  } else {
    recommendations = generateTemplateRecommendations(input, missingFeatures);
  }

  return {
    id: uuidv4(),
    competitorId: input.competitorId,
    missingFeatures,
    recommendations,
    createdAt: new Date(),
  };
}

/**
 * Find features that competitor has but user doesn't.
 * Case-insensitive comparison.
 */
function findMissingFeatures(competitorFeatures: string[], userFeatures: string[]): string[] {
  const userFeaturesLower = new Set(
    userFeatures.map(f => f.toLowerCase().trim())
  );

  return competitorFeatures.filter(feature => {
    const featureLower = feature.toLowerCase().trim();
    return !userFeaturesLower.has(featureLower);
  });
}

/**
 * Try to generate recommendations using OpenAI API.
 * Returns null if API call fails or returns empty response.
 */
async function tryOpenAIRecommendations(
  input: FeatureGapInput,
  missingFeatures: string[]
): Promise<string | null> {
  if (missingFeatures.length === 0) {
    return null;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = buildOpenAIPrompt(input, missingFeatures);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a competitive intelligence analyst specializing in product strategy. Provide actionable, strategic recommendations for feature development. Be concise but insightful. Focus on business value and competitive advantage.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
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
function buildOpenAIPrompt(input: FeatureGapInput, missingFeatures: string[]): string {
  return `Competitor "${input.competitorName}" has these features that we don't have:
${missingFeatures.map(f => `- ${f}`).join('\n')}

Our current features:
${input.userFeatures.map(f => `- ${f}`).join('\n')}

Provide strategic recommendations:
1. Which missing features should we prioritize and why?
2. What competitive advantage might we gain?
3. Any potential risks or considerations?

Keep the response concise and actionable.`;
}

/**
 * Generate recommendations using simple templates.
 */
function generateTemplateRecommendations(
  input: FeatureGapInput,
  missingFeatures: string[]
): string {
  if (missingFeatures.length === 0) {
    return `No feature gaps detected. Your product has feature parity or advantage compared to ${input.competitorName}.`;
  }

  const recommendations: string[] = [];

  if (missingFeatures.length === 1) {
    recommendations.push(
      `${input.competitorName} has one feature you're missing: ${missingFeatures[0]}. ` +
      `Consider evaluating customer demand and implementation complexity to decide if this should be prioritized.`
    );
  } else {
    recommendations.push(
      `${input.competitorName} has ${missingFeatures.length} features you're missing: ${missingFeatures.join(', ')}.`
    );
    recommendations.push(
      `Priority recommendations:\n` +
      `1. Conduct customer research to validate demand for these features\n` +
      `2. Assess competitive impact - which features are table stakes vs differentiators?\n` +
      `3. Evaluate build vs buy vs partner options for quick time-to-market\n` +
      `4. Consider a phased rollout starting with high-impact, low-complexity features`
    );
  }

  return recommendations.join('\n\n');
}

/**
 * Save a gap analysis to the database.
 */
export async function saveGapAnalysis(input: {
  competitorId: string;
  missingFeatures: string[];
  recommendations: string;
}): Promise<GapAnalysis> {
  const db = getDb();
  const id = uuidv4();
  const createdAt = new Date();

  await db.insert(featureGaps).values({
    id,
    competitorId: input.competitorId,
    missingFeatures: JSON.stringify(input.missingFeatures),
    recommendations: input.recommendations,
    createdAt,
  });

  return {
    id,
    competitorId: input.competitorId,
    missingFeatures: input.missingFeatures,
    recommendations: input.recommendations,
    createdAt,
  };
}

/**
 * Get the most recent gap analysis for a competitor.
 */
export async function getGapAnalysis(competitorId: string): Promise<GapAnalysis | null> {
  const db = getDb();

  const results = await db
    .select()
    .from(featureGaps)
    .where(eq(featureGaps.competitorId, competitorId))
    .orderBy(desc(featureGaps.createdAt))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const r = results[0];
  
  // Handle missingFeatures - could be JSON string or empty
  let missingFeatures: string[];
  try {
    missingFeatures = r.missingFeatures ? JSON.parse(r.missingFeatures) : [];
  } catch {
    missingFeatures = [];
  }
  
  return {
    id: r.id,
    competitorId: r.competitorId,
    missingFeatures,
    recommendations: r.recommendations,
    createdAt: r.createdAt,
  };
}

/**
 * Get all gap analyses, ordered by most recent first.
 */
export async function getAllGapAnalyses(): Promise<GapAnalysis[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(featureGaps)
    .orderBy(desc(featureGaps.createdAt));

  return results.map(r => {
    // Handle missingFeatures - could be JSON string or empty
    let missingFeatures: string[];
    try {
      missingFeatures = r.missingFeatures ? JSON.parse(r.missingFeatures) : [];
    } catch {
      missingFeatures = [];
    }
    
    return {
      id: r.id,
      competitorId: r.competitorId,
      missingFeatures,
      recommendations: r.recommendations,
      createdAt: r.createdAt,
    };
  });
}
