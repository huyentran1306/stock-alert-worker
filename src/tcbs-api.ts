// src/tcbs-api.ts
// Uses TCBS (Techcombank Securities) unofficial public API
// No API key required for market data
import type { OHLCVBar } from './types';

const TCBS_BASE = 'https://apipubaws.tcbs.com.vn';

export async function fetchOHLCV(
  symbol: string,
  resolution: 'D' | '1' | '5' | '15' | '30' | '60' = 'D',
  count: number = 60
): Promise<OHLCVBar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - count * 86400; // approximate

  const url = `${TCBS_BASE}/stock-insight/v1/stock/bars-long-term?ticker=${symbol}&type=stock&resolution=${resolution}&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`TCBS API error for ${symbol}: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as {
    data: Array<{
      tradingDate: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  };

  if (!data?.data || !Array.isArray(data.data)) {
    throw new Error(`Invalid TCBS response for ${symbol}`);
  }

  return data.data.map((bar) => ({
    time: new Date(bar.tradingDate).getTime() / 1000,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
}

export async function fetchCurrentPrice(symbol: string): Promise<number> {
  const bars = await fetchOHLCV(symbol, 'D', 2);
  if (bars.length === 0) throw new Error(`No data for ${symbol}`);
  return bars[bars.length - 1].close;
}
