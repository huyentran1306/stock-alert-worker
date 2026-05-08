// src/index.ts
import { fetchOHLCV } from './vps-api';
import { analyzeStock } from './indicators';
import { generateSignals } from './signals';
import { sendAlert, sendSummary, sendPositionAlert } from './notify';
import { getWatchlist } from './watchlist';
import { getPositions, addPosition, savePositions, checkPositionAlerts } from './positions';
import type { StockAnalysis, Env } from './types';

export type { Env } from './types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

interface SignalHistoryEntry {
  symbol: string;
  price: number;
  signals: StockAnalysis['signals'];
  timestamp: string;
}

async function runAnalysis(env: Env): Promise<StockAnalysis[]> {
  const stocks = await getWatchlist(env.STOCK_KV);
  const results: StockAnalysis[] = [];
  const currentPrices = new Map<string, number>();

  for (const stock of stocks) {
    try {
      const bars = await fetchOHLCV(stock.symbol, 'D', 60);
      if (bars.length < 10) continue;
      const analysis = analyzeStock(bars, stock.symbol);
      const signals = generateSignals(analysis, stock);
      const stockAnalysis: StockAnalysis = { ...analysis, signals };
      results.push(stockAnalysis);
      currentPrices.set(stock.symbol, analysis.currentPrice);
      const hasActionable = signals.some((s) => s.type !== 'WATCH' && s.strength !== 'WEAK');
      if (hasActionable) await sendAlert(env.NTFY_TOPIC, stockAnalysis);
    } catch (err) {
      console.error(`Error analyzing ${stock.symbol}:`, err);
    }
  }

  const positions = await getPositions(env.STOCK_KV);
  const posAlerts = checkPositionAlerts(positions, currentPrices);
  for (const alert of posAlerts) await sendPositionAlert(env.NTFY_TOPIC, alert);

  await env.STOCK_KV.put('last_analysis', JSON.stringify(results), { expirationTtl: 3600 });

  const historyRaw = await env.STOCK_KV.get<SignalHistoryEntry[]>('signal_history', 'json') ?? [];
  const newEntries: SignalHistoryEntry[] = results
    .filter((r) => r.signals.length > 0)
    .map((r) => ({ symbol: r.symbol, price: r.currentPrice, signals: r.signals, timestamp: new Date().toISOString() }));
  await env.STOCK_KV.put('signal_history', JSON.stringify([...newEntries, ...historyRaw].slice(0, 200)), { expirationTtl: 7 * 86400 });

  const nowUTC = new Date();
  if (nowUTC.getUTCHours() === 2 && nowUTC.getUTCMinutes() < 30 && results.length > 0) {
    await sendSummary(env.NTFY_TOPIC, results);
  }

  return results;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runAnalysis(env);
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    const url = new URL(request.url);

    if (url.pathname === '/health') return json({ status: 'ok', time: new Date().toISOString() });

    if (url.pathname === '/run' && request.method === 'POST') {
      try {
        const results = await runAnalysis(env);
        return json({ success: true, analyzed: results.length, results });
      } catch (e) { return json({ success: false, error: String(e) }, 500); }
    }

    if (url.pathname === '/analysis') return json(await env.STOCK_KV.get('last_analysis', 'json') ?? []);
    if (url.pathname === '/history') return json(await env.STOCK_KV.get('signal_history', 'json') ?? []);

    if (url.pathname === '/watchlist' && request.method === 'GET') {
      return json(await getWatchlist(env.STOCK_KV));
    }
    if (url.pathname === '/watchlist' && request.method === 'PUT') {
      try {
        const body = await request.json() as { stocks: unknown };
        await env.STOCK_KV.put('watchlist', JSON.stringify({ stocks: body.stocks, updatedAt: new Date().toISOString() }));
        return json({ success: true });
      } catch (e) { return json({ success: false, error: String(e) }, 400); }
    }

    if (url.pathname === '/positions' && request.method === 'GET') return json(await getPositions(env.STOCK_KV));
    if (url.pathname === '/positions' && request.method === 'POST') {
      try {
        const body = await request.json() as {
          symbol: string; buyPrice: number; quantity: number;
          stopLossPercent: number; takeProfitPercent: number; note?: string;
        };
        return json({ success: true, position: await addPosition(env.STOCK_KV, body) });
      } catch (e) { return json({ success: false, error: String(e) }, 400); }
    }
    if (url.pathname.startsWith('/positions/') && request.method === 'DELETE') {
      const id = url.pathname.split('/')[2];
      const positions = await getPositions(env.STOCK_KV);
      await savePositions(env.STOCK_KV, positions.map((p) => p.id === id ? { ...p, status: 'CLOSED' as const } : p));
      return json({ success: true });
    }

    return json({ routes: ['GET /health', 'POST /run', 'GET /analysis', 'GET /history', 'GET|PUT /watchlist', 'GET|POST /positions', 'DELETE /positions/:id'] });
  },
};
