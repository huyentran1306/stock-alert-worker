// src/positions.ts
// Track positions for stop-loss / take-profit alerts

import type { Position, PositionStore } from './types';

const KV_KEY = 'positions';

export async function getPositions(kv: KVNamespace): Promise<Position[]> {
  const data = await kv.get<PositionStore>(KV_KEY, 'json');
  return data?.positions ?? [];
}

export async function savePositions(kv: KVNamespace, positions: Position[]): Promise<void> {
  const store: PositionStore = { positions, updatedAt: new Date().toISOString() };
  await kv.put(KV_KEY, JSON.stringify(store));
}

export async function addPosition(kv: KVNamespace, pos: Omit<Position, 'id' | 'createdAt' | 'status'>): Promise<Position> {
  const positions = await getPositions(kv);
  const newPos: Position = {
    ...pos,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'OPEN',
  };
  positions.push(newPos);
  await savePositions(kv, positions);
  return newPos;
}

export interface PositionAlert {
  position: Position;
  currentPrice: number;
  changePercent: number;
  type: 'STOP_LOSS' | 'TAKE_PROFIT';
}

export function checkPositionAlerts(positions: Position[], currentPrices: Map<string, number>): PositionAlert[] {
  const alerts: PositionAlert[] = [];

  for (const pos of positions) {
    if (pos.status !== 'OPEN') continue;
    const currentPrice = currentPrices.get(pos.symbol);
    if (currentPrice === undefined) continue;

    const changePercent = ((currentPrice - pos.buyPrice) / pos.buyPrice) * 100;

    // Stop-loss triggered
    if (changePercent <= -pos.stopLossPercent) {
      alerts.push({ position: pos, currentPrice, changePercent, type: 'STOP_LOSS' });
    }
    // Take-profit triggered
    else if (changePercent >= pos.takeProfitPercent) {
      alerts.push({ position: pos, currentPrice, changePercent, type: 'TAKE_PROFIT' });
    }
  }

  return alerts;
}
