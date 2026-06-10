import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { authService } from '../modules/auth/AuthService';
import { mt5Bridge } from '../modules/mt5-bridge/Mt5BridgeService';
import { marketDataService } from '../modules/market-data/MarketDataService';
import { strategyEngine } from '../modules/strategies/StrategyEngine';
import { riskManagementService } from '../modules/risk/RiskManagementService';
import { orderManagementService } from '../modules/orders/OrderManagementService';
import { backtestingService } from '../modules/backtesting/BacktestingService';
import { aiAdvisorService } from '../modules/ai/AiAdvisorService';
import { notificationService } from '../modules/notifications/NotificationService';
import { auditService } from '../modules/audit/AuditService';
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

router.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
