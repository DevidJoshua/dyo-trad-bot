import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';

export class MetricsService {
  private registry: Registry;
  private openPositions: Gauge;
  private dailyProfit: Gauge;
  private monthlyProfit: Gauge;
  private totalProfit: Gauge;
  private winRate: Gauge;
  private drawdown: Gauge;
  private ordersExecuted: Counter;
  private ordersFailed: Counter;
  private mt5Connected: Gauge;
  private tradeLatency: Histogram;

  constructor() {
    this.registry = new Registry();

    this.openPositions = new Gauge({
      name: 'tradbot_open_positions',
      help: 'Number of currently open positions',
      registers: [this.registry],
    });

    this.dailyProfit = new Gauge({
      name: 'tradbot_daily_profit',
      help: 'Daily profit/loss',
      registers: [this.registry],
    });

    this.monthlyProfit = new Gauge({
      name: 'tradbot_monthly_profit',
      help: 'Monthly profit/loss',
      registers: [this.registry],
    });

    this.totalProfit = new Gauge({
      name: 'tradbot_total_profit',
      help: 'Total cumulative profit/loss',
      registers: [this.registry],
    });

    this.winRate = new Gauge({
      name: 'tradbot_win_rate',
      help: 'Win rate percentage',
      registers: [this.registry],
    });

    this.drawdown = new Gauge({
      name: 'tradbot_drawdown',
      help: 'Current drawdown',
      registers: [this.registry],
    });

    this.ordersExecuted = new Counter({
      name: 'tradbot_orders_executed_total',
      help: 'Total orders executed',
      registers: [this.registry],
    });

    this.ordersFailed = new Counter({
      name: 'tradbot_orders_failed_total',
      help: 'Total orders failed',
      registers: [this.registry],
    });

    this.mt5Connected = new Gauge({
      name: 'tradbot_mt5_connected',
      help: 'MT5 connection status (1 = connected, 0 = disconnected)',
      registers: [this.registry],
    });

    this.tradeLatency = new Histogram({
      name: 'tradbot_trade_latency_ms',
      help: 'Trade execution latency in milliseconds',
      buckets: [10, 50, 100, 200, 500, 1000, 2000],
      registers: [this.registry],
    });
  }

  getRegistry(): Registry {
    return this.registry;
  }

  async collectMetrics(): Promise<void> {
    try {
      const openCount = await prisma.tradeOrder.count({ where: { status: 'OPEN' } });
      this.openPositions.set(openCount);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = await prisma.tradeOrder.findMany({
        where: { closedAt: { gte: today }, status: 'CLOSED' },
      });
      const dailyPnl = todayOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
      this.dailyProfit.set(dailyPnl);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthOrders = await prisma.tradeOrder.findMany({
        where: { closedAt: { gte: startOfMonth }, status: 'CLOSED' },
      });
      const monthlyPnl = monthOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
      this.monthlyProfit.set(monthlyPnl);

      const allClosed = await prisma.tradeOrder.findMany({
        where: { status: 'CLOSED' },
      });
      const totalPnl = allClosed.reduce((sum, o) => sum + (o.profit || 0), 0);
      this.totalProfit.set(totalPnl);

      if (allClosed.length > 0) {
        const winners = allClosed.filter(o => (o.profit || 0) > 0).length;
        this.winRate.set((winners / allClosed.length) * 100);
      }
    } catch (err) {
      logger.error('Failed to collect metrics', { error: (err as Error).message });
    }
  }

  recordOrderExecuted(): void {
    this.ordersExecuted.inc();
  }

  recordOrderFailed(): void {
    this.ordersFailed.inc();
  }

  setMt5Connected(connected: boolean): void {
    this.mt5Connected.set(connected ? 1 : 0);
  }

  recordTradeLatency(ms: number): void {
    this.tradeLatency.observe(ms);
  }
}

export const metricsService = new MetricsService();
