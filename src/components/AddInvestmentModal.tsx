import React, { useState, useEffect } from 'react';
import { X, Plus, DollarSign, Layers, Target, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { Holding } from '../hooks/useInvestments';
import { fetchIndianStockQuote } from '../lib/indianApi';

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: Omit<Holding, 'id'>) => void;
}

export function AddInvestmentModal({ isOpen, onClose, onAdd }: AddInvestmentModalProps) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<Holding['type']>('Equity');
  const [term, setTerm] = useState<Holding['term']>('Long Term');
  const [quantity, setQuantity] = useState<string>('');
  const [avgBuyPrice, setAvgBuyPrice] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [sector, setSector] = useState<Holding['sector']>('Financials');
  const [marketCap, setMarketCap] = useState<Holding['marketCap']>('Large Cap');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [thesis, setThesis] = useState('');
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live lookup from IndianAPI when typing symbol
  const handleSymbolBlur = async () => {
    if (!symbol || symbol.length < 2) return;
    setIsFetchingQuote(true);
    try {
      const quote = await fetchIndianStockQuote(symbol);
      if (quote) {
        if (!name && quote.companyName) setName(quote.companyName);
        if (quote.currentPrice) {
          setCurrentPrice(String(quote.currentPrice));
          if (!avgBuyPrice) setAvgBuyPrice(String(quote.currentPrice));
        }
      }
    } catch (e) {
      // Ignore
    } finally {
      setIsFetchingQuote(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name || !quantity || !avgBuyPrice) return;

    const qty = parseFloat(quantity) || 1;
    const buyPrice = parseFloat(avgBuyPrice) || 0;
    const currPrice = currentPrice ? parseFloat(currentPrice) : buyPrice;

    onAdd({
      symbol: symbol.toUpperCase().trim(),
      name: name.trim(),
      exchange: 'NSE',
      type,
      term,
      quantity: qty,
      avgBuyPrice: buyPrice,
      currentPrice: currPrice,
      dayChangePercent: 0.5,
      sector,
      marketCap,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      thesis: thesis.trim() || undefined,
      scores: {
        overall: 80,
        fundamentals: 82,
        valuation: 75,
        growth: 84,
        risk: 76,
        conviction: 88
      }
    });

    onClose();
  };

  const inputClass = "w-full bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all";
  const labelClass = "text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Add Investment Holding
            </h3>
            <p className="text-xs text-gray-400">Track equity, ETF, mutual fund, or commodity</p>
          </div>
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
          
          {/* Term Toggle */}
          <div>
            <label className={labelClass}>Investment Horizon</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-200/80 dark:border-neutral-700">
              {(['Short Term', 'Long Term'] as const).map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTerm(t)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${term === t ? 'bg-[#111827] dark:bg-white text-white dark:text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>Symbol / Ticker *</label>
                {isFetchingQuote && (
                  <span className="text-[10px] text-blue-500 flex items-center gap-1 font-medium">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Fetching Live LTP...
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. RELIANCE"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                onBlur={handleSymbolBlur}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Asset Name *</label>
              <input
                type="text"
                placeholder="e.g. Reliance Industries"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Type & Sector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Asset Type</label>
              <select value={type} onChange={e => setType(e.target.value as any)} className={inputClass}>
                <option value="Equity">Equity (Stock)</option>
                <option value="ETF">ETF</option>
                <option value="Mutual Fund">Mutual Fund</option>
                <option value="Gold / SGB">Gold / SGB</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Sector</label>
              <select value={sector} onChange={e => setSector(e.target.value as any)} className={inputClass}>
                <option value="Financials">Financials</option>
                <option value="IT">IT & Tech</option>
                <option value="Energy">Energy & Oil</option>
                <option value="Consumer">Consumer Goods</option>
                <option value="Healthcare">Healthcare & Pharma</option>
                <option value="Automobile">Automobile</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          {/* Market Cap */}
          <div>
            <label className={labelClass}>Market Capitalization</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Large Cap', 'Mid Cap', 'Small Cap'] as const).map(mc => (
                <button
                  type="button"
                  key={mc}
                  onClick={() => setMarketCap(mc)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${marketCap === mc ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 font-bold' : 'border-gray-200 dark:border-neutral-700 text-gray-500'}`}
                >
                  {mc}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Buy Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity *</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 25"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Avg Buy Price (₹) *</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 2450.00"
                value={avgBuyPrice}
                onChange={e => setAvgBuyPrice(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Current Price & Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Current Market Price (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="Leave blank for same"
                value={currentPrice}
                onChange={e => setCurrentPrice(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Target Exit Price (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 3100.00"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Stop Loss & Thesis */}
          <div>
            <label className={labelClass}>Stop Loss / Floor Price (₹)</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 2150.00"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Investment Thesis & Catalyst</label>
            <textarea
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              placeholder="Why are you allocating capital here? What is the expected growth story?"
              className={`${inputClass} h-20 resize-none`}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#111827] dark:bg-white text-white dark:text-gray-900 font-bold text-xs rounded-2xl shadow-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Portfolio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
