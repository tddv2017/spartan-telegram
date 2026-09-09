'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Radio, User, Layers } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseTimestampMs } from '@/lib/dateUtils';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type ChartRange = '1D' | '7D' | '1M';
const RANGE_DAYS: Record<ChartRange, number> = { '1D': 1, '7D': 7, '1M': 30 };

interface HourlyDataPoint {
  timeLabel: string;
  hour: number;
  equity: number;
  growthPercent: number;
  note: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function vnParts(ms: number) {
  const shifted = new Date(ms + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function vnDayStartMs(ms: number): number {
  const parts = vnParts(ms);
  return Date.UTC(parts.year, parts.month, parts.date) - VN_OFFSET_MS;
}

function formatVnDay(ms: number): string {
  const parts = vnParts(ms);
  return `${pad2(parts.date)}/${pad2(parts.month + 1)}`;
}

function growthPct(equity: number, baseline: number): number {
  if (!(baseline > 0)) return 0;
  return Number((((equity - baseline) / baseline) * 100).toFixed(2));
}

interface EquityChartProps {
  userTradingBalance?: number;
  userCapitalJoinedAt?: string | null;
  masterPoolBalance?: number;
  masterPoolEquity?: number;
  trades?: any[];
}

export const EquityChart: React.FC<EquityChartProps> = ({
  userTradingBalance = 0,
  userCapitalJoinedAt,
  masterPoolBalance: propBalance,
  masterPoolEquity: propEquity,
  trades: propTrades,
}) => {
  const { t } = useLanguage();
  const [liveEquity, setLiveEquity] = useState<number>(propEquity || 49969.52);
  const [liveBalance, setLiveBalance] = useState<number>(propBalance || 49790.30);
  const [liveFloating, setLiveFloating] = useState<number>(179.22);
  const [liveTrades, setLiveTrades] = useState<any[]>(propTrades || []);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<ChartRange>('1D');
  const [nowMs, setNowMs] = useState<number | null>(null);

  const hasUserCapital = typeof userTradingBalance === 'number' && userTradingBalance > 0;
  // Default to PERSONAL view if client has invested capital, otherwise MASTER_POOL
  const [viewMode, setViewMode] = useState<'PERSONAL' | 'MASTER_POOL'>(hasUserCapital ? 'PERSONAL' : 'MASTER_POOL');

  // Auto update viewMode when client balance loads
  useEffect(() => {
    if (userTradingBalance > 0) {
      setViewMode('PERSONAL');
    }
  }, [userTradingBalance]);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setActivePointIndex(null);
  }, [timeRange, viewMode]);

  // Auto fetch live metrics from Exness MT5 / Firebase RTDB
  useEffect(() => {
    let isMounted = true;
    const fetchLiveData = async () => {
      try {
        const [poolRes, tradesRes] = await Promise.all([
          fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/master_pool.json"),
          fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/trades.json")
        ]);

        if (poolRes.ok) {
          const pool = await poolRes.json();
          if (pool && isMounted) {
            if (typeof pool.equity === 'number') setLiveEquity(pool.equity);
            if (typeof pool.balance === 'number') setLiveBalance(pool.balance);
            if (typeof pool.floatingProfit === 'number') setLiveFloating(pool.floatingProfit);
          }
        }

        if (tradesRes.ok) {
          const t = await tradesRes.json();
          if (t && typeof t === 'object' && isMounted) {
            setLiveTrades(Object.values(t));
          }
        }
      } catch (err) {}
    };

    fetchLiveData();
    const timer = setInterval(fetchLiveData, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Synchronize with incoming props if they change
  useEffect(() => {
    if (typeof propEquity === 'number' && propEquity > 0) setLiveEquity(propEquity);
    if (typeof propBalance === 'number' && propBalance > 0) setLiveBalance(propBalance);
    if (propTrades && Array.isArray(propTrades)) setLiveTrades(propTrades);
  }, [propEquity, propBalance, propTrades]);

  // Capital Share Ratio (%) for this customer
  const effectiveMasterPool = Math.max(liveBalance, 50000);
  const userShareRatio = hasUserCapital ? (userTradingBalance / effectiveMasterPool) : 1;
  const userSharePercent = userShareRatio * 100;

  // Reconstruct the growth curve from live trades for 1D / 7D / 1M
  const { hourlyPoints, dayGrowthPercent, minVal, maxVal, yLabels, displayEquity } = useMemo(() => {
    const fallbackEquity =
      viewMode === 'PERSONAL' && hasUserCapital ? userTradingBalance : liveEquity;
    const emptyChart = {
      hourlyPoints: [{
        timeLabel: '--:--',
        hour: 0,
        equity: fallbackEquity,
        growthPercent: 0,
        note: '',
      }] as HourlyDataPoint[],
      dayGrowthPercent: 0,
      minVal: Math.floor((fallbackEquity - 80) / 10) * 10,
      maxVal: Math.ceil((fallbackEquity + 80) / 10) * 10,
      yLabels: ['', '', '', '', ''],
      displayEquity: fallbackEquity,
    };

    if (nowMs == null) return emptyChart;

    const clockMs = nowMs;
    const todayStart = vnDayStartMs(clockMs);
    const rangeDays = RANGE_DAYS[timeRange];
    const rangeStart = todayStart - (rangeDays - 1) * DAY_MS;
    const nowParts = vnParts(clockMs);
    const curTimeStr = `${pad2(nowParts.hour)}:${pad2(nowParts.minute)}`;

    const isPersonal = viewMode === 'PERSONAL' && hasUserCapital;
    const share = isPersonal ? userShareRatio : 1;
    const joinTs = userCapitalJoinedAt ? parseTimestampMs(userCapitalJoinedAt) : Number.NaN;

    const parsedTrades = liveTrades
      .map((trade: any) => ({
        ts: parseTimestampMs(trade.timestamp),
        pnl: Number(trade.pnl) || 0,
      }))
      .filter((trade) => Number.isFinite(trade.ts))
      .sort((a, b) => a.ts - b.ts);

    const eligibleTrades =
      isPersonal && Number.isFinite(joinTs)
        ? parsedTrades.filter((trade) => trade.ts >= joinTs)
        : parsedTrades;

    const allEligiblePnl = eligibleTrades.reduce((sum, trade) => sum + trade.pnl * share, 0);
    const floatingShare = (Number(liveFloating) || 0) * share;
    const currentEquity = isPersonal
      ? userTradingBalance + allEligiblePnl + floatingShare
      : liveEquity;

    const pnlInRange = eligibleTrades
      .filter((trade) => trade.ts >= rangeStart && trade.ts <= clockMs)
      .reduce((sum, trade) => sum + trade.pnl * share, 0);
    const startEquity = currentEquity - pnlInRange - floatingShare;
    const baseline = startEquity > 0 ? startEquity : Math.max(currentEquity, 0);

    const liveNote = isPersonal
      ? `Live Portfolio (${userSharePercent.toFixed(1)}% Pool)`
      : `Live Exness MT5 (Lãi thả nổi: +$${liveFloating.toFixed(2)})`;

    let points: HourlyDataPoint[] = [];

    if (timeRange === '1D') {
      const hourPnl = new Array(24).fill(0);
      for (const trade of eligibleTrades) {
        if (trade.ts < todayStart || trade.ts > clockMs) continue;
        hourPnl[vnParts(trade.ts).hour] += trade.pnl * share;
      }

      const markers = new Set<number>([0, nowParts.hour]);
      for (let hour = 0; hour <= nowParts.hour; hour += 1) {
        if (hourPnl[hour] !== 0) markers.add(hour);
      }
      for (const hour of [4, 8, 12, 16, 20]) {
        if (hour <= nowParts.hour) markers.add(hour);
      }

      const hours = [...markers].sort((a, b) => a - b);
      for (const hour of hours) {
        const isNow = hour === nowParts.hour;
        const closedBefore = hourPnl.slice(0, hour).reduce((sum, value) => sum + value, 0);
        const equity = isNow ? currentEquity : baseline + closedBefore;
        points.push({
          timeLabel: isNow ? curTimeStr : `${pad2(hour)}:00`,
          hour,
          equity,
          growthPercent: growthPct(equity, baseline),
          note: isNow
            ? liveNote
            : hour === 0
              ? (isPersonal ? 'Mở đầu ngày - Vốn bảo toàn' : 'Bắt đầu phiên giao dịch ngày')
              : `Phiên ${pad2(hour)}:00`,
        });
      }
    } else {
      for (let dayIndex = 0; dayIndex < rangeDays; dayIndex += 1) {
        const dayStart = rangeStart + dayIndex * DAY_MS;
        const dayEnd = dayStart + DAY_MS;
        const isLast = dayIndex === rangeDays - 1;
        const pnlThroughDay = eligibleTrades
          .filter((trade) => trade.ts >= rangeStart && trade.ts < dayEnd)
          .reduce((sum, trade) => sum + trade.pnl * share, 0);
        const equity = isLast ? currentEquity : baseline + pnlThroughDay;
        points.push({
          timeLabel: formatVnDay(dayStart),
          hour: dayIndex,
          equity,
          growthPercent: growthPct(equity, baseline),
          note: isLast ? liveNote : `Khóa phiên ${formatVnDay(dayStart)}`,
        });
      }
    }

    if (points.length === 0) {
      points = [{
        timeLabel: curTimeStr,
        hour: nowParts.hour,
        equity: currentEquity,
        growthPercent: 0,
        note: liveNote,
      }];
    }

    const latestPoint = points[points.length - 1];
    const currentDisplayEquity = latestPoint.equity;
    const currentRangeGrowth = latestPoint.growthPercent;

    const equities = points.map((point) => point.equity);
    const minE = Math.min(...equities);
    const maxE = Math.max(...equities);
    const span = maxE - minE;
    const pad = Math.max(span * 0.25, Math.max(currentDisplayEquity * 0.004, 30));
    const chartMin = Math.floor((minE - pad) / 10) * 10;
    const chartMax = Math.ceil((maxE + pad) / 10) * 10;

    const labels: string[] = [];
    const step = (chartMax - chartMin) / 4;
    for (let i = 4; i >= 0; i -= 1) {
      const val = chartMin + step * i;
      if (val >= 1000) {
        labels.push(`$${(val / 1000).toFixed(1)}k`);
      } else {
        labels.push(`$${val.toFixed(0)}`);
      }
    }

    return {
      hourlyPoints: points,
      dayGrowthPercent: currentRangeGrowth,
      minVal: chartMin,
      maxVal: chartMax,
      yLabels: labels,
      displayEquity: currentDisplayEquity,
    };
  }, [liveEquity, liveTrades, liveFloating, viewMode, hasUserCapital, userTradingBalance, userShareRatio, userSharePercent, userCapitalJoinedAt, timeRange, nowMs]);

  // Coordinate mapping for SVG (Width: 260, Height: 90)
  const svgWidth = 260;
  const svgHeight = 90;
  const topPadding = 12;
  const bottomPadding = 12;
  const paddingX = 14; // Safe horizontal padding from container edges
  const availableHeight = svgHeight - topPadding - bottomPadding;

  const mappedPoints = useMemo(() => {
    const range = Math.max(maxVal - minVal, 1);
    const count = hourlyPoints.length;

    return hourlyPoints.map((pt, idx) => {
      const x = count > 1 ? paddingX + (idx / (count - 1)) * (svgWidth - (paddingX * 2)) : svgWidth / 2;
      const normalizedY = (pt.equity - minVal) / range;
      // Invert Y because SVG (0,0) is top-left
      const y = topPadding + (1 - normalizedY) * availableHeight;
      return { ...pt, x, y };
    });
  }, [hourlyPoints, minVal, maxVal, availableHeight]);

  // Create smooth Bezier curve path
  const curvePath = useMemo(() => {
    if (mappedPoints.length < 2) return `M 10 ${svgHeight / 2} L ${svgWidth - 10} ${svgHeight / 2}`;

    let path = `M ${mappedPoints[0].x.toFixed(1)} ${mappedPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < mappedPoints.length - 1; i++) {
      const p0 = mappedPoints[i === 0 ? i : i - 1];
      const p1 = mappedPoints[i];
      const p2 = mappedPoints[i + 1];
      const p3 = mappedPoints[i + 2 < mappedPoints.length ? i + 2 : i + 1];

      // Catmull-Rom to Cubic Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }, [mappedPoints]);

  // Area Fill path
  const areaPath = useMemo(() => {
    if (mappedPoints.length < 2) return '';
    const firstX = mappedPoints[0].x;
    const lastX = mappedPoints[mappedPoints.length - 1].x;
    return `${curvePath} L ${lastX} ${svgHeight} L ${firstX} ${svgHeight} Z`;
  }, [curvePath, mappedPoints]);

  const activePoint = activePointIndex !== null ? mappedPoints[activePointIndex] : null;
  const isPositiveGrowth = dayGrowthPercent >= 0;
  const primaryColor = isPositiveGrowth ? '#f6e27a' : '#ff2d55';

  return (
    <div className="w-full bg-[#080b12] rounded-3xl p-4 border border-[#221c10] space-y-2.5 shadow-md relative transition-all overflow-hidden">
      {/* Chart Header with Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#f5d77f] uppercase tracking-wider">
            {t('chart_account_growth')}
          </span>
          <span className="text-[9px] font-bold text-gray-400 bg-[#05070c] px-2 py-0.5 rounded-full border border-[#221c10] flex items-center gap-1 font-mono">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span>
              {timeRange === '1D' ? t('chart_hourly') : timeRange === '7D' ? t('chart_7d_badge') : t('chart_1m_badge')}
            </span>
          </span>
        </div>

        {/* View Mode Toggle: Khách hàng (x % vốn) vs Master Pool */}
        <div className="flex items-center gap-1.5">
          {hasUserCapital && (
            <div className="flex items-center bg-[#05070c] p-0.5 rounded-xl border border-[#221c10] text-[9px] font-bold">
              <button
                onClick={() => setViewMode('PERSONAL')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'PERSONAL'
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#f6e27a] text-black font-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Xem theo tỷ lệ vốn góp của bạn"
              >
                <User className="w-2.5 h-2.5" />
                <span>{t('chart_my_share')} ({userSharePercent.toFixed(1)}%)</span>
              </button>
              <button
                onClick={() => setViewMode('MASTER_POOL')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'MASTER_POOL'
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#f6e27a] text-black font-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Xem biểu đồ tổng Master Pool Exness"
              >
                <Layers className="w-2.5 h-2.5" />
                <span>{t('chart_pool_share')}</span>
              </button>
            </div>
          )}

          {/* Time range: 1D / 7D / 1M */}
          <div className="flex items-center bg-[#05070c] p-0.5 rounded-xl border border-[#221c10] text-[9px] font-black">
            {([
              { id: '1D' as const, label: t('chart_range_1d') },
              { id: '7D' as const, label: t('chart_range_7d') },
              { id: '1M' as const, label: t('chart_range_1m') },
            ]).map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setTimeRange(range.id)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  timeRange === range.id
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#f6e27a] text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Dynamic Live Growth Badge */}
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border font-mono flex items-center gap-1 ${
            isPositiveGrowth 
              ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
              : 'text-red-400 bg-red-500/15 border-red-500/40'
          }`}>
            {isPositiveGrowth ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositiveGrowth ? '+' : ''}{dayGrowthPercent.toFixed(2)}% {timeRange === '1D' ? t('chart_today') : timeRange === '7D' ? t('chart_7d') : t('chart_1m')}</span>
          </span>
        </div>
      </div>

      {/* Fixed-Height Info & Tooltip Bar (Zero Layout Shift!) */}
      <div className="h-7 flex items-center justify-between px-2.5 rounded-xl bg-[#05070c] border border-[#221c10] text-[10px] select-none transition-colors">
        {activePoint ? (
          <>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-mono font-black text-amber-300 shrink-0">{activePoint.timeLabel}</span>
              <span className="text-gray-400 truncate">• {activePoint.note}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono font-bold">
              <span className="text-white font-black">${activePoint.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={activePoint.growthPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {activePoint.growthPercent >= 0 ? '+' : ''}{activePoint.growthPercent.toFixed(2)}%
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-gray-500 font-medium flex items-center gap-1">
              <span>{viewMode === 'PERSONAL' ? t('chart_share_ratio_hint') : t('chart_pool_ratio_hint')} • {t('chart_touch_hint')}</span>
            </span>
            <span className="text-gray-400 font-mono">
              {viewMode === 'PERSONAL' ? t('chart_your_equity') : t('chart_live_equity')} <strong className="text-white">${displayEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
            </span>
          </>
        )}
      </div>

      {/* Chart Body with Left Y-Axis & Bottom X-Axis */}
      <div className="flex items-stretch gap-2 pt-1 h-36">
        {/* Left Y-Axis Real Equity Values */}
        <div className="flex flex-col justify-between text-[9px] text-gray-400 font-mono py-1 select-none pr-1 border-r border-[#1f293d]/50 min-w-[42px] text-right">
          {yLabels.map((lbl, idx) => (
            <span key={idx}>{lbl}</span>
          ))}
        </div>

        {/* SVG Curve Canvas */}
        <div className="flex-1 relative flex flex-col justify-between overflow-visible">
          <div className="flex-1 relative">
            <svg 
              className="w-full h-full" 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="realtimeGrowthGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Gradient Fill */}
              {areaPath && (
                <path d={areaPath} fill="url(#realtimeGrowthGlow)" />
              )}

              {/* Real Hourly Smooth Spline Curve */}
              <path
                d={curvePath}
                fill="none"
                stroke={primaryColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hourly Data Points */}
              {mappedPoints.map((pt, idx) => {
                const isLatest = idx === mappedPoints.length - 1;
                const isSelected = activePointIndex === idx;

                return (
                  <g 
                    key={idx} 
                    className="cursor-pointer"
                    onClick={() => setActivePointIndex(idx === activePointIndex ? null : idx)}
                    onMouseEnter={() => setActivePointIndex(idx)}
                    onMouseLeave={() => setActivePointIndex(null)}
                  >
                    {/* Invisible Larger Hit Area for easy touch on mobile */}
                    <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />

                    {/* Pure SVG Animated Ripple Ring for current realtime point (Zero Drift, perfectly centered) */}
                    {isLatest && (
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="3.5" 
                        fill="none" 
                        stroke={isPositiveGrowth ? '#00df89' : '#ff2d55'} 
                        strokeWidth="1.5"
                      >
                        <animate 
                          attributeName="r" 
                          values="3.5;8;3.5" 
                          dur="2s" 
                          repeatCount="indefinite" 
                        />
                        <animate 
                          attributeName="opacity" 
                          values="0.9;0.1;0.9" 
                          dur="2s" 
                          repeatCount="indefinite" 
                        />
                      </circle>
                    )}

                    {/* Main Point Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4 : isLatest ? 3.5 : 2.5}
                      fill={isLatest ? (isPositiveGrowth ? '#00df89' : '#ff2d55') : isSelected ? '#ffffff' : '#facc15'}
                      stroke={isSelected ? '#ff5500' : 'none'}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom X-Axis Timeline */}
          <div className="relative h-4 border-t border-[#1f293d]/50 mt-1 select-none">
            {mappedPoints.map((pt, idx) => {
              const count = mappedPoints.length;
              const step = Math.max(1, Math.ceil((count - 1) / 6));
              const showLabel = count <= 8 || idx === 0 || idx === count - 1 || idx % step === 0;
              if (!showLabel) return null;
              const isLatest = idx === count - 1;
              const left = (pt.x / svgWidth) * 100;
              return (
                <span
                  key={idx}
                  className={`absolute top-1 -translate-x-1/2 text-[8px] font-mono whitespace-nowrap ${
                    isLatest
                      ? 'text-[#00df89] font-black'
                      : activePointIndex === idx
                        ? 'text-white font-bold'
                        : 'text-gray-500'
                  }`}
                  style={{ left: `${left}%` }}
                >
                  {pt.timeLabel}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Context Footnote */}
      <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
        {viewMode === 'PERSONAL' && hasUserCapital ? (
          <>
            <span className="font-mono">Vốn đầu tư của bạn: <strong className="text-white">${userTradingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</strong></span>
            <span className="text-cyan-300 font-mono font-bold">Cổ phần: {userSharePercent.toFixed(2)}% Master Pool</span>
          </>
        ) : (
          <>
            <span className="font-mono">Tài sản Exness MT5: <strong className="text-gray-300">${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></span>
            <span className="text-[#00df89] font-mono">Lệnh chạy: +${liveFloating.toFixed(2)} USD</span>
          </>
        )}
      </div>
    </div>
  );
};
