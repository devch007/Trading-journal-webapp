import { useState, useEffect, useMemo } from 'react';

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
    quantity: 20,
    avgBuyPrice: 2410,
    currentPrice: 2530,
    dayChangePercent: 1.45,
    sector: 'Energy',
    marketCap: 'Large Cap',
    thesis: 'Expanding 5G monetization, retail scale, and new energy green hydrogen projects.',
    targetPrice: 3100,
    stopLoss: 2200,
    holdingDays: 240,
    dividendYield: 0.45,
    annualDividend: 200,
    lastReviewDate: '2026-03-10',
    nextReviewDate: '2026-09-10',
    scores: {
      overall: 84,
      fundamentals: 88,
      valuation: 72,
      growth: 90,
      risk: 70,
      conviction: 92
    },
    priceHistory: [
      { date: 'Jan', price: 2320 },
      { date: 'Feb', price: 2380 },
      { date: 'Mar', price: 2450 },
      { date: 'Apr', price: 2410 },
      { date: 'May', price: 2490 },
      { date: 'Jun', price: 2530 }
    ]
  },
  {
    id: 'h-2',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    type: 'Equity',
    term: 'Long Term',
    quantity: 30,
    avgBuyPrice: 1620,
    currentPrice: 1695,
    dayChangePercent: 0.85,
    sector: 'Financials',
    marketCap: 'Large Cap',
    thesis: 'Merger integration overhang receding, credit deposit ratio stabilizing with premium CASA growth.',
    targetPrice: 2050,
    stopLoss: 1480,
    holdingDays: 310,
    dividendYield: 1.15,
    annualDividend: 585,
    lastReviewDate: '2026-02-15',
    nextReviewDate: '2026-08-15',
    scores: {
      overall: 86,
      fundamentals: 92,
      valuation: 85,
      growth: 82,
      risk: 85,
      conviction: 94
    },
    priceHistory: [
      { date: 'Jan', price: 1580 },
      { date: 'Feb', price: 1610 },
      { date: 'Mar', price: 1640 },
      { date: 'Apr', price: 1620 },
      { date: 'May', price: 1665 },
      { date: 'Jun', price: 1695 }
    ]
  },
  {
    id: 'h-3',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    type: 'Equity',
    term: 'Long Term',
    quantity: 15,
    avgBuyPrice: 3580,
    currentPrice: 3820,
    dayChangePercent: -0.32,
    sector: 'IT',
    marketCap: 'Large Cap',
    thesis: 'Leading enterprise GenAI deal pipeline and resilient operating margins above 26%.',
    targetPrice: 4400,
    stopLoss: 3350,
    holdingDays: 195,
    dividendYield: 2.1,
    annualDividend: 1100,
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
    thesis: 'EMS & semiconductor OSAT testing capex tailwinds with multi-year order backlog.',
    targetPrice: 5100,
    stopLoss: 3950,
    expectedReturnPercent: 21.4,
    riskReward: '1:3.6',
    holdingDays: 28,
    lastReviewDate: '2026-05-20',
    nextReviewDate: '2026-06-25',
    scores: {
      overall: 78,
      fundamentals: 80,
      valuation: 62,
      growth: 96,
      risk: 60,
      conviction: 85
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
  { id: 'w-1', symbol: 'INFY', name: 'Infosys Ltd.', price: 1580, changePercent: -0.42, targetPrice: 1850, sector: 'IT' },
  { id: 'w-2', symbol: 'LT', name: 'Larsen & Toubro Ltd.', price: 3620, changePercent: 0.85, targetPrice: 4200, sector: 'Infrastructure' },
  { id: 'w-3', symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', price: 1145, changePercent: 1.2, targetPrice: 1320, sector: 'Financials' },
  { id: 'w-4', symbol: 'TITAN', name: 'Titan Company Ltd.', price: 3410, changePercent: -0.65, targetPrice: 3900, sector: 'Consumer' }
];

export function useInvestments() {
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem('tradex_investments');
    return saved ? JSON.parse(saved) : DEFAULT_HOLDINGS;
  });

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem('tradex_investment_watchlist');
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });

  const [wealthGoal, setWealthGoal] = useState<WealthGoal>(() => {
    const saved = localStorage.getItem('tradex_wealth_goal');
    return saved ? JSON.parse(saved) : {
      targetAmount: 2500000,
      targetYear: 2030,
      title: 'Financial Independence & Freedom Milestone',
      monthlySip: 18500
    };
  });

  useEffect(() => {
    localStorage.setItem('tradex_investments', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('tradex_investment_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('tradex_wealth_goal', JSON.stringify(wealthGoal));
  }, [wealthGoal]);

  const addHolding = (holding: Omit<Holding, 'id'>) => {
    const newHolding: Holding = {
      ...holding,
      id: 'h-' + Date.now()
    };
    setHoldings(prev => [newHolding, ...prev]);
  };

  const updateHolding = (id: string, updates: Partial<Holding>) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const deleteHolding = (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
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
