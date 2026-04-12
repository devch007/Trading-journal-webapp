import React, { useState, useEffect, useRef } from 'react';
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

// ─── Synthetic OHLCV Generator ───────────────────────────────────────────────
function generateMockCandles(
  basePrice: number,
  isLong: boolean,
  entryDate: Date,
  candlesBefore = 50,
  candlesAfter = 30
): CandlestickData[] {
  const data: CandlestickData[] = [];
  const startMs = entryDate.getTime() - candlesBefore * 15 * 60 * 1000;
  const vol = basePrice * 0.001;
  let price = isLong ? basePrice * 0.993 : basePrice * 1.007;

  for (let i = 0; i < candlesBefore + candlesAfter; i++) {
    const time = Math.floor((startMs + i * 15 * 60 * 1000) / 1000) as Time;

    if (i < candlesBefore) {
      price += (basePrice - price) / (candlesBefore - i + 1) + (Math.random() - 0.5) * vol;
    } else {
      price += (isLong ? 1 : -1) * Math.random() * vol * 0.5 + (Math.random() - 0.5) * vol;
    }

    const o = price;
    const rng = Math.random() * vol * 2;
    const h = o + rng * 0.7;
    const l = o - rng * 0.3;
    const c = l + (h - l) * Math.random();

    data.push({
      time,
      open: parseFloat(o.toFixed(5)),
      high: parseFloat(h.toFixed(5)),
      low: parseFloat(l.toFixed(5)),
      close: parseFloat(c.toFixed(5)),
    });
    price = c;
  }
  return data;
}

const ENTRY_IDX = 50;

export function ChartingAI() {
  const { trades, loading } = useTrades();
  const { selectedAccountId } = useAccountContext();

  const accountTrades = selectedAccountId
    ? trades.filter(t => t.accountId === selectedAccountId)
    : trades;

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const chartInitialized = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [currentIndex, setCurrentIndex] = useState(ENTRY_IDX);
  const [fullData, setFullData] = useState<CandlestickData[]>([]);

  // Auto-select first trade
  useEffect(() => {
    if (accountTrades.length > 0 && !selectedTrade) {
      setSelectedTrade(accountTrades[0]);
    } else if (accountTrades.length === 0) {
      setSelectedTrade(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountTrades.length]);

  // Init chart once container is ready
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || chartInitialized.current) return;
    chartInitialized.current = true;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: { background: { type: 'solid', color: '#0A0A12' }, textColor: '#6B7280' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.12)', style: 3 },
        horzLine: { color: 'rgba(255,255,255,0.12)', style: 3 },
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
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

    const ro = new ResizeObserver(() => {
      if (el) chart.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      chartInitialized.current = false;
    };
  }, []);

  // Generate data when trade changes
  useEffect(() => {
    if (!selectedTrade) return;
    setIsPlaying(false);

    let dateObj = new Date();
    try {
      dateObj = getTradeDate(selectedTrade.date || selectedTrade.createdAt || new Date().toISOString());
    } catch { /* ignore */ }

    const isLong = selectedTrade.action?.toUpperCase() === 'BUY';
    const entryPrice = parseFloat(selectedTrade.entry) || 1.1000;
    const generated = generateMockCandles(entryPrice, isLong, dateObj);
    setFullData(generated);
    setCurrentIndex(ENTRY_IDX);
  }, [selectedTrade]);

  // Update chart when index changes
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || fullData.length === 0) return;

    const slice = fullData.slice(0, currentIndex + 1);
    series.setData(slice);

    const markers: SeriesMarker<Time>[] = [];
    if (currentIndex >= ENTRY_IDX && selectedTrade) {
      const isLong = selectedTrade.action?.toUpperCase() === 'BUY';
      markers.push({
        time: fullData[ENTRY_IDX].time,
        position: isLong ? 'belowBar' : 'aboveBar',
        color: isLong ? '#1ED760' : '#E5534B',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: `ENTRY @ ${selectedTrade.entry}`,
      });
    }
    if (currentIndex >= fullData.length - 1 && selectedTrade) {
      markers.push({
        time: fullData[fullData.length - 1].time,
        position: 'aboveBar',
        color: '#3B82F6',
        shape: 'circle',
        text: `EXIT @ ${selectedTrade.exit || '—'}`,
      });
    }
    series.setMarkers(markers);
    chart.timeScale().scrollToRealTime();
  }, [currentIndex, fullData, selectedTrade]);

  // Playback interval
  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= fullData.length - 1) { setIsPlaying(false); return; }
    const id = setInterval(() => setCurrentIndex(p => p + 1), speed);
    return () => clearInterval(id);
  }, [isPlaying, currentIndex, fullData.length, speed]);

  const togglePlay = () => {
    if (currentIndex >= fullData.length - 1) setCurrentIndex(ENTRY_IDX);
    setIsPlaying(p => !p);
  };
  const stepForward = () => { if (currentIndex < fullData.length - 1) setCurrentIndex(p => p + 1); };
  const reset = () => { setIsPlaying(false); setCurrentIndex(ENTRY_IDX); };

  const progress = fullData.length <= ENTRY_IDX
    ? 0
    : Math.round(((currentIndex - ENTRY_IDX) / (fullData.length - 1 - ENTRY_IDX)) * 100);

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
    <div className="flex flex-col bg-[#0A0A12]" style={{ height: '100vh' }}>
      <TopBar title="Charting AI" subtitle="Candle-by-candle trade replay" showSearch={false} />

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left Trade Selector ── */}
        <div className="w-72 shrink-0 border-r border-white/5 bg-[#0D0D18] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-black/20 shrink-0">
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

        {/* ── Chart Area ── */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          {/* The chart fills the entire box */}
          <div ref={chartContainerRef} style={{ position: 'absolute', inset: 0 }} />

          {!selectedTrade && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 text-gray-600 z-10">
              <Target className="w-14 h-14 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-40">Select a trade to replay</p>
            </div>
          )}

          {/* ── Floating Replay Toolbar ── */}
          {selectedTrade && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5 px-6 py-3 rounded-full border border-white/10 shadow-2xl"
              style={{ background: 'rgba(10,10,18,0.90)', backdropFilter: 'blur(20px)' }}
            >
              {/* Speed */}
              <div className="flex items-center gap-2 pr-5 border-r border-white/10">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Speed</span>
                <select
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value={1600}>0.5x</option>
                  <option value={800}>1x</option>
                  <option value={400}>2x</option>
                  <option value={150}>5x</option>
                </select>
              </div>

              {/* Reset */}
              <button onClick={reset} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors">
                <RefreshCw className="w-4 h-4 text-gray-300" />
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="rounded-full bg-primary hover:bg-blue-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all hover:scale-105 active:scale-95"
                style={{ width: 52, height: 52 }}
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
