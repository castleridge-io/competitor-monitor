import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateVideoScript,
  generateVideo,
  getVideoStatus,
  VideoGenerationError,
} from '../../src/services/video-generator.js';
import type { SavedNarrative } from '../../src/services/narrator.js';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Video Generator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.HEYGEN_API_KEY;
    delete process.env.TAVUS_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateVideoScript', () => {
    it('should generate script from narratives', async () => {
      const narratives: SavedNarrative[] = [
        {
          id: 'narr-1',
          competitorId: 'comp-1',
          narrative: 'Competitor A dropped prices by 20%.',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'narr-2',
          competitorId: 'comp-2',
          narrative: 'Competitor B added new feature X.',
          createdAt: new Date('2024-01-02'),
        },
      ];

      const script = await generateVideoScript(narratives);

      expect(script).toContain('Weekly Competitor Digest');
      expect(script).toContain('Competitor A dropped prices by 20%');
      expect(script).toContain('Competitor B added new feature X');
    });

    it('should handle empty narratives', async () => {
      const script = await generateVideoScript([]);

      expect(script).toContain('No competitor changes detected');
    });

    it('should group narratives by competitor', async () => {
      const narratives: SavedNarrative[] = [
        {
          id: 'narr-1',
          competitorId: 'comp-1',
          narrative: 'Competitor A price change.',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'narr-2',
          competitorId: 'comp-1',
          narrative: 'Competitor A feature change.',
          createdAt: new Date('2024-01-02'),
        },
      ];

      const script = await generateVideoScript(narratives);

      expect(script).toContain('Competitor A');
    });

    it('should limit script length', async () => {
      const narratives: SavedNarrative[] = Array(20).fill(null).map((_, i) => ({
        id: `narr-${i}`,
        competitorId: `comp-${i}`,
        narrative: 'This is a long narrative about competitor changes. '.repeat(10),
        createdAt: new Date(),
      }));

      const script = await generateVideoScript(narratives);

      // Script should be reasonable length (under 5000 chars)
      expect(script.length).toBeLessThan(5000);
    });
  });

  describe('generateVideo (HeyGen)', () => {
    beforeEach(() => {
      process.env.HEYGEN_API_KEY = 'test-api-key';
    });

    it('should generate video with HeyGen API', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          video_id: 'video-123',
          status: 'processing',
        }),
      } as Response);

      const result = await generateVideo({
        script: 'Test video script',
        title: 'Weekly Digest',
        provider: 'heygen',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.heygen.com/v1/video_agent/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-KEY': 'test-api-key',
          }),
        })
      );

      expect(result).toEqual({
        providerVideoId: 'video-123',
        status: 'processing',
      });
    });

    it('should handle HeyGen API errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(
        generateVideo({
          script: 'Test script',
          title: 'Weekly Digest',
          provider: 'heygen',
        })
      ).rejects.toThrow(VideoGenerationError);
    });

    it('should throw error if API key not configured', async () => {
      delete process.env.HEYGEN_API_KEY;

      await expect(
        generateVideo({
          script: 'Test script',
          title: 'Weekly Digest',
          provider: 'heygen',
        })
      ).rejects.toThrow('HeyGen API key not configured');
    });
  });

  describe('generateVideo (Tavus)', () => {
    beforeEach(() => {
      process.env.TAVUS_API_KEY = 'test-api-key';
    });

    it('should generate video with Tavus API', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          video_id: 'tavus-video-123',
          status: 'processing',
        }),
      } as Response);

      const result = await generateVideo({
        script: 'Test video script',
        title: 'Weekly Digest',
        provider: 'tavus',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tavus'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('test-api-key'),
          }),
        })
      );

      expect(result).toEqual({
        providerVideoId: 'tavus-video-123',
        status: 'processing',
      });
    });

    it('should throw error if Tavus API key not configured', async () => {
      delete process.env.TAVUS_API_KEY;

      await expect(
        generateVideo({
          script: 'Test script',
          title: 'Weekly Digest',
          provider: 'tavus',
        })
      ).rejects.toThrow('Tavus API key not configured');
    });
  });

  describe('getVideoStatus', () => {
    beforeEach(() => {
      process.env.HEYGEN_API_KEY = 'test-api-key';
    });

    it('should fetch video status from HeyGen', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          video_id: 'video-123',
          status: 'completed',
          video_url: 'https://example.com/video.mp4',
          thumbnail_url: 'https://example.com/thumb.jpg',
          duration: 60,
        }),
      } as Response);

      const result = await getVideoStatus({
        providerVideoId: 'video-123',
        provider: 'heygen',
      });

      expect(result).toEqual({
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 60,
      });
    });

    it('should handle processing status', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          video_id: 'video-123',
          status: 'processing',
        }),
      } as Response);

      const result = await getVideoStatus({
        providerVideoId: 'video-123',
        provider: 'heygen',
      });

      expect(result.status).toBe('processing');
      expect(result.videoUrl).toBeUndefined();
    });

    it('should handle failed status', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          video_id: 'video-123',
          status: 'failed',
          error: 'Video generation failed',
        }),
      } as Response);

      const result = await getVideoStatus({
        providerVideoId: 'video-123',
        provider: 'heygen',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Video generation failed');
    });
  });

  describe('error handling', () => {
    it('should retry on transient errors', async () => {
      process.env.HEYGEN_API_KEY = 'test-api-key';
      const mockFetch = vi.mocked(fetch);

      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            video_id: 'video-123',
            status: 'processing',
          }),
        } as Response);

      const result = await generateVideo({
        script: 'Test script',
        title: 'Weekly Digest',
        provider: 'heygen',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('processing');
    });

    it('should fail after max retries', async () => {
      process.env.HEYGEN_API_KEY = 'test-api-key';
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        generateVideo({
          script: 'Test script',
          title: 'Weekly Digest',
          provider: 'heygen',
        })
      ).rejects.toThrow(VideoGenerationError);
    }, 10000);
  });
});
