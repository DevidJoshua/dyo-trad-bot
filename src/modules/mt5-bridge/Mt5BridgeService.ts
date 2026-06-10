import net from 'net';
import { EventEmitter } from 'events';
import { logger } from '../../common/utils/logger';
import { config } from '../../config';
import { TradeCommand, CloseCommand, ModifyCommand, AccountInfo, PositionInfo } from '../../common/interfaces';

export class Mt5BridgeService extends EventEmitter {
  private server: net.Server | null = null;
  private clientSocket: net.Socket | null = null;
  private pendingCommands: Map<string, { resolve: Function; reject: Function; timer: NodeJS.Timeout }> = new Map();
  private commandCounter = 0;

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.clientSocket = socket;
        logger.info('MT5 EA connected');

        socket.on('data', (data) => this.handleData(data));
        socket.on('close', () => {
          logger.warn('MT5 EA disconnected');
          this.clientSocket = null;
          this.emit('disconnected');
        });
        socket.on('error', (err) => {
          logger.error('MT5 socket error', { error: err.message });
        });

        this.emit('connected');
      });

      this.server.listen(config.mt5.bridgePort, () => {
        logger.info(`MT5 Bridge listening on port ${config.mt5.bridgePort}`);
        resolve();
      });
    });
  }

  private handleData(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString().trim());
      const { type, commandId, payload } = message;

      if (type === 'response' && commandId) {
        const pending = this.pendingCommands.get(commandId);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingCommands.delete(commandId);
          pending.resolve(payload);
        }
      } else if (type === 'account_update') {
        this.emit('account_update', payload as AccountInfo);
      } else if (type === 'position_update') {
        this.emit('position_update', payload as PositionInfo);
      } else if (type === 'trade_executed') {
        this.emit('trade_executed', payload);
      } else if (type === 'trade_error') {
        this.emit('trade_error', payload);
      }
    } catch (err) {
      logger.error('Failed to parse MT5 message', { error: (err as Error).message, data: data.toString() });
    }
  }

  private sendCommand(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.clientSocket) {
        return reject(new Error('MT5 EA not connected'));
      }

      const commandId = `cmd_${++this.commandCounter}_${Date.now()}`;
      const command = { commandId, type, payload };

      const timer = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error(`Command ${commandId} timed out`));
      }, 30000);

      this.pendingCommands.set(commandId, { resolve, reject, timer });

      try {
        this.clientSocket.write(JSON.stringify(command) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pendingCommands.delete(commandId);
        reject(err);
      }
    });
  }

  async placeOrder(cmd: TradeCommand): Promise<any> {
    logger.info('Sending order to MT5', { symbol: cmd.symbol, action: cmd.action, lot: cmd.lot });
    return this.sendCommand('place_order', cmd);
  }

  async closeOrder(cmd: CloseCommand): Promise<any> {
    logger.info('Closing order in MT5', { ticket: cmd.ticket });
    return this.sendCommand('close_order', cmd);
  }

  async modifyOrder(cmd: ModifyCommand): Promise<any> {
    logger.info('Modifying order in MT5', { ticket: cmd.ticket });
    return this.sendCommand('modify_order', cmd);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    return this.sendCommand('get_account_info', {});
  }

  async getOpenPositions(): Promise<PositionInfo[]> {
    return this.sendCommand('get_open_positions', {});
  }

  async shutdown(): Promise<void> {
    if (this.clientSocket) {
      this.clientSocket.destroy();
    }
    if (this.server) {
      return new Promise((resolve) => this.server!.close(() => resolve()));
    }
  }
}

export const mt5Bridge = new Mt5BridgeService();
