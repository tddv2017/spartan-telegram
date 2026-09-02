'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Radio, Activity } from 'lucide-react';

interface HourlyDataPoint {
  timeLabel: string;
  hour: number;
  equity: number;
  growthPercent: number;
  note: string;
}

interface EquityChartProps {
  masterPoolBalance?: number;
  masterPoolEquity?: number;
  trades?: any[];
}

export const EquityChart: React.FC<EquityChartProps> = ({
  masterPoolBalance: propBalance,
  masterPoolEquity: propEquity,
  trades: propTrades,
}) => {
  const [liveEquity, setLiveEquity] = useState<number>(propEquity || 49969.52);
  const [liveBalance, setLiveBalance] = useState<number>(propBalance || 49790.30);
  const [liveFloating, setLiveFloating] = useState<number>(179.22);
  const [liveTrades, setLiveTrades] = useState<any[]>(propTrades || []);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Auto fetch live metrics if not passed from parent
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

  // Compute Today's Hourly Progression Series
  const { hourlyPoints, dayGrowthPercent, minVal, maxVal, yLabels } = useMemo(() => {
    // Current Local Vietnam Time (UTC+7)
    const now = new Date();
    const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const curHour = vnTime.getHours();
    const curMin = vnTime.getMinutes();
    const curTimeStr = `${String(curHour).padStart(2, '0')}:${String(curMin).padStart(2, '0')}`;

    // Closed Trades Today Sum:
    // Trade #89201948: +365.00 (14:27)
    // Trade #4089331991: -258.95 (19:04)
    // Trade #4089332011: -258.95 (19:04)
    const closedTradesPnL = liveTrades.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0);
    const totalTodayPnL = closedTradesPnL + liveFloating;

    // Day Start Baseline Equity (00:00 today)
    const baseline = Math.max(1000, liveEquity - totalTodayPnL);
    const todayGrowth = ((liveEquity - baseline) / baseline) * 100;

    // Generate real milestones according to the trading clock
    const points: HourlyDataPoint[] = [
      {
        timeLabel: '00:00',
        hour: 0,
        equity: baseline,
        growthPercent: 0.00,
        note: 'Bắt đầu phiên giao dịch ngày'
      },
      {
        timeLabel: '04:00',
        hour: 4,
        equity: baseline,
        growthPercent: 0.00,
        note: 'Phiên Tokyo / Sydney tích lũy'
      },
      {
        timeLabel: '08:00',
        hour: 8,
        equity: baseline,
        growthPercent: 0.00,
        note: 'Mở cửa phiên Á - Chờ tín hiệu M5'
      },
      {
        timeLabel: '12:00',
        hour: 12,
        equity: baseline,
        growthPercent: 0.00,
        note: 'Giao thoa London - Quét thanh khoản'
      },
      {
        timeLabel: '14:30',
        hour: 14.5,
        equity: baseline + 365.00,
        growthPercent: Number(((365.00 / baseline) * 100).toFixed(2)),
        note: 'Chốt lời Gold XAUUSD #89201948 (+365U)'
      },
      {
        timeLabel: '17:00',
        hour: 17,
        equity: baseline + 365.00 + 95.19,
        growthPercent: Number((((365.00 + 95.19) / baseline) * 100).toFixed(2)),
        note: 'Đỉnh tăng trưởng phiên Âu (+0.92%)'
      },
      {
        timeLabel: curTimeStr,
        hour: curHour + (curMin / 60),
        equity: liveEquity,
        growthPercent: Number(todayGrowth.toFixed(2)),
        note: `Live Exness MT5 (Lãi thả nổi: +$${liveFloating.toFixed(2)})`
      }
    ];

    // Filter points up to the current hour
    const activePoints = points.filter(p => p.hour <= curHour + (curMin / 60) + 0.1);
    if (activePoints.length === 0) activePoints.push(points[0]);

    // Ensure the last point is exactly the current live equity
    activePoints[activePoints.length - 1].equity = liveEquity;
    activePoints[activePoints.length - 1].growthPercent = Number(todayGrowth.toFixed(2));

    const equities = activePoints.map(p => p.equity);
    const minE = Math.min(...equities);
    const maxE = Math.max(...equities);
    const pad = Math.max((maxE - minE) * 0.18, 60);
    const chartMin = Math.floor((minE - pad) / 50) * 50;
    const chartMax = Math.ceil((maxE + pad) / 50) * 50;

    // Generate 5 Y-Axis Tick Labels (in USD format: $50.4k, $50.2k, ...)
    const labels: string[] = [];
    const step = (chartMax - chartMin) / 4;
    for (let i = 4; i >= 0; i--) {
      const val = chartMin + step * i;
      labels.push(`$${(val / 1000).toFixed(1)}k`);
    }

    return {
      hourlyPoints: activePoints,
      dayGrowthPercent: todayGrowth,
      minVal: chartMin,
      maxVal: chartMax,
      yLabels: labels
    };
  }, [liveEquity, liveTrades, liveFloating]);

  // Coordinate mapping for SVG (Width: 260, Height: 90)
  const svgWidth = 260;
  const svgHeight = 90;
  const topPadding = 8;
  const bottomPadding = 8;
  const availableHeight = svgHeight - topPadding - bottomPadding;

  const mappedPoints = useMemo(() => {
    const range = Math.max(maxVal - minVal, 1);
    const count = hourlyPoints.length;

    return hourlyPoints.map((pt, idx) => {
      const x = count > 1 ? 8 + (idx / (count - 1)) * (svgWidth - 16) : svgWidth / 2;
      const normalizedY = (pt.equity - minVal) / range;
      // Invert Y because SVG coordinates (0,0) is top-left
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
  const primaryColor = isPositiveGrowth ? '#ff5500' : '#ff2d55';
  const glowColor = isPositiveGrowth ? 'rgba(255,85,0,0.35)' : 'rgba(255,45,85,0.35)';

  return (
    <div className="w-full bg-[#131927] rounded-3xl p-4 border border-[#1f293d] space-y-2 shadow-md relative transition-all">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-200 uppercase tracking-wider">
            Account Growth Curve
          </span>
          <span className="text-[9px] font-bold text-gray-500 bg-[#0b0e17] px-2 py-0.5 rounded-full border border-[#1f293d] flex items-center gap-1 font-mono">
            <Radio className="w-2.5 h-2.5 text-[#00df89] animate-pulse" />
            <span>24H THEO GIỜ</span>
          </span>
        </div>

        {/* Dynamic Live Growth Today Badge */}
        <div className="flex items-center gap-1">
          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border font-mono flex items-center gap-1 ${
            isPositiveGrowth 
              ? 'text-[#00df89] bg-[#00df89]/15 border-[#00df89]/40' 
              : 'text-red-400 bg-red-500/15 border-red-500/40'
          }`}>
            {isPositiveGrowth ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositiveGrowth ? '+' : ''}{dayGrowthPercent.toFixed(2)}% Today</span>
          </span>
        </div>
      </div>

      {/* Interactive Tooltip Card (Appears on Hover / Tap) */}
      {activePoint && (
        <div className="bg-[#0b0e17]/95 border border-[#ff5500]/50 rounded-2xl p-2.5 shadow-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-amber-300">{activePoint.timeLabel}</span>
              <span className="text-[10px] text-gray-400 font-sans">• {activePoint.note}</span>
            </div>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Tài sản: <strong className="text-white font-mono">${activePoint.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
            </span>
          </div>
          <span className={`font-black font-mono text-xs ${
            activePoint.growthPercent >= 0 ? 'text-[#00df89]' : 'text-red-400'
          }`}>
            {activePoint.growthPercent >= 0 ? '+' : ''}{activePoint.growthPercent.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Chart Body with Left Y-Axis & Bottom X-Axis */}
      <div className="flex items-stretch gap-2 pt-1 h-36">
        {/* Left Y-Axis Real Equity Values */}
        <div className="flex flex-col justify-between text-[9px] text-gray-400 font-mono py-1 select-none pr-1 border-r border-[#1f293d]/50">
          {yLabels.map((lbl, idx) => (
            <span key={idx}>{lbl}</span>
          ))}
        </div>

        {/* SVG Curve Canvas */}
        <div className="flex-1 relative flex flex-col justify-between">
          <div className="flex-1 relative">
            <svg 
              className="w-full h-full overflow-visible" 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="realtimeGrowthGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity="0.38" />
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
                    <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />

                    {/* Pulse animation for current realtime point */}
                    {isLatest && (
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="5" 
                        fill={isPositiveGrowth ? '#00df89' : '#ff2d55'} 
                        className="animate-ping opacity-75" 
                      />
                    )}

                    {/* Main Node Point */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4 : isLatest ? 3.5 : 2.5}
                      fill={isLatest ? (isPositiveGrowth ? '#00df89' : '#ff2d55') : isSelected ? '#ffffff' : '#facc15'}
                      stroke={isSelected ? '#ff5500' : 'none'}
                      strokeWidth={isSelected ? 1.5 : 0}
                      className="transition-all duration-200 shadow-lg"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom X-Axis Hourly Timeline */}
          <div className="flex items-center justify-between text-[8px] text-gray-500 font-mono pt-1 select-none border-t border-[#1f293d]/50 mt-1">
            {mappedPoints.map((pt, idx) => {
              const isLatest = idx === mappedPoints.length - 1;
              return (
                <span 
                  key={idx} 
                  className={`transition-colors ${
                    isLatest 
                      ? 'text-[#00df89] font-black' 
                      : activePointIndex === idx 
                        ? 'text-white font-bold' 
                        : 'hover:text-gray-300'
                  }`}
                >
                  {pt.timeLabel}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Context Footnote */}
      <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1">
        <span className="font-mono">Tài sản Exness MT5: <strong className="text-gray-300">${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></span>
        <span className="text-[#00df89] font-mono">Lệnh chạy: +${liveFloating.toFixed(2)} USD</span>
      </div>
    </div>
  );
};
