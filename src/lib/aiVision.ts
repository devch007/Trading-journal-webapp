/**
 * AI Vision Pipeline for Trading Screenshot Analysis (MT4, MT5, TradingView, Brokers)
 * High-Accuracy Exhaustive OCR with Dual-Pass Multi-Slice High-Resolution Scanning
 */

export interface ExtractedTrade {
  symbol: string;
  type: 'BUY' | 'SELL';
  volume?: number;
  entry_price?: string;
  exit_price?: string;
  profit?: number;
  commission?: number;
  close_reason?: string;
  date_time?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  session?: 'Asian' | 'London' | 'NY' | 'Else';
  strategy?: string;
}

export interface ExtractionResult {
  trades: ExtractedTrade[];
  source?: string;
  error?: string;
}

export function getAiApiKey(): string {
  if (typeof window !== 'undefined') {
    const savedGroq = localStorage.getItem('tradex_groq_api_key') || localStorage.getItem('tradex_ai_key');
    if (savedGroq) return savedGroq.trim();
  }
  return (import.meta as any).env?.VITE_GROQ_API_KEY || '';
}

export function setAiApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tradex_groq_api_key', key.trim());
  }
}

export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tradex_gemini_api_key');
    if (saved) return saved.trim();
  }
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any)?.GEMINI_API_KEY || '';
}

export function setGeminiApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tradex_gemini_api_key', key.trim());
  }
}

const EXHAUSTIVE_EXTRACTION_PROMPT = `You are a high-precision trading journal OCR scanner. Your task is to extract EVERY SINGLE trade row visible in this screenshot with 100% completeness.

CRITICAL EXTRACTION RULES:
1. SCAN TOP-TO-BOTTOM EXHAUSTIVELY: Read every visible row in the table, trade history list, or position log. Count each individual trade row. DO NOT SKIP OR OMIT ANY ROW.
2. INDIVIDUAL ENTRIES: If the same symbol appears multiple times (e.g. 5 scalps on XAUUSD or EURUSD), extract EACH ONE as a separate item in the array. Never combine them.
3. FIELDS TO EXTRACT:
   - symbol: Standard symbol name (e.g. "EURUSD", "XAUUSD", "BTCUSDT", "NQ", "RELIANCE", "GBPJPY").
   - type: "BUY" or "SELL".
   - volume: Lot size or quantity as a number (e.g. 0.01, 0.10, 1.00, 50).
   - entry_price: Open/entry price as string (e.g. "2340.50", "1.08450").
   - exit_price: Close/current price as string (e.g. "2355.80", "1.08900").
   - profit: Net or gross P&L as a floating number (e.g. 150.00 for profit, -45.50 for loss).
   - commission: Swap/commission fee as a number (e.g. 0.0, 3.50).
   - close_reason: "Take profit", "Stop loss", "Manual close", "SL", "TP", or "Market".
   - date_time: Timestamp visible on that row (e.g. "2026.04.15 14:30:00").
   - confidence: "High".

Return ONLY valid JSON matching this schema:
{
  "trades": [
    {
      "symbol": "XAUUSD",
      "type": "BUY",
      "volume": 0.5,
      "entry_price": "2340.50",
      "exit_price": "2355.80",
      "profit": 765.0,
      "commission": 0.0,
      "close_reason": "Take profit",
      "date_time": "2026.04.15 14:30:00",
      "confidence": "High"
    }
  ]
}`;

/**
 * Attempt extraction with Groq Vision
 */
