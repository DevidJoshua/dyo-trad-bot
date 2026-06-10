import { TradeSignal, MarketCandle, Strategy } from '../../common/interfaces';
import { logger } from '../../common/utils/logger';
import { prisma } from '../../common/utils/prisma';
import { RsiStrategy } from './RsiStrategy';
import { MaCrossStrategy } from './MaCrossStrategy';
import { BreakoutStrategy } from './BreakoutStrategy';
import { BaseStrategy } from './BaseStrategy';

export class StrategyEngine {
  private strategies: Map<number, BaseStrategy> = new Map();

  async initialize(): Promise<void> {
    const dbStrategies = await prisma.strategy.findMany({ where: { isActive: true } });

    for (const s of dbStrategies) {
      const config = JSON.parse(s.configuration || '{}');
      let instance: BaseStrategy;

      switch (s.name) {
        case 'RSI_REVERSAL':
          instance = new RsiStrategy(config);
          break;
        case 'MA_CROSS':
          instance = new MaCrossStrategy(config);
          break;
        case 'BREAKOUT':
          instance = new BreakoutStrategy(config);
          break;
        default:
          logger.warn(`Unknown strategy: ${s.name}`);
          continue;
      }

      this.strategies.set(s.id, instance);
      logger.info(`Initialized strategy: ${s.name}`);
    }
  }

  async evaluateAll(symbol: string, candles: MarketCandle[]): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];

    for (const [strategyId, strategy] of this.strategies.entries()) {
      try {
        const signal = strategy.evaluate(symbol, candles);
        if (signal) {
          signal.strategyId = strategyId;
          signals.push(signal);
        }
      } catch (err) {
        logger.error(`Strategy ${strategyId} evaluation error`, { error: (err as Error).message });
      }
    }

    return signals;
  }

  getActiveCount(): number {
    return this.strategies.size;
  }
}

export const strategyEngine = new StrategyEngine();
