import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as schema from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/competitor-monitor.db');

let SQL: SqlJsStatic | null = null;
let sqlite: Database | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

function saveDatabase(): void {
  if (sqlite) {
    const data = sqlite.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export async function initDatabase(): Promise<void> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlite = new SQL.Database(buffer);
  } else {
    sqlite = new SQL.Database();
  }
  
  dbInstance = drizzle(sqlite, { schema });
  
  // Create tables using raw SQL
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

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS change_narratives (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      narrative TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS feature_gaps (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      missing_features TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS battlecards (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      strengths TEXT NOT NULL,
      weaknesses TEXT NOT NULL,
      pricing TEXT NOT NULL,
      features TEXT NOT NULL,
      win_strategies TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      stripe_customer_id TEXT,
      subscription_tier TEXT NOT NULL DEFAULT 'free',
      created_at INTEGER NOT NULL
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS billing_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stripe_subscription_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      current_period_end INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  // Create indexes
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_scrapes_competitor ON scrapes(competitor_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_scrapes_date ON scrapes(scraped_at)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_reports_public ON reports(is_public)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_competitor ON competitor_subscriptions(competitor_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_narratives_competitor ON change_narratives(competitor_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_narratives_date ON change_narratives(created_at)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_feature_gaps_competitor ON feature_gaps(competitor_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_feature_gaps_date ON feature_gaps(created_at)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_battlecards_competitor ON battlecards(competitor_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_battlecards_date ON battlecards(created_at)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user ON billing_subscriptions(user_id)`);
  sqlite.run(`CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_stripe ON billing_subscriptions(stripe_subscription_id)`);
  
  saveDatabase();
  console.log('✅ Database initialized');
}

export function closeDatabase(): void {
  if (sqlite) {
    saveDatabase();
    sqlite.close();
    sqlite = null;
    dbInstance = null;
  }
}

// Export schema for use in queries
export { schema };
