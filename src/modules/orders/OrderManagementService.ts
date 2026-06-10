import { prisma } from '../../common/utils/prisma';
import { logger } from '../../common/utils/logger';
import { mt5Bridge } from '../mt5-bridge/Mt5BridgeService';
import { signalService } from '../signals/SignalService';
import { riskManagementService } from '../risk/RiskManagementService';
import { notificationService } from '../notifications/NotificationService';
import { TradeSignal, CloseCommand, ModifyCommand } from '../../common/interfaces';

export class OrderManagementService {
  async processSignal(signal: TradeSignal): Promise<void> {
    const riskCheck = await riskManagementService.checkTrade(signal);
    if (!riskCheck.allowed) {
      logger.warn('Trade rejected by risk management', { reason: riskCheck.reason });
      return;
    }

    const createdSignal = await signalService.createSignal(signal);

    const order = await prisma.tradeOrder.create({
      data: {
        symbol: signal.symbol,
        action: signal.action,
        lot: riskCheck.suggestedLot || signal.lot,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        status: 'PENDING',
        signalId: createdSignal.id,
        accountId: signal.accountId,
      },
    });

    try {
      const result = await mt5Bridge.placeOrder({
        symbol: signal.symbol,
        action: signal.action,
        lot: order.lot,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
      });

      await prisma.tradeOrder.update({
        where: { id: order.id },
        data: {
          status: 'OPEN',
          ticket: BigInt(result.ticket || 0),
          entryPrice: result.price || 0,
          openedAt: new Date(),
        },
      });

      logger.info('Order executed', { orderId: order.id, ticket: result.ticket });

      await notificationService.sendTradeNotification({
        action: signal.action,
        symbol: signal.symbol,
        lot: order.lot,
        entryPrice: result.price,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        type: 'OPENED',
      });
    } catch (err) {
      await prisma.tradeOrder.update({
        where: { id: order.id },
        data: { status: 'REJECTED' },
      });

      logger.error('Order rejected by MT5', { orderId: order.id, error: (err as Error).message });
    }
  }

  async closeOrder(orderId: number): Promise<void> {
    const order = await prisma.tradeOrder.findUnique({ where: { id: orderId } });
    if (!order || !order.ticket) {
      throw new Error('Order not found or no ticket');
    }

    try {
      const result = await mt5Bridge.closeOrder({ ticket: Number(order.ticket) });

      await prisma.tradeOrder.update({
        where: { id: orderId },
        data: {
          status: 'CLOSED',
          profit: result.profit || 0,
          closedAt: new Date(),
        },
      });

      logger.info('Order closed', { orderId, profit: result.profit });

      await notificationService.sendTradeNotification({
        action: order.action as 'BUY' | 'SELL',
        symbol: order.symbol,
        lot: order.lot,
        entryPrice: order.entryPrice || 0,
        stopLoss: order.stopLoss ?? undefined,
        takeProfit: order.takeProfit ?? undefined,
        profit: result.profit,
        type: 'CLOSED',
      });
    } catch (err) {
      logger.error('Failed to close order', { orderId, error: (err as Error).message });
      throw err;
    }
  }

  async modifyOrder(orderId: number, cmd: ModifyCommand): Promise<void> {
    const order = await prisma.tradeOrder.findUnique({ where: { id: orderId } });
    if (!order || !order.ticket) {
      throw new Error('Order not found or no ticket');
    }

    try {
      await mt5Bridge.modifyOrder(cmd);

      await prisma.tradeOrder.update({
        where: { id: orderId },
        data: {
          stopLoss: cmd.stopLoss ?? order.stopLoss,
          takeProfit: cmd.takeProfit ?? order.takeProfit,
        },
      });

      logger.info('Order modified', { orderId });
    } catch (err) {
      logger.error('Failed to modify order', { orderId, error: (err as Error).message });
      throw err;
    }
  }

  async getOpenOrders() {
    return prisma.tradeOrder.findMany({
      where: { status: 'OPEN' },
      include: { account: true, signal: { include: { strategy: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderHistory(limit: number = 100) {
    return prisma.tradeOrder.findMany({
      where: { status: { in: ['CLOSED', 'REJECTED'] } },
      include: { account: true, signal: { include: { strategy: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const orderManagementService = new OrderManagementService();
