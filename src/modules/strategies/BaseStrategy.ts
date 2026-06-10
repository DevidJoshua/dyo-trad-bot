import { TradeSignal, MarketCandle, Strategy } from '../../common/interfaces';

export abstract class BaseStrategy implements Strategy {
  protected config: Record<string, any>;

  constructor(config: Record<string, any> = {}) {
    this.config = config;
  }

  abstract evaluate(symbol: string, candles: MarketCandle[]): TradeSignal | null;

  protected validateCandles(candles: MarketCandle[], required: number): boolean {
    return candles.length >= required;
  }
}
