import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  type: 'Equity' | 'Mutual Fund' | 'ETF' | 'Gold / SGB';
  term: 'Short Term' | 'Long Term';
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  dayChangePercent: number;
  sector: 'Financials' | 'IT' | 'Energy' | 'Healthcare' | 'Consumer' | 'Automobile' | 'Others';
  marketCap: 'Large Cap' | 'Mid Cap' | 'Small Cap';
  thesis?: string;
  targetPrice?: number;
  stopLoss?: number;
  expectedReturnPercent?: number;
  riskReward?: string;
  holdingDays?: number;
  dividendYield?: number;
  annualDividend?: number;
  lastReviewDate?: string;
  nextReviewDate?: string;
  scores?: {
    overall: number;
    fundamentals: number;
    valuation: number;
    growth: number;
    risk: number;
    conviction: number;
  };
  priceHistory?: { date: string; price: number }[];
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  targetPrice: number;
  sector: string;
}

export interface WealthGoal {
  targetAmount: number;
  targetYear: number;
  title: string;
  monthlySip: number;
}

const DEFAULT_HOLDINGS: Holding[] = [
  {
    id: 'h-1',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    type: 'Equity',
    term: 'Long Term',
    quantity: 45,
    avgBuyPrice: 2420,
    currentPrice: 2895.4,
    dayChangePercent: 1.15,
    sector: 'Energy',
    marketCap: 'Large Cap',
    thesis: 'Green hydrogen transition, retail FMCG aggressive expansion, and Jio telecom 5G monetization.',
    targetPrice: 3400,
    expectedReturnPercent: 40.5,
    holdingDays: 310,
    dividendYield: 0.35,
    annualDividend: 450,
    lastReviewDate: '2026-03-15',
    nextReviewDate: '2026-09-15',
    scores: {
      overall: 88,
      fundamentals: 92,
      valuation: 76,
      growth: 89,
      risk: 85,
      conviction: 94
    },
    priceHistory: [
      { date: 'Jan', price: 2550 },
      { date: 'Feb', price: 2620 },
      { date: 'Mar', price: 2710 },
      { date: 'Apr', price: 2780 },
      { date: 'May', price: 2840 },
      { date: 'Jun', price: 2895.4 }
    ]
  },
  {
    id: 'h-2',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    exchange: 'NSE',
    type: 'Equity',
    term: 'Long Term',
    quantity: 80,
    avgBuyPrice: 1540,
    currentPrice: 1680.2,
    dayChangePercent: -0.45,
    sector: 'Financials',
    marketCap: 'Large Cap',
    thesis: 'Post-merger deposit re-acceleration, strong CASA ratio improvement, NIM expansion in FY27.',
    targetPrice: 2050,
    expectedReturnPercent: 33.1,
    holdingDays: 240,
    dividendYield: 1.18,
    annualDividend: 1560,
    lastReviewDate: '2026-04-10',
    nextReviewDate: '2026-10-10',
    scores: {
      overall: 85,
      fundamentals: 94,
      valuation: 82,
      growth: 78,
      risk: 88,
      conviction: 90
    },
    priceHistory: [
      { date: 'Jan', price: 1520 },
      { date: 'Feb', price: 1560 },
      { date: 'Mar', price: 1605 },
      { date: 'Apr', price: 1640 },
      { date: 'May', price: 1690 },
      { date: 'Jun', price: 1680.2 }
    ]
  },
  {
    id: 'h-3',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    type: 'Equity',
    term: 'Long Term',
    quantity: 25,
    avgBuyPrice: 3550,
    currentPrice: 3820,
    dayChangePercent: 0.85,
    sector: 'IT',
    marketCap: 'Large Cap',
    thesis: 'Generative AI client transformation deals, strong dividend yield and high ROCE cash generation.',
    targetPrice: 4400,
    expectedReturnPercent: 23.9,
    holdingDays: 180,
    dividendYield: 1.75,
    annualDividend: 1850,
    lastReviewDate: '2026-04-01',
    nextReviewDate: '2026-10-01',
    scores: {
      overall: 89,
      fundamentals: 95,
      valuation: 78,
      growth: 85,
      risk: 90,
      conviction: 95
    },
    priceHistory: [
      { date: 'Jan', price: 3450 },
      { date: 'Feb', price: 3520 },
      { date: 'Mar', price: 3650 },
      { date: 'Apr', price: 3720 },
      { date: 'May', price: 3780 },
      { date: 'Jun', price: 3820 }
    ]
  },
  {
    id: 'h-4',
    symbol: 'NIFTYBEES',
    name: 'Nippon India Nifty 50 ETF',
    exchange: 'NSE',
    type: 'ETF',
    term: 'Long Term',
    quantity: 180,
    avgBuyPrice: 240,
    currentPrice: 255.5,
    dayChangePercent: 0.62,
    sector: 'Others',
    marketCap: 'Large Cap',
    thesis: 'Core passive allocation representing top 50 blue-chip market leaders in India.',
    targetPrice: 300,
    holdingDays: 420,
    scores: {
      overall: 92,
      fundamentals: 90,
      valuation: 80,
      growth: 85,
      risk: 95,
      conviction: 98
    },
    priceHistory: [
      { date: 'Jan', price: 235 },
      { date: 'Feb', price: 242 },
      { date: 'Mar', price: 246 },
      { date: 'Apr', price: 250 },
      { date: 'May', price: 252 },
      { date: 'Jun', price: 255.5 }
    ]
  },
  {
    id: 'h-5',
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    exchange: 'NSE',
    type: 'Equity',
    term: 'Short Term',
    quantity: 60,
    avgBuyPrice: 940,
    currentPrice: 1015,
    dayChangePercent: 2.15,
    sector: 'Automobile',
    marketCap: 'Large Cap',
    thesis: 'JLR order book expansion and EV market leadership breakout above resistance.',
    targetPrice: 1120,
    stopLoss: 910,
    expectedReturnPercent: 19.1,
    riskReward: '1:3.2',
    holdingDays: 45,
    lastReviewDate: '2026-05-12',
    nextReviewDate: '2026-06-30',
    scores: {
      overall: 81,
      fundamentals: 82,
      valuation: 75,
      growth: 92,
      risk: 65,
      conviction: 88
    },
    priceHistory: [
      { date: 'W1', price: 935 },
      { date: 'W2', price: 960 },
      { date: 'W3', price: 985 },
      { date: 'W4', price: 1015 }
    ]
  },
  {
    id: 'h-6',
    symbol: 'KAYNES',
    name: 'Kaynes Technology India Ltd.',
    exchange: 'NSE',
    type: 'Equity',
    term: 'Short Term',
    quantity: 15,
    avgBuyPrice: 4200,
    currentPrice: 4520,
    dayChangePercent: 3.4,
    sector: 'Others',
    marketCap: 'Mid Cap',
    thesis: 'Semiconductor OSAT plant approval & aggressive electronics manufacturing order inflows.',
    targetPrice: 5200,
    stopLoss: 3950,
    expectedReturnPercent: 23.8,
    riskReward: '1:4.0',
    holdingDays: 22,
    lastReviewDate: '2026-05-20',
    nextReviewDate: '2026-06-20',
    scores: {
      overall: 79,
      fundamentals: 80,
      valuation: 65,
      growth: 96,
      risk: 62,
      conviction: 84
    },
    priceHistory: [
      { date: 'W1', price: 4180 },
      { date: 'W2', price: 4320 },
      { date: 'W3', price: 4410 },
      { date: 'W4', price: 4520 }
    ]
  }
];

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { id: 'w-1', symbol: 'INFY', name: 'Infosys Ltd.', price: 1480, changePercent: 1.2, targetPrice: 1700, sector: 'IT' },
  { id: 'w-2', symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', price: 1120, changePercent: -0.3, targetPrice: 1350, sector: 'Financials' },
  { id: 'w-3', symbol: 'LT', name: 'Larsen & Toubro', price: 3580, changePercent: 0.8, targetPrice: 4100, sector: 'Energy' },
  { id: 'w-4', symbol: 'ZOMATO', name: 'Zomato Ltd.', price: 185, changePercent: 4.1, targetPrice: 240, sector: 'Consumer' }
];

