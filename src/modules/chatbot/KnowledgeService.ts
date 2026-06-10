import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';

interface KnowledgeContext {
  category: string;
  content: string;
}

export class KnowledgeService {
  async getRelevantContext(query: string): Promise<string> {
    const parts: string[] = [];

    const tradingContext = await this.getTradingContext(query);
    if (tradingContext) parts.push(tradingContext);

    const portfolioContext = await this.getKnowledgeBaseContext(query);
    if (portfolioContext) parts.push(portfolioContext);

    return parts.join('\n\n---\n\n');
  }

  private async getTradingContext(query: string): Promise<string | null> {
    const lower = query.toLowerCase();
    const ctx: string[] = [];

    if (this.matches(lower, ['position', 'trade', 'order', 'open'])) {
      const openOrders = await prisma.tradeOrder.findMany({
        where: { status: 'OPEN' },
        include: { account: true },
      });

      if (openOrders.length > 0) {
        ctx.push('=== Current Open Positions ===');
        for (const o of openOrders) {
          ctx.push(`- ${o.action} ${o.symbol} | Lot: ${o.lot} | Entry: ${o.entryPrice} | Profit: ${o.profit ?? 0}`);
        }
      } else {
        ctx.push('No open positions currently.');
      }
    }

    if (this.matches(lower, ['balance', 'equity', 'account', 'performance', 'pnl'])) {
      const accounts = await prisma.tradingAccount.findMany();
      for (const acc of accounts) {
        const orders = await prisma.tradeOrder.findMany({
          where: { accountId: acc.id, status: 'CLOSED' },
        });
        const totalPnl = orders.reduce((s, o) => s + (o.profit || 0), 0);
        ctx.push(`=== Account: ${acc.name} ===`);
        ctx.push(`Broker: ${acc.broker} | Server: ${acc.server} | Status: ${acc.status}`);
        ctx.push(`Total Closed Trades: ${orders.length} | Cumulative PnL: ${totalPnl.toFixed(2)}`);
      }
    }

    if (this.matches(lower, ['strategy', 'rsi', 'ma cross', 'breakout', 'ma_cross'])) {
      const strategies = await prisma.strategy.findMany();
      ctx.push('=== Active Strategies ===');
      for (const s of strategies) {
        ctx.push(`- ${s.name}: ${s.description || 'No description'} | Active: ${s.isActive ? 'Yes' : 'No'}`);
      }
    }

    if (this.matches(lower, ['risk', 'drawdown', 'daily loss', 'max open'])) {
      const risk = await prisma.riskConfiguration.findFirst();
      if (risk) {
        ctx.push('=== Risk Configuration ===');
        ctx.push(`Risk per Trade: ${risk.riskPerTrade}%`);
        ctx.push(`Max Daily Loss: ${risk.maxDailyLoss}%`);
        ctx.push(`Max Drawdown: ${risk.maxDrawdown}%`);
        ctx.push(`Max Open Positions: ${risk.maxOpenPositions}`);
      }
    }

    if (this.matches(lower, ['signal', 'signals'])) {
      const signals = await prisma.tradeSignal.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { strategy: true },
      });
      if (signals.length > 0) {
        ctx.push('=== Recent Trade Signals ===');
        for (const s of signals) {
          ctx.push(`- ${s.signal} ${s.symbol} | Confidence: ${s.confidence ?? 'N/A'}% | Strategy: ${s.strategy.name}`);
        }
      }
    }

    return ctx.length > 0 ? ctx.join('\n') : null;
  }

  private async getKnowledgeBaseContext(query: string): Promise<string | null> {
    const lower = query.toLowerCase();
    const entries = await prisma.knowledgeEntry.findMany();
    if (entries.length === 0) return null;

    const scored = entries.map(e => {
      let score = 0;
      const combined = `${e.title} ${e.content} ${e.tags}`.toLowerCase();
      const words = lower.split(/\s+/);
      for (const word of words) {
        if (word.length < 3) continue;
        if (combined.includes(word)) score++;
      }
      if (e.tags.toLowerCase().includes(lower)) score += 3;
      if (e.title.toLowerCase().includes(lower)) score += 2;
      return { ...e, score };
    });

    const relevant = scored.filter(e => e.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    if (relevant.length === 0) return null;

    const ctx = ['=== Knowledge Base ==='];
    for (const r of relevant) {
      ctx.push(`[${r.category}] ${r.title}: ${r.content}`);
    }
    return ctx.join('\n');
  }

  private matches(lowercaseQuery: string, keywords: string[]): boolean {
    return keywords.some(k => lowercaseQuery.includes(k));
  }

  async rebuildKnowledge(entries: { category: string; title: string; content: string; tags?: string }[]): Promise<void> {
    await prisma.knowledgeEntry.deleteMany();
    if (entries.length > 0) {
      await prisma.knowledgeEntry.createMany({
        data: entries.map(e => ({
          category: e.category,
          title: e.title,
          content: e.content,
          tags: e.tags || '',
        })),
      });
    }
    logger.info(`Knowledge base rebuilt with ${entries.length} entries`);
  }

  async getEntries() {
    return prisma.knowledgeEntry.findMany({ orderBy: { category: 'asc' } });
  }
}

export const knowledgeService = new KnowledgeService();
