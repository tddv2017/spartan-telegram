/** Exness XAUUSD contract: $1 price move × 1.00 lot ≈ $100. */
const XAU_CONTRACT_SIZE = 100;

export function inferOpenPrice(trade: {
  openPrice?: number;
  closePrice?: number;
  pnl?: number;
  lots?: number;
  type?: string;
  symbol?: string;
}): number {
  const stored = Number(trade.openPrice) || 0;
  if (stored > 0) return stored;

  const close = Number(trade.closePrice) || 0;
  const lots = Number(trade.lots) || 0;
  const pnl = Number(trade.pnl) || 0;
  if (!(close > 0) || !(lots > 0)) return 0;

  const symbol = String(trade.symbol || '').toUpperCase();
  if (!symbol.includes('XAU')) return 0;

  const move = pnl / (lots * XAU_CONTRACT_SIZE);
  const isSell = String(trade.type || '').toUpperCase().includes('SELL');
  const open = isSell ? close + move : close - move;
  return open > 0 ? Number(open.toFixed(3)) : 0;
}

export function tradePnlPercent(trade: {
  openPrice?: number;
  closePrice?: number;
  pnl?: number;
  lots?: number;
  type?: string;
  symbol?: string;
  pnlPercentage?: number;
}): number {
  const stored = Number(trade.pnlPercentage);
  if (Number.isFinite(stored) && stored !== 0) return stored;

  const open = inferOpenPrice(trade);
  const close = Number(trade.closePrice) || 0;
  if (!(open > 0) || !(close > 0)) return 0;

  const isSell = String(trade.type || '').toUpperCase().includes('SELL');
  const pct = isSell ? ((open - close) / open) * 100 : ((close - open) / open) * 100;
  return Number(pct.toFixed(2));
}

export function formatTradePrice(price: number): string {
  if (!(price > 0)) return '—';
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}
