export interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  bidPrice: number; // ราคาขายทันที
  offerPrice: number; // ราคาซื้อทันที
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  history: number[]; // ราคาย้อนหลังเพื่อแสดงผลใน Sparkline (10 จุดล่าสุด)
  theme?: string;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timestamp: string;
  holdingDays: number; // 0, 1, 2, 3 (เทรดระยะสั้น ไม่เกิน 3 วัน)
  status: 'ACTIVE' | 'CLOSED';
  exitPrice?: number;
  exitTimestamp?: string;
  profitPercent?: number;
  analysisReason?: string;
  isStarred?: boolean;
}

export interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  entryDate: string;
  holdingDays: number;
}

export interface Portfolio {
  cash: number;
  positions: Position[];
  startingCapital: number;
  tradesToday: number;    // จำนวนครั้งที่เทรดในวันนี้
  lastTradeDate: string;  // วันที่ล่าสุดที่มีการเทรด (YYYY-MM-DD)
  pendingOrders?: PendingOrder[]; // คำสั่งซื้อขายที่รอจับคู่
}

export interface PendingOrder {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  targetPrice: number;
  timestamp: string;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  amount: number;
  timestamp: string;
  realizedPnL?: number;
  owner: 'BOT' | 'USER';
}

export interface BotLearningState {
  winCount: number;
  lossCount: number;
  consecutiveLosses: number;
  takeProfitMargin: number;
  stopLossMargin: number;
  rsiThreshold: number;
  macdThreshold: number;
  maxHoldingDays: number;
  sellOnlyOnTarget: boolean;
  marketBreadth?: number;
}

export interface BotLearningLog {
  id: string;
  timestamp: string;
  symbol: string;
  action: 'WIN' | 'LOSS' | 'AI_ANALYSIS';
  realizedPnL: number;
  pnlPercent: number;
  adjustments: string[];
}
