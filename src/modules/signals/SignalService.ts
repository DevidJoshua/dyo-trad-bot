import { TradeSignal } from '../../common/interfaces';
import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';

export class SignalService {
  async createSignal(signal: TradeSignal) {
    const record = await prisma.tradeSignal.create({
      data: {
        symbol: signal.symbol,
        signal: signal.action,
        confidence: signal.confidence,
        strategyId: signal.strategyId,
        accountId: signal.accountId,
      },
    });

    logger.info('Signal created', {
      id: record.id,
      symbol: record.symbol,
      signal: record.signal,
      confidence: record.confidence,
    });

    return record;
  }

  async getRecentSignals(limit: number = 50) {
    return prisma.tradeSignal.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { strategy: true },
    });
  }
}

export const signalService = new SignalService();
