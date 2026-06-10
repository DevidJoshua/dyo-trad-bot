export interface TradeSignal {
  symbol: string;
  action: 'BUY' | 'SELL';
  lot: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence?: number;
  strategyId: number;
  accountId: number;
}

export interface TradeCommand {
  symbol: string;
  action: 'BUY' | 'SELL';
  lot: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface CloseCommand {
  ticket: number;
}

export interface ModifyCommand {
  ticket: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  openPositions: PositionInfo[];
  status: string;
}

export interface PositionInfo {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  swap: number;
  openTime: string;
}

export interface MarketCandle {
  symbol: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface Strategy {
  evaluate(symbol: string, candles: MarketCandle[]): TradeSignal | null;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  suggestedLot?: number;
}

export interface AiAdvisor {
  analyzeTrade(signal: TradeSignal): Promise<string>;
  analyzePerformance(): Promise<string>;
  optimizeStrategy(strategyId: number): Promise<string>;
}

export interface BacktestResult {
  strategyName: string;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}
