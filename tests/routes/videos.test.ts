import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Create a mutable reference for the database
const dbRef = vi.hoisted(() => ({ current: null as unknown }));

// Mock the db module before importing routes
vi.mock('../../src/db/index.js', () => ({
  getDb: () => dbRef.current,
}));

// Mock video generator service
vi.mock('../../src/services/video-generator.js', () => ({
  generateVideoScript: vi.fn(),
  generateVideo: vi.fn(),
  getVideoStatus: vi.fn(),
  VideoGenerationError: class VideoGenerationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'VideoGenerationError';
    }
  },
}));

// Import test utilities - must be after mock
import { setupTestDatabase, teardownTestDatabase, getTestDb, createTestUser, createTestCompetitor, createTestVideo, createTestNarrative } from '../utils/test-db.js';
import * as schema from '../../src/db/schema.js';
import { generateVideoScript, generateVideo, getVideoStatus } from '../../src/services/video-generator.js';

describe('Videos Routes', () => {
  let app: Express;
  let videosRouter: express.Router;

  beforeEach(async () => {
    // Reset module cache to get fresh router with new db
    vi.resetModules();

    await setupTestDatabase();
    dbRef.current = getTestDb();

    // Import router AFTER setting up db
    videosRouter = (await import('../../src/routes/videos.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api/videos', videosRouter);

    // Clear mock calls
    vi.clearAllMocks();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  describe('GET /api/videos', () => {
    it('should return empty array when no videos exist', async () => {
      const response = await request(app).get('/api/videos');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all videos', async () => {
      const user = await createTestUser({ id: 'user-1' });
      await createTestVideo({ id: 'video-1', userId: user.id, title: 'Video 1' });
      await createTestVideo({ id: 'video-2', userId: user.id, title: 'Video 2' });

      const response = await request(app).get('/api/videos');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should filter videos by status', async () => {
      const user = await createTestUser({ id: 'user-1' });
      await createTestVideo({ id: 'video-1', userId: user.id, status: 'completed' });
      await createTestVideo({ id: 'video-2', userId: user.id, status: 'pending' });
      await createTestVideo({ id: 'video-3', userId: user.id, status: 'completed' });

      const response = await request(app).get('/api/videos?status=completed');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.every((v: any) => v.status === 'completed')).toBe(true);
    });

    it('should sort videos by creation date (newest first)', async () => {
      const user = await createTestUser({ id: 'user-1' });
      await createTestVideo({ id: 'video-1', userId: user.id });
      await createTestVideo({ id: 'video-2', userId: user.id });

      const response = await request(app).get('/api/videos');

      expect(response.status).toBe(200);
      const dates = response.body.map((v: any) => new Date(v.createdAt).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
    });
  });

  describe('GET /api/videos/:id', () => {
    it('should return a single video with segments', async () => {
      const user = await createTestUser({ id: 'user-1' });
      const competitor = await createTestCompetitor({ id: 'comp-1' });
      const video = await createTestVideo({ id: 'video-1', userId: user.id });

      const db = getTestDb();
      await db.insert(schema.videoSegments).values({
        id: 'segment-1',
        videoId: video.id,
        competitorId: competitor.id,
        order: 0,
        script: 'First segment',
        startTime: null,
        endTime: null,
        createdAt: new Date(),
      });

      const response = await request(app).get('/api/videos/video-1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('video-1');
      expect(response.body.segments).toBeDefined();
      expect(response.body.segments.length).toBe(1);
    });

    it('should return 404 for non-existent video', async () => {
      const response = await request(app).get('/api/videos/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Video not found');
    });
  });

  describe('POST /api/videos/generate', () => {
    it('should generate a new video from narratives', async () => {
      const user = await createTestUser({ id: 'user-1' });
      const competitor = await createTestCompetitor({ id: 'comp-1', name: 'Competitor 1' });
      await createTestNarrative(competitor.id, 'Price changed');

      vi.mocked(generateVideoScript).mockResolvedValue('Test script');
      vi.mocked(generateVideo).mockResolvedValue({
        providerVideoId: 'video-123',
        status: 'processing',
      });

      const response = await request(app)
        .post('/api/videos/generate')
        .send({ userId: user.id, title: 'Weekly Digest' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('processing');
      expect(response.body.title).toBe('Weekly Digest');
      expect(generateVideo).toHaveBeenCalled();
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/videos/generate')
        .send({ title: 'Weekly Digest' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });

    it('should handle video generation errors', async () => {
      const user = await createTestUser({ id: 'user-1' });

      vi.mocked(generateVideoScript).mockResolvedValue('Test script');
      vi.mocked(generateVideo).mockRejectedValue(new Error('API error'));

      const response = await request(app)
        .post('/api/videos/generate')
        .send({ userId: user.id, title: 'Weekly Digest' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to generate video');
    }, 10000);

    it('should use custom provider if specified', async () => {
      const user = await createTestUser({ id: 'user-1' });

      vi.mocked(generateVideoScript).mockResolvedValue('Test script');
      vi.mocked(generateVideo).mockResolvedValue({
        providerVideoId: 'tavus-123',
        status: 'processing',
      });

      const response = await request(app)
        .post('/api/videos/generate')
        .send({ userId: user.id, title: 'Weekly Digest', provider: 'tavus' });

      expect(response.status).toBe(201);
      expect(generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'tavus' })
      );
    });
  });

  describe('POST /api/videos/:id/check-status', () => {
    it('should check video status from provider', async () => {
      const user = await createTestUser({ id: 'user-1' });
      await createTestVideo({
        id: 'video-1',
        userId: user.id,
        provider: 'heygen',
        providerVideoId: 'heygen-123',
      });

      vi.mocked(getVideoStatus).mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        duration: 60,
      });

      const response = await request(app).post('/api/videos/video-1/check-status');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.videoUrl).toBe('https://example.com/video.mp4');
      expect(getVideoStatus).toHaveBeenCalledWith({
        providerVideoId: 'heygen-123',
        provider: 'heygen',
      });
    });

    it('should update video in database', async () => {
      const user = await createTestUser({ id: 'user-1' });
      await createTestVideo({
        id: 'video-1',
        userId: user.id,
        provider: 'heygen',
        providerVideoId: 'heygen-123',
      });

      vi.mocked(getVideoStatus).mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        duration: 60,
      });

      await request(app).post('/api/videos/video-1/check-status');

      const db = getTestDb();
      const { eq } = await import('drizzle-orm');
      const videos = await db.select().from(schema.videos).where(eq(schema.videos.id, 'video-1'));

      expect(videos[0].status).toBe('completed');
      expect(videos[0].videoUrl).toBe('https://example.com/video.mp4');
      expect(videos[0].duration).toBe(60);
    });

    it('should return 404 for non-existent video', async () => {
      const response = await request(app).post('/api/videos/nonexistent/check-status');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/videos/:id', () => {
    it('should delete a video', async () => {
      const user = await createTestUser({ id: 'user-1' });
      await createTestVideo({ id: 'video-to-delete', userId: user.id });

      const response = await request(app).delete('/api/videos/video-to-delete');

      expect(response.status).toBe(204);

      const db = getTestDb();
      const videos = await db.select().from(schema.videos);
      expect(videos.find((v) => v.id === 'video-to-delete')).toBeUndefined();
    });

    it('should return 204 even for non-existent video', async () => {
      const response = await request(app).delete('/api/videos/nonexistent');

      expect(response.status).toBe(204);
    });
  });
});
