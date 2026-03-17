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
