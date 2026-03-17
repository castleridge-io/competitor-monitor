# Product F: Competitor Monitor - Tasks

**Updated:** 2026-03-17

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
- **Status:** 🔲 Ready
- **Priority:** P1
- **Estimate:** 2-3 days
- **Notes:** API docs, authentication, rate limiting

### TASK-F-011: Stripe Billing Integration
- **Status:** 🔲 Ready
- **Priority:** P1
- **Estimate:** 2-3 days
- **Notes:** Subscription tiers, checkout, webhook handling

### TASK-F-012: API Rate Limiting
- **Status:** 🔲 Ready
- **Priority:** P2
- **Estimate:** 1 day
- **Notes:** Per-user limits, abuse prevention

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
- **Status:** 🔄 In Progress
- **Priority:** P0
- **Estimate:** 3-5 days
- **Started:** 2026-03-17 18:20 HKT
- **Agent:** Codex (session: fast-seaslug)
- **Notes:** "What features does competitor X have that I don't?" comparison

### TASK-F-015: Competitor Timeline Visualization
- **Status:** 🔲 Ready
- **Priority:** P1
- **Estimate:** 2-3 days
- **Notes:** Visual timeline of all changes with AI annotations

### TASK-F-016: Battlecard Generator
- **Status:** 🔲 Ready
- **Priority:** P1
- **Estimate:** 3-5 days
- **Notes:** AI-generated battlecards from scraped competitor data

### TASK-F-017: Embed Widgets
- **Status:** 🔲 Ready
- **Priority:** P1
- **Estimate:** 2-3 days
- **Notes:** "Powered by Competitor Monitor" embeddable widgets

---

## Differentiators (Phase 3)

### TASK-F-018: One-Click Competitor Cloning
- **Status:** 🔲 Ready
- **Priority:** P2
- **Estimate:** 5-7 days
- **Notes:** Import competitor URL → auto-detect features → gap report

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
| Complete | 7 |
| In Progress | 0 |
| Blocked | 2 |
| Ready | 11 |
| Backlog | 3 |

**Updated:** 2026-03-17 18:18 HKT
