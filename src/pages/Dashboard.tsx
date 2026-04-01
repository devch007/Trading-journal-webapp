import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../lib/TopBar";
import { TradeModal } from "../components/TradeModal";
import { ImportTradesModal } from "../components/ImportTradesModal";
import { TrendingUp, TrendingDown, Target, Activity, ArrowUpRight, ArrowDownRight, Plus, Upload, Loader2, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTrades } from "../hooks/useTrades";
import { useAuth } from "../contexts/AuthContext";
import { useAccountContext } from "../contexts/AccountContext";
import { MonthlyPnLCalendar } from "../components/MonthlyPnLCalendar";

// Initial static data
const initialEquityData = [
  { name: '10:15:00', value: 11200 },
  { name: '10:16:00', value: 11450 },
  { name: '10:17:00', value: 11300 },
  { name: '10:18:00', value: 11800 },
  { name: '10:19:00', value: 11650 },
  { name: '10:20:00', value: 12100 },
  { name: '10:21:00', value: 12450 },
];

const initialTrades = [
  { id: 1, date: "Today, 10:21:00", symbol: "EURUSD", action: "BUY", size: "2.00 Lot", result: "+$350.00", isPositive: true, pnl: 350 },
  { id: 2, date: "Today, 10:20:00", symbol: "USDJPY", action: "SELL", size: "1.50 Lot", result: "-$150.00", isPositive: false, pnl: -150 },
  { id: 3, date: "Today, 10:19:00", symbol: "XAUUSD", action: "BUY", size: "0.50 Lot", result: "+$450.00", isPositive: true, pnl: 450 },
  { id: 4, date: "Today, 10:18:00", symbol: "GBPUSD", action: "BUY", size: "1.00 Lot", result: "+$500.00", isPositive: true, pnl: 500 },
  { id: 5, date: "Today, 10:17:00", symbol: "USDCAD", action: "SELL", size: "1.00 Lot", result: "-$150.00", isPositive: false, pnl: -150 },
];

const initialQuantInsights = [
  { label: "Avg. Winning Trade", value: 412.50, isPositive: true },
  { label: "Avg. Losing Trade", value: -210.15, isPositive: false },
  { label: "Best Trade (XAUUSD)", value: 1240.00, isPositive: true },
  { label: "Worst Trade (USDJPY)", value: -450.00, isPositive: false },
];

const initialPerformance = [
  { pair: "EURUSD", winRate: 82, color: "bg-primary" },
  { pair: "XAUUSD", winRate: 65, color: "bg-primary" },
  { pair: "GBPUSD", winRate: 58, color: "bg-primary" },
  { pair: "USDJPY", winRate: 42, color: "bg-rose-500" },
  { pair: "USDCAD", winRate: 50, color: "bg-gray-500" },
];

