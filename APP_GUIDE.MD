# TradBot Application Guide

Complete guide on how to use the TradBot Forex Trading Platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Positions](#managing-positions)
4. [Strategy Management](#strategy-management)
5. [Risk Management](#risk-management)
6. [Trade Signals](#trade-signals)
7. [Backtesting](#backtesting)
8. [AI Chatbot](#ai-chatbot)
9. [AI Pilot Trading](#ai-pilot-trading)
10. [Integrations Configuration](#integrations-configuration)
11. [Audit Logs](#audit-logs)
12. [Monitoring & Metrics](#monitoring--metrics)

---

## Getting Started

### Accessing the Dashboard

1. Start the backend: `npm run dev` (runs on `http://localhost:3000`)
2. Start the dashboard: `cd dashboard && npm run dev` (runs on `http://localhost:5173`)
3. Open `http://localhost:5173` in your browser
4. Login with the default credentials:
   - **Email:** `admin@tradbot.com`
   - **Password:** `admin123`

### First-Time Setup

1. Go to **Integrations** → **AI Provider** and configure your AI provider
2. Go to **Integrations** → **Telegram** and configure Telegram notifications (optional)
3. Go to **Risk Management** to set your risk parameters
4. Ensure **Strategies** are enabled (they are active by default after seeding)

---

## Dashboard Overview

The dashboard is the home page showing a summary of your trading activity.

### Cards

| Card              | Description                                |
|-------------------|--------------------------------------------|
| Total Equity      | Sum of all account balances                |
| Open Positions    | Number of currently open trades            |
| Unrealized PnL    | Current profit/loss on open positions      |
| Active Accounts   | Number of connected trading accounts       |

### Open Positions Table

Shows all currently open trades with:
- Symbol, Action (Buy/Sell), Lot size
- Entry price, Stop Loss, Take Profit
- Current profit/loss

### Navigation Sidebar

Use the left sidebar to navigate between sections:
- **Dashboard** — Home page with summary
- **Positions** — Open/closed position management
- **Strategies** — Enable/disable and configure trading strategies
- **Risk Management** — Set risk parameters
- **Signals** — View generated trade signals
- **Backtesting** — Run historical strategy tests
- **Audit Logs** — View system activity logs
- **Integrations** — Configure AI, Telegram, and knowledge base

### Header Controls

- **AI Pilot switch** — Toggle automated AI trading on/off (visible on all pages)
- **Logout** — Sign out of the dashboard

---

## Managing Positions

### View Open Positions

1. Navigate to **Positions** in the sidebar
2. The **Open Positions** tab shows all active trades

### Close a Position

1. In the **Open Positions** tab, click the **Close** button next to a position
2. The position will be sent to MT5 for closing
3. A notification is sent via Telegram (if configured)

### Modify a Position (SL/TP)

1. Click the **Modify** button next to a position
2. Enter new **Stop Loss** and/or **Take Profit** values
3. Click **Update**
4. Changes are sent to MT5 immediately

### View Closed Positions

1. Switch to the **Closed Positions** tab
2. Shows all historical trades with entry/exit prices and profit/loss

---

## Strategy Management

TradBot comes with 3 built-in strategies. You can enable/disable and configure each one.

### Viewing Strategies

Navigate to **Strategies** in the sidebar.

| Strategy      | Description                                         |
|---------------|-----------------------------------------------------|
| RSI_REVERSAL  | Buy when RSI < 30, Sell when RSI > 70               |
| MA_CROSS      | Buy when MA20 crosses above MA50, Sell when opposite |
| BREAKOUT      | Buy/sell when price breaks 20-candle high/low       |

### Enabling/Disabling

Toggle the **Active** switch for each strategy. Only active strategies are evaluated.

### Configuring a Strategy

1. Click **Configure** next to a strategy
2. Adjust the parameters:

**RSI Reversal:**
- `period` — RSI calculation period (default: 14)
- `oversoldLevel` — Buy threshold (default: 30)
- `overboughtLevel` — Sell threshold (default: 70)

**MA Cross:**
- `fastPeriod` — Fast MA period (default: 20)
- `slowPeriod` — Slow MA period (default: 50)

**Breakout:**
- `lookbackPeriod` — Number of candles to look back (default: 20)

3. Click **Save**

### Adding Custom Strategies

To add a new strategy:
1. Create a new file in `src/modules/strategies/` (e.g., `MacdStrategy.ts`)
2. Implement the `BaseStrategy` interface
3. Register it in `StrategyEngine.ts` switch statement
4. Add it to the seed file `prisma/seed.ts`

---

## Risk Management

Controls how the platform manages trading risk.

Navigate to **Risk Management** in the sidebar.

### Settings

| Parameter          | Description                              | Default |
|--------------------|------------------------------------------|---------|
| Risk Per Trade (%) | Percentage of capital to risk per trade  | 1%      |
| Max Daily Loss (%) | Stop trading when daily loss exceeds this | 3%      |
| Max Drawdown (%)   | Stop trading when drawdown exceeds this  | 10%     |
| Max Open Positions | Maximum concurrent open trades           | 5       |

### How It Works

1. **Position Sizing** — Lot size is automatically calculated based on risk per trade
2. **Daily Loss Protection** — If cumulative daily losses exceed the limit, no new trades are opened
3. **Drawdown Protection** — If peak-to-trough drawdown exceeds the limit, trading stops
4. **Max Open Trades** — Prevents exceeding the configured number of concurrent positions

All checks run before every trade attempt. If any check fails, the trade is rejected with a reason logged.

---

## Trade Signals

View signals generated by the active strategies.

Navigate to **Signals** in the sidebar.

Each signal shows:
- **Symbol** — Currency pair
- **Signal** — BUY or SELL (color-coded)
- **Confidence** — Strategy confidence percentage
- **Strategy** — Which strategy generated the signal
- **Created** — Timestamp

Signals are automatically processed by the Order Management system. If risk checks pass, the signal becomes an order sent to MT5.

---

## Backtesting

Test strategies against historical data before live trading.

Navigate to **Backtesting** in the sidebar.

### Running a Backtest

1. Select a **Strategy** (RSI Reversal, MA Cross, or Breakout)
2. Select a **Symbol** (EURUSD, GBPUSD, etc.)
3. Select a **Timeframe** (M1, M5, M15, H1, H4, D1)
4. Select a **Date Range**
5. Click **Run Backtest**

### Understanding Results

| Metric        | Description                                     |
|---------------|-------------------------------------------------|
| Total Trades  | Number of trades executed in the period         |
| Win Rate      | Percentage of profitable trades                 |
| Profit Factor | Gross profit divided by gross loss (>1 is good) |
| Total Profit  | Net profit/loss                                 |
| Max Drawdown  | Largest peak-to-trough decline                  |
| Sharpe Ratio  | Risk-adjusted return (higher is better)         |

**Note:** Backtesting requires historical market data in the database. If no data is available, the test will fail.

---

## AI Chatbot

The AI chatbot is a floating assistant available on every page.

### Opening the Chat

Click the **robot icon** (🤖) at the bottom-right corner of any page.

### Using the Chat

- **Type a message** in the input field and press Enter
- Click a **suggested question** button for quick queries
- The chatbot remembers conversation context within a session

### What You Can Ask

**About Trading:**
- "Show my open positions"
- "How is my account performing?"
- "What strategies are active?"
- "What are my risk settings?"
- "Show me recent signals"

**About the Platform:**
- "Tell me about your experience"
- "What technologies do you use?"
- "How can I contact you?"
- "Show portfolio projects"

### Features

- **Minimize/Maximize** — Click the minus icon to minimize, click the robot button to reopen
- **Dark Mode** — Works with the dashboard's theme
- **Chat History** — Conversation is saved per session
- **AI Pilot Awareness** — When AI Pilot is active, the chatbot knows about it

---

## AI Pilot Trading

AI Pilot is an automated trading mode where the system evaluates market conditions and executes trades every 60 seconds.

### Activation

Click the **AI Pilot** switch in the header bar (visible on every page):
- **Green/ON** — AI Pilot is active and trading
- **Gray/OFF** — AI Pilot is disabled

### How It Works

1. Every 60 seconds, the system evaluates all enabled strategies
2. For each generated signal, risk management checks are run
3. If risk checks pass, the order is sent to MT5 for execution
4. All trades are logged and visible in the Positions page

### Safety

- AI Pilot respects **all risk management settings**
- It will not exceed **max open positions**
- It respects **daily loss** and **drawdown limits**
- You can **disable it at any time** by toggling the switch off
- Recommended for **demo accounts only** until thoroughly tested

### Monitoring

When AI Pilot is active:
- The header shows an **ACTIVE** tag
- Open positions update in real-time
- Telegram notifications are sent (if configured)

---

## Integrations Configuration

Navigate to **Integrations** in the sidebar to configure external services.

### AI Provider Tab

Configure which AI powers the chatbot and AI Pilot.

See [3RD_PARTY_GUIDE.MD](./3RD_PARTY_GUIDE.MD) → AI Provider Setup for detailed instructions.

### Telegram Tab

Configure Telegram bot notifications for trade events.

See [3RD_PARTY_GUIDE.MD](./3RD_PARTY_GUIDE.MD) → Telegram Bot Setup for detailed instructions.

### Knowledge Base Tab

View all knowledge entries used by the AI chatbot.

- Click **Rebuild from Seed** to regenerate knowledge from the seed file
- Knowledge includes trading platform info and portfolio data

### Analytics Tab

View chatbot usage statistics:
- **Total Sessions** — Number of chat conversations
- **Total Messages** — Number of messages sent
- **Recent Sessions** — List of recent conversations

---

## Audit Logs

Track all administrative actions on the platform.

Navigate to **Audit Logs** in the sidebar.

Each log entry shows:
- **Action** — What was done (UPDATE, CLOSE_ORDER, etc.)
- **Entity** — Which object was affected (Strategy, RiskConfiguration, etc.)
- **Entity ID** — ID of the affected object
- **Details** — Description of the action
- **Timestamp** — When it happened

Audit logs are useful for:
- Tracking configuration changes
- Monitoring who closed/modified orders
- Debugging unexpected behavior
- Compliance and record-keeping

---

## Monitoring & Metrics

Prometheus metrics are exposed at `http://localhost:3000/metrics`.

### Available Metrics

| Metric                          | Type      | Description                   |
|---------------------------------|-----------|-------------------------------|
| `tradbot_open_positions`        | Gauge     | Current open positions        |
| `tradbot_daily_profit`          | Gauge     | Daily profit/loss             |
| `tradbot_monthly_profit`        | Gauge     | Monthly profit/loss           |
| `tradbot_total_profit`          | Gauge     | Cumulative profit/loss        |
| `tradbot_win_rate`              | Gauge     | Win rate %                    |
| `tradbot_drawdown`              | Gauge     | Current drawdown              |
| `tradbot_orders_executed_total` | Counter   | Total executed orders         |
| `tradbot_orders_failed_total`   | Counter   | Total failed orders           |
| `tradbot_mt5_connected`         | Gauge     | MT5 connection status (1/0)   |
| `tradbot_trade_latency_ms`      | Histogram | Trade execution latency       |

### Viewing in Prometheus

If Prometheus is running:
```
http://localhost:9090
```

Query example:
```
tradbot_open_positions
tradbot_daily_profit
rate(tradbot_orders_executed_total[1h])
```

### Viewing in Grafana

If Grafana is running:
```
http://localhost:3030
```
Login: `admin` / `admin`

A pre-built dashboard is available at `monitoring/grafana/dashboards/tradbot-dashboard.json`.

---

## Troubleshooting

### Common Issues

| Issue                    | Solution                                            |
|--------------------------|-----------------------------------------------------|
| Cannot login             | Run `npm run prisma:seed` to seed admin user        |
| No data on dashboard     | Connect MT5 EA and ensure strategies are active     |
| Backtest returns 0 trades| Load historical market data first                   |
| AI Chatbot not responding| Configure AI provider in Integrations page          |
| Orders not executing     | Check MT5 EA is connected and AutoTrading is on     |
| Telegram silent          | Save Telegram config and click "Send Test Message"  |
