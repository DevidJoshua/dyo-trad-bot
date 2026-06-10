# TradBot — Forex Trading Bot Platform

A production-ready algorithmic Forex trading platform with Node.js/TypeScript backend, React dashboard, MySQL database, and MetaTrader 5 integration via MQL5 Expert Advisor.

---

## System Requirements

- **Node.js** >= 18.x
- **MySQL** 8.0 (local or Docker)
- **Redis** (optional, for BullMQ queues — currently unused but ready)
- **MetaTrader 5** (for live trading with the MQL5 EA)
- **npm** >= 9.x

---

## Quick Start (Windows)

### 1. Clone & Install

```bash
cd trad-bot
npm install
```

### 2. Database Setup

**Option A — Docker (recommended if you have Docker Desktop):**

```bash
docker run -d --name tradbot-mysql ^
  -e MYSQL_ROOT_PASSWORD=password ^
  -e MYSQL_DATABASE=tradbot ^
  -p 3306:3306 ^
  mysql:8.0
```

**Option B — Local MySQL installation:**

Create a database named `tradbot` and ensure the credentials match `.env`.

### 3. Configure Environment

Edit `.env` to match your setup (defaults work for local MySQL with root/password):

```
DATABASE_URL="mysql://root:password@localhost:3306/tradbot"
```

### 4. Push Database Schema & Seed

```bash
npx prisma db push
npx prisma db seed
```

> The seed command creates the admin user, 3 strategies (RSI, MA Cross, Breakout),
> a default risk configuration, and a demo trading account.
>
> If `npx prisma db seed` is not configured, run manually:
> ```bash
> npx ts-node prisma/seed.ts
> ```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Run the Backend

```bash
npm run dev
```

Server starts on **http://localhost:3000**.

---

## Running the Admin Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Dashboard starts on **http://localhost:5173** and proxies API calls to the backend.

### Default Login

- **Email:** `admin@tradbot.com`
- **Password:** `admin123`

---

## Running Everything with Docker

```bash
docker-compose up -d
```

This starts:

| Service   | Port |
|-----------|------|
| App       | 3000 |
| MySQL     | 3306 |
| Redis     | 6379 |
| Prometheus| 9090 |
| Grafana   | 3030 |

---

## Environment Variables (.env)

| Variable             | Description                | Default                                |
|----------------------|----------------------------|----------------------------------------|
| `NODE_ENV`           | Environment mode           | `development`                          |
| `PORT`               | Backend server port        | `3000`                                 |
| `DATABASE_URL`       | MySQL connection string    | `mysql://root:password@localhost:3306/tradbot` |
| `REDIS_HOST`         | Redis host                 | `localhost`                            |
| `REDIS_PORT`         | Redis port                 | `6379`                                 |
| `JWT_SECRET`         | JWT signing secret         | `tradbot-dev-jwt-secret-2024`          |
| `JWT_EXPIRES_IN`     | JWT token expiry           | `24h`                                  |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token         | *(empty — not required for dev)*       |
| `TELEGRAM_CHAT_ID`   | Telegram chat ID           | *(empty — not required for dev)*       |
| `MT5_BRIDGE_PORT`    | TCP bridge port for MT5 EA | `5000`                                 |
| `MT5_POLL_INTERVAL_MS` | EA polling interval      | `1000`                                 |
| `ADMIN_EMAIL`        | Default admin email        | `admin@tradbot.com`                    |
| `ADMIN_PASSWORD`     | Default admin password     | `admin123`                             |
| `LOG_LEVEL`          | Winston log level          | `debug`                                |

---

## MT5 Expert Advisor Setup

1. Open **MetaTrader 5**
2. Go to **File → Open Data Folder → MQL5 → Experts**
3. Copy `mql5/TradeBotEA.mq5` into that folder
4. Restart MT5, compile the EA (F7)
5. Attach the EA to a chart
6. In EA properties, set:
   - `BridgeHost` = `127.0.0.1`
   - `BridgePort` = `5000`
7. Ensure the Node.js backend is running — the EA auto-connects via TCP

---

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login (returns JWT)

### Accounts
- `GET /api/account` — List accounts
- `GET /api/account/:id/performance` — Account performance stats

### Strategies
- `GET /api/strategies` — List strategies
- `PUT /api/strategies/:id` — Toggle active / update config *(Admin)*

### Signals & Orders
- `GET /api/signals` — Recent trade signals
- `GET /api/orders/open` — Open positions
- `GET /api/orders/history` — Closed orders
- `POST /api/orders/close/:id` — Close order *(Admin)*
- `POST /api/orders/modify/:id` — Modify SL/TP *(Admin)*

### Risk Management
- `GET /api/risk` — Get risk config
- `PUT /api/risk` — Update risk settings *(Admin)*

### Market Data
- `GET /api/market-data/:symbol/:timeframe` — Fetch candles

### Backtesting
- `POST /api/backtest` — Run backtest

### AI
- `POST /api/ai/analyze-trade` — AI trade analysis *(Admin)*

### Monitoring
- `GET /metrics` — Prometheus metrics
- `GET /api/health` — Health check

### Audit
- `GET /api/audit-logs` — View audit logs *(Admin)*

---

## Architecture

```
Market Data → Market Data Service → Strategy Engine → Risk Management
    → Signal Generator → Order Management → MT5 Bridge API
    → MQL5 Expert Advisor → MetaTrader 5 → Broker
```

### Built-in Strategies

| Strategy       | Buy Signal                | Sell Signal               |
|----------------|---------------------------|---------------------------|
| RSI Reversal   | RSI < 30                  | RSI > 70                  |
| MA Cross       | MA20 crosses above MA50   | MA20 crosses below MA50   |
| Breakout       | Breaks 20-candle high     | Breaks 20-candle low      |

---

## Project Structure

```
trad-bot/
├── src/
│   ├── index.ts                  # Entry point
│   ├── config/                   # Environment config
│   ├── common/                   # Interfaces, logger, prisma client
│   ├── middleware/               # Auth, rate limiter, error handler
│   ├── modules/
│   │   ├── auth/                 # JWT authentication
│   │   ├── mt5-bridge/           # TCP bridge to MQL5 EA
│   │   ├── market-data/          # Candle storage & retrieval
│   │   ├── strategies/           # RSI, MA Cross, Breakout + engine
│   │   ├── risk/                 # Position sizing, DD protection
│   │   ├── signals/              # Signal service
│   │   ├── orders/               # Order lifecycle
│   │   ├── notifications/        # Telegram alerts
│   │   ├── monitoring/           # Prometheus metrics
│   │   ├── backtesting/          # Historical backtester
│   │   └── ai/                   # AI abstraction layer
│   └── routes/                   # REST API routes
├── prisma/
│   ├── schema.prisma             # 8 database models
│   └── seed.ts                   # Initial data seed
├── mql5/TradeBotEA.mq5           # MQL5 Expert Advisor
├── dashboard/                    # React + Ant Design admin panel
├── monitoring/                   # Prometheus + Grafana config
├── docker-compose.yml            # Full stack Docker setup
└── Dockerfile                    # Production build
```

---

## License

MIT
