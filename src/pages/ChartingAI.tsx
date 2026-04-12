import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  SeriesMarker,
} from 'lightweight-charts';
import { TopBar } from '../lib/TopBar';
import { useTrades, Trade } from '../hooks/useTrades';
import { useAccountContext } from '../contexts/AccountContext';
import { Play, Pause, SkipForward, Target, RefreshCw } from 'lucide-react';
import { getTradeDate } from '../lib/timeUtils';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

// ─── Synthetic OHLCV Generator ────────────────────────────────────────────────
function generateMockCandles(
  basePrice: number,
  isLong: boolean,
  entryDate: Date,
  candlesBefore = 60,
  candlesAfter = 40
): CandlestickData[] {
  const data: CandlestickData[] = [];
  const startMs = entryDate.getTime() - candlesBefore * 15 * 60 * 1000;
  const vol = basePrice * 0.0015;
  let price = isLong ? basePrice * 0.99 : basePrice * 1.01;

  for (let i = 0; i < candlesBefore + candlesAfter; i++) {
    const time = Math.floor((startMs + i * 15 * 60 * 1000) / 1000) as Time;

    if (i < candlesBefore) {
      price += (basePrice - price) / (candlesBefore - i + 1) + (Math.random() - 0.5) * vol;
    } else {
      const trend = isLong ? 0.3 : -0.3;
      price += trend * vol + (Math.random() - 0.5) * vol * 1.5;
    }

    const o = price;
    const spread = Math.random() * vol * 2;
    const h = o + spread * (0.4 + Math.random() * 0.6);
    const l = o - spread * (0.4 + Math.random() * 0.6);
    const c = l + (h - l) * Math.random();

    data.push({
      time,
      open: +o.toFixed(5),
      high: +Math.max(o, h, c).toFixed(5),
      low: +Math.min(o, l, c).toFixed(5),
      close: +c.toFixed(5),
    });
    price = c;
  }
  return data;
}

const ENTRY_IDX = 60;

