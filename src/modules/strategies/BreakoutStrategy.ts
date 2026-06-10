import { TradeSignal, MarketCandle } from '../../common/interfaces';
import { BaseStrategy } from './BaseStrategy';

export class BreakoutStrategy extends BaseStrategy {
  private lookbackPeriod: number;

  constructor(config: Record<string, any> = {}) {
    super(config);
    this.lookbackPeriod = config.lookbackPeriod || 20;
  }

  evaluate(symbol: string, candles: MarketCandle[]): TradeSignal | null {
    if (!this.validateCandles(candles, this.lookbackPeriod + 2)) return null;

    const orderedCandles = [...candles].reverse();
    const currentCandle = orderedCandles[orderedCandles.length - 1];
    const lookbackCandles = orderedCandles.slice(0, this.lookbackPeriod);

    const highestHigh = Math.max(...lookbackCandles.map(c => c.high));
    const lowestLow = Math.min(...lookbackCandles.map(c => c.low));

    if (currentCandle.high > highestHigh) {
      return {
        symbol,
        action: 'BUY',
        lot: 0.1,
        confidence: 80,
        strategyId: 3,
        accountId: 1,
      };
    }

    if (currentCandle.low < lowestLow) {
      return {
        symbol,
        action: 'SELL',
        lot: 0.1,
        confidence: 80,
        strategyId: 3,
        accountId: 1,
      };
    }

    return null;
  }
}
