import { TradeSignal, MarketCandle } from '../../common/interfaces';
import { BaseStrategy } from './BaseStrategy';

export class MaCrossStrategy extends BaseStrategy {
  private fastPeriod: number;
  private slowPeriod: number;

  constructor(config: Record<string, any> = {}) {
    super(config);
    this.fastPeriod = config.fastPeriod || 20;
    this.slowPeriod = config.slowPeriod || 50;
  }

  evaluate(symbol: string, candles: MarketCandle[]): TradeSignal | null {
    if (!this.validateCandles(candles, this.slowPeriod + 2)) return null;

    const closes = candles.map(c => c.close).reverse();
    const fastMA = this.calculateSMA(closes, this.fastPeriod);
    const slowMA = this.calculateSMA(closes, this.slowPeriod);

    if (fastMA.length < 2 || slowMA.length < 2) return null;

    const prevFastMA = fastMA[fastMA.length - 2];
    const currFastMA = fastMA[fastMA.length - 1];
    const prevSlowMA = slowMA[slowMA.length - 2];
    const currSlowMA = slowMA[slowMA.length - 1];

    if (prevFastMA <= prevSlowMA && currFastMA > currSlowMA) {
      return {
        symbol,
        action: 'BUY',
        lot: 0.1,
        confidence: 75,
        strategyId: 2,
        accountId: 1,
      };
    }

    if (prevFastMA >= prevSlowMA && currFastMA < currSlowMA) {
      return {
        symbol,
        action: 'SELL',
        lot: 0.1,
        confidence: 75,
        strategyId: 2,
        accountId: 1,
      };
    }

    return null;
  }

  private calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }
}
