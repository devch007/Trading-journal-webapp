import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, SeriesMarker } from 'lightweight-charts';
import { TopBar } from '../lib/TopBar';
import { useTrades, Trade } from '../hooks/useTrades';
import { Play, Pause, FastForward, SkipForward, Target, RefreshCw } from 'lucide-react';
import { getTradeDate } from '../lib/timeUtils';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

// Utility to generate synthetic realistic OHLCV based on a trade's entry price
function generateMockCandles(
  basePrice: number,
  isLong: boolean,
  entryDate: Date,
  candlesBefore: number = 50,
  candlesAfter: number = 30
): CandlestickData[] {
  const data: CandlestickData[] = [];
  const startTimestamp = entryDate.getTime() - candlesBefore * 15 * 60 * 1000; // Assume 15m timeframe
  
  let currentPrice = isLong ? basePrice * 0.995 : basePrice * 1.005; // Start somewhere before the entry
  let volatility = basePrice * 0.001;

  for (let i = 0; i < candlesBefore + candlesAfter; i++) {
    const time = (startTimestamp + i * 15 * 60 * 1000) / 1000 as Time; // UNIX timestamp in seconds
    
    // Towards entry point, make it approach basePrice
    if (i < candlesBefore) {
      const step = (basePrice - currentPrice) / (candlesBefore - i);
      currentPrice += step + (Math.random() - 0.5) * volatility;
    } else {
      // After entry, simulate the trade playing out
      currentPrice += (isLong ? 1 : -1) * (Math.random() * volatility) + (Math.random() - 0.5) * volatility;
    }

    const o = currentPrice;
    const h = currentPrice + Math.random() * volatility;
    const l = currentPrice - Math.random() * volatility;
    const c = l + (h - l) * Math.random();

    data.push({ time, open: o, high: h, low: l, close: c });
    currentPrice = c;
  }

  // Force the entry candle to explicitly touch the exact basePrice
  if (data[candlesBefore]) {
    const entryCandle = data[candlesBefore];
    if (isLong) {
      entryCandle.low = Math.min(entryCandle.low, basePrice);
      entryCandle.high = Math.max(entryCandle.high, basePrice * 1.001);
    } else {
      entryCandle.high = Math.max(entryCandle.high, basePrice);
      entryCandle.low = Math.min(entryCandle.low, basePrice * 0.999);
    }
  }

  return data;
}

