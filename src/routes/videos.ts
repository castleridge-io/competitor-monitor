import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { videos, videoSegments, changeNarratives } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import {
  generateVideoScript,
  generateVideo,
  getVideoStatus,
  VideoGenerationError,
} from '../services/video-generator.js';
import { getNarrativesForCompetitor } from '../services/narrator.js';

const router: RouterType = Router();
const db = getDb();

/**
 * GET /api/videos
 * List all videos with optional filtering
 */
router.get('/', async (req, res) => {
  const { status, userId, limit = '50' } = req.query;

  const conditions = [];
  if (status) {
    conditions.push(eq(videos.status, status as string));
  }
  if (userId) {
    conditions.push(eq(videos.userId, userId as string));
  }

  const result = await db
    .select()
    .from(videos)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(videos.createdAt))
    .limit(parseInt(limit as string, 10));

  res.json(result);
});

/**
 * GET /api/videos/:id
 * Get a single video with its segments
 */
router.get('/:id', async (req, res) => {
  const videoResult = await db
    .select()
    .from(videos)
    .where(eq(videos.id, req.params.id));

  if (videoResult.length === 0) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const video = videoResult[0];

  // Get video segments
  const segments = await db
    .select()
    .from(videoSegments)
    .where(eq(videoSegments.videoId, video.id))
    .orderBy(videoSegments.order);

  res.json({
    ...video,
    segments,
  });
});

/**
 * POST /api/videos/generate
 * Generate a new weekly digest video
 */
router.post('/generate', async (req, res) => {
  const { userId, title = 'Weekly Competitor Digest', provider = 'heygen' } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get recent narratives for all competitors
    // In a real app, you'd filter by user's competitors
    const allNarratives = await db
      .select()
      .from(changeNarratives)
      .orderBy(desc(changeNarratives.createdAt))
      .limit(50);

    // Generate script from narratives
    const script = await generateVideoScript(
      allNarratives.map(n => ({
        id: n.id,
        competitorId: n.competitorId,
        narrative: n.narrative,
        createdAt: n.createdAt,
      }))
    );

    // Generate video using provider
    const videoResult = await generateVideo({
      script,
      title,
      provider,
    });

    // Save video to database
    const videoId = uuidv4();
    const now = new Date();

    await db.insert(videos).values({
      id: videoId,
      userId,
      title,
      script,
      videoUrl: null,
      thumbnailUrl: null,
      duration: null,
      status: 'processing',
      error: null,
      provider,
      providerVideoId: videoResult.providerVideoId,
      metadata: null,
      createdAt: now,
      completedAt: null,
    });

    // Create video segments for each competitor
    const competitorNarratives = new Map<string, typeof allNarratives>();
    for (const narrative of allNarratives) {
      const existing = competitorNarratives.get(narrative.competitorId) || [];
      existing.push(narrative);
      competitorNarratives.set(narrative.competitorId, existing);
    }

    let order = 0;
    for (const [competitorId, narratives] of competitorNarratives) {
      const segmentScript = narratives.map(n => n.narrative).join(' ');

      await db.insert(videoSegments).values({
        id: uuidv4(),
        videoId,
        competitorId,
        order: order++,
        script: segmentScript,
        startTime: null,
        endTime: null,
        createdAt: now,
      });
    }

    // Fetch and return the created video
    const created = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId));

    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Video generation error:', error);

    if (error instanceof VideoGenerationError) {
      return res.status(500).json({
        error: `Failed to generate video: ${error.message}`,
      });
    }

    res.status(500).json({
      error: 'Failed to generate video',
    });
  }
});

/**
 * POST /api/videos/:id/check-status
 * Check video generation status from provider
 */
router.post('/:id/check-status', async (req, res) => {
  const videoResult = await db
    .select()
    .from(videos)
    .where(eq(videos.id, req.params.id));

  if (videoResult.length === 0) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const video = videoResult[0];

  if (!video.providerVideoId) {
    return res.status(400).json({ error: 'Video has no provider ID' });
  }

  try {
    const status = await getVideoStatus({
      providerVideoId: video.providerVideoId,
      provider: video.provider as 'heygen' | 'tavus',
    });

    // Update video in database
    const updateData: Partial<typeof videos.$inferInsert> = {
      status: status.status,
    };

    if (status.videoUrl) {
      updateData.videoUrl = status.videoUrl;
    }

    if (status.thumbnailUrl) {
      updateData.thumbnailUrl = status.thumbnailUrl;
    }

    if (status.duration) {
      updateData.duration = status.duration;
    }

    if (status.error) {
      updateData.error = status.error;
    }

    if (status.status === 'completed') {
      updateData.completedAt = new Date();
    }

    await db
      .update(videos)
      .set(updateData)
      .where(eq(videos.id, video.id));

    // Fetch updated video
    const updated = await db
      .select()
      .from(videos)
      .where(eq(videos.id, video.id));

    res.json(updated[0]);
  } catch (error) {
    console.error('Status check error:', error);

    if (error instanceof VideoGenerationError) {
      return res.status(500).json({
        error: `Failed to check status: ${error.message}`,
      });
    }

    res.status(500).json({
      error: 'Failed to check video status',
    });
  }
});

/**
 * DELETE /api/videos/:id
 * Delete a video
 */
router.delete('/:id', async (req, res) => {
  // Delete video segments first
  await db.delete(videoSegments).where(eq(videoSegments.videoId, req.params.id));

  // Delete video
  await db.delete(videos).where(eq(videos.id, req.params.id));

  res.status(204).send();
});

export default router;
