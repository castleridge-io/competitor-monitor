# Product F: Competitor Monitor - Tasks

**Updated:** 2026-03-16

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

---

## Backlog

- Add Stripe billing
- Create user dashboard
- Add API rate limiting
- Analytics integration

---

## Stats

- Total: 5 tasks
- Blocked: 2
- Ready: 1
- Complete: 2
