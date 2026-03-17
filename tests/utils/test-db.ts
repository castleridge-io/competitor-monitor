import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import * as schema from '../../src/db/schema.js';

let sqlite: initSqlJs.Database | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Mutable getter for mocking - allows tests to set this during setup
let _getDb: () => ReturnType<typeof drizzle<typeof schema>> = () => {
  throw new Error('Test database not initialized');
};

export function getTestDb() {
  if (!dbInstance) {
    throw new Error('Test database not initialized');
  }
  return dbInstance;
}

// Getter function that can be used in mocks - returns a function
// This is exported specifically for vi.mock hoisting issues
export function getDbGetter() {
  return _getDb;
}

export function setDbGetter(fn: () => ReturnType<typeof drizzle<typeof schema>>) {
  _getDb = fn;
}

export async function setupTestDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  sqlite = new SQL.Database();

  dbInstance = drizzle(sqlite, { schema });

  // Set the getter for mocks to use
  setDbGetter(() => dbInstance!);

  // Create tables
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS competitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      selectors TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS scrapes (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      data TEXT NOT NULL,
      scraped_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      scrape_id TEXT NOT NULL,
      html_content TEXT NOT NULL,
      json_data TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS competitor_subscriptions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      competitor_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(email, competitor_id)
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS telegram_settings (
      id TEXT PRIMARY KEY,
      chat_id TEXT,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

export function teardownTestDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    dbInstance = null;
  }
}

// Helper to create test competitor
export async function createTestCompetitor(overrides: Partial<{
  id: string;
  name: string;
  url: string;
  selectors: Record<string, string>;
}> = {}) {
  const db = getTestDb();
  const id = overrides.id || 'test-competitor-1';
  const now = new Date();

  await db.insert(schema.competitors).values({
    id,
    name: overrides.name || 'Test Competitor',
    url: overrides.url || 'https://example.com',
    selectors: overrides.selectors ? JSON.stringify(overrides.selectors) : null,
    createdAt: now,
    updatedAt: now,
  });

  return { id, name: overrides.name || 'Test Competitor', url: overrides.url || 'https://example.com' };
}

// Helper to create test scrape
export async function createTestScrape(competitorId: string, data: Record<string, unknown> = {}, timestamp?: Date) {
  const db = getTestDb();
  const id = `scrape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const scrapedAt = timestamp || new Date();

  const scrapeData = {
    price: '$99/month',
    features: ['Feature 1', 'Feature 2'],
    ...data,
  };

  await db.insert(schema.scrapes).values({
    id,
    competitorId,
    data: JSON.stringify(scrapeData),
    scrapedAt,
  });

  return { id, competitorId, data: scrapeData };
}

// Helper to create test report
export async function createTestReport(competitorId: string, scrapeId: string, overrides: Partial<{
  id: string;
  isPublic: boolean;
  jsonData: Record<string, unknown>;
  htmlContent: string;
}> = {}) {
  const db = getTestDb();
  const id = overrides.id || `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  const jsonData = overrides.jsonData || {
    price: '$99/month',
    features: ['Feature 1', 'Feature 2'],
    name: 'Test Competitor',
    url: 'https://example.com',
  };

  await db.insert(schema.reports).values({
    id,
    competitorId,
    scrapeId,
    htmlContent: overrides.htmlContent || '<html><body>Test Report</body></html>',
    jsonData: JSON.stringify(jsonData),
    isPublic: overrides.isPublic ?? false,
    createdAt: now,
  });

  return { id, competitorId, scrapeId, jsonData };
}

// Helper to create test subscription
export async function createTestSubscription(email: string, competitorId: string) {
  const db = getTestDb();
  const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  await db.insert(schema.subscriptions).values({
    id,
    email,
    competitorId,
    createdAt: now,
  });

  return { id, email, competitorId };
}

// Helper to create test waitlist entry
export async function createTestWaitlistEntry(email: string) {
  const db = getTestDb();
  const id = `waitlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  await db.insert(schema.waitlist).values({
    id,
    email,
    createdAt: now,
  });

  return { id, email };
}

// Helper to create test telegram settings
export async function createTestTelegramSettings(overrides: Partial<{
  id: string;
  chatId: string;
  enabled: boolean;
}> = {}) {
  const db = getTestDb();
  const id = overrides.id || 'telegram-settings-1';
  const now = new Date();

  await db.insert(schema.telegramSettings).values({
    id,
    chatId: overrides.chatId || null,
    enabled: overrides.enabled ?? false,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    chatId: overrides.chatId || null,
    enabled: overrides.enabled ?? false,
  };
}