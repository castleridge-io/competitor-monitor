import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../api'
import type { Competitor, Report, Scrape } from '../../types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Set up a default API key
    localStorage.setItem('apiKey', 'test-api-key')
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getCompetitors', () => {
    it('should fetch all competitors', async () => {
      const mockCompetitors: Competitor[] = [
        {
          id: '1',
          name: 'Competitor A',
          url: 'https://example.com',
          selectors: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompetitors),
      })

      const result = await apiClient.getCompetitors()

      expect(mockFetch).toHaveBeenCalledWith('/api/competitors', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
      })
      expect(result).toEqual(mockCompetitors)
    })

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      })

      await expect(apiClient.getCompetitors()).rejects.toThrow('Unauthorized')
    })
  })

  describe('createCompetitor', () => {
    it('should create a new competitor', async () => {
      const newCompetitor = {
        name: 'New Competitor',
        url: 'https://new.com',
      }

      const mockResponse: Competitor = {
        id: '2',
        ...newCompetitor,
        selectors: null,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.createCompetitor(newCompetitor)

      expect(mockFetch).toHaveBeenCalledWith('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify(newCompetitor),
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateCompetitor', () => {
    it('should update an existing competitor', async () => {
      const updateData = { name: 'Updated Name' }
      const mockResponse: Competitor = {
        id: '1',
        name: 'Updated Name',
        url: 'https://example.com',
        selectors: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.updateCompetitor('1', updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/competitors/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: JSON.stringify(updateData),
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteCompetitor', () => {
    it('should delete a competitor', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await apiClient.deleteCompetitor('1')

      expect(mockFetch).toHaveBeenCalledWith('/api/competitors/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
      })
    })
  })

  describe('getReports', () => {
    it('should fetch all reports', async () => {
      const mockReports = [
        {
          id: '1',
          competitorId: 'comp-1',
          isPublic: false,
          createdAt: new Date('2024-01-01'),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReports),
      })

      const result = await apiClient.getReports()

      expect(mockFetch).toHaveBeenCalledWith('/api/reports', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
      })
      expect(result).toEqual(mockReports)
    })
  })

  describe('getReport', () => {
    it('should fetch a single report by id', async () => {
      const mockReport: Report = {
        id: '1',
        competitorId: 'comp-1',
        scrapeId: 'scrape-1',
        htmlContent: '<html></html>',
        jsonData: { price: 100 },
        isPublic: false,
        createdAt: new Date('2024-01-01'),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      const result = await apiClient.getReport('1')

      expect(mockFetch).toHaveBeenCalledWith('/api/reports/1', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
      })
      expect(result).toEqual(mockReport)
    })
  })

  describe('triggerScrape', () => {
    it('should trigger a scrape for a competitor', async () => {
      const mockResponse = {
        scrapeId: 'scrape-1',
        reportId: 'report-1',
        data: { price: 99.99 },
        reportUrl: '/public/reports/report-1',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.triggerScrape('comp-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/scrape/comp-1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getScrapeHistory', () => {
    it('should fetch scrape history for a competitor', async () => {
      const mockScrapes: Scrape[] = [
        {
          id: 'scrape-1',
          competitorId: 'comp-1',
          data: { price: 99.99 },
          scrapedAt: new Date('2024-01-01'),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockScrapes),
      })

      const result = await apiClient.getScrapeHistory('comp-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/scrape/comp-1', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
      })
      expect(result).toEqual(mockScrapes)
    })
  })

  describe('authentication', () => {
    it('should not include Authorization header if no API key is set', async () => {
      localStorage.removeItem('apiKey')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await apiClient.getCompetitors()

      expect(mockFetch).toHaveBeenCalledWith('/api/competitors', {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })
  })
})