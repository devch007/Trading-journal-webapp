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
  TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TopBar } from "../lib/TopBar";
import { cn } from "../lib/utils";
import { TradeQualityMeter } from "../components/TradeQualityMeter";
import { useTrades, Trade } from "../hooks/useTrades";

export function Journal() {
  const { trades: allTrades, loading, updateTrades } = useTrades();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo(() => {
    let filtered = allTrades;
    
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

    return filtered;
  }, [allTrades, activeTab, searchQuery]);

  useEffect(() => {
    if (entries.length > 0 && !selectedId) {
      setSelectedId(entries[0].id);
    } else if (entries.length === 0) {
      setSelectedId(null);
    }
  }, [entries, selectedId]);

  const selectedEntry = entries.find(e => e.id === selectedId) || entries[0];

  const updateEntry = (updates: Partial<Trade>) => {
    if (selectedId) {
      updateTrades([selectedId], updates);
    }
  };

  const defaultChecklist = [
    {label: "Checked higher timeframe", checked: false}, 
    {label: "Risk within limits", checked: false}, 
    {label: "Fits my trading plan", checked: false}, 
    {label: "Key levels identified", checked: false}, 
    {label: "Economic calendar checked", checked: false}
  ];

  const normalizedEntry = useMemo(() => {
    if (!selectedEntry) return null;
    return {
      ...selectedEntry,
      strategy: selectedEntry.strategy || "SCALP",
      notes: selectedEntry.notes || "",
      emotions: selectedEntry.emotions || [],
      tags: selectedEntry.tags || (selectedEntry.tag ? [selectedEntry.tag] : []),
      proof: selectedEntry.proof || null,
      rating: selectedEntry.rating || 0,
      checklist: selectedEntry.checklist || defaultChecklist,
      tradeType: selectedEntry.tradeType || (selectedEntry.tag || "Scalp"),
      entryPrice: selectedEntry.entry || "0.0000",
      exitPrice: selectedEntry.exit || "0.0000",
      duration: selectedEntry.duration || "0h 0m",
      date: selectedEntry.date && !selectedEntry.date.startsWith('Today') 
        ? selectedEntry.date 
        : (selectedEntry.createdAt?.toDate ? selectedEntry.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : "UNKNOWN DATE"),
      type: selectedEntry.action === "BUY" ? "LONG" : "SHORT"
    };
  }, [selectedEntry]);

  const formatDate = (trade: Trade) => {
    if (trade.date && !trade.date.startsWith('Today')) return trade.date;
    if (trade.createdAt && typeof trade.createdAt.toDate === 'function') {
      return trade.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    }
    return "UNKNOWN DATE";
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateEntry({ proof: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-10 relative overflow-hidden">
      {/* Immersive Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <TopBar 
        title="Trade Analysis" 
        subtitle="In-depth Performance Review" 
        showSearch={true}
      />

      <div className="px-8 flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 relative z-10">
        
        {/* Left Column: List */}
        <div className="flex flex-col gap-6 h-[calc(100vh-180px)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-white uppercase tracking-wider text-sm">Trade Logs</h3>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">{entries.length}</span>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          <div className="glass-card p-1 rounded-xl flex bg-black/20 border border-white/5 mb-2">
            {["All", "Journaled", "Pending"].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                  activeTab === tab 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs uppercase tracking-widest font-bold">Loading Trades...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                <Target className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs uppercase tracking-widest font-bold opacity-50">No trades found</p>
              </div>
            ) : (
              entries.map(entry => (
                <motion.div 
                  key={entry.id} 
                  layoutId={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className={cn(
                    "relative group cursor-pointer rounded-2xl border transition-all duration-300",
                    selectedId === entry.id 
                      ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                      : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                  )}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-headline text-lg text-white tracking-tight">{entry.symbol}</h4>
                        <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest mt-0.5">{formatDate(entry)}</p>
                      </div>
                      <div className={cn(
                        "font-data font-bold text-base",
                        entry.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      )}>
                        {entry.pnl >= 0 ? "+" : ""}{entry.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                        entry.action === 'BUY' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {entry.action === 'BUY' ? 'LONG' : 'SHORT'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-label uppercase tracking-widest">
                        {entry.strategy || entry.tag || "SCALP"}
                      </span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  </div>
                  
                  {selectedId === entry.id && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                    />
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Detail */}
        <div className="flex flex-col h-[calc(100vh-180px)] glass-card rounded-2xl border border-white/5 overflow-hidden bg-black/20 backdrop-blur-xl">
          {!normalizedEntry ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-12 text-center">
              <Target className="w-16 h-16 mb-6 opacity-10" />
              <h3 className="text-xl font-headline text-white/50 mb-2">Select a trade to analyze</h3>
              <p className="text-sm max-w-xs">Choose a trade from the list on the left to view detailed performance metrics and journal entries.</p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                    <Target className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-headline text-3xl text-white tracking-tighter">{normalizedEntry.symbol}</h2>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        normalizedEntry.pnl >= 0 ? "bg-primary/20 text-primary border border-primary/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      )}>
                        {normalizedEntry.pnl >= 0 ? "Winner" : "Loser"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-on-surface-variant">
                      <span className="text-[10px] font-label uppercase tracking-widest flex items-center gap-1.5">
                        {normalizedEntry.pnl >= 0 ? <TrendingUp className="w-3 h-3 text-primary" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                        {normalizedEntry.type} Position
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[10px] font-label uppercase tracking-widest flex items-center gap-1.5">
                        <CalendarIcon className="w-3 h-3" />
                        {normalizedEntry.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest mb-1">Total P&L</p>
                  <h3 className={cn(
                    "font-headline text-3xl tracking-tighter",
                    normalizedEntry.pnl >= 0 ? "text-primary" : "text-rose-400"
                  )}>
                    {normalizedEntry.pnl >= 0 ? "+" : ""}{normalizedEntry.pnl.toFixed(2)}
                  </h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                
                {/* Trade Quality Analysis */}
                <TradeQualityMeter 
                  pnl={normalizedEntry.pnl}
                  rating={normalizedEntry.rating}
                  checklist={normalizedEntry.checklist}
                  notes={normalizedEntry.notes}
                  emotions={normalizedEntry.emotions}
                  proof={normalizedEntry.proof}
                />

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: "Symbol", value: normalizedEntry.symbol, icon: Target },
                    { label: "Entry", value: normalizedEntry.entryPrice, field: "entry", icon: ArrowUpRight },
                    { label: "Exit", value: normalizedEntry.exitPrice, field: "exit", icon: ArrowDownRight },
                    { label: "Duration", value: normalizedEntry.duration, field: "duration", icon: Clock }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white/5 p-5 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className="w-3 h-3 text-gray-500 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest">{item.label}</span>
                      </div>
                      {item.field ? (
                        <input 
                          value={item.value} 
                          onChange={e => updateEntry({ [item.field!]: e.target.value })} 
                          className="bg-transparent font-data font-bold text-lg text-white w-full focus:outline-none border-b border-transparent focus:border-primary/50 transition-all" 
                        />
                      ) : (
                        <div className="font-data font-bold text-lg text-white">{item.value}</div>
                      )}
                    </div>
                  ))}
                </div>

            {/* Trade Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-3 h-3 text-primary" /> Trade Type
                </label>
                <select 
                  value={normalizedEntry.tradeType}
                  onChange={e => updateEntry({ tradeType: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                >
                  <option>Scalp</option>
                  <option>Trend Following</option>
                  <option>Breakout</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-3 h-3 text-primary" /> Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {normalizedEntry.tags.map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary uppercase tracking-wider">
                      {tag}
                      <button 
                        onClick={() => updateEntry({ tags: normalizedEntry.tags.filter((t: string) => t !== tag) })}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                        if (val && !normalizedEntry.tags.includes(val)) {
                          updateEntry({ tags: [...normalizedEntry.tags, val] });
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all" 
                    placeholder="Add tag and press Enter..." 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest flex items-center gap-2">
                    <Star className="w-3 h-3 text-amber-400" /> Rating
                  </label>
                  <span className="text-xs font-bold text-white">{normalizedEntry.rating}/10</span>
                </div>
                <div className="pt-2">
                  <input 
                    type="range" min="1" max="10" value={normalizedEntry.rating}
                    onChange={e => updateEntry({ rating: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>

            {/* Emotions */}
            <div className="space-y-4">
              <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest flex items-center gap-2">
                <Smile className="w-3 h-3 text-primary" /> Psychological State
              </label>
              <div className="flex gap-4">
                {['😰', '😥', '😎', '😐', '🤯'].map(emo => (
                  <button 
                    key={emo} 
                    onClick={() => updateEntry({ emotions: normalizedEntry.emotions.includes(emo) ? normalizedEntry.emotions.filter(e => e !== emo) : [...normalizedEntry.emotions, emo] })}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 border",
                      normalizedEntry.emotions.includes(emo) 
                        ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-110" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest flex items-center gap-2">
                  <CheckSquare className="w-3 h-3 text-primary" /> Execution Checklist
                </label>
                <span className="text-xs font-bold text-emerald-400">{normalizedEntry.checklist.filter(c => c.checked).length}/5 Complete</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {normalizedEntry.checklist.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => updateEntry({ checklist: normalizedEntry.checklist.map((c, i) => i === idx ? {...c, checked: !c.checked} : c) })}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all group",
                      item.checked 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-white/5 border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="mb-3">
                      {item.checked 
                        ? <CheckSquare className="w-5 h-5 text-emerald-400" /> 
                        : <Square className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />
                      }
                    </div>
                    <div className={cn(
                      "text-[10px] font-bold leading-tight uppercase tracking-tight",
                      item.checked ? "text-emerald-400" : "text-gray-500"
                    )}>
                      {item.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-3 h-3 text-primary" /> Trade Notes
              </label>
              <textarea 
                value={normalizedEntry.notes}
                onChange={e => updateEntry({ notes: e.target.value })}
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-gray-300 focus:outline-none focus:border-primary/50 transition-all resize-none leading-relaxed" 
                placeholder="Describe your mindset, market conditions, and why you took this setup..." 
              />
            </div>

            {/* Proof */}
            <div className="space-y-3">
              <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-3 h-3 text-primary" /> Trade Proof
              </label>
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-white/10 rounded-2xl h-64 flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer overflow-hidden"
              >
                {normalizedEntry.proof ? (
                  <div className="relative w-full h-full">
                    <img src={normalizedEntry.proof} alt="Proof" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white font-bold text-sm">Click to change screenshot</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateEntry({ proof: null }); }} 
                      className="absolute top-4 right-4 bg-rose-500 p-2 rounded-xl shadow-lg hover:bg-rose-600 transition-colors z-20"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
                      <UploadCloud className="w-8 h-8 text-gray-500 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-white text-sm">Drag and drop screenshots</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">PNG, JPG, SVG up to 10MB</p>
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
        </>
      )}
    </div>
      </div>
    </div>
  );
}

// Missing icons from lucide-react in the original imports
const Clock = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ArrowUpRight = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const ArrowDownRight = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="7" y1="7" x2="17" y2="17" />
    <polyline points="17 7 17 17 7 17" />
  </svg>
);
