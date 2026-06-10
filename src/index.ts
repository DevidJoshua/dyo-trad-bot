import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './common/utils/logger';
import { prisma } from './common/utils/prisma';
import { authService } from './modules/auth/AuthService';
import { mt5Bridge } from './modules/mt5-bridge/Mt5BridgeService';
import { strategyEngine } from './modules/strategies/StrategyEngine';
import { notificationService } from './modules/notifications/NotificationService';
import { metricsService } from './modules/monitoring/MetricsService';
import { orderManagementService } from './modules/orders/OrderManagementService';
import { marketDataService } from './modules/market-data/MarketDataService';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import router from './routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg: string) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);
app.use('/api', router);

app.get('/metrics', async (_req, res) => {
  try {
    await metricsService.collectMetrics();
    res.set('Content-Type', metricsService.getRegistry().contentType);
    res.end(await metricsService.getRegistry().metrics());
  } catch (err) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

app.use(errorHandler);

async function startTradingLoop(): Promise<void> {
  logger.info('Starting trading evaluation loop');

  setInterval(async () => {
    try {
      const symbols = marketDataService.getSupportedSymbols();
      for (const symbol of symbols) {
        const candles = await marketDataService.getCandles(symbol, 'M5', 100);
        if (candles.length === 0) continue;

        const signals = await strategyEngine.evaluateAll(symbol, candles);
        for (const signal of signals) {
          await orderManagementService.processSignal(signal);
        }
      }
    } catch (err) {
      logger.error('Trading loop error', { error: (err as Error).message });
    }
  }, 60000);
}

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Connected to database');

    await authService.seedAdmin();

    await strategyEngine.initialize();

    await notificationService.initialize();

    await mt5Bridge.start();

    mt5Bridge.on('connected', () => {
      metricsService.setMt5Connected(true);
      logger.info('MT5 bridge connected');
    });

    mt5Bridge.on('disconnected', () => {
      metricsService.setMt5Connected(false);
    });

    mt5Bridge.on('account_update', async (info) => {
      logger.debug('Account update received', { balance: info.balance, equity: info.equity });
    });

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });

    startTradingLoop();
  } catch (err) {
    logger.error('Failed to bootstrap application', { error: (err as Error).message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  await mt5Bridge.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down');
  await mt5Bridge.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();

export default app;
