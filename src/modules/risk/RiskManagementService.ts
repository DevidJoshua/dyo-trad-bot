import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';
import { RiskCheckResult, TradeSignal } from '../../common/interfaces';

export class RiskManagementService {
  async checkTrade(signal: TradeSignal): Promise<RiskCheckResult> {
    const config = await prisma.riskConfiguration.findFirst();
    if (!config) {
      return { allowed: true };
    }

    const dailyLossCheck = await this.checkDailyLoss(config.maxDailyLoss);
    if (!dailyLossCheck.allowed) return dailyLossCheck;

    const drawdownCheck = await this.checkDrawdown(config.maxDrawdown);
    if (!drawdownCheck.allowed) return drawdownCheck;

    const openPositionsCheck = await this.checkMaxOpenPositions(config.maxOpenPositions);
    if (!openPositionsCheck.allowed) return openPositionsCheck;

    const suggestedLot = this.calculatePositionSize(signal, config.riskPerTrade);

    return { allowed: true, suggestedLot };
  }

  private async checkDailyLoss(maxDailyLoss: number): Promise<RiskCheckResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.tradeOrder.findMany({
      where: {
        closedAt: { gte: today },
        status: 'CLOSED',
      },
    });

    const dailyLoss = todayOrders
      .filter(o => (o.profit || 0) < 0)
      .reduce((sum, o) => sum + Math.abs(o.profit || 0), 0);

    if (dailyLoss >= maxDailyLoss) {
      logger.warn(`Daily loss limit reached: ${dailyLoss} >= ${maxDailyLoss}`);
      return { allowed: false, reason: `Daily loss limit reached: ${dailyLoss}` };
    }

    return { allowed: true };
  }

  private async checkDrawdown(maxDrawdown: number): Promise<RiskCheckResult> {
    const account = await prisma.tradingAccount.findFirst();
    if (!account) return { allowed: true };

    const orders = await prisma.tradeOrder.findMany({
      where: { accountId: account.id, status: 'CLOSED' },
    });

    if (orders.length === 0) return { allowed: true };

    let peak = 0;
    let drawdown = 0;
    let runningTotal = 0;

    for (const order of orders.sort((a, b) => (a.closedAt?.getTime() || 0) - (b.closedAt?.getTime() || 0))) {
      runningTotal += order.profit || 0;
      if (runningTotal > peak) peak = runningTotal;
      const currentDrawdown = peak - runningTotal;
      if (currentDrawdown > drawdown) drawdown = currentDrawdown;
    }

    if (drawdown >= maxDrawdown) {
      logger.warn(`Max drawdown reached: ${drawdown} >= ${maxDrawdown}`);
      return { allowed: false, reason: `Max drawdown reached: ${drawdown}` };
    }

    return { allowed: true };
  }

  private async checkMaxOpenPositions(maxOpen: number): Promise<RiskCheckResult> {
    const openCount = await prisma.tradeOrder.count({
      where: { status: 'OPEN' },
    });

    if (openCount >= maxOpen) {
      return { allowed: false, reason: `Maximum open positions reached: ${openCount}` };
    }

    return { allowed: true };
  }

  private calculatePositionSize(signal: TradeSignal, riskPerTrade: number): number {
    const baseLot = signal.lot || 0.1;
    const riskFactor = riskPerTrade / 100;
    return Math.round((baseLot * riskFactor) * 100) / 100 || 0.01;
  }

  async getConfig() {
    return prisma.riskConfiguration.findFirst();
  }

  async updateConfig(data: {
    riskPerTrade?: number;
    maxDailyLoss?: number;
    maxDrawdown?: number;
    maxOpenPositions?: number;
  }) {
    const existing = await prisma.riskConfiguration.findFirst();
    if (existing) {
      return prisma.riskConfiguration.update({
        where: { id: existing.id },
        data,
      });
    }
    return prisma.riskConfiguration.create({ data: data as any });
  }
}

export const riskManagementService = new RiskManagementService();