// ─── Component ────────────────────────────────────────────────────────────────
export function ChartingAI() {
  const { trades, loading } = useTrades();
  const { selectedAccountId } = useAccountContext();

  const accountTrades = selectedAccountId
    ? trades.filter(t => t.accountId === selectedAccountId)
    : trades;

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  // Chart DOM ref — this div MUST have real pixel size when chart is created
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [currentIndex, setCurrentIndex] = useState(ENTRY_IDX);
  const [fullData, setFullData] = useState<CandlestickData[]>([]);

  // Auto-select first trade when list loads
  useEffect(() => {
    if (accountTrades.length > 0) {
      setSelectedTrade(prev => prev ?? accountTrades[0]);
    }
  }, [accountTrades.length]);

  // ─── Create chart with useLayoutEffect so DOM is painted ──────────────────
  useLayoutEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    // Destroy previous instance if any
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    // At this point the el is in the DOM and has real pixels
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: 'solid', color: '#0A0A12' },
        textColor: '#6B7280',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.15)', style: 3, width: 1 },
        horzLine: { color: 'rgba(255,255,255,0.15)', style: 3, width: 1 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#1ED760',
      downColor: '#E5534B',
      borderVisible: false,
      wickUpColor: '#1ED760',
      wickDownColor: '#E5534B',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Keep chart sized to container on resize
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.resize(width, height);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []); // only once on mount

  // ─── Generate candles when trade changes ──────────────────────────────────
  useEffect(() => {
    if (!selectedTrade) return;

    setIsPlaying(false);

    let dateObj = new Date();
    try {
      dateObj = getTradeDate(
        selectedTrade.date || selectedTrade.createdAt || new Date().toISOString()
      );
    } catch { /* ignore */ }

    const isLong = selectedTrade.action?.toUpperCase() === 'BUY';
    const entryPrice = parseFloat(selectedTrade.entry) || 1.1;
    const generated = generateMockCandles(entryPrice, isLong, dateObj);

    setFullData(generated);
    setCurrentIndex(ENTRY_IDX);
  }, [selectedTrade]);

  // ─── Draw candles up to currentIndex ──────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || fullData.length === 0) return;

    const visibleSlice = fullData.slice(0, currentIndex + 1);
    series.setData(visibleSlice);

    // Entry / Exit markers
    const markers: SeriesMarker<Time>[] = [];

    if (currentIndex >= ENTRY_IDX && selectedTrade) {
      const isLong = selectedTrade.action?.toUpperCase() === 'BUY';
      markers.push({
        time: fullData[ENTRY_IDX].time,
        position: isLong ? 'belowBar' : 'aboveBar',
        color: isLong ? '#1ED760' : '#E5534B',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: `▶ ENTRY  ${selectedTrade.entry}`,
      });
    }

    if (currentIndex >= fullData.length - 1 && selectedTrade) {
      markers.push({
        time: fullData[fullData.length - 1].time,
        position: 'aboveBar',
        color: '#3B82F6',
        shape: 'circle',
        text: `■ EXIT  ${selectedTrade.exit || '—'}`,
      });
    }

    series.setMarkers(markers);

    // Scroll to latest candle
    chart.timeScale().scrollToRealTime();
  }, [currentIndex, fullData, selectedTrade]);

  // ─── Playback interval ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= fullData.length - 1) {
      setIsPlaying(false);
      return;
    }
    const id = setInterval(() => setCurrentIndex(p => p + 1), speed);
    return () => clearInterval(id);
  }, [isPlaying, currentIndex, fullData.length, speed]);

  const togglePlay = () => {
    if (currentIndex >= fullData.length - 1) setCurrentIndex(ENTRY_IDX);
    setIsPlaying(p => !p);
  };
  const stepForward = () => {
    if (currentIndex < fullData.length - 1) setCurrentIndex(p => p + 1);
  };
  const reset = () => {
    setIsPlaying(false);
    setCurrentIndex(ENTRY_IDX);
  };

  const progress =
    fullData.length <= ENTRY_IDX
      ? 0
      : Math.round(
          ((Math.max(0, currentIndex - ENTRY_IDX)) /
            (fullData.length - 1 - ENTRY_IDX)) *
            100
        );

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col bg-[#0A0A12]" style={{ height: '100vh' }}>
        <TopBar title="Charting AI" subtitle="Candle-by-candle trade replay" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    // Outer wrapper fills the full viewport height minus whatever the sidebar offset is
    <div className="flex flex-col bg-[#0A0A12]" style={{ height: '100vh' }}>
      <TopBar title="Charting AI" subtitle="Candle-by-candle trade replay" showSearch={false} />

      {/* Body row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* ── Trade list ── */}
        <div
          style={{
            width: 272,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: '#0D0D18',
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-primary" />
              Trades ({accountTrades.length})
            </h3>
          </div>

          {accountTrades.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-8 text-center gap-3">
              <Target className="w-10 h-10 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-40">No trades for this account</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {accountTrades.map(trade => (
                <div
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className={cn(
                    'p-4 rounded-xl cursor-pointer transition-all border',
                    selectedTrade?.id === trade.id
                      ? 'bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                      : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                  )}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-white text-sm">{trade.symbol}</span>
                    <span className={cn('text-sm font-bold tnum', trade.pnl >= 0 ? 'text-[#1ED760]' : 'text-[#E5534B]')}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-gray-500">
                    <span className={trade.action === 'BUY' ? 'text-[#1ED760]' : 'text-[#E5534B]'}>
                      {trade.action === 'BUY' ? 'LONG' : 'SHORT'}
                    </span>
                    <span>•</span>
                    <span>{trade.strategy || trade.tag || 'SCALP'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Chart Column ── */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>

          {/* Chart div — must have REAL pixel width & height */}
          <div
            ref={chartContainerRef}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Empty state */}
          {!selectedTrade && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 text-gray-600 z-10 bg-[#0A0A12]">
              <Target className="w-14 h-14 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-40">Select a trade to replay</p>
            </div>
          )}

          {/* ── Floating toolbar ── */}
          {selectedTrade && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5 px-6 py-3 rounded-full border border-white/10 shadow-2xl"
              style={{ background: 'rgba(10,10,18,0.92)', backdropFilter: 'blur(24px)' }}
            >
              {/* Speed picker */}
              <div className="flex items-center gap-2 pr-5 border-r border-white/10">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Speed</span>
                <select
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value={1600}>0.5×</option>
                  <option value={800}>1×</option>
                  <option value={400}>2×</option>
                  <option value={150}>5×</option>
                </select>
              </div>

              {/* Reset */}
              <button
                onClick={reset}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-gray-300" />
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="rounded-full bg-primary hover:bg-blue-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ width: 52, height: 52, boxShadow: '0 0 24px rgba(59,130,246,0.45)' }}
              >
                {isPlaying
                  ? <Pause className="w-5 h-5 text-white" />
                  : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>

              {/* Step */}
              <button
                onClick={stepForward}
                disabled={isPlaying || currentIndex >= fullData.length - 1}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <SkipForward className="w-4 h-4 text-gray-300" />
              </button>

              {/* Progress */}
              <div className="pl-5 border-l border-white/10 flex flex-col items-center min-w-[48px]">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Progress</span>
                <span className="text-sm font-black text-primary tnum">{progress}%</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
