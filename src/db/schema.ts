import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Competitors table
export const competitors = sqliteTable('competitors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  selectors: text('selectors'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Scrapes table
export const scrapes = sqliteTable('scrapes', {
  id: text('id').primaryKey(),
  competitorId: text('competitor_id').notNull().references(() => competitors.id),
  data: text('data').notNull(), // JSON string
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
});

// Reports table
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  competitorId: text('competitor_id').notNull().references(() => competitors.id),
  scrapeId: text('scrape_id').notNull().references(() => scrapes.id),
  htmlContent: text('html_content').notNull(),
  jsonData: text('json_data').notNull(), // JSON string
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Waitlist table
export const waitlist = sqliteTable('waitlist', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Subscriptions table
export const subscriptions = sqliteTable('competitor_subscriptions', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  competitorId: text('competitor_id').notNull().references(() => competitors.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Telegram settings table
export const telegramSettings = sqliteTable('telegram_settings', {
  id: text('id').primaryKey(),
  chatId: text('chat_id'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Change narratives table
export const changeNarratives = sqliteTable('change_narratives', {
  id: text('id').primaryKey(),
  competitorId: text('competitor_id').notNull().references(() => competitors.id),
  narrative: text('narrative').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Feature gaps table
export const featureGaps = sqliteTable('feature_gaps', {
  id: text('id').primaryKey(),
  competitorId: text('competitor_id').notNull().references(() => competitors.id),
  missingFeatures: text('missing_features').notNull(), // JSON string
  recommendations: text('recommendations').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Users table for billing
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id'),
  subscriptionTier: text('subscription_tier').notNull().default('free'), // 'free' | 'pro' | 'enterprise'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Billing subscriptions table
export const billingSubscriptions = sqliteTable('billing_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  status: text('status').notNull(), // 'active' | 'canceled' | 'past_due' | 'unpaid'
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// API Keys table for public API access
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  keyHash: text('key_hash').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
});

// Battlecards table for competitive battlecards
export const battlecards = sqliteTable('battlecards', {
  id: text('id').primaryKey(),
  competitorId: text('competitor_id').notNull().references(() => competitors.id),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  strengths: text('strengths').notNull(), // JSON array of strings
  weaknesses: text('weaknesses').notNull(), // JSON array of strings
  pricing: text('pricing').notNull(), // JSON pricing comparison
  features: text('features').notNull(), // JSON feature comparison
  winStrategies: text('win_strategies').notNull(), // JSON array of strings
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Videos table for AI-generated weekly digest videos
export const videos = sqliteTable('videos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  script: text('script').notNull(),
  videoUrl: text('video_url'),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'), // Duration in seconds
  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
  error: text('error'), // Error message if failed
  provider: text('provider').notNull().default('heygen'), // 'heygen' | 'tavus'
  providerVideoId: text('provider_video_id'), // External video ID from provider
  metadata: text('metadata'), // JSON string for additional data
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Video segments table for multi-competitor segments
export const videoSegments = sqliteTable('video_segments', {
  id: text('id').primaryKey(),
  videoId: text('video_id').notNull().references(() => videos.id),
  competitorId: text('competitor_id').notNull().references(() => competitors.id),
  order: integer('order').notNull(), // Order in video
  script: text('script').notNull(),
  startTime: integer('start_time'), // Start time in seconds
  endTime: integer('end_time'), // End time in seconds
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Relations
export const competitorsRelations = relations(competitors, ({ many }) => ({
  scrapes: many(scrapes),
  reports: many(reports),
  subscriptions: many(subscriptions),
  narratives: many(changeNarratives),
}));

export const scrapesRelations = relations(scrapes, ({ one, many }) => ({
  competitor: one(competitors, {
    fields: [scrapes.competitorId],
    references: [competitors.id],
  }),
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  competitor: one(competitors, {
    fields: [reports.competitorId],
    references: [competitors.id],
  }),
  scrape: one(scrapes, {
    fields: [reports.scrapeId],
    references: [scrapes.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  competitor: one(competitors, {
    fields: [subscriptions.competitorId],
    references: [competitors.id],
  }),
}));

export const changeNarrativesRelations = relations(changeNarratives, ({ one }) => ({
  competitor: one(competitors, {
    fields: [changeNarratives.competitorId],
    references: [competitors.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  subscription: one(billingSubscriptions, {
    fields: [users.id],
    references: [billingSubscriptions.userId],
  }),
}));

export const billingSubscriptionsRelations = relations(billingSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [billingSubscriptions.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const battlecardsRelations = relations(battlecards, ({ one }) => ({
  competitor: one(competitors, {
    fields: [battlecards.competitorId],
    references: [competitors.id],
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  segments: many(videoSegments),
}));

export const videoSegmentsRelations = relations(videoSegments, ({ one }) => ({
  video: one(videos, {
    fields: [videoSegments.videoId],
    references: [videos.id],
  }),
  competitor: one(competitors, {
    fields: [videoSegments.competitorId],
    references: [competitors.id],
  }),
}));

// Type exports
export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;
export type Scrape = typeof scrapes.$inferSelect;
export type NewScrape = typeof scrapes.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type TelegramSettings = typeof telegramSettings.$inferSelect;
export type NewTelegramSettings = typeof telegramSettings.$inferInsert;
export type ChangeNarrative = typeof changeNarratives.$inferSelect;
export type NewChangeNarrative = typeof changeNarratives.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type BillingSubscription = typeof billingSubscriptions.$inferSelect;
export type NewBillingSubscription = typeof billingSubscriptions.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type Battlecard = typeof battlecards.$inferSelect;
export type NewBattlecard = typeof battlecards.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type VideoSegment = typeof videoSegments.$inferSelect;
export type NewVideoSegment = typeof videoSegments.$inferInsert;
