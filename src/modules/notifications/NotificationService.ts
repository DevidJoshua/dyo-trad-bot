import { logger } from '../../common/utils/logger';
import { prisma } from '../../common/utils/prisma';
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
  private dbConfig: { botToken: string; chatId: string; enabled: boolean } | null = null;

  async initialize(): Promise<void> {
    try {
      this.dbConfig = await prisma.telegramConfig.findFirst();
    } catch {
      this.dbConfig = null;
    }

    const botToken = this.dbConfig?.botToken || config.telegram.botToken;
    const chatId = this.dbConfig?.chatId || config.telegram.chatId;
    const enabled = this.dbConfig ? this.dbConfig.enabled : true;

    if (!botToken || !chatId || !enabled) {
      logger.warn('Telegram not configured, notifications disabled');
      return;
    }

    try {
      const TelegramBot = require('node-telegram-bot-api');
      this.bot = new TelegramBot(botToken, { polling: false });
      logger.info('Telegram notification service initialized');
    } catch (err) {
      logger.error('Failed to initialize Telegram bot', { error: (err as Error).message });
    }
  }

  private getBotToken(): string {
    return this.dbConfig?.botToken || config.telegram.botToken;
  }

  private getChatId(): string {
    return this.dbConfig?.chatId || config.telegram.chatId;
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
    if (!this.bot) return;
    const chatId = this.getChatId();
    if (!chatId) return;

    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      logger.error('Failed to send Telegram message', { error: (err as Error).message });
    }
  }

  async getConfig() {
    const db = await prisma.telegramConfig.findFirst();
    if (db) {
      return { enabled: db.enabled, chatId: db.chatId, botToken: db.botToken ? '********' : '' };
    }
    return {
      enabled: !!config.telegram.botToken,
      chatId: config.telegram.chatId,
      botToken: config.telegram.botToken ? '********' : '',
    };
  }

  async updateConfig(data: { enabled?: boolean; botToken?: string; chatId?: string }) {
    const existing = await prisma.telegramConfig.findFirst();
    const payload: any = {};
    if (data.enabled !== undefined) payload.enabled = data.enabled;
    if (data.botToken !== undefined && data.botToken) payload.botToken = data.botToken;
    if (data.chatId !== undefined) payload.chatId = data.chatId;

    let result;
    if (existing) {
      result = await prisma.telegramConfig.update({ where: { id: existing.id }, data: payload });
    } else {
      result = await prisma.telegramConfig.create({
        data: {
          enabled: data.enabled ?? true,
          botToken: data.botToken || '',
          chatId: data.chatId || '',
        },
      });
    }

    this.dbConfig = result;
    await this.initialize();
    return this.getConfig();
  }

  async sendTestMessage(): Promise<boolean> {
    try {
      await this.sendMessage('🧪 *Test Notification*\n\nYour Telegram bot is configured correctly!');
      return true;
    } catch {
      return false;
    }
  }
}

export const notificationService = new NotificationService();