export function ChartingAI() {
  const { trades, loading } = useTrades();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullData, setFullData] = useState<CandlestickData[]>([]);

  // Initialize trade selection
  useEffect(() => {
    if (trades.length > 0 && !selectedTrade) {
      setSelectedTrade(trades[0]);
    }
  }, [trades, selectedTrade]);

  // Handle Chart Initialization & Resize
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#0A0A12' },
        textColor: '#8A8D99',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { width: 1, color: 'rgba(255, 255, 255, 0.1)', style: 3 },
        horzLine: { width: 1, color: 'rgba(255, 255, 255, 0.1)', style: 3 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        rightOffset: 12,
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#1ED760',
      downColor: '#E5534B',
      borderVisible: false,
      wickUpColor: '#1ED760',
      wickDownColor: '#E5534B',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = series;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // When a trade is selected, generate its data
  useEffect(() => {
    if (!selectedTrade) return;

    setIsPlaying(false);
    
    // Parse the date
    let dateObj = new Date();
    try {
      dateObj = getTradeDate(selectedTrade.date || selectedTrade.createdAt || new Date().toISOString());
    } catch {}

    const isLong = selectedTrade.action?.toUpperCase() === 'BUY';
    const entryPriceNum = parseFloat(selectedTrade.entry) || 100;
    
    const generated = generateMockCandles(entryPriceNum, isLong, dateObj);
    setFullData(generated);
    
    // Start by showing only the "before" candles (index 50)
    setCurrentIndex(50);
  }, [selectedTrade]);

  // Update chart data when index changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current || fullData.length === 0) return;

    const currentData = fullData.slice(0, currentIndex + 1);
    candlestickSeriesRef.current.setData(currentData);

    // Apply markers if entry or exit points are reached
    const markers: SeriesMarker<Time>[] = [];
    
    if (currentIndex >= 50 && selectedTrade) {
      const entryTime = fullData[50].time;
      const isLong = selectedTrade.action?.toUpperCase() === 'BUY';
      markers.push({
        time: entryTime,
        position: 'belowBar',
        color: isLong ? '#1ED760' : '#E5534B',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: `ENTRY ${selectedTrade.entry}`,
      });
    }

    if (currentIndex >= fullData.length - 1 && selectedTrade) {
      markers.push({
        time: fullData[fullData.length - 1].time,
        position: 'aboveBar',
        color: '#3B82F6',
        shape: 'arrowDown',
        text: `EXIT ${selectedTrade.exit || 'Closed'}`,
      });
    }

    candlestickSeriesRef.current.setMarkers(markers);

    // Only set visible range automatically if we are playing to keep the active candle in focus
    if (isPlaying) {
      chartRef.current.timeScale().scrollToPosition(0, true);
    }
  }, [currentIndex, fullData, selectedTrade, isPlaying]);

  // Replay interval logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && currentIndex < fullData.length - 1) {
      interval = setInterval(() => {
        setCurrentIndex(prev => prev + 1);
      }, speed);
    } else if (currentIndex >= fullData.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, fullData.length, speed]);

  const togglePlay = () => {
    if (currentIndex >= fullData.length - 1) {
      setCurrentIndex(50); // reset
    }
    setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
    if (currentIndex < fullData.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const resetReplay = () => {
    setIsPlaying(false);
    setCurrentIndex(50);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Charting AI" subtitle="Execute trade replays" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen relative overflow-hidden bg-[#0A0A12]">
      <TopBar title="Charting AI" subtitle="Candle-by-candle trade replay" showSearch={false} />
      
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Trade Selector */}
        <div className="w-80 border-r border-white/5 bg-[#0D0D16] flex flex-col h-full z-10 shrink-0">
          <div className="p-5 border-b border-white/5 bg-black/20">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Select Trade
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {trades.map(trade => (
              <div 
                key={trade.id} 
                onClick={() => setSelectedTrade(trade)}
                className={cn(
                  "p-4 rounded-xl cursor-pointer transition-all border",
                  selectedTrade?.id === trade.id
                    ? "bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-white">{trade.symbol}</span>
                  <span className={cn(
                    "text-xs font-bold tnum",
                    trade.pnl >= 0 ? "text-[#1ED760]" : "text-[#E5534B]"
                  )}>
                    {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-gray-500">
                  <span className={trade.action === "BUY" ? "text-[#1ED760]" : "text-[#E5534B]"}>
                    {trade.action === "BUY" ? "LONG" : "SHORT"}
                  </span>
                  <span>•</span>
                  <span>{trade.strategy || trade.tag || "SCALP"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col relative w-full h-full">
          
          {/* Chart Container */}
          <div ref={chartContainerRef} className="flex-1 w-full h-full" />

          {/* Replay Toolbar Overlay */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-card border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl z-20"
          >
            {/* Speed Control */}
            <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-6">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Speed</span>
              <select 
                value={speed} 
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value={2000}>0.5x</option>
                <option value={1000}>1.0x</option>
                <option value={500}>2.0x</option>
                <option value={200}>5.0x</option>
              </select>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button 
                onClick={resetReplay}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white relative group"
              >
                <RefreshCw className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-primary hover:bg-blue-500 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:scale-105 active:scale-95 text-white"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>

              <button 
                onClick={stepForward}
                disabled={isPlaying || currentIndex >= fullData.length - 1}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-white group"
              >
                <SkipForward className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
              </button>
            </div>
            
            {/* Playback Stats */}
            <div className="ml-4 border-l border-white/10 pl-6 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Progress</span>
              <span className="text-sm font-bold text-primary tnum">
                {Math.round(((currentIndex - 50 < 0 ? 0 : currentIndex - 50) / (fullData.length - 50)) * 100)}%
              </span>
            </div>
          </motion.div>
        
        </div>
      </div>
    </div>
  );
}
