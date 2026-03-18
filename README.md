# Competitor Monitor

B2B competitor monitoring tool — scrape, report, alert.

Track competitor pricing, features, and positioning changes with AI-powered insights, automated reports, and real-time alerts.

## Features

### Core Monitoring
- **Automated Scraping** - Daily competitor price & feature tracking with Playwright
- **Change Detection** - Automatic alerts for pricing and feature changes
- **Historical Trends** - Visual charts showing price/feature evolution over time
- **AI Narratives** - Natural language summaries of competitor changes

### User Experience
- **Web Dashboard** - React + Vite + TypeScript + Tailwind CSS interface
- **Telegram Bot** - Real-time alerts via Telegram (`/enable`, `/disable`, `/status`)
- **Email Reports** - Automated change summaries via Resend
- **Public Reports** - Shareable report links for stakeholders

### Business & Monetization
- **Stripe Billing** - 3-tier subscription (Free/Pro/Enterprise)
- **Customer Portal** - Self-service subscription management
- **Waitlist** - Landing page with email capture

### Advanced Features
- **Feature Gap Analysis** - "What features do competitors have that I don't?"
- **API Keys** - Programmatic access with rate limiting
- **Usage Tracking** - Per-API-key usage monitoring

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Configure environment
# Required: RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
# Optional: TELEGRAM_BOT_TOKEN, PROXY_SERVER

# Run in development
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## API Endpoints

### Core API
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

### Billing & Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/checkout` | Create Stripe checkout session |
| GET | `/api/billing/portal` | Create customer portal session |
| POST | `/api/billing/webhook` | Stripe webhook handler |
| GET | `/api/subscriptions` | Get user subscription status |

### Telegram Bot
| Command | Description |
|---------|-------------|
| `/start` | Initialize bot and link account |
| `/enable` | Enable change alerts |
| `/disable` | Disable change alerts |
| `/status` | Check alert status |

### Public API (v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/public/competitors` | List competitors (API key required) |
| GET | `/api/v1/public/competitors/:id` | Get competitor details |
| GET | `/api/v1/public/reports/:id` | Get public report |
| GET | `/api/v1/public/gaps` | Feature gap analysis |
| GET | `/api/v1/public/trends` | Historical trends |

### API Documentation
- Swagger UI: `GET /api/docs`
- OpenAPI JSON: `GET /api/docs.json`

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** SQLite (better-sqlite3) + Drizzle ORM
- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Scraping:** Playwright
- **Email:** Resend
- **Payments:** Stripe
- **Bot:** Grammy (Telegram)
- **Scheduler:** node-cron
- **Testing:** Vitest

## Project Structure

```
src/
├── index.ts              # Express app entry
├── routes/               # API endpoints
│   ├── competitors.ts
│   ├── scrape.ts
│   ├── reports.ts
│   ├── billing.ts        # Stripe integration
│   ├── subscriptions.ts
│   ├── gaps.ts           # Feature gap analysis
│   ├── trends.ts         # Historical trends
│   ├── api-keys.ts       # API key management
│   ├── public-api.ts     # Public REST API
│   └── public.ts         # Public pages
├── services/             # Business logic
│   ├── scraper.ts        # Playwright scraping
│   ├── reporter.ts       # Report generation
│   ├── narrator.ts       # AI change narratives
│   ├── emailer.ts        # Resend integration
│   ├── scheduler.ts      # Daily cron jobs
│   ├── telegram.ts       # Telegram bot
│   └── feature-gap-analyzer.ts
├── middleware/           # Express middleware
│   ├── auth.ts           # API key authentication
│   └── rate-limiter.ts   # Rate limiting
├── db/                   # Database setup
│   ├── schema.ts         # Drizzle schema
│   └── index.ts
└── frontend/             # React dashboard
    ├── pages/
    ├── components/
    └── hooks/
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |
| `DATABASE_PATH` | SQLite file path | No |
| `RESEND_API_KEY` | Resend API key | Yes (for emails) |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes (for billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes (for webhooks) |
| `STRIPE_PRICE_ID_*` | Stripe price IDs for tiers | Yes (for billing) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | No (for bot alerts) |
| `PUBLIC_URL` | Base URL for public reports | No |
| `PROXY_SERVER` | Proxy server for scraping | Recommended |
| `PROXY_USER` | Proxy username | If proxy requires auth |
| `PROXY_PASS` | Proxy password | If proxy requires auth |
| `RATE_LIMIT_MAX` | Max requests per minute | No (default: 100) |

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

# Run specific test file
pnpm test -- tests/routes/billing.test.ts
```

## Deployment

```bash
# Build
pnpm build

# Start production server
pnpm start
```

### Requirements
- Node.js 18+
- SQLite database (file-based or server)
- VPS or cloud hosting for scheduled scraping
- VPN/proxy recommended for reliable scraping

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test suite
pnpm test -- tests/services/scraper.test.ts
```

Test coverage: 246 tests across 23 test files.

## License

MIT
