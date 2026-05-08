// src/types.ts
export interface StockConfig {
  symbol: string;
  name: string;
  buyDropPercent: number;   // Alert when price drops by this % from recent high
  sellRisePercent: number;  // Alert when price rises by this % from recent low
  rsiOversold: number;      // RSI below this = potential buy signal (default 30)
  rsiOverbought: number;    // RSI above this = potential sell signal (default 70)
  enabled: boolean;
}

export interface OHLCVBar {
  time: number;    // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockAnalysis {
  symbol: string;
  currentPrice: number;
  priceChange1D: number;     // % change vs yesterday
  priceChange5D: number;     // % change vs 5 days ago
  rsi14: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPercentB: number;        // 0=at lower band, 100=at upper band
  bbBandwidth: number;
  signals: Signal[];
}

export interface Signal {
  type: 'BUY' | 'SELL' | 'WATCH';
  reason: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface WatchlistStore {
  stocks: StockConfig[];
  updatedAt: string;
}

export interface Env {
  STOCK_KV: KVNamespace;
  NTFY_TOPIC: string;
}

export interface Position {
  id: string;            // uuid
  symbol: string;
  buyPrice: number;      // price in thousands VND (same unit as API)
  quantity: number;      // shares
  stopLossPercent: number;   // e.g. 7 = alert when price drops 7% from buy
  takeProfitPercent: number; // e.g. 10 = alert when price rises 10% from buy
  createdAt: string;
  note?: string;
  status: 'OPEN' | 'CLOSED';
}

export interface PositionStore {
  positions: Position[];
  updatedAt: string;
}