const CustomTooltip = ({ active, payload, label, data }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const currentIndex = data.findIndex((d: any) => d.name === label);
    const prevValue = currentIndex > 0 ? data[currentIndex - 1].value : value;
    const isPositive = value >= prevValue;

    return (
      <div className="glass-card p-3 rounded-xl border border-white/10 flex flex-col gap-1 shadow-xl bg-[#1a1a24]/90 backdrop-blur-md">
        <p className="text-on-surface-variant font-label text-xs uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-data font-bold text-lg text-white">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {currentIndex > 0 && (
            <div className={`flex items-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trades: allTrades, loading, addTrade } = useTrades();
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [equityData, setEquityData] = useState(initialEquityData);
  const [period, setPeriod] = useState('ALL');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{ trades: any[] } | null>(null);
  
  // Filter trades by selected account
  const trades = useMemo(() => {
    if (!selectedAccountId) return allTrades;
    return allTrades.filter(t => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);
  
  // Calculate stats based on real trades
  const stats = useMemo(() => {
    if (!trades.length) return { totalPnl: 0, winRate: 0, profitFactor: 0, activeTrades: 0 };
    
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = trades.filter(t => t.isPositive);
    const losingTrades = trades.filter(t => !t.isPositive);
    
    const winRate = (winningTrades.length / trades.length) * 100;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    
    return {
      totalPnl,
      winRate,
      profitFactor,
      activeTrades: trades.length
    };
  }, [trades]);

  const quantInsights = useMemo(() => {
    if (!trades || trades.length === 0) return initialQuantInsights;
    
    const winningTrades = (trades || []).filter(t => t.isPositive);
    const losingTrades = (trades || []).filter(t => !t.isPositive);
    
    const avgWin = winningTrades.length ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    
    const bestTrade = trades.reduce((best, current) => (current.pnl || 0) > (best.pnl || 0) ? current : best, trades[0]);
    const worstTrade = trades.reduce((worst, current) => (current.pnl || 0) < (worst.pnl || 0) ? current : worst, trades[0]);
    
    return [
      { label: "Avg. Winning Trade", value: avgWin, isPositive: true },
      { label: "Avg. Losing Trade", value: avgLoss, isPositive: false },
      { label: `Best Trade (${bestTrade?.symbol || 'N/A'})`, value: bestTrade?.pnl || 0, isPositive: true },
      { label: `Worst Trade (${worstTrade?.symbol || 'N/A'})`, value: worstTrade?.pnl || 0, isPositive: false },
    ];
  }, [trades]);

  const performanceByPair = useMemo(() => {
    if (!trades || trades.length === 0) return initialPerformance;
    
    const pairs = Array.from(new Set((trades || []).map(t => t.symbol)));
    return pairs.map(pair => {
      const pairTrades = trades.filter(t => t.symbol === pair);
      const wins = pairTrades.filter(t => t.isPositive).length;
      const winRate = (wins / pairTrades.length) * 100;
      
      let color = "bg-gray-500";
      if (winRate >= 60) color = "bg-primary";
      else if (winRate < 50) color = "bg-rose-500";
      
      return { pair, winRate, color };
    }).sort((a, b) => b.winRate - a.winRate).slice(0, 5);
  }, [trades]);

  // Update equity curve when trades or period change
  useEffect(() => {
    if (!trades || trades.length === 0) {
      setEquityData([{ name: 'No Data', value: selectedAccount ? (selectedAccount.initialCapital || 10000) : 10000 }]);
      return;
    }
    
    // Filter trades by period
    const now = new Date();
    let cutoff = new Date(0); // Default to beginning of time for 'ALL'
    
    if (period === '1D') {
      cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
    } else if (period === '1W') {
      cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
    } else if (period === '1M') {
      cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 1);
    }

    const periodFilteredTrades = (trades || []).filter(t => {
      const tradeDate = new Date(t.createdAt || Date.now());
      return tradeDate >= cutoff;
    });

    if (periodFilteredTrades.length === 0) {
      setEquityData([{ name: 'No Data', value: selectedAccount ? (selectedAccount.currentEquity || selectedAccount.initialCapital) : 10000 }]);
      return;
    }
    
    // Simple equity curve calculation
    const initialBalance = selectedAccount ? selectedAccount.initialCapital : 10000;
    
    // To calculate the equity at the start of the period, we need to sum PnL of trades BEFORE the cutoff
    const tradesBeforeCutoff = trades.filter(t => {
      const tradeDate = new Date(t.createdAt || Date.now());
      return tradeDate < cutoff;
    });
    
    const startingEquity = initialBalance + tradesBeforeCutoff.reduce((sum, t) => sum + (t.pnl || 0), 0);
    let runningEquity = startingEquity;

    const newEquityData = [...periodFilteredTrades].reverse().map((trade, index) => {
      runningEquity += (trade.pnl || 0);
      return {
        name: trade.date?.split(', ')[1] || `T${index + 1}`,
        value: runningEquity
      };
    });
    
    // Add starting point
    newEquityData.unshift({ 
      name: period === '1D' ? 'Start' : cutoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      value: startingEquity 
    });
    
    setEquityData(newEquityData);
  }, [trades, selectedAccount, period]);

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val >= 0 ? `+$${absVal}` : `-$${absVal}`;
  };

  const handleNewTrade = async (newTrade: any) => {
    await addTrade({
      accountId: newTrade.accountId,
      date: newTrade.date,
      symbol: newTrade.symbol,
      action: newTrade.action,
      size: newTrade.size,
      result: newTrade.result,
      isPositive: newTrade.isPositive,
      pnl: newTrade.pnl
    });
  };

  const handleSaveImportedTrades = async (extractedTrades: any[]) => {
    for (const t of extractedTrades) {
      const pnl = parseFloat(t.profit) || 0;
      await addTrade({
        accountId: selectedAccountId || '',
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        symbol: t.symbol,
        action: t.type,
        size: `${t.volume} Lot`,
        result: pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`,
        isPositive: pnl >= 0,
        pnl: pnl
      });
    }
  };

  const handleImportClick = () => {
    setExtractionError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedAccountId) {
      setExtractionError("Please select a trading account first");
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // Call Groq API
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract the trades from this MT5/trading screenshot. Return ONLY a valid JSON object with a 'trades' array. Each trade should have: symbol (string), type ('BUY' or 'SELL'), volume (number), entry_price (number), exit_price (number), profit (number), commission (number, default 0), and confidence ('High', 'Medium', or 'Low' based on how clearly you can read the row). Do not include any markdown formatting or explanations."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.type};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData);
        } catch (e) {
          errorDetails = await response.text();
        }
        console.error("Groq API Error Details:", errorDetails);
        throw new Error(`Groq API Error: ${response.status} - ${errorDetails}`);
      }

      const result = await response.json();
      let jsonStr = result.choices?.[0]?.message?.content || "{}";
      
      // Clean up potential markdown formatting
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const data = JSON.parse(jsonStr);
      
      if (data.trades && data.trades.length > 0) {
        setExtractedData(data);
        setIsImportModalOpen(true);
      } else {
        setExtractionError("Could not detect trades");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      setExtractionError("Could not detect trades");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Dashboard" 
        subtitle="Overview & Analytics" 
        showSearch={true} 
        actionButton={
          <button 
            onClick={() => setIsTradeModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-4 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
          >
            <Plus className="w-4 h-4" />
            New Trade
          </button>
        }
      />
      
      <TradeModal 
        isOpen={isTradeModalOpen} 
        onClose={() => setIsTradeModalOpen(false)} 
        onSubmit={handleNewTrade} 
      />

      <ImportTradesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSave={handleSaveImportedTrades}
        initialData={extractedData}
      />
      
      <div className="px-8 flex flex-col gap-8">
        {/* Quick Actions */}
        <div className="flex flex-col gap-4">
          <h3 className="font-headline text-lg text-white">Quick Actions</h3>
          <div className="flex gap-4 flex-wrap">
            <button 
              onClick={() => setIsTradeModalOpen(true)}
              className="glass-card px-6 py-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-all group cursor-pointer border border-white/5 hover:border-primary/50"
            >
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-white text-sm">Log New Trade</span>
                <span className="text-xs text-on-surface-variant">Manually enter trade details</span>
              </div>
            </button>

            <div className="relative">
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                onClick={handleImportClick}
                disabled={isExtracting}
                className={`glass-card px-6 py-4 rounded-2xl flex items-center gap-4 transition-all group border border-white/5 ${isExtracting ? 'opacity-80 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer hover:border-primary/50'}`}
              >
                <div className={`p-3 rounded-xl transition-colors ${isExtracting ? 'bg-white/10' : 'bg-primary/10 group-hover:bg-primary/20'}`}>
                  {isExtracting ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-white text-sm">{isExtracting ? 'Analyzing screenshot...' : 'Import Trades'}</span>
                  <span className="text-xs text-on-surface-variant">{isExtracting ? 'Please wait' : 'Extract from MT5 screenshot'}</span>
                </div>
              </button>
              {extractionError && (
                <div className="absolute top-full mt-2 left-0 flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 whitespace-nowrap">
                  <AlertCircle className="w-3 h-3" />
                  {extractionError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard 
            title="Total P&L" 
            value={formatCurrency(stats.totalPnl)} 
            trend="+14.5%" 
            isPositive={stats.totalPnl >= 0} 
            icon={<Activity className="text-primary w-5 h-5" />} 
          />
          <StatCard 
            title="Win Rate" 
            value={`${stats.winRate.toFixed(1)}%`} 
            trend="+2.4%" 
            isPositive={stats.winRate >= 50} 
            icon={<Target className="text-secondary w-5 h-5" />} 
          />
          <StatCard 
            title="Profit Factor" 
            value={stats.profitFactor.toFixed(2)} 
            trend="-0.1" 
            isPositive={stats.profitFactor >= 1} 
            icon={<TrendingUp className="text-tertiary w-5 h-5" />} 
          />
          <StatCard 
            title="Active Trades" 
            value={stats.activeTrades.toString()} 
            trend="0" 
            isPositive={true} 
            icon={<TrendingDown className="text-error w-5 h-5" />} 
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column (Spans 2) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            {/* Main Chart */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-headline text-lg text-white">Equity Curve</h3>
                </div>
                <div className="flex gap-2">
                  {['1D', '1W', '1M', 'ALL'].map(p => (
                    <button 
                      key={p} 
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1 text-xs font-label rounded-lg transition-colors ${period === p ? 'bg-primary text-background font-bold' : 'bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} domain={['auto', 'auto']} />
                    <Tooltip 
                      content={<CustomTooltip data={equityData} />} 
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
                      isAnimationActive={false}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" isAnimationActive={true} animationDuration={500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly P&L Calendar */}
            <MonthlyPnLCalendar trades={trades} />

            {/* Recent Execution History */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h3 className="font-headline text-lg text-white">Recent Execution History</h3>
                <button 
                  onClick={() => navigate('/trades')}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-label"
                >
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-on-surface-variant font-label uppercase border-b border-white/5">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Symbol</th>
                      <th className="pb-3 font-medium">Action</th>
                      <th className="pb-3 font-medium">Size</th>
                      <th className="pb-3 font-medium text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(trades.length > 0 ? trades.slice(0, 5) : initialTrades).map((trade) => (
                      <tr key={trade.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group animate-in fade-in slide-in-from-top-2 duration-500">
                        <td className="py-4 text-on-surface-variant font-label text-xs">{trade.date}</td>
                        <td className="py-4 font-bold text-white">{trade.symbol}</td>
                        <td className={`py-4 font-bold text-xs ${trade.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.action}</td>
                        <td className="py-4 text-on-surface-variant font-data text-xs">{trade.size}</td>
                        <td className={`py-4 text-right font-data font-bold ${trade.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (Spans 1) */}
          <div className="flex flex-col gap-6">
            {/* Quant Insights */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <h3 className="font-headline text-lg text-white mb-2">Quant Insights</h3>
              <div className="flex flex-col">
                {quantInsights.map((insight, i) => (
                  <div key={i} className={`flex justify-between items-center py-4 ${i !== quantInsights.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <span className="text-sm text-on-surface-variant font-label">{insight.label}</span>
                    <span className={`font-data font-bold transition-colors duration-500 ${insight.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(insight.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance by Pair */}
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-6">
              <h3 className="font-headline text-lg text-white">Performance by Pair</h3>
              <div className="flex flex-col gap-5">
                {performanceByPair.map((perf, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-label">
                      <span className="text-white font-bold">{perf.pair}</span>
                      <span className="text-on-surface-variant transition-all duration-500">{perf.winRate.toFixed(0)}% WIN</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${perf.color}`} style={{ width: `${perf.winRate}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isPositive, icon }: { title: string, value: string, trend: string, isPositive: boolean, icon: React.ReactNode }) {
  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500"></div>
      <div className="flex justify-between items-start">
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-on-surface-variant font-label text-sm mb-1">{title}</p>
        <h2 className="font-headline text-3xl text-white tracking-tight transition-all duration-500">{value}</h2>
      </div>
    </div>
  );
}
