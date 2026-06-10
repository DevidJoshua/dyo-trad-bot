import { TradeSignal, MarketCandle } from '../../common/interfaces';
import { BaseStrategy } from './BaseStrategy';

export class RsiStrategy extends BaseStrategy {
  private period: number;
  private oversoldLevel: number;
  private overboughtLevel: number;

  constructor(config: Record<string, any> = {}) {
    super(config);
    this.period = config.period || 14;
    this.oversoldLevel = config.oversoldLevel || 30;
    this.overboughtLevel = config.overboughtLevel || 70;
  }

  evaluate(symbol: string, candles: MarketCandle[]): TradeSignal | null {
    if (!this.validateCandles(candles, this.period + 1)) return null;

    const closes = candles.map(c => c.close).reverse();
    const rsi = this.calculateRSI(closes, this.period);

    if (rsi === null) return null;

    if (rsi < this.oversoldLevel) {
      return {
        symbol,
        action: 'BUY',
        lot: 0.1,
        confidence: Math.round((1 - rsi / this.oversoldLevel) * 100),
        strategyId: 1,
        accountId: 1,
      };
    }

    if (rsi > this.overboughtLevel) {
      return {
        symbol,
        action: 'SELL',
        lot: 0.1,
        confidence: Math.round((rsi / this.overboughtLevel - 1) * 100),
        strategyId: 1,
        accountId: 1,
      };
    }

    return null;
  }

  private calculateRSI(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? -diff : 0);
    }

    const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
}
