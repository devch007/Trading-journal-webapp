import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ClipboardCheck, Clock, Crosshair, BarChart2, ShieldCheck, 
  Target, AlertTriangle, CheckCircle2, RotateCcw, Save, Search, 
  Activity, TrendingUp, AlertCircle
} from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { cn } from '../lib/utils';
import { useTrades } from '../hooks/useTrades';
import { useNavigate } from 'react-router-dom';

export function PreTradeCheckout() {
  const navigate = useNavigate();
  const { addTrade } = useTrades();

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
    if (totalScore >= 9) return { rating: 'A+', feedback: 'High Probability Setup', color: 'text-[#1ED760]', riskRec: '0.5%' };
    if (totalScore >= 7) return { rating: 'B', feedback: 'Standard Setup', color: 'text-blue-400', riskRec: '0.25%' };
    return { rating: 'C', feedback: 'Low Probability. DO NOT TRADE.', color: 'text-[#E5534B]', riskRec: '0%' };
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
    
    const notes = \`Pre-Trade Score: \${totalScore}/10 (\${rating})\\nMistakes: \${mistake}\`;
    
    addTrade({
      date,
      symbol: pair,
      action: 'BUY',
      size: lotSize || '0.00',
      result: result === 'Win' ? 'WIN' : result === 'Loss' ? 'LOSS' : 'BE',
      isPositive: result === 'Win',
      pnl: 0,
      session: session as any,
      entry,
      notes,
      rating: totalScore,
      checklist: [
        { label: 'Bias clear', checked: chkBias },
        { label: '2+ confluences', checked: chkCnf },
        { label: 'Valid FVG', checked: chkFvg }
      ]
    });
    
    navigate('/journal');
  };

  return (
    <div className="flex flex-col min-h-full pb-20 relative overflow-hidden">
      <div 
        className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none blur-[100px] transition-colors duration-1000"
        style={{ backgroundColor: totalScore >= 9 ? '#1ED760' : totalScore >= 7 ? '#3b82f6' : totalScore === 0 ? 'transparent' : '#E5534B' }}
      />
      
      <TopBar title="Pre-Trade Checkout" subtitle="Execute with discipline securely" showSearch={false} />

      <div className="px-4 md:px-8 mt-6 max-w-5xl mx-auto w-full flex flex-col gap-8 relative z-10">
        
        {/* Header Action Bar */}
        <div className="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <ClipboardCheck className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-white font-bold tracking-tight">Checkout Terminal</h2>
                <p className="text-xs text-gray-500 font-medium">Evaluate before execution</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleReset} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
             </button>
             <button onClick={handleSaveToJournal} disabled={totalScore < 7 || !isAllChecked} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-2">
                <Save className="w-3.5 h-3.5" />
                Journal Config
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Scoring Column */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Section 1: Overview */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-5">
                  <Search className="w-4 h-4 text-white" /> 1. Overview
               </h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Session</label>
                    <select value={session} onChange={e => setSession(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none">
                       <option>London</option>
                       <option>NY</option>
                       <option>Asian</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Pair</label>
                    <input type="text" value={pair} onChange={e => setPair(e.target.value)} placeholder="e.g. EURUSD" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none uppercase" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Timeframe</label>
                    <input type="text" value={timeframe} onChange={e => setTimeframe(e.target.value)} placeholder="e.g. 5m" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Setup</label>
                    <input type="text" value={tradeType} onChange={e => setTradeType(e.target.value)} placeholder="e.g. FVG Hold" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* Section 2: Scoring */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm">
               <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" /> 2. Scoring Matrix
                  </h3>
                  <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                     <span className={cn("text-sm font-black", color)}>{totalScore}/10</span>
                  </div>
               </div>

               <div className="space-y-6">
                  {/* Bias */}
                  <div className="space-y-3">
                     <label className="text-xs font-bold text-white">1. Bias (0-2 Pts)</label>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button onClick={() => setBias(2)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", bias === 2 ? "bg-[#1ED760]/10 border-[#1ED760] text-[#1ED760]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">2 Pts</span> Clear HTF Trend (HH/HL)
                        </button>
                        <button onClick={() => setBias(1)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", bias === 1 ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">1 Pt</span> Weak / Ranging Bias
                        </button>
                        <button onClick={() => setBias(0)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", bias === 0 ? "bg-[#E5534B]/10 border-[#E5534B] text-[#E5534B]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">0 Pts</span> Counter-Trend / No Bias
                        </button>
                     </div>
                  </div>

                  {/* Confluence */}
                  <div className="space-y-3">
                     <label className="text-xs font-bold text-white flex justify-between">
                        <span>2. Confluence (0-3 Pts)</span>
                        <span className="text-gray-500 font-normal">1 pt each</span>
                     </label>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className={cn("p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all", cnfZone ? "bg-blue-500/10 border-blue-500" : "bg-black/40 border-white/10")}>
                           <span className={cn("text-xs font-bold", cnfZone ? "text-blue-400" : "text-gray-400")}>Key Zone (S/D)</span>
                           <input type="checkbox" checked={cnfZone} onChange={e => setCnfZone(e.target.checked)} className="w-4 h-4 rounded border-white/20 text-blue-500 bg-transparent focus:ring-0 focus:ring-offset-0" />
                        </label>
                        <label className={cn("p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all", cnfLiq ? "bg-blue-500/10 border-blue-500" : "bg-black/40 border-white/10")}>
                           <span className={cn("text-xs font-bold", cnfLiq ? "text-blue-400" : "text-gray-400")}>Liquidity Sweep</span>
                           <input type="checkbox" checked={cnfLiq} onChange={e => setCnfLiq(e.target.checked)} className="w-4 h-4 rounded border-white/20 text-blue-500 bg-transparent focus:ring-0 focus:ring-offset-0" />
                        </label>
                        <label className={cn("p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all", cnfTime ? "bg-blue-500/10 border-blue-500" : "bg-black/40 border-white/10")}>
                           <span className={cn("text-xs font-bold", cnfTime ? "text-blue-400" : "text-gray-400")}>Session Timing</span>
                           <input type="checkbox" checked={cnfTime} onChange={e => setCnfTime(e.target.checked)} className="w-4 h-4 rounded border-white/20 text-blue-500 bg-transparent focus:ring-0 focus:ring-offset-0" />
                        </label>
                     </div>
                  </div>

                  {/* FVG Quality */}
                  <div className="space-y-3">
                     <label className="text-xs font-bold text-white">3. FVG Quality (0-2 Pts)</label>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button onClick={() => setFvgVal(2)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", fvgVal === 2 ? "bg-[#1ED760]/10 border-[#1ED760] text-[#1ED760]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">2 Pts</span> Strong impulse + clean gap
                        </button>
                        <button onClick={() => setFvgVal(1)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", fvgVal === 1 ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">1 Pt</span> Average
                        </button>
                        <button onClick={() => setFvgVal(0)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", fvgVal === 0 ? "bg-[#E5534B]/10 border-[#E5534B] text-[#E5534B]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">0 Pts</span> Weak / Messy
                        </button>
                     </div>
                  </div>

                  {/* Structure */}
                  <div className="space-y-3">
                     <label className="text-xs font-bold text-white">4. Structure (0-1 Pts)</label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={() => setStructVal(1)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", structVal === 1 ? "bg-[#1ED760]/10 border-[#1ED760] text-[#1ED760]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">1 Pt</span> Clear continuation/shift
                        </button>
                        <button onClick={() => setStructVal(0)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", structVal === 0 ? "bg-[#E5534B]/10 border-[#E5534B] text-[#E5534B]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">0 Pts</span> Messy / Unclear
                        </button>
                     </div>
                  </div>

                  {/* Confirmation */}
                  <div className="space-y-3">
                     <label className="text-xs font-bold text-white">5. Confirmation (0-2 Pts)</label>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button onClick={() => setConfVal(2)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", confVal === 2 ? "bg-[#1ED760]/10 border-[#1ED760] text-[#1ED760]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">2 Pts</span> Strong engulf/rejection
                        </button>
                        <button onClick={() => setConfVal(1)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", confVal === 1 ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">1 Pt</span> Weak reaction
                        </button>
                        <button onClick={() => setConfVal(0)} className={cn("p-3 rounded-xl border text-xs text-left transition-all", confVal === 0 ? "bg-[#E5534B]/10 border-[#E5534B] text-[#E5534B]" : "bg-black/40 border-white/10 text-gray-400 hover:border-white/30")}>
                           <span className="block font-bold mb-1">0 Pts</span> No confirmation
                        </button>
                     </div>
                  </div>

               </div>
            </div>

            {/* Section 5: Execution Plan */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-5">
                  <Activity className="w-4 h-4 text-white" /> 5. Execution Plan
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Entry</label>
                    <input type="text" value={entry} onChange={e => setEntry(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none tnum" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Stop Loss (px)</label>
                    <input type="text" value={sl} onChange={e => setSl(e.target.value)} placeholder="15" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E5534B] focus:border-[#E5534B] outline-none tnum" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Take Profit (px)</label>
                    <input type="text" value={tp} onChange={e => setTp(e.target.value)} placeholder="30" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#1ED760] focus:border-[#1ED760] outline-none tnum" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Risk %</label>
                    <input type="text" value={riskPct} onChange={e => setRiskPct(e.target.value)} placeholder="0.5%" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none tnum" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Lot Size</label>
                    <input type="text" value={lotSize} onChange={e => setLotSize(e.target.value)} placeholder="1.00" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none tnum" />
                  </div>
               </div>
            </div>

            {/* Section 6: Review */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-white" /> 6. Post-Trade Review
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <label className="text-[10px] text-gray-500 uppercase tracking-widest">Result</label>
                         <select value={result} onChange={e => setResult(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none">
                            <option value="">Pending</option>
                            <option value="Win">Win</option>
                            <option value="Loss">Loss</option>
                            <option value="BE">Break Even</option>
                         </select>
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] text-gray-500 uppercase tracking-widest">R Multiple</label>
                         <input type="text" value={rMult} onChange={e => setRMult(e.target.value)} placeholder="+2R" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none tnum" />
                       </div>
                     </div>
                     <div className="flex gap-4">
                       <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                          <input type="checkbox" checked={followedRules} onChange={e => setFollowedRules(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-transparent text-blue-500 focus:ring-0" />
                          Followed all rules?
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                          <input type="checkbox" checked={hasSc} onChange={e => setHasSc(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-transparent text-blue-500 focus:ring-0" />
                          Screenshot attached
                       </label>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-1.5">
                       <label className="text-[10px] text-gray-500 uppercase tracking-widest flex justify-between">
                         Emotion Level <span className="text-white">{emotion}/10</span>
                       </label>
                       <input type="range" min="1" max="10" value={emotion} onChange={e => setEmotion(e.target.value)} className="w-full accent-blue-500" />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[10px] text-gray-500 uppercase tracking-widest">Mistake (if any)</label>
                       <input type="text" value={mistake} onChange={e => setMistake(e.target.value)} placeholder="e.g. FOMO entry, moved SL..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                     </div>
                  </div>
               </div>
            </div>

          </div>

          {/* Right Layout Column */}
          <div className="space-y-6">
             
            {/* Section 3: Logic Box */}
            <div className={cn("p-6 rounded-2xl border backdrop-blur-md text-center flex flex-col items-center justify-center min-h-[180px] shadow-2xl transition-all duration-500", totalScore >= 9 ? "bg-[#1ED760]/10 border-[#1ED760]/30" : totalScore >= 7 ? "bg-blue-500/10 border-blue-500/30" : "bg-[#E5534B]/10 border-[#E5534B]/30")}>
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> 3. Decision Logic
               </h3>
               <motion.div key={totalScore} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2">
                 <p className={cn("text-6xl font-black tracking-tighter drop-shadow-xl", color)}>{rating}</p>
                 <p className="text-white font-bold mt-2">{feedback}</p>
                 {totalScore >= 7 ? (
                   <p className="text-xs text-gray-400 mt-2 font-medium">Risk Recommendation: <span className="text-white">{riskRec}</span></p>
                 ) : (
                   <p className="text-xs text-[#E5534B] mt-2 font-bold px-3 py-1 bg-[#E5534B]/20 rounded-full border border-[#E5534B]/30">STOP. DO NOT ENTER MARKET.</p>
                 )}
               </motion.div>
            </div>

            {/* Section 4: Checklist Box */}
            <div className={cn("p-6 rounded-2xl border transition-all duration-300", isAllChecked ? "bg-[#1ED760]/5 border-[#1ED760]/20" : "bg-white/[0.02] border-white/5")}>
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> 4. Checklist
                  </div>
                  {isAllChecked && <span className="text-[10px] text-[#1ED760] font-black tracking-widest py-1 px-2 bg-[#1ED760]/10 rounded border border-[#1ED760]/20">ALL CLEAR</span>}
               </h3>
               <div className="space-y-3 text-sm">
                  {[
                    { state: chkBias, set: setChkBias, label: 'Bias is clear' },
                    { state: chkCnf, set: setChkCnf, label: 'Min 2 confluences' },
                    { state: chkFvg, set: setChkFvg, label: 'Valid FVG identified' },
                    { state: chkConf, set: setChkConf, label: 'Confirmation candle' },
                    { state: chkSes, set: setChkSes, label: 'Session is London/NY' },
                    { state: chkRisk, set: setChkRisk, label: 'Risk calculated limits' },
                    { state: chkSl, set: setChkSl, label: 'Stop Loss defined' },
                  ].map((item, idx) => (
                    <label key={idx} className={cn("flex items-center gap-3 cursor-pointer group p-2 rounded-lg transition-colors", item.state ? "bg-[#1ED760]/10" : "hover:bg-white/5")}>
                      <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", item.state ? "bg-[#1ED760] border-[#1ED760]" : "border-gray-600 group-hover:border-white")}>
                        {item.state && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <span className={cn("font-medium transition-colors", item.state ? "text-[#1ED760]" : "text-gray-400 group-hover:text-gray-300")}>{item.label}</span>
                      <input type="checkbox" className="hidden" checked={item.state} onChange={e => item.set(e.target.checked)} />
                    </label>
                  ))}
               </div>
               
               {!isAllChecked && (
                 <div className="mt-5 p-3 rounded-xl bg-[#E5534B]/10 border border-[#E5534B]/20 flex items-start gap-3">
                   <AlertCircle className="w-4 h-4 text-[#E5534B] flex-shrink-0 mt-0.5" />
                   <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-relaxed">If ANY of these are unchecked, you do not have permission to trade.</p>
                 </div>
               )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
