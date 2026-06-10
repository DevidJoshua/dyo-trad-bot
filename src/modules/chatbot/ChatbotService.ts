import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';
import { createProvider, AiProvider } from './AiProvider';
import { knowledgeService } from './KnowledgeService';
import { conversationService } from './ConversationService';

export class ChatbotService {
  private providerCache: Map<string, AiProvider> = new Map();

  private async getProvider(): Promise<{ provider: AiProvider; config: any }> {
    const config = await prisma.aiConfiguration.findFirst();
    if (!config || !config.enabled) {
      throw new Error('AI chatbot is disabled');
    }

    const cacheKey = `${config.provider}:${config.model}:${config.apiEndpoint}`;
    if (!this.providerCache.has(cacheKey)) {
      const p = createProvider(config.provider, config.apiKey, config.model, config.apiEndpoint || undefined);
      this.providerCache.set(cacheKey, p);
    }

    return { provider: this.providerCache.get(cacheKey)!, config };
  }

  async chat(sessionId: string, message: string): Promise<{ reply: string; suggestions: string[] }> {
    const { provider, config } = await this.getProvider();

    const session = await conversationService.getOrCreateSession(sessionId);
    await conversationService.addMessage(session.sessionId, 'user', message);

    const knowledge = await knowledgeService.getRelevantContext(message);

    const tradingData = await this.getTradingSummary();

    const systemPrompt = [
      config.systemPrompt,
      '',
      '=== Current Platform Context ===',
      tradingData,
      '',
      knowledge ? `=== Retrieved Knowledge ===\n${knowledge}` : '',
      '',
      'Guidelines:',
      '- Answer based ONLY on the context and knowledge provided above.',
      '- If you cannot find relevant information, say so politely.',
      '- For trading questions, use the actual platform data provided.',
      '- Be concise but helpful.',
      '- Format responses with bullet points and sections for readability.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const isResponseMode = config.chatMode === 'response';
      const history = isResponseMode
        ? [{ role: 'user', content: message } as { role: string; content: string }]
        : await conversationService.getHistory(session.sessionId);
      const reply = await provider.chat(history, systemPrompt);
      if (!isResponseMode) {
        await conversationService.addMessage(session.sessionId, 'assistant', reply);
      }

      const suggestions = await this.getSuggestions(message);

      return { reply, suggestions };
    } catch (err) {
      const errMsg = (err as Error).message;
      logger.error('Chatbot error', { error: errMsg });
      throw err;
    }
  }

  private async getTradingSummary(): Promise<string> {
    const parts: string[] = [];

    const openOrders = await prisma.tradeOrder.findMany({ where: { status: 'OPEN' } });
    parts.push(`Open Positions: ${openOrders.length}`);

    const closedOrders = await prisma.tradeOrder.findMany({ where: { status: 'CLOSED' } });
    const totalPnl = closedOrders.reduce((s, o) => s + (o.profit || 0), 0);
    const winners = closedOrders.filter(o => (o.profit || 0) > 0).length;
    const winRate = closedOrders.length > 0 ? ((winners / closedOrders.length) * 100).toFixed(1) : '0';
    parts.push(`Total Trades: ${closedOrders.length} | Win Rate: ${winRate}% | PnL: ${totalPnl.toFixed(2)}`);

    const activeStrategies = await prisma.strategy.count({ where: { isActive: true } });
    parts.push(`Active Strategies: ${activeStrategies}`);

    return parts.join('\n');
  }

  private async getSuggestions(message: string): Promise<string[]> {
    const lower = message.toLowerCase();

    if (lower.includes('position') || lower.includes('trade') || lower.includes('order')) {
      return ['Show account performance', 'What are my risk settings?', 'Tell me about active strategies'];
    }
    if (lower.includes('strategy') || lower.includes('rsi')) {
      return ['What positions are open?', 'Show me recent signals', 'How is my account performing?'];
    }
    if (lower.includes('risk') || lower.includes('drawdown')) {
      return ['Show open positions', 'What strategies are active?', 'Show account performance'];
    }
    if (lower.includes('portfolio') || lower.includes('project') || lower.includes('experience') || lower.includes('skill')) {
      return ['Tell me about your experience', 'What technologies do you use?', 'How can I contact you?'];
    }

    return [
      'Show open positions',
      'Tell me about active strategies',
      'What are my risk settings?',
      'Show account performance',
      'Tell me about your experience',
    ];
  }

  async getConfig() {
    return prisma.aiConfiguration.findFirst();
  }

  async updateConfig(data: {
    enabled?: boolean;
    provider?: string;
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
    welcomeMessage?: string;
    suggestedQuestions?: string[];
    chatMode?: string;
  }) {
    this.providerCache.clear();
    const existing = await prisma.aiConfiguration.findFirst();
    const payload: any = { ...data };
    if (data.suggestedQuestions) {
      payload.suggestedQuestions = JSON.stringify(data.suggestedQuestions);
    }

    if (existing) {
      return prisma.aiConfiguration.update({ where: { id: existing.id }, data: payload });
    }
    return prisma.aiConfiguration.create({ data: payload as any });
  }
}

export const chatbotService = new ChatbotService();
