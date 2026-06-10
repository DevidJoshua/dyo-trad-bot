# Third Party Integration Guide

This guide explains how to connect TradBot with external services: MetaTrader 4/5, AI providers, Telegram, and database tools.

---

## Table of Contents

1. [MetaTrader 5 (MT5) Expert Advisor](#metatrader-5-mt5-expert-advisor)
2. [MetaTrader 4 (MT4) Support](#metatrader-4-mt4-support)
3. [AI Provider Setup](#ai-provider-setup)
4. [Telegram Bot Setup](#telegram-bot-setup)
5. [MySQL Database](#mysql-database)
6. [Redis (Optional)](#redis-optional)
7. [Prometheus & Grafana (Monitoring)](#prometheus--grafana-monitoring)

---

## MetaTrader 5 (MT5) Expert Advisor

TradBot communicates with MetaTrader 5 via a TCP socket bridge. An MQL5 Expert Advisor (EA) runs inside MT5 and relays commands between the Node.js backend and the MT5 terminal.

### Prerequisites

- MetaTrader 5 installed on a Windows machine or VPS
- A funded trading account (demo or real)
- Node.js backend running and accessible from the MT5 machine

### Setup Steps

#### 1. Compile the EA

1. Locate the EA file at `mql5/TradeBotEA.mq5`
2. Copy it to your MT5 data folder: `File → Open Data Folder → MQL5 → Experts`
3. Restart MetaTrader 5
4. Open the **Navigator** panel (Ctrl+N)
5. Right-click `TradeBotEA` → **Compile** (or press F7)
6. Verify compilation succeeds with no errors

#### 2. Attach the EA to a Chart

1. Drag `TradeBotEA` from Navigator onto any currency chart (e.g., EURUSD)
2. In the **Common** tab:
   - Check **Allow Automated Trading**
   - Check **Allow DLL Imports** (required for socket communication)
3. In the **Inputs** tab, configure:

| Parameter       | Value                   | Description                          |
|-----------------|-------------------------|--------------------------------------|
| `BridgeHost`    | `127.0.0.1`            | IP of the Node.js backend            |
| `BridgePort`    | `5000`                  | TCP port the bridge listens on       |
| `PollIntervalMs`| `1000`                  | How often EA polls for commands (ms) |

4. Click **OK**

#### 3. Enable Automated Trading

- Click the **AutoTrading** button in MT5 (or press Ctrl+E)
- Verify the button turns green
- The EA log should show: `TradeBot EA initializing...` then `Connected to Node.js bridge`

#### 4. Verify Connection

Check the Node.js backend logs for:
```
MT5 EA connected
```

You can also test by calling the health endpoint:
```bash
curl http://localhost:3000/api/health
```

### If Running on Different Machines

If MT5 and the backend are on different machines:

1. Update `.env` → `MT5_BRIDGE_PORT=5000`
2. In the EA inputs, set `BridgeHost` to the backend machine's IP address
3. Ensure port `5000` is open in the firewall on the backend machine
4. If using Docker, ensure the port is published: `docker-compose.yml` maps `5000:5000`

### Troubleshooting

| Symptom                    | Likely Cause                         | Solution                                      |
|----------------------------|--------------------------------------|-----------------------------------------------|
| EA shows `SocketCreate failed` | MT5 running on different machine   | Check BridgeHost IP and firewall rules        |
| EA shows `Not connected`   | Backend not running                  | Start the backend: `npm run dev`              |
| Orders not executing       | AutoTrading disabled                 | Press Ctrl+E in MT5                           |
| Compilation error          | Missing includes or DLL imports off  | Ensure DLL imports are allowed in EA settings |
| Timeout errors             | MT5 terminal busy or slow            | Increase `PollIntervalMs` to 2000             |

---

## MetaTrader 4 (MT4) Support

TradBot's EA is written for **MT5 (MQL5)**. For MT4 (MQL4) compatibility:

1. The EA must be **ported** from MQL5 to MQL4 syntax (different trade functions, socket API)
2. Alternatively, use an MT4-to-MT5 gateway/bridge tool
3. The TCP protocol is identical — any MQL4 EA that speaks the same JSON protocol will work

**Note:** If you need MT4 support, please open an issue or contribute an MQL4 version of `TradeBotEA`.

---

## AI Provider Setup

TradBot supports multiple AI providers for the chatbot and AI Pilot features.

### Supported Providers

| Provider       | Default Model       | API Key Required | Endpoint                                 |
|----------------|---------------------|------------------|------------------------------------------|
| OpenAI         | `gpt-4o-mini`       | Yes              | `https://api.openai.com/v1`             |
| Anthropic      | `claude-3-haiku`    | Yes              | `https://api.anthropic.com`             |
| Google Gemini  | `gemini-1.5-flash`  | Yes              | `https://generativelanguage.googleapis.com` |
| Ollama (Local) | `llama3`            | No               | `http://localhost:11434`                |
| Custom Gateway | any                 | Optional         | Your own endpoint URL                   |

### OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. In the dashboard → **Integrations** → **AI Provider**, select **OpenAI**
4. Paste your API key and set the model (e.g., `gpt-4o-mini`, `gpt-4o`)

### Anthropic Claude

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. In the dashboard → **Integrations** → **AI Provider**, select **Anthropic Claude**
4. Paste your API key
5. Recommended model: `claude-3-haiku-20240307` (fast/cheap) or `claude-3-opus-20240229` (powerful)

### Google Gemini

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create an API key
3. In the dashboard → **Integrations** → **AI Provider**, select **Google Gemini**
4. Paste your API key
5. Recommended model: `gemini-1.5-flash` or `gemini-1.5-pro`

### Ollama (Local LLM)

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3`
3. Ensure Ollama is running: `ollama serve`
4. In the dashboard → **Integrations** → **AI Provider**, select **Ollama (Local)**
5. Set the API endpoint to `http://localhost:11434`
6. Set the model name (e.g., `llama3`, `mistral`, `codellama`)

### Custom OpenAI-compatible Gateway (Sniffox, etc.)

Many AI providers offer OpenAI-compatible APIs. To use them:

1. In the dashboard → **Integrations** → **AI Provider**, select **Custom (OpenAI-compatible Gateway)**
2. Enter the **API Endpoint URL** — the full URL to the chat completions endpoint
   - Example: `https://api.sniffox.ai/v1/chat/completions`
   - Example: `https://your-gateway.com/v1/chat/completions`
3. Enter your **API Key** if required (optional for some gateways)
4. Enter the **Model** name expected by the gateway

### AI Pilot Trading

The **AI Pilot** feature lets the AI automatically evaluate the market and execute trades.

1. Go to **Integrations** → **AI Provider** tab
2. Configure a working AI provider (required for AI Pilot)
3. Click the **AI Pilot** switch in the header bar (top-right of any page)
4. The system will evaluate every 60 seconds and trade automatically

**Safety notes:**
- Start with a **demo account** only
- AI Pilot respects the risk management settings (max positions, daily loss, drawdown)
- Monitor the dashboard for active positions
- Disable AI Pilot immediately if unexpected behavior occurs

---

## Telegram Bot Setup

Telegram notifications alert you when trades open, close, or risk limits are hit.

### 1. Create a Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow the prompts to name your bot (e.g., `TradBot Alerts`)
4. Save the **bot token** you receive (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Get Your Chat ID

1. Start a chat with your new bot
2. Send any message to the bot
3. Open in browser: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat.id` value in the JSON response (e.g., `-1001234567890` or `123456789`)

### 3. Configure in Dashboard

1. Go to **Integrations** → **Telegram** tab
2. Toggle **Enable Telegram Notifications** on
3. Paste the **Bot Token**
4. Paste the **Chat ID**
5. Click **Save Telegram Config**
6. Click **Send Test Message** to verify

### Notification Events

Notifications are sent for:
- Trade opened (with entry price, SL, TP)
- Trade closed (with profit/loss)
- Stop loss hit
- Take profit hit
- Daily loss limit reached
- Drawdown limit reached

---

## MySQL Database

### Connection String

Format:
```
mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

Example:
```
mysql://root:password@localhost:3306/tradbot
```

### Docker MySQL

If using Docker:
```bash
docker run -d --name tradbot-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=tradbot \
  -p 3306:3306 \
  mysql:8.0
```

### Apply Migrations

```bash
npx prisma db push    # Push schema directly
npx prisma migrate dev  # Create migration files
npm run prisma:seed     # Seed initial data
```

### Viewing Data

```bash
npx prisma studio      # Opens browser-based DB viewer
```

---

## Redis (Optional)

Redis is configured for future use with BullMQ job queues. Currently optional.

Start Redis:
```bash
docker run -d --name tradbot-redis -p 6379:6379 redis:7-alpine
```

---

## Prometheus & Grafana (Monitoring)

### Prometheus

Prometheus scrapes metrics from the backend at `http://app:3000/metrics`.

Built-in metrics:
- `tradbot_open_positions` — Current open positions
- `tradbot_daily_profit` — Daily PnL
- `tradbot_monthly_profit` — Monthly PnL
- `tradbot_win_rate` — Win rate percentage
- `tradbot_drawdown` — Current drawdown
- `tradbot_orders_executed_total` — Total orders executed
- `tradbot_orders_failed_total` — Total orders failed
- `tradbot_mt5_connected` — MT5 connection status (1/0)
- `tradbot_trade_latency_ms` — Trade execution latency histogram

### Start with Docker

```bash
docker-compose up -d prometheus grafana
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3030` (login: `admin` / `admin`)

### Import Dashboard

A pre-built Grafana dashboard is at:
`monitoring/grafana/dashboards/tradbot-dashboard.json`

In Grafana:
1. Login at `http://localhost:3030`
2. Go to **Dashboards → Import**
3. Upload the JSON file or paste its contents
4. Select the Prometheus data source
5. Click **Import**
