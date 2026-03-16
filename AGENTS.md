# Competitor Monitor - AGENTS.md

> AI session routing file

## Paths

| Item | Path |
|------|------|
| Project | `~/projects/competitor-monitor` |
| Vault | `~/Vault/Projects/competitor-monitor` |
| Source | `src/` |
| Tests | `tests/` |
| Database | `data/competitor-monitor.db` |

## Commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Start | `pnpm start` |
| Test | `pnpm test` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Format | `pnpm format` |

## Stack

- Node.js + TypeScript + Express
- SQLite (better-sqlite3)
- Playwright (scraping)
- Resend (email)
- node-cron (scheduler)

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Express app entry |
| `src/db/index.ts` | SQLite setup |
| `src/services/scraper.ts` | Playwright scraping |
| `src/services/reporter.ts` | HTML report generation |
| `src/services/emailer.ts` | Resend integration |
| `src/services/scheduler.ts` | Daily cron |

## API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/competitors` | GET/POST | List/add competitors |
| `/api/scrape/:id` | POST | Trigger scrape |
| `/api/reports/:id` | GET | Get report |
| `/public/reports/:id` | GET | Public report page |

## Database Schema

```sql
competitors (id, name, url, selectors, created_at, updated_at)
scrapes (id, competitor_id, data, scraped_at)
reports (id, competitor_id, scrape_id, html_content, json_data, is_public, created_at)
waitlist (id, email, created_at)
```

## Workflow

1. Add competitor: `POST /api/competitors`
2. Scrape: `POST /api/scrape/:id`
3. Report generated automatically
4. Share: `GET /public/reports/:id`

---

**Created:** 2026-03-16
