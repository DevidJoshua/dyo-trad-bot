import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';
import { marketDataService } from '../market-data/MarketDataService';
import { strategyEngine } from '../strategies/StrategyEngine';
import { riskManagementService } from '../risk/RiskManagementService';
import { orderManagementService } from '../orders/OrderManagementService';
import { notificationService } from '../notifications/NotificationService';

export class AiPilotService {
  private intervalHandle: NodeJS.Timeout | null = null;
  private running = false;

  async getStatus(): Promise<{ enabled: boolean; running: boolean }> {
    const config = await prisma.aiConfiguration.findFirst();
    return { enabled: config?.aiPilotEnabled || false, running: this.running };
  }

  async toggle(enabled: boolean): Promise<{ enabled: boolean; running: boolean }> {
    const existing = await prisma.aiConfiguration.findFirst();
    if (existing) {
      await prisma.aiConfiguration.update({ where: { id: existing.id }, data: { aiPilotEnabled: enabled } });
    } else {
      await prisma.aiConfiguration.create({ data: { aiPilotEnabled: enabled } as any });
    }

    if (enabled) {
      this.start();
    } else {
      this.stop();
    }

    logger.info(`AI Pilot ${enabled ? 'enabled' : 'disabled'}`);
    return { enabled, running: this.running };
  }

  private start(): void {
    if (this.intervalHandle) return;
    this.running = true;

    this.intervalHandle = setInterval(async () => {
      try {
        await this.evaluateAndTrade();
      } catch (err) {
        logger.error('AI Pilot evaluation error', { error: (err as Error).message });
      }
    }, 60000);

    logger.info('AI Pilot trading loop started');
  }

  private stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.running = false;
    logger.info('AI Pilot trading loop stopped');
  }

  private async evaluateAndTrade(): Promise<void> {
    const config = await prisma.aiConfiguration.findFirst();
    if (!config?.aiPilotEnabled || !config?.enabled) return;

    const risk = await prisma.riskConfiguration.findFirst();
    const openOrders = await prisma.tradeOrder.count({ where: { status: 'OPEN' } });
    if (risk && openOrders >= risk.maxOpenPositions) return;

    const symbols = marketDataService.getSupportedSymbols();
    for (const symbol of symbols) {
      const candles = await marketDataService.getCandles(symbol, 'M5', 100);
      if (candles.length < 50) continue;

      const signals = await strategyEngine.evaluateAll(symbol, candles);
      for (const signal of signals) {
        const riskCheck = await riskManagementService.checkTrade(signal);
        if (riskCheck.allowed) {
          try {
            await orderManagementService.processSignal(signal);
            logger.info('AI Pilot executed signal', {
              symbol: signal.symbol,
              action: signal.action,
              strategyId: signal.strategyId,
            });
          } catch (err) {
            logger.error('AI Pilot execution failed', { error: (err as Error).message });
          }
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    this.stop();
  }
}

export const aiPilotService = new AiPilotService();
