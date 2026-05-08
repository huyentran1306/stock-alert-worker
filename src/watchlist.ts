// src/watchlist.ts
// Manage the stock watchlist stored in Cloudflare KV

import type { StockConfig, WatchlistStore, Env } from './types';

const KV_KEY = 'watchlist';

export const DEFAULT_WATCHLIST: StockConfig[] = [
  {
    symbol: 'VNM',
    name: 'Vinamilk',
    buyDropPercent: 3,
    sellRisePercent: 5,
    rsiOversold: 30,
    rsiOverbought: 70,
    enabled: true,
  },
  {
    symbol: 'FPT',
    name: 'FPT Corp',
    buyDropPercent: 3,
    sellRisePercent: 5,
    rsiOversold: 30,
    rsiOverbought: 70,
    enabled: true,
  },
  {
    symbol: 'HPG',
    name: 'Hòa Phát Group',
    buyDropPercent: 4,
    sellRisePercent: 6,
    rsiOversold: 35,
    rsiOverbought: 65,
    enabled: true,
  },
  {
    symbol: 'VIC',
    name: 'Vingroup',
    buyDropPercent: 3,
    sellRisePercent: 5,
    rsiOversold: 30,
    rsiOverbought: 70,
    enabled: true,
  },
  {
    symbol: 'MWG',
    name: 'Mobile World',
    buyDropPercent: 4,
    sellRisePercent: 6,
    rsiOversold: 30,
    rsiOverbought: 70,
    enabled: true,
  },
];

export async function getWatchlist(kv: Env['STOCK_KV']): Promise<StockConfig[]> {
  const data = await kv.get<WatchlistStore>(KV_KEY, 'json');
  if (!data) {
    // First run: seed default watchlist
    await saveWatchlist(kv, DEFAULT_WATCHLIST);
    return DEFAULT_WATCHLIST;
  }
  return data.stocks.filter((s: StockConfig) => s.enabled);
}

export async function saveWatchlist(kv: Env['STOCK_KV'], stocks: StockConfig[]): Promise<void> {
  const store: WatchlistStore = { stocks, updatedAt: new Date().toISOString() };
  await kv.put(KV_KEY, JSON.stringify(store));
}