async function extractWithGroq(base64Data: string, mimeType: string, apiKey: string): Promise<ExtractedTrade[]> {
  const models = [
    "qwen/qwen3.6-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "llama-3.2-11b-vision-preview"
  ];

  for (const model of models) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: EXHAUSTIVE_EXTRACTION_PROMPT },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64Data}` }
                }
              ]
            }
          ],
          temperature: 0.0,
          max_tokens: 4096,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || "{}";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
        if (parsed && Array.isArray(parsed.trades) && parsed.trades.length > 0) {
          return parsed.trades;
        }
      }
    } catch (e) {
      // Try next model
    }
  }

  return [];
}

/**
 * Attempt extraction with Google Gemini
 */
async function extractWithGemini(base64Data: string, mimeType: string, apiKey: string): Promise<ExtractedTrade[]> {
  const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const model of geminiModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: EXHAUSTIVE_EXTRACTION_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.0,
            maxOutputTokens: 8192
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
        if (parsed && Array.isArray(parsed.trades) && parsed.trades.length > 0) {
          return parsed.trades;
        }
      }
    } catch (e) {
      // Continue
    }
  }

  return [];
}

/**
 * Slice an image into Top and Bottom segments for high-density vertical phone screenshots
 */
async function sliceImage(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      
      // If it's a tall mobile screenshot (height > 900 & height > width), slice to double resolution
      if (height > 900 && height > width * 1.1) {
        const canvasTop = document.createElement('canvas');
        const ctxTop = canvasTop.getContext('2d');
        canvasTop.width = width;
        canvasTop.height = Math.round(height * 0.58);
        if (ctxTop) {
          ctxTop.drawImage(img, 0, 0, width, canvasTop.height, 0, 0, width, canvasTop.height);
        }

        const canvasBottom = document.createElement('canvas');
        const ctxBottom = canvasBottom.getContext('2d');
        canvasBottom.width = width;
        canvasBottom.height = Math.round(height * 0.58);
        const startY = Math.round(height * 0.42);
        if (ctxBottom) {
          ctxBottom.drawImage(img, 0, startY, width, height - startY, 0, 0, width, height - startY);
        }

        const topB64 = canvasTop.toDataURL('image/jpeg', 0.95).split(',')[1];
        const bottomB64 = canvasBottom.toDataURL('image/jpeg', 0.95).split(',')[1];
        resolve([topB64, bottomB64]);
      } else {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Deduplicate trades accurately based on unique properties
 */
function deduplicateTrades(tradeList: ExtractedTrade[]): ExtractedTrade[] {
  const seen = new Set<string>();
  const result: ExtractedTrade[] = [];

  for (const t of tradeList) {
    if (!t || !t.symbol) continue;

    const sym = t.symbol.toUpperCase().trim();
    const type = (t.type || 'BUY').toUpperCase();
    const vol = parseFloat(String(t.volume || 0)).toFixed(2);
    const pnl = parseFloat(String(t.profit || 0)).toFixed(2);
    const entry = String(t.entry_price || '').trim();
    const dt = String(t.date_time || '').trim();

    // Primary unique signature
    const key = `${sym}_${type}_${vol}_${pnl}_${entry}_${dt}`;
    
    // Secondary fallback signature if date or entry is slightly parsed
    const looseKey = `${sym}_${type}_${vol}_${pnl}`;

    if (!seen.has(key)) {
      seen.add(key);
      seen.add(looseKey);
      result.push({
        ...t,
        symbol: sym,
        type: type === 'SELL' ? 'SELL' : 'BUY',
        volume: parseFloat(String(t.volume)) || 1.0,
        profit: parseFloat(String(t.profit)) || 0.0,
        commission: parseFloat(String(t.commission)) || 0.0,
        confidence: 'High'
      });
    }
  }

  return result;
}

/**
 * Main Screenshot OCR analysis entrypoint with Dual-Pass Multi-Slice High-Resolution Scanning
 */
export async function analyzeTradeScreenshot(file: File): Promise<ExtractionResult> {
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const res = reader.result as string;
      const b64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const groqKey = getAiApiKey();
  const geminiKey = getGeminiApiKey();

  if (!groqKey && !geminiKey) {
    return {
      trades: [],
      error: "MISSING_API_KEY"
    };
  }

  const allRawTrades: ExtractedTrade[] = [];
  const mimeType = file.type || 'image/jpeg';

  // 1. Primary Full-Image Scan
  if (groqKey) {
    const fullTrades = await extractWithGroq(base64Data, mimeType, groqKey);
    allRawTrades.push(...fullTrades);
  } else if (geminiKey) {
    const fullTrades = await extractWithGemini(base64Data, mimeType, geminiKey);
    allRawTrades.push(...fullTrades);
  }

  // 2. High-Resolution Sliced Dual-Pass Scan (Captures dense middle/bottom rows on mobile screenshots)
  try {
    const slices = await sliceImage(file);
    if (slices.length > 0) {
      for (const sliceB64 of slices) {
        if (groqKey) {
          const sliceTrades = await extractWithGroq(sliceB64, 'image/jpeg', groqKey);
          allRawTrades.push(...sliceTrades);
        } else if (geminiKey) {
          const sliceTrades = await extractWithGemini(sliceB64, 'image/jpeg', geminiKey);
          allRawTrades.push(...sliceTrades);
        }
      }
    }
  } catch (sliceErr) {
    // If slice fails in browser canvas, full image scan is already stored
  }

  const uniqueTrades = deduplicateTrades(allRawTrades);

  if (uniqueTrades.length > 0) {
    return {
      trades: uniqueTrades,
      source: "AI High-Res Multi-Scan"
    };
  }

  return {
    trades: [],
    error: "NO_TRADES_DETECTED"
  };
}