export function useInvestments() {
  const { user } = useAuth();
  
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_HOLDINGS;
    const saved = localStorage.getItem('tradex_investments');
    return saved ? JSON.parse(saved) : DEFAULT_HOLDINGS;
  });

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
    const saved = localStorage.getItem('tradex_investment_watchlist');
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });

  const [wealthGoal, setWealthGoal] = useState<WealthGoal>(() => {
    if (typeof window === 'undefined') return {
      targetAmount: 2500000,
      targetYear: 2030,
      title: 'Financial Independence & Freedom Milestone',
      monthlySip: 18500
    };
    const saved = localStorage.getItem('tradex_wealth_goal');
    return saved ? JSON.parse(saved) : {
      targetAmount: 2500000,
      targetYear: 2030,
      title: 'Financial Independence & Freedom Milestone',
      monthlySip: 18500
    };
  });

  // Sync from Supabase DB on user authentication
  useEffect(() => {
    if (!user) return;

    const fetchDbHoldings = async () => {
      try {
        const { data, error } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id);

        if (!error && data && data.length > 0) {
          const mapped: Holding[] = data.map(d => ({
            id: d.id,
            symbol: d.symbol,
            name: d.name,
            exchange: d.exchange || 'NSE',
            type: d.type || 'Equity',
            term: d.term || 'Long Term',
            quantity: Number(d.quantity) || 1,
            avgBuyPrice: Number(d.avg_buy_price) || 0,
            currentPrice: Number(d.current_price) || 0,
            dayChangePercent: Number(d.day_change_percent) || 0,
            sector: d.sector || 'Others',
            marketCap: d.market_cap || 'Large Cap',
            thesis: d.thesis,
            targetPrice: d.target_price ? Number(d.target_price) : undefined,
            stopLoss: d.stop_loss ? Number(d.stop_loss) : undefined,
            expectedReturnPercent: d.expected_return_percent ? Number(d.expected_return_percent) : undefined,
            riskReward: d.risk_reward,
            holdingDays: d.holding_days ? Number(d.holding_days) : undefined,
            scores: d.scores,
            priceHistory: d.price_history
          }));
          setHoldings(mapped);
        }
      } catch (err) {
        // Table not created yet or offline, fallback to localStorage
      }
    };

    fetchDbHoldings();
  }, [user]);

  // Persist locally
  useEffect(() => {
    localStorage.setItem('tradex_investments', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('tradex_investment_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('tradex_wealth_goal', JSON.stringify(wealthGoal));
  }, [wealthGoal]);

  const addHolding = async (holding: Omit<Holding, 'id'>) => {
    const newId = 'h-' + Date.now();
    const newHolding: Holding = {
      ...holding,
      id: newId
    };
    setHoldings(prev => [newHolding, ...prev]);

    // Save to Supabase if logged in
    if (user) {
      try {
        await supabase.from('investments').insert({
          user_id: user.id,
          symbol: holding.symbol,
          name: holding.name,
          exchange: holding.exchange,
          type: holding.type,
          term: holding.term,
          quantity: holding.quantity,
          avg_buy_price: holding.avgBuyPrice,
          current_price: holding.currentPrice,
          day_change_percent: holding.dayChangePercent,
          sector: holding.sector,
          market_cap: holding.marketCap,
          thesis: holding.thesis,
          target_price: holding.targetPrice,
          stop_loss: holding.stopLoss,
          scores: holding.scores,
          price_history: holding.priceHistory
        });
      } catch (e) {
        // Continue
      }
    }
  };

  const updateHolding = async (id: string, updates: Partial<Holding>) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));

    if (user) {
      try {
        const payload: any = {};
        if (updates.currentPrice !== undefined) payload.current_price = updates.currentPrice;
        if (updates.dayChangePercent !== undefined) payload.day_change_percent = updates.dayChangePercent;
        if (updates.thesis !== undefined) payload.thesis = updates.thesis;
        if (updates.quantity !== undefined) payload.quantity = updates.quantity;
        if (updates.avgBuyPrice !== undefined) payload.avg_buy_price = updates.avgBuyPrice;
        if (updates.targetPrice !== undefined) payload.target_price = updates.targetPrice;
        if (updates.stopLoss !== undefined) payload.stop_loss = updates.stopLoss;

        await supabase.from('investments').update(payload).eq('id', id);
      } catch (e) {
        // Continue
      }
    }
  };

  const deleteHolding = async (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));

    if (user) {
      try {
        await supabase.from('investments').delete().eq('id', id);
      } catch (e) {
        // Continue
      }
    }
  };

  const addToWatchlist = (item: Omit<WatchlistItem, 'id'>) => {
    const newItem = { ...item, id: 'w-' + Date.now() };
    setWatchlist(prev => [...prev, newItem]);
  };

  const removeFromWatchlist = (id: string) => {
    setWatchlist(prev => prev.filter(w => w.id !== id));
  };

  const convertWatchlistToHolding = (item: WatchlistItem) => {
    addHolding({
      symbol: item.symbol,
      name: item.name,
      exchange: 'NSE',
      type: 'Equity',
      term: 'Long Term',
      quantity: 10,
      avgBuyPrice: item.price,
      currentPrice: item.price,
      dayChangePercent: item.changePercent,
      sector: (item.sector as any) || 'Others',
      marketCap: 'Large Cap',
      targetPrice: item.targetPrice,
      scores: {
        overall: 80,
        fundamentals: 82,
        valuation: 75,
        growth: 84,
        risk: 78,
        conviction: 85
      }
    });
    removeFromWatchlist(item.id);
  };

  return {
    holdings,
    watchlist,
    wealthGoal,
    setWealthGoal,
    addHolding,
    updateHolding,
    deleteHolding,
    addToWatchlist,
    removeFromWatchlist,
    convertWatchlistToHolding
  };
}
