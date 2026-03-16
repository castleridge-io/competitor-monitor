import cron from 'node-cron';
import { db } from '../db/index.js';
import { competitors, scrapes, subscriptions } from '../db/schema.js';
import { scrapeCompetitor, type ScraperInput } from './scraper.js';
import { generateReport, type ScrapeData } from './reporter.js';
import { sendChangeAlert } from './emailer.js';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

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
  // Get all competitors
  const allCompetitors = await db.select().from(competitors);
  
  if (allCompetitors.length === 0) {
    console.log('📊 No competitors found to scrape');
    return;
  }
  
  console.log(`📊 Found ${allCompetitors.length} competitors to scrape`);
  
  for (const competitor of allCompetitors) {
    try {
      console.log(`🔍 Scraping ${competitor.name}...`);
      
      // Parse selectors from JSON string and build scraper input
      const scraperInput: ScraperInput = {
        id: competitor.id,
        name: competitor.name,
        url: competitor.url,
        selectors: competitor.selectors ? JSON.parse(competitor.selectors) : undefined,
      };
      
      const scrapeData = await scrapeCompetitor(scraperInput) as ScrapeData;
      
      // Store scrape
      const scrapeId = uuidv4();
      const now = new Date();
      
      await db.insert(scrapes).values({
        id: scrapeId,
        competitorId: competitor.id,
        data: JSON.stringify(scrapeData),
        scrapedAt: now,
      });
      
      // Check for changes - get previous scrapes
      const previousScrapes = await db.select()
        .from(scrapes)
        .where(eq(scrapes.competitorId, competitor.id))
        .orderBy(desc(scrapes.scrapedAt))
        .limit(2);  // Get 2, skip the one we just inserted
      
      if (previousScrapes.length > 1) {
        const lastData = JSON.parse(previousScrapes[1].data) as ScrapeData;
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
      const subs = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.competitorId, competitorId));
      
      if (subs.length > 0) {
        // Send alerts to subscribed users
        for (const sub of subs) {
          await sendChangeAlert(sub.email, {
            competitorName,
            competitorUrl: newData.url as string || '',
            field,
            oldValue: oldValue,
            newValue: newValue,
            reportUrl: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/public/reports/${competitorId}`,
          });
        }
        
        console.log(`  📧 Alerted ${subs.length} subscribers`);
      }
    }
  }
}
