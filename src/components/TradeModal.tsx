import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAccountContext } from "../contexts/AccountContext";
import { useStrategies } from "../contexts/StrategyContext";
import { cn } from "../lib/utils";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trade: any) => void;
  trade?: any;
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

  useEffect(() => {
    if (trade) {
      setAccountId(trade.accountId || selectedAccountId || (accounts[0]?.id || ""));
      setSelectedDate(parseDateForPicker(trade.date));
      setSymbol(trade.symbol);
      setAction(trade.action);
      setSize(trade.size.replace(" Lot", "").replace(" Lots", ""));
      setEntry(trade.entry !== undefined ? trade.entry.toString() : "");
      setExit(trade.exit !== undefined ? trade.exit.toString() : "");
      setPnl(trade.pnl !== undefined ? trade.pnl.toString() : "");
      setCommission(trade.commission !== undefined ? trade.commission.toString() : "");
      setSession(trade.session || "Else");
      setConfidence(trade.confidence || "High");
      setDuration(trade.duration || "");
      setTags(trade.tags || (trade.tag ? [trade.tag] : []));
      setStrategy(trade.strategy || "");
    } else {
      setAccountId(selectedAccountId || (accounts[0]?.id || ""));
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
  }, [trade, isOpen, selectedAccountId, accounts]);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
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
    
    let formattedDate = "Today, 12:00:00";
    if (selectedDate) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(selectedDate.getHours())}:${pad(selectedDate.getMinutes())}:${pad(selectedDate.getSeconds())}`;
      
      const today = new Date();
      const isToday = selectedDate.getDate() === today.getDate() && 
                      selectedDate.getMonth() === today.getMonth() && 
                      selectedDate.getFullYear() === today.getFullYear();
                      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = selectedDate.getDate() === yesterday.getDate() && 
                          selectedDate.getMonth() === yesterday.getMonth() && 
                          selectedDate.getFullYear() === yesterday.getFullYear();

      if (isToday) {
        formattedDate = `Today, ${timeStr}`;
      } else if (isYesterday) {
        formattedDate = `Yesterday, ${timeStr}`;
      } else {
        const month = selectedDate.toLocaleString('default', { month: 'short' });
        formattedDate = `${month} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
      }
    }

    const finalPnl = pnl ? parseFloat(pnl) : 0;
    const isPositive = finalPnl >= 0;

    if (trade) {
      const updatedTrade = {
        ...trade,
        accountId: accountId || undefined,
        date: formattedDate,
        symbol,
        action,
        size: `${parseFloat(size || "1").toFixed(2)} Lot`,
        entry: entry || undefined,
        exit: exit || undefined,
        result: `${isPositive ? '+' : '-'}$${Math.abs(finalPnl).toFixed(2)}`,
        isPositive,
        pnl: finalPnl,
        commission: commission ? parseFloat(commission) : undefined,
        session,
        confidence,
        duration: duration || undefined,
        tags,
        tag: tags[0] || undefined,
        strategy: strategy || undefined,
      };
      onSubmit(updatedTrade);
    } else {
      const newTrade = {
        accountId: accountId || undefined,
        date: formattedDate,
        symbol,
        action,
        size: `${parseFloat(size || "1").toFixed(2)} Lot`,
        entry: entry || "0.0000",
        exit: exit || "0.0000",
        result: `${isPositive ? '+' : '-'}$${Math.abs(finalPnl).toFixed(2)}`,
        isPositive,
        pnl: finalPnl,
        commission: commission ? parseFloat(commission) : undefined,
        session,
        confidence,
        duration: duration || "",
        tags,
        tag: tags[0] || "",
        strategy,
      };
      onSubmit(newTrade);
    }
    
    onClose();
  };

  const inputClass = "w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 font-semibold focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all shadow-2xs";
  const labelClass = "text-xs font-semibold text-gray-900 dark:text-white block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#16181f] w-full max-w-lg rounded-3xl border border-gray-200/90 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{trade ? 'Edit Trade' : 'Log New Trade'}</h2>
            <p className="text-xs text-gray-400">Record execution details, metrics, and strategy</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar flex-1">
          {/* Account Selection */}
          {accounts.length > 0 && (
            <div>
              <label className={labelClass}>Trading Account</label>
              <select 
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={inputClass}
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.firm} — {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className={labelClass}>Date & Time</label>
            <div className="w-full">
              <DatePicker
                selected={selectedDate}
                onChange={(d) => setSelectedDate(d)}
                showTimeSelect
                timeFormat="h:mm aa"
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMMM d, yyyy h:mm aa"
                className={inputClass}
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {/* Symbol & Action */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Symbol</label>
              <select 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className={inputClass}
              >
                <option value="EURUSD">EURUSD</option>
                <option value="XAUUSD">XAUUSD</option>
                <option value="GBPUSD">GBPUSD</option>
                <option value="USDJPY">USDJPY</option>
                <option value="USDCAD">USDCAD</option>
                <option value="GBPJPY">GBPJPY</option>
                <option value="EURJPY">EURJPY</option>
                <option value="AUDUSD">AUDUSD</option>
                <option value="NZDUSD">NZDUSD</option>
                <option value="USDCHF">USDCHF</option>
                <option value="US30">US30</option>
                <option value="NAS100">NAS100</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Order Direction</label>
              <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setAction("BUY")}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                    action === "BUY" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  BUY (LONG)
                </button>
                <button
                  type="button"
                  onClick={() => setAction("SELL")}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                    action === "SELL" ? "bg-rose-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  SELL (SHORT)
                </button>
              </div>
            </div>
          </div>

          {/* Entry & Exit */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Entry Price</label>
              <input 
                type="number" 
                step="0.00001"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className={inputClass}
                placeholder="e.g. 1.08500"
              />
            </div>
            <div>
              <label className={labelClass}>Exit Price</label>
              <input 
                type="number" 
                step="0.00001"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                className={inputClass}
                placeholder="e.g. 1.09000"
              />
            </div>
          </div>

          {/* Size & P&L & Commission */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Size (Lots)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputClass}
                placeholder="1.00"
                required
              />
            </div>
            <div>
              <label className={labelClass}>P&L ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                className={inputClass}
                placeholder="150.00"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Comms ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className={inputClass}
                placeholder="-5.00"
              />
            </div>
          </div>

          {/* Session, Confidence, Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Session</label>
              <select 
                value={session}
                onChange={(e) => setSession(e.target.value as any)}
                className={inputClass}
              >
                <option value="London">London</option>
                <option value="NY">NY</option>
                <option value="Asian">Asian</option>
                <option value="Else">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Confidence</label>
              <select 
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as any)}
                className={inputClass}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Duration</label>
              <input 
                type="text" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={inputClass}
                placeholder="1h 30m"
              />
            </div>
          </div>

          {/* Strategy Selection */}
          <div>
            <label className={labelClass}>Strategy Playbook</label>
            <select 
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Select Strategy --</option>
              {strategies.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Add Setup Tags (Press Enter)</label>
            <input 
              type="text" 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className={inputClass}
              placeholder="e.g. BREAKOUT, FVG, TREND"
            />
          </div>

          {/* Tags Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span 
                  key={t} 
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl text-xs font-semibold"
                >
                  {t}
                  <button 
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-rose-600 transition-colors cursor-pointer"
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
            className={cn(
              "mt-2 w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-xs transition-all cursor-pointer",
              action === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            )}
          >
            {trade ? 'Save Changes' : `Execute ${action} ${symbol}`}
          </button>
        </form>
      </div>
    </div>
  );
}
