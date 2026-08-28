import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, Clock, Crosshair, BarChart2, ShieldCheck, 
  Target, AlertTriangle, CheckCircle2, RotateCcw, Save, Search, 
  Activity, TrendingUp, AlertCircle, History, ArrowRight
} from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { cn } from '../lib/utils';
import { useTrades } from '../hooks/useTrades';
import { useNavigate } from 'react-router-dom';

export function PreTradeCheckout() {
  const navigate = useNavigate();
  const { addTrade, trades } = useTrades();

  const scoredTrades = useMemo(() => {
    return trades.filter(t => t.rating !== undefined && t.rating !== null).slice(0, 5);
  }, [trades]);

  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  // --- Section 1: Overview ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState('London');
  const [pair, setPair] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('15m');
  const [tradeType, setTradeType] = useState('FVG Hold');

  // --- Section 2: Scoring ---
  const [bias, setBias] = useState<number | null>(null);
  const [cnfZone, setCnfZone] = useState(false);
  const [cnfLiq, setCnfLiq] = useState(false);
  const [cnfTime, setCnfTime] = useState(false);
  const [fvgVal, setFvgVal] = useState<number | null>(null);
  const [structVal, setStructVal] = useState<number | null>(null);
  const [confVal, setConfVal] = useState<number | null>(null);

  const totalScore = useMemo(() => {
    let s = 0;
    if (bias !== null) s += bias;
    if (cnfZone) s += 1;
    if (cnfLiq) s += 1;
    if (cnfTime) s += 1;
    if (fvgVal !== null) s += fvgVal;
    if (structVal !== null) s += structVal;
    if (confVal !== null) s += confVal;
    return s;
  }, [bias, cnfZone, cnfLiq, cnfTime, fvgVal, structVal, confVal]);

  const { rating, feedback, color, riskRec } = useMemo(() => {
    if (totalScore >= 9) return { rating: 'A+', feedback: 'High Probability Setup', color: 'text-emerald-600 dark:text-emerald-400', riskRec: '0.5%' };
    if (totalScore >= 7) return { rating: 'B', feedback: 'Standard Setup', color: 'text-blue-500', riskRec: '0.25%' };
    return { rating: 'C', feedback: 'Low Probability. DO NOT TRADE.', color: 'text-rose-500', riskRec: '0%' };
  }, [totalScore]);

  // --- Section 4: Checklist ---
  const [chkBias, setChkBias] = useState(false);
  const [chkCnf, setChkCnf] = useState(false);
  const [chkFvg, setChkFvg] = useState(false);
  const [chkConf, setChkConf] = useState(false);
  const [chkSes, setChkSes] = useState(false);
  const [chkRisk, setChkRisk] = useState(false);
  const [chkSl, setChkSl] = useState(false);

  const isAllChecked = chkBias && chkCnf && chkFvg && chkConf && chkSes && chkRisk && chkSl;

  // --- Section 5: Execution ---
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [riskPct, setRiskPct] = useState('');
  const [lotSize, setLotSize] = useState('');

  // --- Section 6: Review ---
  const [result, setResult] = useState('');
  const [rMult, setRMult] = useState('');
  const [followedRules, setFollowedRules] = useState(true);
  const [mistake, setMistake] = useState('');
  const [emotion, setEmotion] = useState('5');
  const [hasSc, setHasSc] = useState(false);

  const handleReset = () => {
    setBias(null); setCnfZone(false); setCnfLiq(false); setCnfTime(false);
    setFvgVal(null); setStructVal(null); setConfVal(null);
    setChkBias(false); setChkCnf(false); setChkFvg(false); setChkConf(false);
    setChkSes(false); setChkRisk(false); setChkSl(false);
    setEntry(''); setSl(''); setTp(''); setRiskPct(''); setLotSize('');
    setResult(''); setRMult(''); setMistake(''); setEmotion('5'); setHasSc(false);
  };

  const handleSaveToJournal = () => {
    if (!pair) return;
    
    const notes = `Pre-Trade Score: ${totalScore}/10 (${rating})\nMistakes: ${mistake}`;
    
    addTrade({
      date,
      symbol: pair,
      action: 'BUY',
      size: lotSize || '1.0',
      strategy: tradeType,
      entry: entry || '0',
      exit: tp || '0',
      pnl: 0,
      isPositive: true,
      notes,
      rating: totalScore,
      session: session as any,
      result: result.toUpperCase() || 'PENDING'
    });

    navigate('/journal');
  };

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Pre-Trade Terminal" 
        subtitle="Evaluate rule compliance & setup probability before entering" 
        showSearch={true}
        actionButton={
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReset} 
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 rounded-2xl transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button 
              onClick={handleSaveToJournal} 
              disabled={totalScore < 7 || !isAllChecked} 
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs font-semibold text-white dark:text-gray-900 bg-[#111827] dark:bg-white disabled:opacity-40 rounded-2xl transition-all shadow-xs hover:bg-black dark:hover:bg-gray-100"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Approve & Journal</span>
              <span className="sm:hidden">Journal</span>
            </button>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">
          
          {/* Main Scoring Column (8 COLS) */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Section 1: Overview */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
               <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-blue-500" /> 1. Trade Setup Overview
               </h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Session</label>
                    <select value={session} onChange={e => setSession(e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20">
                       <option>London</option>
                       <option>NY</option>
                       <option>Asian</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Pair</label>
                    <input type="text" value={pair} onChange={e => setPair(e.target.value)} placeholder="e.g. EURUSD" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none uppercase font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Timeframe</label>
                    <input type="text" value={timeframe} onChange={e => setTimeframe(e.target.value)} placeholder="e.g. 5m" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Strategy</label>
                    <input type="text" value={tradeType} onChange={e => setTradeType(e.target.value)} placeholder="e.g. FVG Hold" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none" />
                  </div>
               </div>
            </div>

            {/* Section 2: Scoring */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-5">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" /> 2. Scoring Matrix
                  </h3>
                  <div className="bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                     <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Score</span>
                     <span className={cn("text-xs font-bold tabular-nums", color)}>{totalScore}/10</span>
                  </div>
               </div>

               {/* Bias */}
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white">1. HTF Directional Bias (0-2 Pts)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                     <button onClick={() => setBias(2)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", bias === 2 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">2 Pts</span> Clear HTF Trend (HH/HL)
                     </button>
                     <button onClick={() => setBias(1)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", bias === 1 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">1 Pt</span> Weak / Ranging Bias
                     </button>
                     <button onClick={() => setBias(0)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", bias === 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">0 Pts</span> Counter-Trend / No Bias
                     </button>
                  </div>
               </div>

               {/* Confluence */}
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white flex justify-between">
                     <span>2. Confluence Factors (0-3 Pts)</span>
                     <span className="text-gray-400 font-normal text-[11px]">1 pt each</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                     <label className={cn("p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all", cnfZone ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="text-xs font-semibold">Key Zone (S/D)</span>
                        <input type="checkbox" checked={cnfZone} onChange={e => setCnfZone(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-0" />
                     </label>
                     <label className={cn("p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all", cnfLiq ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="text-xs font-semibold">Liquidity Sweep</span>
                        <input type="checkbox" checked={cnfLiq} onChange={e => setCnfLiq(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-0" />
                     </label>
                     <label className={cn("p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all", cnfTime ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="text-xs font-semibold">Session Timing</span>
                        <input type="checkbox" checked={cnfTime} onChange={e => setCnfTime(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-0" />
                     </label>
                  </div>
               </div>

               {/* FVG Quality */}
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white">3. FVG / Zone Quality (0-2 Pts)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                     <button onClick={() => setFvgVal(2)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", fvgVal === 2 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">2 Pts</span> Strong impulse + clean gap
                     </button>
                     <button onClick={() => setFvgVal(1)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", fvgVal === 1 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">1 Pt</span> Average reaction
                     </button>
                     <button onClick={() => setFvgVal(0)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", fvgVal === 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">0 Pts</span> Weak / Messy
                     </button>
                  </div>
               </div>

               {/* Confirmation */}
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white">4. Entry Trigger Confirmation (0-2 Pts)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                     <button onClick={() => setConfVal(2)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", confVal === 2 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">2 Pts</span> Strong rejection candle
                     </button>
                     <button onClick={() => setConfVal(1)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", confVal === 1 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">1 Pt</span> Weak confirmation
                     </button>
                     <button onClick={() => setConfVal(0)} className={cn("p-3 rounded-2xl border text-xs text-left transition-all", confVal === 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-400" : "bg-gray-50 dark:bg-neutral-800/60 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300")}>
                        <span className="block font-bold mb-0.5">0 Pts</span> No confirmation
                     </button>
                  </div>
               </div>
            </div>

            {/* Section 5: Execution Plan */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
               <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-blue-500" /> 3. Execution Plan
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Entry</label>
                    <input type="text" value={entry} onChange={e => setEntry(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white tabular-nums outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Stop Loss</label>
                    <input type="text" value={sl} onChange={e => setSl(e.target.value)} placeholder="15 px" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-rose-500 tabular-nums outline-none font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Take Profit</label>
                    <input type="text" value={tp} onChange={e => setTp(e.target.value)} placeholder="30 px" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-emerald-600 tabular-nums outline-none font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Risk %</label>
                    <input type="text" value={riskPct} onChange={e => setRiskPct(e.target.value)} placeholder="0.5%" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white tabular-nums outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-400">Lot Size</label>
                    <input type="text" value={lotSize} onChange={e => setLotSize(e.target.value)} placeholder="1.00" className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-2 text-xs text-gray-900 dark:text-white tabular-nums outline-none font-semibold" />
                  </div>
               </div>
            </div>

          </div>

          {/* Right Layout Column (4 COLS) */}
          <div className="xl:col-span-4 space-y-6">
             
            {/* Section 3: Logic Box */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs text-center flex flex-col items-center justify-center min-h-[170px]">
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                 <ShieldCheck className="w-4 h-4 text-blue-500" /> Decision Logic
               </h3>
               <div className="mt-2">
                 <p className={cn("text-5xl font-black tabular-nums tracking-tight", color)}>{rating}</p>
                 <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{feedback}</p>
                 {totalScore >= 7 ? (
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Recommended Risk: <span className="font-bold text-gray-900 dark:text-white">{riskRec}</span></p>
                 ) : (
                   <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-bold px-3 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-full border border-rose-200 dark:border-rose-800/40">DO NOT ENTER MARKET</p>
                 )}
               </div>
            </div>

            {/* Section 4: Checklist Box */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-3">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" /> Mandatory Checklist
                  </h3>
                  {isAllChecked && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">PASSED</span>}
               </div>
               <div className="space-y-2 text-xs">
                  {[
                    { state: chkBias, set: setChkBias, label: 'Bias is clear & confirmed' },
                    { state: chkCnf, set: setChkCnf, label: 'Minimum 2 confluences' },
                    { state: chkFvg, set: setChkFvg, label: 'Valid FVG identified' },
                    { state: chkConf, set: setChkConf, label: 'Confirmation candle closed' },
                    { state: chkSes, set: setChkSes, label: 'Session is London or NY' },
                    { state: chkRisk, set: setChkRisk, label: 'Risk within account limit (≤1%)' },
                    { state: chkSl, set: setChkSl, label: 'Stop Loss strictly defined' },
                  ].map((item, idx) => (
                    <label key={idx} className={cn("flex items-center gap-2.5 cursor-pointer p-2.5 rounded-2xl transition-colors", item.state ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-medium" : "bg-gray-50 dark:bg-neutral-800/50 text-gray-600 dark:text-gray-400")}>
                      <input type="checkbox" checked={item.state} onChange={e => item.set(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 focus:ring-0" />
                      <span>{item.label}</span>
                    </label>
                  ))}
               </div>
            </div>

            {/* Section 7: Recent Trade Scores */}
            <div className="bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs">
               <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-blue-500" /> Past Checklist Scores
               </h3>
               {scoredTrades.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No scored trades yet.</p>
               ) : (
                  <div className="space-y-2">
                     {scoredTrades.map((trade) => (
                        <div 
                          key={trade.id} 
                          className="p-3 rounded-2xl bg-gray-50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-800 flex items-center justify-between"
                        >
                           <div>
                              <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold text-gray-900 dark:text-white">{trade.symbol}</span>
                                 <span className="text-[10px] font-medium text-gray-400">{trade.action}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">{new Date(trade.date).toLocaleDateString()}</span>
                           </div>
                           <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {trade.rating}/10
                           </span>
                        </div>
                     ))}
                  </div>
               )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
