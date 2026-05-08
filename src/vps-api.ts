// src/vps-api.ts
// Uses VPS Securities public TradingView-compatible API
// No API key required for market data
import type { OHLCVBar } from './types';

const VPS_BASE = 'https://histdatafeed.vps.com.vn/tradingview';

export async function fetchOHLCV(
  symbol: string,
  resolution: 'D' | '1' | '5' | '15' | '30' | '60' = 'D',
  days: number = 60
): Promise<OHLCVBar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400 * 1.5; // add buffer for weekends/holidays

  const url = `${VPS_BASE}/history?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) {
    throw new Error(`VPS API error for ${symbol}: ${res.status}`);
  }

  const data = await res.json() as {
    s: string;
    t: number[];
    o: number[];
    h: number[];
    l: number[];
    c: number[];
    v: number[];
  };

  if (data.s !== 'ok' || !data.t?.length) {
    throw new Error(`No data from VPS for ${symbol}: status=${data.s}`);
  }

  return data.t.map((time, i) => ({
    time,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i],
  }));
}
