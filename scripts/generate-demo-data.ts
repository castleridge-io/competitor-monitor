#!/usr/bin/env tsx
/**
 * Generate demo competitor data and sample reports
 * This creates realistic mock data for marketing and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { initDatabase, closeDatabase, getDb } from '../src/db/index.js';
import { reports, scrapes, competitors } from '../src/db/schema.js';

async function generateDemoData() {
  // Initialize database first
  await initDatabase();
  
  const db = getDb();

  // Sample competitors (realistic SaaS companies in the monitoring space)
  const DEMO_COMPETITORS = [
    {
      name: 'Competitor A',
      url: 'https://competitor-a.example.com/pricing',
      description: 'Enterprise monitoring platform',
      selectors: {
        price: '.pricing-card .price',
        features: '.feature-list li',
      },
    },
    {
      name: 'Competitor B',
      url: 'https://competitor-b.example.com/plans',
      description: 'API monitoring service',
      selectors: {
        price: '[data-testid="price"]',
        features: '.features-grid li',
      },
    },
    {
      name: 'Competitor C',
      url: 'https://competitor-c.example.com/pricing',
      description: 'Uptime monitoring tool',
      selectors: {
        price: '.plan-price',
        features: '.plan-features li',
      },
    },
    {
      name: 'Competitor D',
      url: 'https://competitor-d.example.com/pricing',
      description: 'Status page service',
      selectors: {
        price: '.price-tag',
        features: '.feature-items li',
      },
    },
    {
      name: 'Competitor E',
      url: 'https://competitor-e.example.com/plans',
      description: 'Infrastructure monitoring',
      selectors: {
        price: '[class*="Price"]',
        features: '[class*="Features"] li',
      },
    },
  ];

  // Sample scrape results (realistic pricing data)
  const DEMO_SCRAPE_RESULTS = [
    {
      price: '$99/month',
      features: [
        'Unlimited monitors',
        '5-minute check intervals',
        'Email & SMS alerts',
        'Public status pages',
        'API access',
        'Team collaboration',
      ],
    },
    {
      price: '$49/month',
      features: [
        '50 monitors',
        '1-minute check intervals',
        'Webhook integrations',
        'Custom dashboards',
        'Historical data (30 days)',
      ],
    },
    {
      price: '$29/month',
      features: [
        '10 monitors',
        '5-minute check intervals',
        'Email alerts',
        'Basic reporting',
        'SSL monitoring',
      ],
    },
    {
      price: '$79/month',
      features: [
        'Unlimited status pages',
        'Custom domains',
        'Incident management',
        'Subscriber notifications',
        'Analytics dashboard',
        '99.9% uptime SLA',
      ],
    },
    {
      price: '$199/month',
      features: [
        'Infrastructure monitoring',
        'APM integration',
        'Log management',
        'Distributed tracing',
        'Custom metrics',
        'Enterprise SSO',
        '24/7 support',
      ],
    },
  ];

  console.log('🎭 Generating demo competitor data...\n');

  try {
    // Clear existing data using raw SQL
    db.run(sql`DELETE FROM reports`);
    db.run(sql`DELETE FROM scrapes`);
    db.run(sql`DELETE FROM competitors`);
    console.log('✅ Cleared existing data\n');

    // Insert competitors
    const insertedCompetitors = [];
    for (const comp of DEMO_COMPETITORS) {
      const id = uuidv4();
      const now = new Date();
      
      db.insert(competitors).values({
        id,
        name: comp.name,
        url: comp.url,
        selectors: JSON.stringify(comp.selectors),
        createdAt: now,
        updatedAt: now,
      }).run();
      
      insertedCompetitors.push({ id, ...comp });
      console.log(`✓ Added competitor: ${comp.name}`);
    }
    console.log('');

    // Generate scrapes and reports
    for (let i = 0; i < insertedCompetitors.length; i++) {
      const comp = insertedCompetitors[i];
      const scrapeData = DEMO_SCRAPE_RESULTS[i];
      
      // Insert scrape
      const scrapeId = uuidv4();
      const fullScrapeData = {
        ...scrapeData,
        name: comp.name,
        url: comp.url,
        scrapedAt: new Date().toISOString(),
      };
      
      db.insert(scrapes).values({
        id: scrapeId,
        competitorId: comp.id,
        data: JSON.stringify(fullScrapeData),
        scrapedAt: new Date(),
      }).run();
      
      console.log(`✓ Created scrape for: ${comp.name}`);

      // Generate report using the reporter service
      const { generateReport } = await import('../src/services/reporter.js');
      const report = await generateReport(comp.id, scrapeId, fullScrapeData);
      
      // Make it public
      db.update(reports)
        .set({ isPublic: true })
        .where(sql`id = ${report.id}`)
        .run();
      
      console.log(`✓ Generated public report: /public/reports/${report.id}`);
    }

    console.log('\n📊 Demo data generation complete!');
    console.log('\nNext steps:');
    console.log('1. Start the server: pnpm dev');
    console.log('2. View reports at: http://localhost:3000/public/reports/{report-id}');
    console.log('3. List all reports: curl http://localhost:3000/api/reports\n');

    // Show generated report IDs
    const allReports = db.select().from(reports).all() as Array<{id: string, competitorId: string}>;
    console.log('Generated reports:');
    for (const report of allReports) {
      const comp = insertedCompetitors.find(c => c.id === report.competitorId);
      console.log(`  - ${comp?.name}: http://localhost:3000/public/reports/${report.id}`);
    }

  } catch (error) {
    console.error('❌ Error generating demo data:', error);
    throw error;
  } finally {
    closeDatabase();
  }
}

// Import sql helper
import { sql } from 'drizzle-orm';

generateDemoData().catch(console.error);
