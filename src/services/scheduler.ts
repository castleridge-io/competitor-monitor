import cron from 'node-cron';
import { getDatabase, saveDatabase } from '../db/index.js';
import { scrapeCompetitor } from './scraper.js';
import { generateReport } from './reporter.js';
import { sendChangeAlert } from './emailer.js';
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

export async function scrapeAllCompetitors(): Promise<void> {
  const db = await getDatabase();
  
  // Get all competitors using sql.js API
  const result = db.exec('SELECT * FROM competitors');
  
  if (!result[0] || result[0].values.length === 0) {
    console.log('📊 No competitors found to scrape');
    return;
  }
  
  const competitors: Competitor[] = result[0].values.map(row => ({
    id: row[0] as string,
    name: row[1] as string,
    url: row[2] as string,
    selectors: row[3] ? JSON.parse(row[3] as string) : undefined,
    createdAt: new Date(row[4] as string),
    updatedAt: new Date(row[5] as string),
  }));
  
  console.log(`📊 Found ${competitors.length} competitors to scrape`);
  
  for (const competitor of competitors) {
    try {
      console.log(`🔍 Scraping ${competitor.name}...`);
      
      const scrapeData = await scrapeCompetitor(competitor) as unknown as ScrapeData;
      
      // Store scrape
      const scrapeId = uuidv4();
      const now = new Date().toISOString();
      db.run(`
        INSERT INTO scrapes (id, competitor_id, data, scraped_at)
        VALUES (?, ?, ?, ?)
      `, [scrapeId, competitor.id, JSON.stringify(scrapeData), now]);
      
      // Check for changes
      const lastScrapeResult = db.exec(`
        SELECT data FROM scrapes 
        WHERE competitor_id = ? AND id != ?
        ORDER BY scraped_at DESC 
        LIMIT 1
      `, [competitor.id, scrapeId]);
      
      if (lastScrapeResult[0] && lastScrapeResult[0].values.length > 0) {
        const lastData = JSON.parse(lastScrapeResult[0].values[0][0] as string) as ScrapeData;
        await detectAndAlertChanges(competitor.id, competitor.name, lastData, scrapeData);
      }
      
      // Generate report
      await generateReport(competitor.id, scrapeId, scrapeData);
      
      saveDatabase();
      
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
  oldData: ScrapeData,
  newData: ScrapeData
): Promise<void> {
  const fieldsToCheck = ['price', 'features'] as const;
  
  for (const field of fieldsToCheck) {
    const oldValue = JSON.stringify(oldData[field]);
    const newValue = JSON.stringify(newData[field]);
    
    if (oldValue !== newValue) {
      console.log(`🔔 Change detected: ${competitorName} - ${field}`);
      console.log(`  Old: ${oldValue}`);
      console.log(`  New: ${newValue}`);
      
      // Get subscribed users for this competitor
      const db = await getDatabase();
      const subsResult = db.exec(`
        SELECT email FROM competitor_subscriptions 
        WHERE competitor_id = ?
      `, [competitorId]);
      
      if (subsResult[0] && subsResult[0].values.length > 0) {
        const emails = subsResult[0].values.map(row => row[0] as string);
        
        // Send alerts to subscribed users
        for (const email of emails) {
          await sendChangeAlert(email, {
            competitorName,
            competitorUrl: newData.url as string || '',
            field,
            oldValue: oldValue,
            newValue: newValue,
            reportUrl: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/public/reports/${competitorId}`,
          });
        }
        
        console.log(`  📧 Alerted ${emails.length} subscribers`);
      }
    }
  }
}
