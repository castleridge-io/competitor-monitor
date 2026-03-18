import cron from 'node-cron';
import { getDb } from '../db/index.js';
import { competitors, scrapes, subscriptions, users, changeNarratives, videos } from '../db/schema.js';
import { scrapeCompetitor, type ScraperInput } from './scraper.js';
import { generateReport, type ScrapeData } from './reporter.js';
import { sendChangeAlert } from './emailer.js';
import { sendTelegramAlert } from './telegram.js';
import { generateVideoScript, generateVideo } from './video-generator.js';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

const db = getDb();
const scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

export function startScheduler(): void {
  // Daily scrape at 6 AM HKT (22:00 UTC)
  const dailyJob = cron.schedule('0 22 * * *', async () => {
    console.log('⏰ Running daily competitor scrape...');
    await scrapeAllCompetitors();
  }, {
    timezone: 'Asia/Hong_Kong',
  });

  // Weekly video digest on Monday at 8 AM HKT (00:00 UTC Monday)
  const weeklyVideoJob = cron.schedule('0 0 * * 1', async () => {
    console.log('🎬 Generating weekly video digest...');
    await generateWeeklyDigestVideos();
  }, {
    timezone: 'Asia/Hong_Kong',
  });

  scheduledJobs.set('daily', dailyJob);
  scheduledJobs.set('weekly-video', weeklyVideoJob);
  console.log('✅ Scheduler started (daily at 6 AM HKT, weekly video on Monday at 8 AM HKT)');
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

      const reportUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/public/reports/${competitorId}`;

      // Get subscribed users for this competitor
      const subs = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.competitorId, competitorId));

      if (subs.length > 0) {
        // Send email alerts to subscribed users
        for (const sub of subs) {
          await sendChangeAlert(sub.email, {
            competitorName,
            competitorUrl: newData.url as string || '',
            field,
            oldValue: oldValue,
            newValue: newValue,
            reportUrl,
          });
        }

        console.log(`  📧 Alerted ${subs.length} subscribers via email`);
      }

      // Send Telegram alert
      const telegramResult = await sendTelegramAlert({
        competitorName,
        competitorUrl: newData.url as string || '',
        field,
        oldValue: oldValue,
        newValue: newValue,
        reportUrl,
      });

      if (telegramResult.success) {
        console.log(`  📱 Sent Telegram alert`);
      } else if (telegramResult.error !== 'Telegram not configured' &&
                 telegramResult.error !== 'Telegram alerts are disabled' &&
                 telegramResult.error !== 'No chat ID configured') {
        console.error(`  ❌ Telegram alert failed: ${telegramResult.error}`);
      }
    }
  }
}

/**
 * Generate weekly digest videos for users with video feature enabled.
 * This is called automatically by the scheduler every Monday.
 */
export async function generateWeeklyDigestVideos(): Promise<void> {
  // Check if video generation is enabled
  if (!process.env.HEYGEN_API_KEY && !process.env.TAVUS_API_KEY) {
    console.log('📹 Video generation disabled (no API key configured)');
    return;
  }

  // Get all users (in a real app, you'd filter by users with video feature enabled)
  const allUsers = await db.select().from(users);

  if (allUsers.length === 0) {
    console.log('📹 No users found for video generation');
    return;
  }

  console.log(`📹 Generating digest videos for ${allUsers.length} users...`);

  for (const user of allUsers) {
    try {
      // Get recent narratives for the user
      const narratives = await db
        .select()
        .from(changeNarratives)
        .orderBy(desc(changeNarratives.createdAt))
        .limit(20);

      if (narratives.length === 0) {
        console.log(`  ⏭️  No narratives for user ${user.email}, skipping`);
        continue;
      }

      // Generate script
      const script = await generateVideoScript(
        narratives.map(n => ({
          id: n.id,
          competitorId: n.competitorId,
          narrative: n.narrative,
          createdAt: n.createdAt,
        }))
      );

      // Determine provider (prefer HeyGen, fallback to Tavus)
      const provider = process.env.HEYGEN_API_KEY ? 'heygen' : 'tavus';

      // Generate video
      console.log(`  🎬 Generating video for ${user.email}...`);
      const videoResult = await generateVideo({
        script,
        title: `Weekly Competitor Digest - ${new Date().toLocaleDateString()}`,
        provider,
      });

      // Save video to database
      const videoId = uuidv4();
      const now = new Date();

      await db.insert(videos).values({
        id: videoId,
        userId: user.id,
        title: `Weekly Competitor Digest - ${now.toLocaleDateString()}`,
        script,
        videoUrl: null,
        thumbnailUrl: null,
        duration: null,
        status: 'processing',
        error: null,
        provider,
        providerVideoId: videoResult.providerVideoId,
        metadata: null,
        createdAt: now,
        completedAt: null,
      });

      console.log(`  ✅ Video generation started for ${user.email} (ID: ${videoId})`);

      // Rate limit between video generations
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`  ❌ Failed to generate video for ${user.email}:`, error);
    }
  }

  console.log('🏁 Weekly video digest complete');
}
