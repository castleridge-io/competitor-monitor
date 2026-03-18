import type { SavedNarrative } from './narrator.js';

export interface VideoGenerationOptions {
  script: string;
  title: string;
  provider: 'heygen' | 'tavus';
}

export interface VideoGenerationResult {
  providerVideoId: string;
  status: string;
}

export interface VideoStatusOptions {
  providerVideoId: string;
  provider: 'heygen' | 'tavus';
}

export interface VideoStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

export class VideoGenerationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'VideoGenerationError';
  }
}

/**
 * Generate a video script from competitor narratives.
 * Groups narratives by competitor and formats for video presentation.
 */
export async function generateVideoScript(narratives: SavedNarrative[]): Promise<string> {
  if (narratives.length === 0) {
    return `Weekly Competitor Digest

No competitor changes detected this week.

Stay tuned for next week's update!`;
  }

  // Group narratives by competitor
  const byCompetitor = new Map<string, SavedNarrative[]>();
  for (const narrative of narratives) {
    const existing = byCompetitor.get(narrative.competitorId) || [];
    existing.push(narrative);
    byCompetitor.set(narrative.competitorId, existing);
  }

  // Build script sections
  const sections: string[] = [
    'Weekly Competitor Digest',
    '',
    `Here's what changed this week across ${byCompetitor.size} competitors:`,
    '',
  ];

  // Add competitor sections (limit to keep script reasonable)
  let totalChars = sections.join('\n').length;
  const maxChars = 4500; // Leave room for intro/outro

  for (const [competitorId, competitorNarratives] of byCompetitor) {
    if (totalChars > maxChars) break;

    const narrativeTexts = competitorNarratives
      .map(n => n.narrative)
      .join(' ');

    const section = `Competitor ${competitorId}:\n${narrativeTexts}\n`;

    if (totalChars + section.length <= maxChars) {
      sections.push(section);
      totalChars += section.length;
    }
  }

  sections.push('', 'That concludes this week\'s competitor digest. Stay competitive!');

  return sections.join('\n');
}

/**
 * Generate a video using HeyGen or Tavus API.
 * Handles API authentication and video generation request.
 */
export async function generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
  const { provider } = options;

  if (provider === 'heygen') {
    return generateHeyGenVideo(options);
  } else if (provider === 'tavus') {
    return generateTavusVideo(options);
  }

  throw new VideoGenerationError(`Unsupported provider: ${provider}`);
}

/**
 * Generate video using HeyGen Video Agent API.
 */
async function generateHeyGenVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
  const apiKey = process.env.HEYGEN_API_KEY;

  if (!apiKey) {
    throw new VideoGenerationError('HeyGen API key not configured');
  }

  const prompt = `Create a professional presenter video for the following script. The presenter should speak clearly and engagingly.

Title: ${options.title}

Script:
${options.script}`;

  return retryWithBackoff(async () => {
    const response = await fetch('https://api.heygen.com/v1/video_agent/generate', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoGenerationError(
        `HeyGen API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json() as { video_id: string };

    return {
      providerVideoId: data.video_id,
      status: 'processing',
    };
  });
}

/**
 * Generate video using Tavus API.
 */
async function generateTavusVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
  const apiKey = process.env.TAVUS_API_KEY;

  if (!apiKey) {
    throw new VideoGenerationError('Tavus API key not configured');
  }

  return retryWithBackoff(async () => {
    const response = await fetch('https://tavus.io/api/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: options.script,
        name: options.title,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoGenerationError(
        `Tavus API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json() as { video_id: string };

    return {
      providerVideoId: data.video_id,
      status: 'processing',
    };
  });
}

/**
 * Get video generation status from provider.
 */
export async function getVideoStatus(options: VideoStatusOptions): Promise<VideoStatusResult> {
  const { provider } = options;

  if (provider === 'heygen') {
    return getHeyGenVideoStatus(options);
  } else if (provider === 'tavus') {
    return getTavusVideoStatus(options);
  }

  throw new VideoGenerationError(`Unsupported provider: ${provider}`);
}

/**
 * Get video status from HeyGen API.
 */
async function getHeyGenVideoStatus(options: VideoStatusOptions): Promise<VideoStatusResult> {
  const apiKey = process.env.HEYGEN_API_KEY;

  if (!apiKey) {
    throw new VideoGenerationError('HeyGen API key not configured');
  }

  const response = await fetch(
    `https://api.heygen.com/v1/video/${options.providerVideoId}`,
    {
      headers: {
        'X-API-KEY': apiKey,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new VideoGenerationError(
      `HeyGen API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json() as {
    status?: string;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: string;
  };

  // Map HeyGen status to our status
  const statusMap: Record<string, VideoStatusResult['status']> = {
    pending: 'pending',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
  };

  const result: VideoStatusResult = {
    status: statusMap[data.status || ''] || 'pending',
  };

  if (data.video_url) {
    result.videoUrl = data.video_url;
  }

  if (data.thumbnail_url) {
    result.thumbnailUrl = data.thumbnail_url;
  }

  if (data.duration) {
    result.duration = data.duration;
  }

  if (data.error) {
    result.error = data.error;
  }

  return result;
}

/**
 * Get video status from Tavus API.
 */
async function getTavusVideoStatus(options: VideoStatusOptions): Promise<VideoStatusResult> {
  const apiKey = process.env.TAVUS_API_KEY;

  if (!apiKey) {
    throw new VideoGenerationError('Tavus API key not configured');
  }

  const response = await fetch(
    `https://tavus.io/api/videos/${options.providerVideoId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new VideoGenerationError(
      `Tavus API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json() as {
    status?: string;
    download_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: string;
  };

  // Map Tavus status to our status
  const statusMap: Record<string, VideoStatusResult['status']> = {
    queued: 'pending',
    processing: 'processing',
    ready: 'completed',
    failed: 'failed',
  };

  const result: VideoStatusResult = {
    status: statusMap[data.status || ''] || 'pending',
  };

  if (data.download_url) {
    result.videoUrl = data.download_url;
  }

  if (data.thumbnail_url) {
    result.thumbnailUrl = data.thumbnail_url;
  }

  if (data.duration) {
    result.duration = data.duration;
  }

  if (data.error) {
    result.error = data.error;
  }

  return result;
}

/**
 * Retry helper with exponential backoff.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx)
      if (error instanceof VideoGenerationError && error.message.includes('(4')) {
        throw error;
      }

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new VideoGenerationError(
    `Failed after ${maxRetries} retries`,
    lastError || undefined
  );
}
