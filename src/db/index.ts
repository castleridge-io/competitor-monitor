import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/competitor-monitor.db');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
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
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  }
  return db;
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();
  
  // Create tables
  database.run(`
    CREATE TABLE IF NOT EXISTS competitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      selectors TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.run(`
    CREATE TABLE IF NOT EXISTS scrapes (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      data TEXT NOT NULL,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      scrape_id TEXT NOT NULL,
      html_content TEXT NOT NULL,
      json_data TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.run(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.run(`
    CREATE TABLE IF NOT EXISTS competitor_subscriptions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      competitor_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email, competitor_id)
    )
  `);
  
  // Create indexes
  database.run(`CREATE INDEX IF NOT EXISTS idx_scrapes_competitor ON scrapes(competitor_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_scrapes_date ON scrapes(scraped_at)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_reports_public ON reports(is_public)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_competitor ON competitor_subscriptions(competitor_id)`);
  
  saveDatabase();
  console.log('✅ Database initialized');
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
