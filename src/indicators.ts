// src/indicators.ts
// Technical analysis indicators calculated from OHLCV data

import type { OHLCVBar } from './types';

/** Simple Moving Average */
export function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

/** Exponential Moving Average */
export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];

  // First EMA = SMA
  let prevEma = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prevEma);

  for (let i = period; i < values.length; i++) {
    const currentEma = values[i] * k + prevEma * (1 - k);
    result.push(currentEma);
    prevEma = currentEma;
  }

  return result;
}

/** RSI (Relative Strength Index) - period 14 */
export function rsi(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50; // neutral

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth subsequent values
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

/** MACD (12, 26, 9) */
export function macd(closes: number[]): MACDResult | null {
  if (closes.length < 35) return null;

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);

  // ema12 starts at index 11, ema26 starts at index 25 → offset = 14
  // diff[j] = ema12[j + 14] - ema26[j]
  const macdValues: number[] = [];
  for (let i = 0; i < ema26.length; i++) {
    macdValues.push(ema12[i + 14] - ema26[i]);
  }

  const signal = ema(macdValues, 9);
  const lastMacd = macdValues[macdValues.length - 1];
  const lastSignal = signal[signal.length - 1];

  return {
    macdLine: lastMacd,
    signalLine: lastSignal,
    histogram: lastMacd - lastSignal,
  };
}

/** Percent change between two prices */
export function percentChange(from: number, to: number): number {
  return ((to - from) / from) * 100;
}

export interface BollingerBands {
  upper: number;
  middle: number; // SMA
  lower: number;
  bandwidth: number;      // (upper - lower) / middle * 100
  percentB: number;       // (close - lower) / (upper - lower) * 100  (0=at lower, 100=at upper)
}

/** Bollinger Bands (period=20, stddev=2) */
export function bollingerBands(closes: number[], period: number = 20, multiplier: number = 2): BollingerBands | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, v) => sum + (v - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  const lastClose = closes[closes.length - 1];
  return {
    upper,
    middle,
    lower,
    bandwidth: (upper - lower) / middle * 100,
    percentB: (upper - lower) === 0 ? 50 : (lastClose - lower) / (upper - lower) * 100,
  };
}

/** Analyze bars and return key metrics */
export function analyzeStock(bars: OHLCVBar[], symbol: string) {
  const closes = bars.map((b) => b.close);
  const currentPrice = closes[closes.length - 1];
  const yesterdayPrice = closes[closes.length - 2] ?? currentPrice;
  const fiveDayPrice = closes[closes.length - 6] ?? closes[0];

  const rsi14 = rsi(closes);
  const macdResult = macd(closes);
  const change1D = percentChange(yesterdayPrice, currentPrice);
  const change5D = percentChange(fiveDayPrice, currentPrice);
  const bb = bollingerBands(closes);

  return {
    symbol,
    currentPrice,
    priceChange1D: change1D,
    priceChange5D: change5D,
    rsi14,
    macdLine: macdResult?.macdLine ?? 0,
    macdSignal: macdResult?.signalLine ?? 0,
    macdHistogram: macdResult?.histogram ?? 0,
    bbUpper: bb?.upper ?? 0,
    bbMiddle: bb?.middle ?? 0,
    bbLower: bb?.lower ?? 0,
    bbPercentB: bb?.percentB ?? 50,
    bbBandwidth: bb?.bandwidth ?? 0,
  };
}
