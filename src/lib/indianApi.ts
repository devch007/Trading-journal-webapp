/**
 * IndianAPI.in Client Integration
 * Base URL: https://dev.indianapi.in (with proxies & 1-hour rate limiting)
 */

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
  lastUpdated?: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export function getIndianApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tradex_indian_api_key');
    if (saved) return saved.trim();
  }
  return (import.meta as any).env?.VITE_INDIAN_API_KEY || '';
}

export function setIndianApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tradex_indian_api_key', key.trim());
  }
}

export function getLastPortfolioSyncTime(): number | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tradex_last_portfolio_sync');
    if (saved) return parseInt(saved, 10);
  }
  return null;
}

export function setLastPortfolioSyncTime(timestamp: number = Date.now()) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tradex_last_portfolio_sync', timestamp.toString());
  }
}

/**
 * Get cached stock data if it was fetched within the last 1 hour
 */
function getCachedQuote(symbol: string): IndianStockData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`tradex_quote_cache_${symbol.toUpperCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp < CACHE_TTL_MS)) {
      return parsed.data;
    }
  } catch (e) {
    // Ignore cache parse error
  }
  return null;
}

/**
 * Cache stock data with timestamp
 */
function setCachedQuote(symbol: string, data: IndianStockData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`tradex_quote_cache_${symbol.toUpperCase()}`, JSON.stringify({
      timestamp: Date.now(),
      data: { ...data, lastUpdated: Date.now() }
    }));
  } catch (e) {
    // Ignore storage quota errors
  }
}

/**
 * Robust parser for various response schemas returned by IndianAPI / dev.indianapi.in
 */
function parseIndianApiResponse(raw: any, querySymbol: string): IndianStockData | null {
  if (!raw) return null;

  // Handle nested wrappers: data, stock, body, result, etc.
  const obj = raw.data || raw.stock || raw.body || raw.result || raw;

  // Extract price from various key variations
  const currentPrice = Number(
    obj.currentPrice ??
    obj.price ??
    obj.ltp ??
    obj.lastPrice ??
    obj.last_price ??
    obj.closePrice ??
    obj.close ??
    obj.current_price ??
    0
  );

  if (isNaN(currentPrice) || currentPrice <= 0) {
    return null;
  }

  // Extract change percentage
  let dayChangePct = Number(
    obj.dayChangePercent ??
    obj.percentChange ??
    obj.pChange ??
    obj.changePercent ??
    obj.day_change_percent ??
    0
  );

  let dayChange = Number(
    obj.dayChange ??
    obj.change ??
    obj.netChange ??
    obj.day_change ??
    0
  );

  if (dayChange === 0 && dayChangePct !== 0) {
    dayChange = (currentPrice * dayChangePct) / 100;
  } else if (dayChangePct === 0 && dayChange !== 0) {
    const prevPrice = currentPrice - dayChange;
    if (prevPrice > 0) {
      dayChangePct = (dayChange / prevPrice) * 100;
    }
  }

  return {
    symbol: (obj.symbol || querySymbol).toUpperCase().replace('.NS', '').replace('.BO', ''),
    companyName: obj.companyName || obj.name || obj.company_name || querySymbol,
    currentPrice,
    dayChange,
    dayChangePercent: Number(dayChangePct.toFixed(2)),
    dayHigh: Number(obj.dayHigh || obj.high || obj.day_high) || undefined,
    dayLow: Number(obj.dayLow || obj.low || obj.day_low) || undefined,
    yearHigh52: Number(obj.yearHigh52 || obj.high52 || obj['52_week_high']) || undefined,
    yearLow52: Number(obj.yearLow52 || obj.low52 || obj['52_week_low']) || undefined,
    peRatio: Number(obj.peRatio || obj.pe || obj.pe_ratio) || undefined,
    marketCap: obj.marketCap || obj.marketCapType || obj.market_cap || undefined,
    industry: obj.industry || obj.sector || undefined,
    lastUpdated: Date.now()
  };
}

/**
 * Fetch live quote for an Indian stock / ETF with 1-hour hourly rate limiting & cache
 */
export async function fetchIndianStockQuote(
  nameOrSymbol: string, 
  forceRefresh: boolean = false
): Promise<IndianStockData | null> {
  const cleanSymbol = nameOrSymbol.trim().toUpperCase().replace('.NS', '').replace('.BO', '');
  if (!cleanSymbol) return null;

  // 1. Check 1-hour cache first unless explicitly forcing refresh
  if (!forceRefresh) {
    const cached = getCachedQuote(cleanSymbol);
    if (cached) {
      return cached;
    }
  }

  const apiKey = getIndianApiKey();
  if (!apiKey) {
    return null;
  }

  // URLs to try (proxied first to prevent browser CORS issues, then direct fallbacks)
  const endpoints = [
    `/api/indianapi/stock?name=${encodeURIComponent(cleanSymbol)}`,
    `https://dev.indianapi.in/stock?name=${encodeURIComponent(cleanSymbol)}`,
    `https://stock.indianapi.in/stock?name=${encodeURIComponent(cleanSymbol)}`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          const parsed = parseIndianApiResponse(json, cleanSymbol);
          if (parsed && parsed.currentPrice > 0) {
            // Cache valid result for 1 hour
            setCachedQuote(cleanSymbol, parsed);
            return parsed;
          }
        } catch (parseErr) {
          console.warn('Could not parse JSON response from IndianAPI:', parseErr);
        }
      }
    } catch (fetchErr) {
      // Continue to next endpoint fallback
    }
  }

  // If live fetch fails, check if we have any older cached data as fallback
  const staleCache = getCachedQuote(cleanSymbol);
  if (staleCache) return staleCache;

  return null;
}
