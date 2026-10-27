/**
 * Core Domain Types & Database Contract
 * TradeX Trading Journal
 */

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  location?: string;
  currency?: string;
  riskPerTrade?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type TradingSession = 'Asian' | 'London' | 'NY' | 'Else';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface Trade {
  id: string;
  userId: string;
  accountId?: string;
  date: string;
  symbol: string;
  action: 'BUY' | 'SELL' | string;
  size: string;
  result: string;
  isPositive: boolean;
  pnl: number;
  createdAt: string;
  entry?: string;
  exit?: string;
  duration?: string;
  session?: TradingSession;
  confidence?: ConfidenceLevel;
  tag?: string;
  commission?: number;
  strategy?: string;
  notes?: string;
  emotions?: string[];
  tags?: string[];
  proof?: string | null;
  rating?: number;
  checklist?: ChecklistItem[];
  tradeType?: string;
  sentiment?: SentimentType;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  broker?: string;
  type?: 'Demo' | 'Live' | 'Prop';
  balance: number;
  initialCapital: number;
  currency?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface Strategy {
  id: string;
  userId: string;
  title: string;
  description?: string;
  rules?: string[];
  winRate?: number;
  tradeCount?: number;
  pnl?: number;
  createdAt?: string;
}

export interface InvestmentHolding {
  id: string;
  userId: string;
  symbol: string;
  assetClass: 'Equities' | 'Crypto' | 'Forex' | 'Commodities';
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  term: 'Short-Term' | 'Long-Term';
  notes?: string;
  createdAt?: string;
}
