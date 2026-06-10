import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticate, authorize } from '../middleware/auth';
import { authService } from '../modules/auth/AuthService';
import { mt5Bridge } from '../modules/mt5-bridge/Mt5BridgeService';
import { marketDataService } from '../modules/market-data/MarketDataService';
import { strategyEngine } from '../modules/strategies/StrategyEngine';
import { riskManagementService } from '../modules/risk/RiskManagementService';
import { orderManagementService } from '../modules/orders/OrderManagementService';
import { backtestingService } from '../modules/backtesting/BacktestingService';
import { aiAdvisorService } from '../modules/ai/AiAdvisorService';
import { auditService } from '../modules/audit/AuditService';
import { notificationService } from '../modules/notifications/NotificationService';
import { chatbotService } from '../modules/chatbot/ChatbotService';
import { knowledgeService } from '../modules/chatbot/KnowledgeService';
import { conversationService } from '../modules/chatbot/ConversationService';
import { aiPilotService } from '../modules/chatbot/AiPilotService';
import { prisma } from '../common/utils/prisma';
import { logger } from '../common/utils/logger';

const router = Router();

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    if (!result) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/account', authenticate, async (_req: Request, res: Response) => {
  try {
    const accounts = await prisma.tradingAccount.findMany();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.get('/account/:id/performance', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const orders = await prisma.tradeOrder.findMany({
      where: { accountId: id, status: 'CLOSED' },
    });

    const totalTrades = orders.length;
    const winners = orders.filter(o => (o.profit || 0) > 0).length;
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const winRate = totalTrades > 0 ? (winners / totalTrades) * 100 : 0;

    res.json({ totalTrades, winners, totalProfit, winRate: Math.round(winRate * 100) / 100 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

router.get('/strategies', authenticate, async (_req: Request, res: Response) => {
  try {
    const strategies = await prisma.strategy.findMany();
    res.json(strategies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

router.put('/strategies/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive, configuration } = req.body;
    const data: any = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (configuration !== undefined) data.configuration = JSON.stringify(configuration);

    const updated = await prisma.strategy.update({ where: { id }, data });
    await strategyEngine.initialize();
    await auditService.log('UPDATE', 'Strategy', id, `Updated strategy ${updated.name}`);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

router.get('/signals', authenticate, async (_req: Request, res: Response) => {
  try {
    const signals = await prisma.tradeSignal.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { strategy: true },
    });
    res.json(signals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

router.get('/orders/open', authenticate, async (_req: Request, res: Response) => {
  try {
    const orders = await orderManagementService.getOpenOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open orders' });
  }
});

router.get('/orders/history', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const orders = await orderManagementService.getOrderHistory(limit);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

router.post('/orders/close/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await orderManagementService.closeOrder(id);
    await auditService.log('CLOSE_ORDER', 'TradeOrder', id, `Order ${id} closed manually`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/orders/modify/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { stopLoss, takeProfit } = req.body;
    await orderManagementService.modifyOrder(id, { ticket: id, stopLoss, takeProfit });
    await auditService.log('MODIFY_ORDER', 'TradeOrder', id, `Order ${id} modified`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/risk', authenticate, async (_req: Request, res: Response) => {
  try {
    const config = await riskManagementService.getConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch risk config' });
  }
});

router.put('/risk', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const config = await riskManagementService.updateConfig(req.body);
    await auditService.log('UPDATE', 'RiskConfiguration', config.id, 'Risk config updated');
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update risk config' });
  }
});

router.get('/market-data/:symbol/:timeframe', authenticate, async (req: Request, res: Response) => {
  try {
    const { symbol, timeframe } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const candles = await marketDataService.getCandles(symbol, timeframe, limit);
    res.json(candles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

router.post('/backtest', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await backtestingService.runBacktest(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/ai/analyze-trade', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const analysis = await aiAdvisorService.analyzeTrade(req.body);
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

router.get('/audit-logs', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = await auditService.getLogs(limit, offset);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/metrics/mt5', authenticate, async (_req: Request, res: Response) => {
  try {
    const info = await mt5Bridge.getAccountInfo();
    res.json(info);
  } catch {
    res.json({ error: 'MT5 not connected' });
  }
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;
    if (!message) { res.status(400).json({ error: 'Message is required' }); return; }
    const result = await chatbotService.chat(sessionId || crypto.randomUUID(), message);
    res.json(result);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('disabled')) {
      res.status(503).json({ error: msg });
    } else {
      res.status(500).json({ error: 'Chat failed', message: msg });
    }
  }
});

router.get('/chat/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) { res.json([]); return; }
    const history = await conversationService.getHistory(sessionId as string);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/admin/ai/config', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const config = await chatbotService.getConfig();
    if (config) {
      const { apiKey, ...safe } = config;
      res.json({ ...safe, apiKey: apiKey ? '••••••••' : '' });
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI config' });
  }
});

router.put('/admin/ai/config', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const config = await chatbotService.updateConfig(req.body);
    await auditService.log('UPDATE', 'AiConfiguration', config.id, 'AI config updated');
    const { apiKey, ...safe } = config;
    res.json({ ...safe, apiKey: apiKey ? '••••••••' : '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update AI config' });
  }
});

router.get('/admin/ai/knowledge', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const entries = await knowledgeService.getEntries();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch knowledge entries' });
  }
});

router.post('/admin/ai/knowledge/rebuild', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await knowledgeService.rebuildKnowledge(req.body.entries || []);
    await auditService.log('REBUILD', 'KnowledgeEntry', undefined, 'Knowledge base rebuilt');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rebuild knowledge' });
  }
});

router.get('/admin/ai/analytics', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const [totalSessions, totalMessages, recentSessions] = await Promise.all([
      conversationService.getSessionCount(),
      conversationService.getMessageCount(),
      conversationService.getRecentSessions(10),
    ]);
    res.json({ totalSessions, totalMessages, recentSessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/admin/telegram/config', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const cfg = await notificationService.getConfig();
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Telegram config' });
  }
});

router.put('/admin/telegram/config', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const cfg = await notificationService.updateConfig(req.body);
    await auditService.log('UPDATE', 'TelegramConfig', undefined, 'Telegram config updated');
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Telegram config' });
  }
});

router.post('/admin/telegram/test', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const success = await notificationService.sendTestMessage();
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: 'Test message failed' });
  }
});

router.get('/admin/ai-pilot/status', authenticate, async (_req: Request, res: Response) => {
  try {
    const status = await aiPilotService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI Pilot status' });
  }
});

router.post('/admin/ai-pilot/toggle', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const status = await aiPilotService.toggle(enabled);
    await auditService.log('UPDATE', 'AiPilot', undefined, `AI Pilot ${enabled ? 'enabled' : 'disabled'}`);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle AI Pilot' });
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
