import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Bell, 
  UploadCloud, 
  X, 
  Star, 
  CheckSquare, 
  Square, 
  Smile,
  Search,
  Filter,
  Calendar as CalendarIcon,
  Tag,
  Target,
  MessageSquare,
  Image as ImageIcon,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TopBar } from "../lib/TopBar";
import { cn } from "../lib/utils";
import { TradeQualityMeter } from "../components/TradeQualityMeter";
import { useTrades, Trade } from "../hooks/useTrades";
import { useNavigate } from "react-router-dom";
import { useAccountContext } from "../contexts/AccountContext";
import { getTradeDate } from "../lib/timeUtils";

export function Journal() {
  const { trades: allTrades, loading, updateTrades, fetchTradeProof } = useTrades();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proofCache, setProofCache] = useState<Record<string, string>>({});
  const [isProofLoading, setIsProofLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { selectedAccountId } = useAccountContext();

  const entries = useMemo(() => {
    let filtered = allTrades;
    
    if (selectedAccountId) {
      filtered = filtered.filter(t => t.accountId === selectedAccountId);
    }
    
    if (activeTab === "Journaled") {
      filtered = filtered.filter(t => t.notes || t.rating || (t.emotions && t.emotions.length > 0));
    } else if (activeTab === "Pending") {
      filtered = filtered.filter(t => !t.notes && !t.rating && (!t.emotions || t.emotions.length === 0));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.symbol.toLowerCase().includes(q) || 
        (t.strategy && t.strategy.toLowerCase().includes(q)) ||
        (t.tag && t.tag.toLowerCase().includes(q)) ||
        (t.tags && Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    return filtered.sort((a, b) => {
      const dateA = getTradeDate(a.date || a.createdAt || new Date().toISOString());
      const dateB = getTradeDate(b.date || b.createdAt || new Date().toISOString());
      return dateB.getTime() - dateA.getTime();
    });
  }, [allTrades, activeTab, searchQuery, selectedAccountId]);

  useEffect(() => {
    if (entries.length > 0 && !selectedId) {
      setSelectedId(entries[0].id);
    } else if (entries.length === 0) {
      setSelectedId(null);
    }
  }, [entries, selectedId]);

  const selectedEntry = entries.find(e => e.id === selectedId) || entries[0];

  useEffect(() => {
    if (selectedId && !proofCache[selectedId]) {
      const loadProof = async () => {
        setIsProofLoading(true);
        const proof = await fetchTradeProof(selectedId);
        if (proof) {
          setProofCache(prev => ({ ...prev, [selectedId]: proof }));
        }
        setIsProofLoading(false);
      };
      loadProof();
    }
  }, [selectedId, fetchTradeProof]);

  const updateEntry = (updates: Partial<Trade>) => {
    if (!selectedId) return;
    
    if (updates.proof) {
      setProofCache(prev => ({ ...prev, [selectedId]: updates.proof as string }));
    } else if (updates.proof === null) {
      setProofCache(prev => {
        const next = { ...prev };
        delete next[selectedId];
        return next;
      });
    }

    updateTrades([selectedId], updates);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateEntry({ proof: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (entry: any) => {
    const d = getTradeDate(entry.date || entry.createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const normalizedEntry = selectedEntry ? {
    id: selectedEntry.id,
    symbol: selectedEntry.symbol,
    pnl: Number(selectedEntry.pnl) || 0,
    type: selectedEntry.action || "BUY",
    date: formatDate(selectedEntry),
    entryPrice: selectedEntry.entry || "—",
    exitPrice: selectedEntry.exit || "—",
    duration: selectedEntry.duration || "1h 30m",
    tradeType: selectedEntry.tag || "Scalp",
    tags: selectedEntry.tags || (selectedEntry.tag ? [selectedEntry.tag] : []),
    rating: selectedEntry.rating || 7,
    emotions: selectedEntry.emotions || ['😎'],
    notes: selectedEntry.notes || "",
    proof: proofCache[selectedEntry.id] || selectedEntry.proof || "",
    sentiment: selectedEntry.sentiment || "",
    checklist: selectedEntry.checklist || [
      { label: "Followed Trading Plan", checked: true },
      { label: "Risk within Limits (≤1%)", checked: true },
      { label: "Clear Exit Criteria", checked: true },
      { label: "Patience & No FOMO", checked: false },
      { label: "Positive Mindset", checked: true },
    ]
  } : null;

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="Trade Analysis & Journal" 
        subtitle="In-depth Performance Review" 
        showSearch={true}
      />

      <div className="p-6 md:p-8 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column: Trade Logs List (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Trade Logs</h3>
              <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums">
                {entries.length}
              </span>
            </div>
          </div>

          {/* Segmented Filter Pills */}
          <div className="bg-white dark:bg-[#16181f] p-1 rounded-2xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs flex items-center gap-1">
            {["All", "Journaled", "Pending"].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  activeTab === tab 
                    ? "bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-xs" 
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#16181f] border border-gray-200/90 dark:border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 font-normal focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 shadow-2xs transition-all"
            />
          </div>

          {/* Scrollable List */}
          <div className="overflow-y-auto space-y-3 no-scrollbar max-h-[calc(100vh-280px)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <p className="text-xs font-medium">Loading trades...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 p-8 text-center shadow-2xs">
                <Target className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No trades found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Filter criteria returned 0 results</p>
              </div>
            ) : (
              entries.map(entry => {
                const isPos = Number(entry.pnl) >= 0;
                const isSelected = selectedId === entry.id;
                return (
                  <motion.div 
                    key={entry.id} 
                    onClick={() => setSelectedId(entry.id)}
                    className={cn(
                      "p-4 rounded-3xl border transition-all duration-200 cursor-pointer shadow-2xs",
                      isSelected 
                        ? "bg-white dark:bg-[#16181f] border-blue-500/80 shadow-md ring-1 ring-blue-500/30" 
                        : "bg-white dark:bg-[#16181f] border-gray-200/80 dark:border-neutral-800/80 hover:border-gray-300 dark:hover:border-neutral-700"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{entry.symbol}</h4>
                        <p className="text-[11px] text-gray-400 font-normal tabular-nums">{formatDate(entry)}</p>
                      </div>
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      )}>
                        {isPos ? "+" : ""}${Math.abs(Number(entry.pnl) || 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        entry.action === 'BUY' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                      )}>
                        {entry.action === 'BUY' ? 'LONG' : 'SHORT'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium truncate max-w-[130px]">
                        {entry.strategy || entry.tag || "Scalp"}
                      </span>
                      <div className="ml-auto">
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detail View (8 COLS) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden flex flex-col">
          {!normalizedEntry ? (
            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
              <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Select a trade to inspect</h3>
              <p className="text-xs text-gray-400 max-w-xs">Choose any trade log from the left panel to review notes, psychology, and screenshot proof.</p>
            </div>
          ) : (
            <div className="p-6 md:p-8 space-y-8 overflow-y-auto no-scrollbar max-h-[calc(100vh-200px)]">
              
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-neutral-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-xs">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{normalizedEntry.symbol}</h2>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        normalizedEntry.pnl >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                      )}>
                        {normalizedEntry.pnl >= 0 ? "Winner" : "Loser"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-normal mt-0.5">
                      {normalizedEntry.type} Position · {normalizedEntry.date}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-medium text-gray-400">Total Net Result</p>
                  <h3 className={cn(
                    "text-2xl font-bold tabular-nums",
                    normalizedEntry.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                  )}>
                    {normalizedEntry.pnl >= 0 ? "+" : ""}${Math.abs(normalizedEntry.pnl).toFixed(2)}
                  </h3>
                </div>
              </div>

              {/* Trade Quality Breakdown */}
              <TradeQualityMeter 
                pnl={normalizedEntry.pnl}
                rating={normalizedEntry.rating}
                checklist={normalizedEntry.checklist}
                notes={normalizedEntry.notes}
                emotions={normalizedEntry.emotions}
                proof={normalizedEntry.proof}
              />

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[
                  { label: "Symbol", value: normalizedEntry.symbol },
                  { label: "Entry Price", value: normalizedEntry.entryPrice },
                  { label: "Exit Price", value: normalizedEntry.exitPrice },
                  { label: "Duration", value: normalizedEntry.duration }
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800">
                    <p className="text-[10px] font-medium text-gray-400 mb-1">{item.label}</p>
                    <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Execution Rating Slider/Buttons */}
              <div className="bg-gray-50/80 dark:bg-neutral-800/40 p-5 rounded-3xl border border-gray-100 dark:border-neutral-800 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Execution Rating</span>
                  </label>
                  <span className="text-sm font-bold text-amber-500 tabular-nums">
                    {normalizedEntry.rating}/10
                  </span>
                </div>
                
                <div className="flex gap-1.5 h-7">
                  {[...Array(10)].map((_, i) => {
                    const val = i + 1;
                    const isActive = val <= normalizedEntry.rating;
                    return (
                      <button
                        key={val}
                        onClick={() => updateEntry({ rating: val })}
                        className={cn(
                          "flex-1 rounded-lg transition-all text-[10px] font-bold",
                          isActive 
                            ? "bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-2xs" 
                            : "bg-gray-200/80 dark:bg-neutral-700 text-gray-500"
                        )}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Psychological Emotions State */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-blue-500" />
                  <span>Psychological Mindset</span>
                </label>
                <div className="flex gap-3">
                  {['😰', '😥', '😎', '😐', '🤯'].map(emo => (
                    <button 
                      key={emo} 
                      onClick={() => updateEntry({ emotions: normalizedEntry.emotions.includes(emo) ? normalizedEntry.emotions.filter(e => e !== emo) : [...normalizedEntry.emotions, emo] })}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all border",
                        normalizedEntry.emotions.includes(emo) 
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-2xs scale-105" 
                          : "bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 hover:border-gray-400"
                      )}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                    <span>Discipline Checklist</span>
                  </label>
                  <span className="text-xs font-bold text-emerald-600">
                    {normalizedEntry.checklist.filter(c => c.checked).length}/5 Complete
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {normalizedEntry.checklist.map((item, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => updateEntry({ checklist: normalizedEntry.checklist.map((c, i) => i === idx ? {...c, checked: !c.checked} : c) })}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all",
                        item.checked 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300" 
                          : "bg-gray-50 dark:bg-neutral-800/40 border-gray-200/80 dark:border-neutral-800 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {item.checked ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Square className="w-4 h-4 text-gray-400 shrink-0" />}
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade Notes */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>Trade Notes & Reflection</span>
                </label>
                <textarea 
                  key={`${normalizedEntry.id}-notes`}
                  defaultValue={normalizedEntry.notes}
                  onBlur={e => updateEntry({ notes: e.target.value })}
                  className="w-full h-32 bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-neutral-700 rounded-2xl p-4 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all resize-none leading-relaxed" 
                  placeholder="Describe market structure, catalyst, and reasons for entry..." 
                />
              </div>

              {/* Trade Proof Drag and Drop */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span>Trade Chart Screenshot</span>
                </label>
                <div 
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-neutral-700/80 rounded-3xl h-52 flex flex-col items-center justify-center gap-2.5 bg-gray-50/50 dark:bg-neutral-800/20 hover:border-blue-500/60 hover:bg-blue-50/10 transition-all cursor-pointer overflow-hidden group"
                >
                  {normalizedEntry.proof ? (
                    <div className="relative w-full h-full">
                      <img src={normalizedEntry.proof} alt="Proof" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-semibold text-xs">Click to replace screenshot</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateEntry({ proof: null }); }} 
                        className="absolute top-3 right-3 bg-rose-500 p-1.5 rounded-xl shadow-md text-white hover:bg-rose-600 transition-colors z-20"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : isProofLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <p className="text-xs font-medium text-gray-400">Loading proof...</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xs">
                        <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-xs text-gray-800 dark:text-gray-200">Drag and drop trade chart</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP up to 10MB</p>
                      </div>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => updateEntry({ proof: reader.result as string });
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
