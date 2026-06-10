import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';
import { MarketCandle } from '../../common/interfaces';

const SUPPORTED_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'XAUUSD'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];

export class MarketDataService {
  async storeCandle(candle: MarketCandle): Promise<void> {
    try {
      await prisma.marketData.create({
        data: {
          symbol: candle.symbol,
          timeframe: candle.timeframe,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          timestamp: candle.timestamp,
        },
      });
    } catch (err) {
      logger.error('Failed to store candle', { error: (err as Error).message, candle });
    }
  }

  async storeCandles(candles: MarketCandle[]): Promise<void> {
    if (candles.length === 0) return;
    try {
      await prisma.marketData.createMany({ data: candles, skipDuplicates: true });
      logger.debug(`Stored ${candles.length} candles`);
    } catch (err) {
      logger.error('Failed to store candles', { error: (err as Error).message });
    }
  }

  async getCandles(symbol: string, timeframe: string, limit: number = 100): Promise<MarketCandle[]> {
    return prisma.marketData.findMany({
      where: { symbol: symbol.toUpperCase(), timeframe: timeframe.toUpperCase() },
      orderBy: { timestamp: 'desc' },
      take: limit,
    }) as Promise<MarketCandle[]>;
  }

  isValidSymbol(symbol: string): boolean {
    return SUPPORTED_SYMBOLS.includes(symbol.toUpperCase());
  }

  isValidTimeframe(timeframe: string): boolean {
    return TIMEFRAMES.includes(timeframe.toUpperCase());
  }

  getSupportedSymbols(): string[] {
    return [...SUPPORTED_SYMBOLS];
  }

  getTimeframes(): string[] {
    return [...TIMEFRAMES];
  }
}

export const marketDataService = new MarketDataService();
