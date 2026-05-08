// src/notify.ts
// Send notifications via ntfy.sh — no API key required!
// Just use a unique topic name that only you know
// Subscribe: https://ntfy.sh/YOUR_TOPIC or via ntfy app

import type { StockAnalysis } from './types';

const NTFY_URL = 'https://ntfy.sh';

export async function sendAlert(topic: string, analysis: StockAnalysis): Promise<void> {
  const signals = analysis.signals;
  if (signals.length === 0) return;

  const buySignals = signals.filter((s) => s.type === 'BUY');
  const sellSignals = signals.filter((s) => s.type === 'SELL');
  let emoji = '👀';
  let priority = 'default';
  let tags = 'chart_with_upwards_trend';

  if (buySignals.some((s) => s.strength === 'STRONG')) {
    emoji = '🚨📈';
    priority = 'urgent';
    tags = 'moneybag,arrow_up';
  } else if (sellSignals.some((s) => s.strength === 'STRONG')) {
    emoji = '🚨📉';
    priority = 'urgent';
    tags = 'warning,arrow_down';
  } else if (buySignals.length > 0) {
    emoji = '📈';
    priority = 'high';
    tags = 'arrow_up';
  } else if (sellSignals.length > 0) {
    emoji = '📉';
    priority = 'high';
    tags = 'arrow_down';
  }

  const title = `${emoji} ${analysis.symbol} — ${formatPrice(analysis.currentPrice)} VNĐ`;

  const lines: string[] = [
    `📊 Giá hiện tại: ${formatPrice(analysis.currentPrice)} VNĐ`,
    `📅 Thay đổi 1 ngày: ${formatPercent(analysis.priceChange1D)}`,
    `📅 Thay đổi 5 ngày: ${formatPercent(analysis.priceChange5D)}`,
    `📐 RSI(14): ${analysis.rsi14.toFixed(1)}`,
    `📐 MACD: ${analysis.macdLine.toFixed(3)} | Signal: ${analysis.macdSignal.toFixed(3)}`,
    '',
    '🔔 Tín hiệu:',
    ...signals.map((s) => `  ${signalEmoji(s.type)} [${s.strength}] ${s.reason}`),
    '',
    '⚡ Đây chỉ là phân tích kỹ thuật tự động, không phải khuyến nghị đầu tư!',
  ];

  // Only skip if all signals are WATCH with WEAK strength
  const shouldSkip =
    signals.every((s) => s.type === 'WATCH' && s.strength === 'WEAK') && signals.length > 0;

  if (shouldSkip) return; // Don't spam watch-only notifications

  await fetch(`${NTFY_URL}/${topic}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Title': title,
      'Priority': priority,
      'Tags': tags,
    },
    body: lines.join('\n'),
  });
}

export async function sendSummary(topic: string, analyses: StockAnalysis[]): Promise<void> {
  const lines: string[] = ['📊 Báo cáo thị trường', `🕐 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`, ''];

  for (const a of analyses) {
    const signalTypes = [...new Set(a.signals.map((s) => s.type))];
    const icon = signalTypes.includes('BUY') ? '📈' : signalTypes.includes('SELL') ? '📉' : '➡️';
    lines.push(`${icon} ${a.symbol}: ${formatPrice(a.currentPrice)} (${formatPercent(a.priceChange1D)}) RSI=${a.rsi14.toFixed(0)}`);
  }

  await fetch(`${NTFY_URL}/${topic}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Title': '📊 Stock Summary',
      'Priority': 'low',
      'Tags': 'bar_chart',
    },
    body: lines.join('\n'),
  });
}

function formatPrice(price: number): string {
  return (price * 1000).toLocaleString('vi-VN');
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function signalEmoji(type: string): string {
  if (type === 'BUY') return '🟢';
  if (type === 'SELL') return '🔴';
  return '🟡';
}

export async function sendPositionAlert(topic: string, alert: import('./positions').PositionAlert): Promise<void> {
  const { position: pos, currentPrice, changePercent, type } = alert;
  const isSL = type === 'STOP_LOSS';
  const emoji = isSL ? '🚨🛑' : '🎯💰';
  const title = `${emoji} ${pos.symbol} — ${type === 'STOP_LOSS' ? 'STOP-LOSS' : 'TAKE-PROFIT'} triggered!`;

  const lines = [
    `📍 Mã: ${pos.symbol}`,
    `💵 Giá mua: ${formatPrice(pos.buyPrice)} VNĐ`,
    `📈 Giá hiện tại: ${formatPrice(currentPrice)} VNĐ`,
    `📊 Thay đổi: ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
    `📦 Khối lượng: ${pos.quantity.toLocaleString('vi-VN')} cp`,
    `💰 P&L ước tính: ${formatPrice(Math.abs((currentPrice - pos.buyPrice) * pos.quantity))} VNĐ (${changePercent >= 0 ? 'LÃI' : 'LỖ'})`,
    pos.note ? `📝 Ghi chú: ${pos.note}` : '',
    '',
    isSL
      ? `⚠️ Giá đã giảm qua ngưỡng stop-loss ${pos.stopLossPercent}%. Xem xét cắt lỗ!`
      : `✅ Giá đã tăng qua ngưỡng take-profit ${pos.takeProfitPercent}%. Xem xét chốt lời!`,
  ].filter(Boolean);

  await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Title': title,
      'Priority': 'urgent',
      'Tags': isSL ? 'rotating_light,chart_with_downwards_trend' : 'tada,moneybag',
    },
    body: lines.join('\n'),
  });
}
