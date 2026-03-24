# KokojamboTrade

## Overview

Algorithmic trading bot dashboard with live and paper trading, signal scanning, and Telegram integration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (with tsx in dev)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React 19 + Vite + TailwindCSS v4
- **UI**: shadcn/ui components, framer-motion animations
- **Trading**: BingX exchange integration
- **Notifications**: Telegram Bot API

## Structure

```text
├── artifacts/
│   ├── api-server/         # Express 5 API server (tsx in dev)
│   └── dashboard/          # React + Vite trading dashboard
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/                # Utility scripts
```

## API Routes

- `GET/POST /api/signals` — Trading signals
- `GET /api/signals/stats` — Today's signal stats
- `GET/POST /api/scanner/status` — Scanner status
- `GET/POST /api/scanner/sleep` — Sleep mode toggle
- `GET /api/live-trading` — Live trading state
- `POST /api/live-trading/sync` — Sync from scanner
- `POST /api/live-trading/toggle` — Toggle live trading
- `POST /api/live-trading/close-position` — Close open position
- `GET /api/live-trading/balance` — BingX balance
- `GET /api/live-trading/position-pnl` — Unrealized PnL
- `POST /api/telegram/clear-messages` — Clear Telegram chat

## Database Schema

- `signals` — Trading signals table
- `trading_state` — Paper/live trading state (JSONB)
- `scanner_status` — Scanner status (JSONB)
- `live_trading_state` — Live trading state (JSONB)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provided)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `TELEGRAM_CHAT_ID` — Telegram chat ID
- `BINGX_API_KEY` — BingX API key
- `BINGX_SECRET_KEY` — BingX secret key

## Development

- `pnpm --filter @workspace/api-server run dev` — Start API server (tsx)
- `pnpm --filter @workspace/dashboard run dev` — Start dashboard (Vite)
- `pnpm --filter @workspace/api-spec run codegen` — Re-generate API client
- `pnpm --filter @workspace/db run push` — Push DB schema changes
