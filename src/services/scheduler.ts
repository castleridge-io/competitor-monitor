import cron from 'node-cron';
import { getDatabase } from '../db/index.js';
import { scrapeCompetitor } from './scraper.js';
import { generateReport } from './reporter.js';
import { v4 as uuidv4 } from 'uuid';

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
  const db = getDatabase();
  const competitors = db.prepare('SELECT * FROM competitors').all() as Array<{
    id: string;
    name: string;
    url: string;
    selectors?: string;
  }>;
  
  console.log(`📊 Found ${competitors.length} competitors to scrape`);
  
  for (const competitor of competitors) {
    try {
      console.log(`🔍 Scraping ${competitor.name}...`);
      
      const selectors = competitor.selectors 
        ? JSON.parse(competitor.selectors) 
        : undefined;
      
      const scrapeData = await scrapeCompetitor({
        ...competitor,
        selectors,
      });
      
      // Store scrape
      const scrapeId = uuidv4();
      db.prepare(`
        INSERT INTO scrapes (id, competitor_id, data)
        VALUES (?, ?, ?)
      `).run(scrapeId, competitor.id, JSON.stringify(scrapeData));
      
      // Check for changes
      const lastScrape = db.prepare(`
        SELECT data FROM scrapes 
        WHERE competitor_id = ? AND id != ?
        ORDER BY scraped_at DESC 
        LIMIT 1
      `).get(competitor.id, scrapeId) as { data: string } | undefined;
      
      if (lastScrape) {
        const lastData = JSON.parse(lastScrape.data);
        await detectAndAlertChanges(competitor.id, competitor.name, lastData, scrapeData);
      }
      
      // Generate report
      await generateReport(competitor.id, scrapeId, scrapeData);
      
      console.log(`✅ Completed ${competitor.name}`);
      
      // Rate limit between scrapes
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to scrape ${competitor.name}:`, error);
    }
  }
  
  console.log('🏁 Daily scrape complete');
}

async function detectAndAlertChanges(
  competitorId: string,
  competitorName: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
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
