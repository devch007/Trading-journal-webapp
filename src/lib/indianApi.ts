/**
 * IndianAPI.in Client Integration
 * Base URL: https://dev.indianapi.in or https://stock.indianapi.in
 */

const BASE_URL = 'https://dev.indianapi.in';

export interface IndianStockData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  dayHigh?: number;
  dayLow?: number;
  yearHigh52?: number;
  yearLow52?: number;
  peRatio?: number;
  marketCap?: string;
  industry?: string;
}

export function getIndianApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tradex_indian_api_key');
    if (saved) return saved;
  }
  return (import.meta as any).env?.VITE_INDIAN_API_KEY || '';
}

export function setIndianApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tradex_indian_api_key', key.trim());
  }
}

/**
 * Fetch live quote for an Indian stock / ETF
 */
export async function fetchIndianStockQuote(nameOrSymbol: string): Promise<IndianStockData | null> {
  const apiKey = getIndianApiKey();
  if (!apiKey) {
    // Return null if no API key is configured
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/stock?name=${encodeURIComponent(nameOrSymbol)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`IndianAPI error ${response.status} for ${nameOrSymbol}`);
      return null;
    }

    const data = await response.json();
    
    // Normalize response from indianapi.in
    const price = Number(data.currentPrice || data.price || data.ltp || data.closePrice) || 0;
    const change = Number(data.dayChange || data.change || 0);
    const changePct = Number(data.dayChangePercent || data.percentChange || data.pChange || 0);

    return {
      symbol: data.symbol || nameOrSymbol.toUpperCase(),
      companyName: data.companyName || data.name || nameOrSymbol,
      currentPrice: price,
      dayChange: change,
      dayChangePercent: changePct,
      dayHigh: data.dayHigh || data.high,
      dayLow: data.dayLow || data.low,
      yearHigh52: data.yearHigh52 || data.high52,
      yearLow52: data.yearLow52 || data.low52,
      peRatio: data.peRatio || data.pe,
      marketCap: data.marketCap || data.marketCapType,
      industry: data.industry || data.sector
    };
  } catch (err) {
    console.error('Error fetching stock from IndianAPI:', err);
    return null;
  }
}

/**
 * Fetch live NIFTY 50 / SENSEX / Market indices
 */
export async function fetchMarketIndices(): Promise<Record<string, { price: number; change: number; changePct: number }> | null> {
  const apiKey = getIndianApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${BASE_URL}/market_data`, {
      headers: { 'X-API-Key': apiKey }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    return null;
  }
}
