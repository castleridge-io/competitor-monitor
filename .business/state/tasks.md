# Product F: Competitor Monitor - Tasks

**Updated:** 2026-03-18

---

## Current Sprint

### TASK-F-001: Deploy Backend to VPS
- **Status:** 🔲 Blocked
- **Priority:** P0
- **Blocked By:** BLOCKER-F-001 (VPS access)
- **Estimate:** 2h

### TASK-F-002: Test Scraper with VPN
- **Status:** 🔄 In Progress
- **Priority:** P0
- **Estimate:** 1h
- **Dependencies:** None
- **Notes:** Local test successful (example.com). Need VPN credentials for real competitor testing.

### TASK-F-003: Write Unit Tests
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 2h
- **Started:** 2026-03-16 15:12 HKT
- **Completed:** 2026-03-16 16:09 HKT
- **Committed:** 2026-03-16 16:34 HKT (cb3aec3)
- **Notes:** All 89 tests passing. Fixed reporter.test.ts import issues and scheduler.test.ts timestamp issues.

### TASK-F-005: Landing Page Integration
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 0h
- **Completed:** 2026-03-16 16:34 HKT
- **Notes:** Form already connected to /public/waitlist endpoint. Includes localStorage fallback for when backend unavailable.

### TASK-F-004: Generate 5 Viral Reports
- **Status:** 🔲 Blocked
- **Priority:** P1
- **Blocked By:** TASK-F-001
- **Estimate:** 2h

### TASK-F-006: Competitor Research & Feature Roadmap
- **Status:** ✅ Complete
- **Priority:** P0
- **Estimate:** 2h
- **Started:** 2026-03-17 15:17 HKT
- **Completed:** 2026-03-17 15:20 HKT
- **Notes:** Full competitor research saved to ~/Vault/Projects/F-competitor-monitor/Competitor-Research-2026-03-17.md

---

## Feature Parity (Phase 1)

### TASK-F-007: Build User Dashboard UI
- **Status:** ✅ Complete
- **Priority:** P0
- **Estimate:** 3-4 days
- **Started:** 2026-03-17 15:35 HKT
- **Completed:** 2026-03-17 16:45 HKT
- **Merged:** PR #3 (2026-03-17)
- **Notes:** React dashboard with Vite + TypeScript + Tailwind. 89 tests passing. Includes Dashboard Overview, Competitors, Reports, Settings pages, auth hooks, price history charts.

### TASK-F-008: Historical Trend Charts
- **Status:** ✅ Complete
- **Priority:** P0
- **Estimate:** 2-3 days
- **Started:** 2026-03-17 17:54 HKT
- **Completed:** 2026-03-17 18:15 HKT
- **Merged:** PR #7 (2026-03-17)
- **Notes:** Price/feature history over time with visual charts using recharts. HistoricalPriceChart component with time range selector.

### TASK-F-009: Telegram Bot Integration
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 1-2 days
- **Started:** 2026-03-17 16:08 HKT
- **Completed:** 2026-03-17 17:26 HKT
- **Merged:** PR #6 (2026-03-17)
- **Notes:** Successfully recreated with F013 conflicts resolved. Grammy bot with /start, /enable, /disable, /status commands. Integrated with scheduler for real-time alerts. 113+ tests passing.

### TASK-F-010: Public REST API
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 2-3 days
- **Started:** 2026-03-17 22:30 HKT
- **Completed:** 2026-03-18 08:53 HKT
- **Merged:** PR #11 (2026-03-18)
- **Notes:** All 246 tests passing. Fixed auth middleware (API key length 72 chars), ownership check in /:id/usage, public API middleware, swagger-ui setup. Features: auth middleware, rate limiter, API key management, public endpoints, OpenAPI docs.

### TASK-F-011: Stripe Billing Integration
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 2-3 days
- **Started:** 2026-03-17 20:49 HKT
- **Completed:** 2026-03-17 21:43 HKT
- **Merged:** PR #10 (2026-03-17)
- **Notes:** Full Stripe integration with 3 tiers (Free/Pro/Enterprise), checkout, customer portal, webhook handling. 21 tests passing. Frontend: PricingPage, BillingPage, useBilling hook. Rescued from closed PR #9, rebased and merged.

