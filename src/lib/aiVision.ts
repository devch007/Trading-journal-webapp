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

const EXHAUSTIVE_EXTRACTION_PROMPT = `You are a specialized trading journal OCR engine engineered to read mobile MetaTrader 4 / MetaTrader 5 (MT4/MT5) trade history lists and broker order logs.

SCREENSHOT FORMAT BREAKDOWN (e.g. MetaTrader Mobile History Tab):
Each trade entry consists of 2 lines:
Line 1: [SYMBOL] [buy/sell] [LOT_SIZE] ...................... [PROFIT/LOSS] (in blue if positive, red if negative with '-')
Line 2: [ENTRY_PRICE] -> [EXIT_PRICE] .................... [TIMESTAMP: YYYY.MM.DD HH:MM:SS]

EXAMPLE DECODING:
Example row:
"XAUUSD buy 0.02                          25.50"
"4278.30 -> 4291.05          2026.09.17 06:37:30"
Maps to:
- symbol: "XAUUSD"
- type: "BUY"
- volume: 0.02
- profit: 25.50
- entry_price: "4278.30"
- exit_price: "4291.05"
- date_time: "2026.09.17 06:37:30"

Example negative row:
"XAUUSD buy 0.02                         -27.78"
"4374.04 -> 4360.15          2026.09.17 16:40:07"
Maps to:
- symbol: "XAUUSD"
- type: "BUY"
- volume: 0.02
- profit: -27.78
- entry_price: "4374.04"
- exit_price: "4360.15"
- date_time: "2026.09.17 16:40:07"

Example sell row:
"XAUUSD sell 0.01                         20.80"
"4375.77 -> 4354.97          2026.09.17 17:58:25"
Maps to:
- symbol: "XAUUSD"
- type: "SELL"
- volume: 0.01
- profit: 20.80
- entry_price: "4375.77"
- exit_price: "4354.97"
- date_time: "2026.09.17 17:58:25"

MANDATORY RULES:
1. EXTRACT ALL ROWS: Scan sequentially from top to bottom. If there are 6, 10, or 20 trade entries visible in the screenshot, output an object for EVERY single one.
2. DO NOT SKIP OR COMBINE: Every row is its own execution.
3. PRESERVE SIGN: If the profit number has a minus sign (or is shown in red), ensure profit is a negative number (e.g. -27.78, -22.46, -0.52). If it's blue/positive, profit is positive.
4. TYPE: Normalize type to uppercase "BUY" or "SELL".
5. CLEAN NUMBERS: Volume must be a float (e.g. 0.02, 0.01). Profit must be a float.

Return ONLY valid JSON matching this schema:
{
  "trades": [
    {
      "symbol": "XAUUSD",
      "type": "BUY",
      "volume": 0.02,
      "entry_price": "4278.30",
      "exit_price": "4291.05",
      "profit": 25.50,
      "date_time": "2026.09.17 06:37:30",
      "confidence": "High"
    }
  ]
}`;

/**
 * Helper to clean and parse JSON from LLM responses (strips markdown code blocks)
 */
function cleanAndParseJson(raw: string): any {
  if (!raw) return null;
  let text = raw.trim();
  // Remove markdown code fences ```json ... ``` or ``` ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      // Try parsing full text
    }
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

/**
 * Attempt extraction with Groq Vision
 */
async function extractWithGroq(base64Data: string, mimeType: string, apiKey: string): Promise<{ trades: ExtractedTrade[]; error?: string }> {
  // Official active vision models on Groq
  const models = [
    "qwen/qwen3.8-27b",
    "qwen-2.5-32b",
    "meta-llama/llama-4-scout-17b-vision"
  ];

  let lastErr = "";

  for (const model of models) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
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
          temperature: 0.1,
          max_tokens: 4096,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || "{}";
        const parsed = cleanAndParseJson(content);
        if (parsed && Array.isArray(parsed.trades) && parsed.trades.length > 0) {
          return { trades: parsed.trades };
        }
      } else {
        const errData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        lastErr = errData?.error?.message || `Groq HTTP ${response.status}`;
        console.warn(`Groq Vision model ${model} failed (${response.status}):`, lastErr);
      }
    } catch (e: any) {
      lastErr = e?.message || "Groq network error";
      console.warn(`Groq error on model ${model}:`, e);
    }
  }

  return { trades: [], error: lastErr };
}

/**
 * Attempt extraction with Google Gemini (Ultra-fast flash models first)
 */
async function extractWithGemini(base64Data: string, mimeType: string, apiKey: string): Promise<{ trades: ExtractedTrade[]; error?: string }> {
  const geminiModels = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro'
  ];
  let lastErr = "";

  for (const model of geminiModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
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
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const parsed = cleanAndParseJson(text);
        if (parsed && Array.isArray(parsed.trades) && parsed.trades.length > 0) {
          return { trades: parsed.trades };
        }
      } else {
        const errData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        lastErr = errData?.error?.message || `Gemini HTTP ${response.status}`;
        console.warn(`Gemini Vision model ${model} failed (${response.status}):`, lastErr);
      }
    } catch (e: any) {
      lastErr = e?.message || "Gemini network error";
      console.warn(`Gemini error on model ${model}:`, e);
    }
  }

  return { trades: [], error: lastErr };
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
 * Main Screenshot OCR analysis entrypoint - Fast Single-Pass with Slicing Fallback
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

  let lastApiError = "";
  const allRawTrades: ExtractedTrade[] = [];
  const mimeType = file.type || 'image/jpeg';

  // 1. Primary Full-Image Fast Scan (Try fastest available provider)
  if (groqKey) {
    const groqRes = await extractWithGroq(base64Data, mimeType, groqKey);
    if (groqRes.trades.length > 0) {
      allRawTrades.push(...groqRes.trades);
    } else if (groqRes.error) {
      lastApiError = groqRes.error;
    }
  }
  
  if (allRawTrades.length === 0 && geminiKey) {
    const geminiRes = await extractWithGemini(base64Data, mimeType, geminiKey);
    if (geminiRes.trades.length > 0) {
      allRawTrades.push(...geminiRes.trades);
    } else if (geminiRes.error) {
      lastApiError = geminiRes.error;
    }
  }

  // 2. ONLY slice if 0 trades were found on the full scan (prevents doubling/tripling latency)
  if (allRawTrades.length === 0) {
    try {
      const slices = await sliceImage(file);
      if (slices.length > 0) {
        for (const sliceB64 of slices) {
          if (groqKey) {
            const sliceRes = await extractWithGroq(sliceB64, 'image/jpeg', groqKey);
            if (sliceRes.trades.length > 0) allRawTrades.push(...sliceRes.trades);
          } else if (geminiKey) {
            const sliceRes = await extractWithGemini(sliceB64, 'image/jpeg', geminiKey);
            if (sliceRes.trades.length > 0) allRawTrades.push(...sliceRes.trades);
          }
        }
      }
    } catch (sliceErr) {
      // Ignore slice errors
    }
  }

  const uniqueTrades = deduplicateTrades(allRawTrades);

  if (uniqueTrades.length > 0) {
    return {
      trades: uniqueTrades,
      source: "AI Vision Scan"
    };
  }

  return {
    trades: [],
    error: lastApiError ? `API Error: ${lastApiError}` : "NO_TRADES_DETECTED"
  };
}
