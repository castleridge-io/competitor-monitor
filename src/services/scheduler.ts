import cron from 'node-cron';
import { getDatabase, saveDatabase } from '../db/index.js';
import { scrapeCompetitor } from './scraper.js';
import { generateReport } from './reporter.js';
import { v4 as uuidv4 } from 'uuid';
import type { Competitor, ScrapeData } from '../models/index.js';

let scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

export function startScheduler(): void {
  // Daily scrape at 6 AM HKT (22:00 UTC)
  const dailyJob = cron.schedule('0 22 * * *', async () => {
    console.log('⏰ Running daily competitor scrape...');
    await scrapeAllCompetitors();
  }, {
    timezone: 'Asia/Hong_Kong',
  });
  
  scheduledJobs.set('daily', dailyJob);
  console.log('✅ Scheduler started (daily at 6 AM HKT)');
}

export function stopScheduler(): void {
  for (const [name, job] of scheduledJobs) {
    job.stop();
    console.log(`🛑 Stopped job: ${name}`);
  }
  scheduledJobs.clear();
}

async function scrapeAllCompetitors(): Promise<void> {
  const db = await getDatabase();
  const result = db.prepare('SELECT * FROM competitors');
  const competitors: Competitor[] = [];
  
  // Note: sql.js doesn't have iterators, we'd need to exec and parse
  // For now, just log
  console.log('📊 Scraping all competitors...');
  
  // This would need proper implementation with sql.js API
  // For MVP, manual scraping via API is sufficient
}

async function detectAndAlertChanges(
  competitorId: string,
  competitorName: string,
  oldData: ScrapeData,
  newData: ScrapeData
): Promise<void> {
  // Compare key fields
  const fieldsToCheck = ['price', 'features'];
  
  for (const field of fieldsToCheck) {
    const oldValue = JSON.stringify(oldData[field]);
    const newValue = JSON.stringify(newData[field]);
    
    if (oldValue !== newValue) {
      console.log(`🔔 Change detected: ${competitorName} - ${field}`);
      
      // TODO: Send email alert to subscribed users
      // For now, just log it
      console.log(`  Old: ${oldValue}`);
      console.log(`  New: ${newValue}`);
    }
  }
}
