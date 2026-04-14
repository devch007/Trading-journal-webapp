import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAccountContext } from "../contexts/AccountContext";
import { useStrategies } from "../contexts/StrategyContext";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trade: any) => void;
  trade?: any; // Optional trade for editing
}

export function TradeModal({ isOpen, onClose, onSubmit, trade }: TradeModalProps) {
  const { accounts, selectedAccountId } = useAccountContext();
  const [accountId, setAccountId] = useState(selectedAccountId || "");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [symbol, setSymbol] = useState("EURUSD");
  const [action, setAction] = useState("BUY");
  const [size, setSize] = useState("1.00");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [pnl, setPnl] = useState("");
  const [commission, setCommission] = useState("");
  const [session, setSession] = useState<'Asian' | 'London' | 'NY' | 'Else'>("Else");
  const [confidence, setConfidence] = useState<'High' | 'Medium' | 'Low'>("High");
  const [duration, setDuration] = useState("");
  const [tags, setTags] = useState<string[]>(["BREAKOUT"]);
  const [tagInput, setTagInput] = useState("");
  const [strategy, setStrategy] = useState("");
  const { strategies } = useStrategies();

  const parseDateForPicker = (dStr: string) => {
    if (!dStr) return null;
    let d = new Date();
    if (dStr.startsWith('Today, ')) {
      const timeParts = dStr.split(', ')[1]?.split(':') || ['00', '00'];
      d.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2] || "0"));
    } else if (dStr.startsWith('Yesterday, ')) {
      d.setDate(d.getDate() - 1);
      const timeParts = dStr.split(', ')[1]?.split(':') || ['00', '00'];
      d.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2] || "0"));
    } else {
      const parsed = new Date(dStr);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
        if (d.getFullYear() < 2020) {
          d.setFullYear(2026);
        }
      }
    }
    return d;
  };

  const formatDateFromPicker = (d: Date | null) => {
    if (!d) return "";
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
      ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  useEffect(() => {
    if (isOpen) {
      if (trade) {
        // Edit mode — load trade data
        setAccountId(trade.accountId || "");
        setSelectedDate(trade.date ? parseDateForPicker(trade.date) : new Date());
        setSymbol(trade.symbol || "EURUSD");
        setAction(trade.action || "BUY");
        setSize(trade.size?.replace(" Lot", "") || "1.00");
        setEntry(trade.entry || "");
        setExit(trade.exit || "");
        setPnl(trade.pnl?.toString() || "0");
        setCommission(trade.commission?.toString() || "");
        setSession(trade.session || "Else");
        setConfidence(trade.confidence || "High");
        setDuration(trade.duration || "");
        setTags(trade.tags || (trade.tag ? [trade.tag] : ["BREAKOUT"]));
        setStrategy(trade.strategy || "");
      } else {
        // New trade mode — reset fields
        if (selectedAccountId) {
          setAccountId(selectedAccountId);
        } else if (accounts.length > 0 && !accountId) {
          setAccountId(accounts[0].id);
        }
        setSelectedDate(new Date());
        setSymbol("EURUSD");
        setAction("BUY");
        setSize("1.00");
        setEntry("");
        setExit("");
        setPnl("");
        setCommission("");
        setSession("Else");
        setConfidence("High");
        setDuration("");
        setTags(["BREAKOUT"]);
        setStrategy("");
      }
    }
  }, [isOpen, trade, selectedAccountId, accounts]);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toUpperCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const pnlNum = parseFloat(pnl) || 0;
    const sizeFormatted = `${parseFloat(size).toFixed(2)} Lot`;
    const isPositive = pnlNum >= 0;

    if (trade) {
      // EDIT: only send the fields we want to update - not the entire trade object
      const formattedDate = selectedDate ? formatDateFromPicker(selectedDate) : trade.date;
      const updates: Record<string, any> = {
        id: trade.id, // needed to identify which trade
        accountId: accountId || trade.accountId,
        date: formattedDate,
        symbol,
        action,
        size: sizeFormatted,
        entry: entry || trade.entry || "",
        exit: exit || trade.exit || "",
        pnl: pnlNum,
        result: `${isPositive ? '+' : '-'}$${Math.abs(pnlNum).toFixed(2)}`,
        isPositive,
        session,
        confidence,
        duration: duration || trade.duration || "",
        tags,
        tag: tags[0] || trade.tag || "",
        strategy,
        commission: parseFloat(commission) || 0,
      };
      onSubmit(updates);
    } else {
      // NEW trade
      const now = new Date();
      const dateStr = selectedDate ? formatDateFromPicker(selectedDate) : (now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
        ', ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      const newTrade = {
        accountId: accountId || undefined,
        date: dateStr,
        symbol,
        action,
        size: sizeFormatted,
        entry: entry || "0.0000",
        exit: exit || "0.0000",
        result: `${isPositive ? '+' : '-'}$${Math.abs(pnlNum).toFixed(2)}`,
        isPositive,
        pnl: pnlNum,
        session,
        confidence,
        duration: duration || "",
        tags,
        tag: tags[0] || "",
        strategy,
        commission: parseFloat(commission) || 0,
      };
      onSubmit(newTrade);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="type-h1">{trade ? 'Edit Trade' : 'New Trade'}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Account Selection */}
          {accounts.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Account</label>
              <select 
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-[#1a1a24]">
                    {acc.firm} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="flex flex-col gap-2 relative z-50">
            <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Date & Time</label>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors w-full">
              <DatePicker
                selected={selectedDate}
                onChange={(d) => setSelectedDate(d)}
                showTimeSelect
                timeFormat="h:mm aa"
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMMM d, yyyy h:mm aa"
                className="bg-transparent border-none text-white tnum focus:outline-none w-full"
                calendarClassName="bg-[#191923] border-white/10 shadow-2xl"
                dayClassName={() => "text-white hover:bg-primary/50"}
                timeClassName={() => "text-white bg-[#191923]"}
                popperClassName="z-[100]"
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {/* Symbol & Action */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Symbol</label>
              <select 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
              >
                <option value="EURUSD" className="bg-[#1a1a24]">EURUSD</option>
                <option value="XAUUSD" className="bg-[#1a1a24]">XAUUSD</option>
                <option value="GBPUSD" className="bg-[#1a1a24]">GBPUSD</option>
                <option value="USDJPY" className="bg-[#1a1a24]">USDJPY</option>
                <option value="USDCAD" className="bg-[#1a1a24]">USDCAD</option>
                <option value="GBPJPY" className="bg-[#1a1a24]">GBPJPY</option>
                <option value="EURJPY" className="bg-[#1a1a24]">EURJPY</option>
                <option value="AUDUSD" className="bg-[#1a1a24]">AUDUSD</option>
                <option value="NZDUSD" className="bg-[#1a1a24]">NZDUSD</option>
                <option value="USDCHF" className="bg-[#1a1a24]">USDCHF</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Action</label>
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setAction("BUY")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${action === "BUY" ? "bg-[#1ED760]/20 text-[#1ED760]" : "text-on-surface-variant hover:text-white"}`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setAction("SELL")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${action === "SELL" ? "bg-[#E5534B]/20 text-[#E5534B]" : "text-on-surface-variant hover:text-white"}`}
                >
                  SELL
                </button>
              </div>
            </div>
          </div>

          {/* Entry & Exit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Entry Price</label>
              <input 
                type="number" 
                step="0.00001"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. 1.08500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Exit Price</label>
              <input 
                type="number" 
                step="0.00001"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. 1.09000"
              />
            </div>
          </div>

          {/* Size & P&L & Commission */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Size (Lots)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="1.00"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">P&L ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. 150.00"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Comms ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. -5.00"
              />
            </div>
          </div>

          {/* Session, Confidence, Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Session</label>
              <select 
                value={session}
                onChange={(e) => setSession(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
              >
                <option value="Asian" className="bg-[#1a1a24]">Asian</option>
                <option value="London" className="bg-[#1a1a24]">London</option>
                <option value="NY" className="bg-[#1a1a24]">NY</option>
                <option value="Else" className="bg-[#1a1a24]">Else</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Confidence</label>
              <select 
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
              >
                <option value="High" className="bg-[#1a1a24]">High</option>
                <option value="Medium" className="bg-[#1a1a24]">Medium</option>
                <option value="Low" className="bg-[#1a1a24]">Low</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Duration</label>
              <input 
                type="text" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white tnum focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. 1h 30m"
              />
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Strategy</label>
            <select 
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors appearance-none"
            >
              <option value="" className="bg-[#1a1a24]">-- Select Strategy --</option>
              {strategies.map(s => (
                <option key={s.id} value={s.name} className="bg-[#1a1a24]">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs type-label text-on-surface-variant uppercase tracking-wider">Add Tag (Press Enter)</label>
            <input 
              type="text" 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-primary/50 transition-colors uppercase"
              placeholder="E.G. BREAKOUT"
            />
          </div>

          {/* Tags Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span 
                  key={t} 
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary group"
                >
                  {t}
                  <button 
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-[#E5534B] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit"
            className={`mt-4 w-full py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] ${action === 'BUY' ? 'bg-[#1ED760] hover:bg-[#1ED760] shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-[#E5534B] hover:bg-[#E5534B] shadow-[0_0_20px_rgba(244,63,94,0.3)]'}`}
          >
            {trade ? 'Save Changes' : `Execute ${action} ${symbol}`}
          </button>
        </form>
      </div>
    </div>
  );
}
