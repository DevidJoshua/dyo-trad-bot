import { logger } from '../../common/utils/logger';
import { config } from '../../config';

interface TradeNotification {
  action: 'BUY' | 'SELL';
  symbol: string;
  lot: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit?: number;
  type: 'OPENED' | 'CLOSED' | 'SL_HIT' | 'TP_HIT';
}

interface AlertNotification {
  type: 'DAILY_LOSS' | 'DRAWDOWN' | 'ERROR';
  message: string;
}

export class NotificationService {
  private bot: any = null;

  async initialize(): Promise<void> {
    if (!config.telegram.botToken || !config.telegram.chatId) {
      logger.warn('Telegram not configured, notifications disabled');
      return;
    }

    try {
      const TelegramBot = require('node-telegram-bot-api');
      this.bot = new TelegramBot(config.telegram.botToken, { polling: false });
      logger.info('Telegram notification service initialized');
    } catch (err) {
      logger.error('Failed to initialize Telegram bot', { error: (err as Error).message });
    }
  }

  async sendTradeNotification(data: TradeNotification): Promise<void> {
    const emoji = data.type === 'OPENED' ? '🟢' : data.type === 'CLOSED' ? '🔴' : '⚠️';
    const title = data.type === 'OPENED' ? 'TRADE OPENED' : data.type === 'CLOSED' ? 'TRADE CLOSED' : 'TRADE ALERT';

    const message = [
      `${emoji} *${title}*`,
      ``,
      `${data.action} ${data.symbol}`,
      `Lot: ${data.lot.toFixed(2)}`,
      `Entry: ${data.entryPrice.toFixed(5)}`,
      data.stopLoss ? `SL: ${data.stopLoss.toFixed(5)}` : null,
      data.takeProfit ? `TP: ${data.takeProfit.toFixed(5)}` : null,
      data.profit !== undefined ? `Profit: ${data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendMessage(message);
  }

  async sendAlert(data: AlertNotification): Promise<void> {
    const emoji = data.type === 'ERROR' ? '🚨' : '⚠️';
    const message = `${emoji} *${data.type}*\n\n${data.message}`;
    await this.sendMessage(message);
  }

  private async sendMessage(text: string): Promise<void> {
    if (!this.bot || !config.telegram.chatId) return;

    try {
      await this.bot.sendMessage(config.telegram.chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      logger.error('Failed to send Telegram message', { error: (err as Error).message });
    }
  }
}

export const notificationService = new NotificationService();
