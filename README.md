# Competitor Monitor

B2B competitor monitoring tool — scrape, report, alert.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Add your Resend API key
# RESEND_API_KEY=re_xxx

# Run in development
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/competitors` | List all competitors |
| POST | `/api/competitors` | Add competitor |
| GET | `/api/competitors/:id` | Get competitor |
| PATCH | `/api/competitors/:id` | Update competitor |
| DELETE | `/api/competitors/:id` | Delete competitor |
| POST | `/api/scrape/:competitorId` | Trigger manual scrape |
| GET | `/api/scrape/:competitorId` | Get scrape history |
| GET | `/api/reports/:id` | Get report |
| PATCH | `/api/reports/:id/public` | Make report public/private |
| GET | `/public/reports/:id` | Public report page |
| POST | `/public/waitlist` | Join waitlist |

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** SQLite (better-sqlite3)
- **Scraping:** Playwright
- **Email:** Resend
- **Scheduler:** node-cron

## Project Structure

```
src/
├── index.ts          # Express app entry
├── routes/           # API endpoints
│   ├── competitors.ts
│   ├── scrape.ts
│   ├── reports.ts
│   └── public.ts
├── services/         # Business logic
│   ├── scraper.ts    # Playwright scraping
│   ├── reporter.ts   # Report generation
│   ├── emailer.ts    # Resend integration
│   └── scheduler.ts  # Daily cron
├── models/           # TypeScript types
└── db/               # SQLite setup
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |
| `DATABASE_PATH` | SQLite file path | No |
| `RESEND_API_KEY` | Resend API key | Yes (for emails) |
| `PUBLIC_URL` | Base URL for public reports | No |
| `PROXY_SERVER` | Proxy server for scraping | Recommended |
| `PROXY_USER` | Proxy username | If proxy requires auth |
| `PROXY_PASS` | Proxy password | If proxy requires auth |

## Development

```bash
# Run with hot reload
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Run tests
pnpm test
```

## Deployment

```bash
# Build
pnpm build

# Start production server
pnpm start
```

Docker support coming soon.

## License

MIT
