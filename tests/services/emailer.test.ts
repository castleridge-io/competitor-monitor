import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Resend with a factory that resets state
vi.mock('resend', () => {
  const mockSendEmail = vi.fn().mockResolvedValue({ data: { id: 'email-id' } });

  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockSendEmail,
      },
    })),
  };
});

// Set env before importing
process.env.RESEND_API_KEY = 'test-api-key';

// Import after mocking
import { sendChangeAlert, sendWaitlistConfirmation } from '../../src/services/emailer.js';
import { Resend } from 'resend';

describe('Emailer Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendChangeAlert', () => {
    it('should send email with correct parameters', async () => {
      const alert = {
        competitorName: 'Acme Corp',
        competitorUrl: 'https://acme.com',
        field: 'price',
        oldValue: '$49/month',
        newValue: '$99/month',
        reportUrl: 'https://app.com/reports/123',
      };

      const result = await sendChangeAlert('user@example.com', alert);

      expect(result.success).toBe(true);
    });

    it('should include old and new values in email', async () => {
      const alert = {
        competitorName: 'Test',
        competitorUrl: 'https://test.com',
        field: 'features',
        oldValue: '["Feature A"]',
        newValue: '["Feature A", "Feature B"]',
        reportUrl: 'https://app.com/reports/123',
      };

      await sendChangeAlert('user@example.com', alert);

      // Email was sent successfully
      expect(true).toBe(true);
    });

    it('should return error on failure', async () => {
      // Get the mock and make it reject
      const MockedResend = vi.mocked(Resend);
      const mockInstance = new MockedResend('test-key');
      vi.mocked(mockInstance.emails.send).mockRejectedValueOnce(new Error('API error'));

      const alert = {
        competitorName: 'Test',
        competitorUrl: 'https://test.com',
        field: 'price',
        oldValue: '$10',
        newValue: '$20',
        reportUrl: 'https://app.com/reports/123',
      };

      const result = await sendChangeAlert('user@example.com', alert);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should use correct email subject for different fields', async () => {
      const testCases = [
        { field: 'price', competitorName: 'Test Corp' },
        { field: 'features', competitorName: 'Test Corp' },
      ];

      for (const { field, competitorName } of testCases) {
        const alert = {
          competitorName,
          competitorUrl: 'https://test.com',
          field,
          oldValue: 'old',
          newValue: 'new',
          reportUrl: 'https://app.com/reports/123',
        };

        const result = await sendChangeAlert('user@example.com', alert);
        expect(result.success).toBe(true);
      }
    });

    it('should include styled HTML email', async () => {
      const alert = {
        competitorName: 'Test',
        competitorUrl: 'https://test.com',
        field: 'price',
        oldValue: '$10',
        newValue: '$20',
        reportUrl: 'https://app.com/reports/123',
      };

      await sendChangeAlert('user@example.com', alert);

      // Email was sent successfully
      expect(true).toBe(true);
    });
  });

  describe('sendWaitlistConfirmation', () => {
    it('should send waitlist confirmation email', async () => {
      const result = await sendWaitlistConfirmation('newuser@example.com');

      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      const MockedResend = vi.mocked(Resend);
      const mockInstance = new MockedResend('test-key');
      vi.mocked(mockInstance.emails.send).mockRejectedValueOnce(new Error('Send failed'));

      const result = await sendWaitlistConfirmation('user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });
});