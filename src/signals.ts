// src/signals.ts
// Generate buy/sell/watch signals based on technical analysis

import type { Signal, StockConfig } from './types';

interface AnalysisData {
  currentPrice: number;
  priceChange1D: number;
  priceChange5D: number;
  rsi14: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  bbPercentB: number;   // <0 = below lower band, >100 = above upper band
  bbBandwidth: number;
}

export function generateSignals(
  data: AnalysisData,
  config: StockConfig
): Signal[] {
  const signals: Signal[] = [];

  // === BUY SIGNALS ===

  // 1. RSI oversold
  if (data.rsi14 <= config.rsiOversold) {
    signals.push({
      type: 'BUY',
      reason: `RSI oversold (${data.rsi14.toFixed(1)} ≤ ${config.rsiOversold})`,
      strength: data.rsi14 < 20 ? 'STRONG' : 'MODERATE',
    });
  }

  // 2. Price dropped significantly
  if (data.priceChange1D <= -config.buyDropPercent) {
    signals.push({
      type: 'BUY',
      reason: `Giá giảm ${Math.abs(data.priceChange1D).toFixed(2)}% trong 1 ngày (ngưỡng: -${config.buyDropPercent}%)`,
      strength: Math.abs(data.priceChange1D) >= config.buyDropPercent * 2 ? 'STRONG' : 'MODERATE',
    });
  }

  // 3. MACD bullish crossover (histogram turns positive)
  if (data.macdHistogram > 0 && data.macdLine < 0) {
    signals.push({
      type: 'BUY',
      reason: `MACD bullish crossover (histogram dương, MACD âm → đang hồi phục)`,
      strength: 'WEAK',
    });
  }

  // 4. Bollinger Band squeeze — price below lower band
  if (data.bbPercentB < 0) {
    signals.push({
      type: 'BUY',
      reason: `Giá dưới Bollinger Band thấp (%B=${data.bbPercentB.toFixed(1)}%) — oversold theo BB`,
      strength: data.bbPercentB < -10 ? 'STRONG' : 'MODERATE',
    });
  }

  // === SELL SIGNALS ===

  // 1. RSI overbought
  if (data.rsi14 >= config.rsiOverbought) {
    signals.push({
      type: 'SELL',
      reason: `RSI overbought (${data.rsi14.toFixed(1)} ≥ ${config.rsiOverbought})`,
      strength: data.rsi14 > 80 ? 'STRONG' : 'MODERATE',
    });
  }

  // 2. Price rose significantly - take profit
  if (data.priceChange5D >= config.sellRisePercent) {
    signals.push({
      type: 'SELL',
      reason: `Giá tăng ${data.priceChange5D.toFixed(2)}% trong 5 ngày (ngưỡng chốt lời: +${config.sellRisePercent}%)`,
      strength: data.priceChange5D >= config.sellRisePercent * 1.5 ? 'STRONG' : 'MODERATE',
    });
  }

  // 3. MACD bearish crossover
  if (data.macdHistogram < 0 && data.macdLine > 0) {
    signals.push({
      type: 'SELL',
      reason: `MACD bearish crossover (histogram âm, MACD dương → bắt đầu giảm)`,
      strength: 'WEAK',
    });
  }

  // 4. Bollinger Band — price above upper band
  if (data.bbPercentB > 100) {
    signals.push({
      type: 'SELL',
      reason: `Giá trên Bollinger Band cao (%B=${data.bbPercentB.toFixed(1)}%) — overbought theo BB`,
      strength: data.bbPercentB > 120 ? 'STRONG' : 'MODERATE',
    });
  }

  // === WATCH (no strong signal yet) ===
  if (signals.length === 0) {
    if (data.rsi14 < 40) {
      signals.push({ type: 'WATCH', reason: `RSI thấp (${data.rsi14.toFixed(1)}), theo dõi cơ hội mua`, strength: 'WEAK' });
    } else if (data.rsi14 > 60) {
      signals.push({ type: 'WATCH', reason: `RSI cao (${data.rsi14.toFixed(1)}), theo dõi cơ hội bán`, strength: 'WEAK' });
    }
  }

  return signals;
}
