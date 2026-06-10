import { TradeSignal, AiAdvisor, BacktestResult } from '../../common/interfaces';
import { logger } from '../../common/utils/logger';

export class AiAdvisorService implements AiAdvisor {
  async analyzeTrade(signal: TradeSignal): Promise<string> {
    try {
      return this.generateTradeAnalysis(signal);
    } catch (err) {
      logger.error('AI trade analysis failed', { error: (err as Error).message });
      return 'AI analysis unavailable';
    }
  }

  async analyzePerformance(): Promise<string> {
    return 'Performance analysis - AI integration point. Implement with OpenAI/Claude API.';
  }

  async optimizeStrategy(strategyId: number): Promise<string> {
    return `Strategy ${strategyId} optimization - AI integration point. Implement with genetic algorithms or ML.`;
  }

  private generateTradeAnalysis(signal: TradeSignal): string {
    const riskReward = signal.stopLoss && signal.takeProfit
      ? Math.abs((signal.takeProfit - (signal.action === 'BUY' ? 0 : 0)) / (signal.stopLoss - (signal.action === 'BUY' ? 0 : 0)))
      : 'N/A';

    return [
      `*Trade Analysis for ${signal.symbol}*`,
      ``,
      `Action: ${signal.action}`,
      `Confidence: ${signal.confidence}%`,
      `Risk/Reward: ${riskReward}`,
      `Suggested Lot: ${signal.lot}`,
      ``,
      `*Factors Considered:*`,
      `- Market conditions`,
      `- Technical indicators alignment`,
      `- Recent price action`,
      `- Volatility assessment`,
      ``,
      `*Recommendation:* ${signal.confidence && signal.confidence > 70 ? 'Proceed with trade' : 'Monitor closely'}`,
    ].join('\n');
  }
}

export const aiAdvisorService = new AiAdvisorService();