### TASK-F-012: API Rate Limiting
- **Status:** ✅ Complete
- **Priority:** P2
- **Estimate:** 1 day
- **Started:** 2026-03-18 09:18 HKT
- **Completed:** 2026-03-18 11:00 HKT
- **Merged:** PR #12 (2026-03-18)
- **Notes:** Applied rate limiter to all public API routes. Middleware existed but wasn't applied. Critical security fix.

---

## High Impact Novel Features (Phase 2)

### TASK-F-013: AI Change Narratives
- **Status:** ✅ Complete
- **Priority:** P0
- **Estimate:** 2-3 days
- **Started:** 2026-03-17 15:35 HKT
- **Completed:** 2026-03-17 16:45 HKT
- **Merged:** PR #4 (2026-03-17)
- **Notes:** AI narrator service for generating change summaries. 110 tests passing. Database schema for narratives, LLM integration ready.

### TASK-F-014: Feature Gap Analysis
- **Status:** ✅ Complete
- **Priority:** P0
- **Estimate:** 3-5 days
- **Started:** 2026-03-17 18:20 HKT
- **Completed:** 2026-03-17 19:03 HKT
- **Merged:** PR #8 (2026-03-17)
- **Notes:** "What features does competitor X have that I don't?" comparison. Frontend GapsPage, backend routes/gaps.ts, feature-gap-analyzer service. 512+ tests passing.

### TASK-F-015: Competitor Timeline Visualization
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 2-3 days
- **Started:** 2026-03-18 09:45 HKT
- **Completed:** 2026-03-18 10:42 HKT
- **Merged:** PR #13 (2026-03-18)
- **Notes:** Visual timeline of all changes with AI annotations. Backend route + frontend TimelinePage component. 534+ new tests.

### TASK-F-016: Battlecard Generator
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 3-5 days
- **Started:** 2026-03-18 11:57 HKT
- **Completed:** 2026-03-18 12:47 HKT
- **Merged:** PR #16 (2026-03-18)
- **Notes:** AI-generated battlecards from scraped competitor data. Database schema, backend API, service, frontend page, 100+ tests.

### TASK-F-017: Embed Widgets
- **Status:** ✅ Complete
- **Priority:** P1
- **Estimate:** 2-3 days
- **Started:** 2026-03-18 15:07 HKT
- **Completed:** 2026-03-18 15:28 HKT
- **Merged:** PR #17 (2026-03-18)
- **Notes:** Embeddable widgets with price badges, mini timeline, competitor comparison cards. Backend embed routes, frontend widget components, 100+ tests.

---

## Differentiators (Phase 3)

### TASK-F-018: One-Click Competitor Cloning
- **Status:** 🔄 In Progress
- **Priority:** P2
- **Estimate:** 5-7 days
- **Started:** 2026-03-18 15:51 HKT
- **Notes:** Import competitor URL → auto-detect features → gap report. Agent spawned to implement backend routes, frontend UI, and tests.

### TASK-F-019: Market Position Maps
- **Status:** 🔲 Ready
- **Priority:** P2
- **Estimate:** 3-4 days
- **Notes:** Auto-generated 2x2 positioning charts

### TASK-F-020: Weekly Digest Videos
- **Status:** 🔲 Ready
- **Priority:** P2
- **Estimate:** 5-7 days
- **Notes:** AI video summaries (HeyGen/Tavus integration)

---

## Moonshots (Future)

### TASK-F-021: Multi-Source Intelligence
- **Status:** 🔲 Backlog
- **Priority:** P3
- **Estimate:** 3-4 weeks
- **Notes:** Social, ads, reviews, news in one place

### TASK-F-022: Predictive Alerts
- **Status:** 🔲 Backlog
- **Priority:** P3
- **Estimate:** 2-3 weeks
- **Notes:** "Competitor likely to launch X based on hiring/keywords"

### TASK-F-023: CRM Integrations
- **Status:** 🔲 Backlog
- **Priority:** P3
- **Estimate:** 2-3 weeks
- **Notes:** Salesforce, HubSpot integrations for win/loss tracking

---

## Stats

| Category | Count |
|----------|-------|
| Total | 23 tasks |
| Complete | 16 |
| In Progress | 0 |
| Blocked | 2 |
| Ready | 5 |
| Backlog | 3 |

**Updated:** 2026-03-18 15:50 HKT
