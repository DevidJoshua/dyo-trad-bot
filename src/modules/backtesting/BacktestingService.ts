import { MarketCandle, TradeSignal, BacktestResult } from '../../common/interfaces';
import { marketDataService } from '../market-data/MarketDataService';
import { RsiStrategy } from '../strategies/RsiStrategy';
import { MaCrossStrategy } from '../strategies/MaCrossStrategy';
import { BreakoutStrategy } from '../strategies/BreakoutStrategy';
import { BaseStrategy } from '../strategies/BaseStrategy';
import { logger } from '../../common/utils/logger';

export class BacktestingService {
  async runBacktest(params: {
    strategyName: string;
    symbol: string;
    timeframe: string;
    startDate: Date;
    endDate: Date;
    config?: Record<string, any>;
  }): Promise<BacktestResult> {
    const candles = await marketDataService.getCandles(params.symbol, params.timeframe, 10000);
    const filtered = candles.filter(
      c => c.timestamp >= params.startDate && c.timestamp <= params.endDate,
    );

    if (filtered.length === 0) {
      throw new Error('No data available for the specified period');
    }

    const strategy = this.createStrategy(params.strategyName, params.config);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${params.strategyName}`);
    }

    const trades: { profit: number }[] = [];
    let balance = 10000;

    for (let i = 100; i < filtered.length; i++) {
      const window = filtered.slice(0, i + 1);
      const signal = strategy.evaluate(params.symbol, window);

      if (signal) {
        const entryPrice = filtered[i].close;
        const exitPrice = signal.action === 'BUY'
          ? entryPrice * 1.001
          : entryPrice * 0.999;

        const lot = signal.lot || 0.1;
        const profit = (exitPrice - entryPrice) * (signal.action === 'BUY' ? 1 : -1) * lot * 100000;
        balance += profit;

        trades.push({ profit: Math.round(profit * 100) / 100 });
      }
    }

    return this.calculateResults({
      strategyName: params.strategyName,
      symbol: params.symbol,
      timeframe: params.timeframe,
      startDate: params.startDate,
      endDate: params.endDate,
      trades,
    });
  }

  private createStrategy(name: string, config?: Record<string, any>): BaseStrategy | null {
    switch (name.toUpperCase()) {
      case 'RSI_REVERSAL':
        return new RsiStrategy(config);
      case 'MA_CROSS':
        return new MaCrossStrategy(config);
      case 'BREAKOUT':
        return new BreakoutStrategy(config);
      default:
        return null;
    }
  }

  private calculateResults(data: {
    strategyName: string;
    symbol: string;
    timeframe: string;
    startDate: Date;
    endDate: Date;
    trades: { profit: number }[];
  }): BacktestResult {
    const { trades } = data;
    const totalTrades = trades.length;

    if (totalTrades === 0) {
      return {
        strategyName: data.strategyName,
        symbol: data.symbol,
        timeframe: data.timeframe,
        startDate: data.startDate,
        endDate: data.endDate,
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        totalProfit: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
      };
    }

    const winners = trades.filter(t => t.profit > 0);
    const losers = trades.filter(t => t.profit <= 0);
    const winRate = (winners.length / totalTrades) * 100;

    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const grossProfit = winners.reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.profit, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;
    const returns: number[] = [];

    for (const trade of trades) {
      runningTotal += trade.profit;
      returns.push(trade.profit);
      if (runningTotal > peak) peak = runningTotal;
      const dd = peak - runningTotal;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      strategyName: data.strategyName,
      symbol: data.symbol,
      timeframe: data.timeframe,
      startDate: data.startDate,
      endDate: data.endDate,
      totalTrades,
      winRate: Math.round(winRate * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    };
  }
}

export const backtestingService = new BacktestingService();
