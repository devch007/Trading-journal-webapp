/**
 * AI Vision Pipeline for Trading Screenshot Analysis (MT4, MT5, TradingView, Brokers)
 * High-Accuracy Exhaustive OCR Extraction with Multi-Model Fallbacks
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

const EXHAUSTIVE_EXTRACTION_PROMPT = `You are a precision Optical Character Recognition (OCR) engine for financial trading statements and platforms (MetaTrader 4, MetaTrader 5, cTrader, TradingView, Binance, Zerodha, AngelOne, Exness, Bybit, Prop Firm Dashboards).

CRITICAL INSTRUCTIONS FOR 100% COMPLETENESS:
1. SCAN EXHAUSTIVELY: Scan the image top-to-bottom, row-by-row, column-by-column. Count every visible trade row. Do NOT skip any row, even if it is at the very top edge, bottom edge, or slightly faded.
2. EXTRACT EVERY SINGLE TRADE: If there are multiple trades for the same symbol (e.g. 5 separate EURUSD orders), extract EACH ONE as a separate item in the array. Do not combine or summarize them.
3. DATA EXTRACTION DETAILS:
   - symbol: Currency pair, ticker, or crypto asset in uppercase (e.g. EURUSD, XAUUSD, BTCUSDT, RELIANCE, NQ, ES).
   - type: "BUY" or "SELL" (long vs short).
   - volume: Lot size or quantity (e.g. 0.50, 1.0, 10).
   - entry_price: Original open price as a string (e.g. "1.08500", "2350.25").
   - exit_price: Close price as a string. If open, leave blank or same.
   - profit: Net or gross P&L as a floating number. Positive for green gains (+120.50), negative for red losses (-45.20).
   - commission: Broker fee / swap if visible (as positive number, e.g. 3.50).
   - close_reason: "Take profit", "Stop loss", "Market close", "SL hit", "TP hit", or "Manual".
   - date_time: Timestamp formatted as "YYYY.MM.DD HH:MM:SS" or string found in image.
   - confidence: "High" or "Medium".

Return ONLY a valid JSON object matching this schema:
{
  "trades": [
    {
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 1.0,
      "entry_price": "1.08500",
      "exit_price": "1.08900",
      "profit": 400.0,
      "commission": 0.0,
      "close_reason": "Take profit",
      "date_time": "2026.04.03 14:30:00",
      "confidence": "High"
    }
  ]
}`;

/**
 * Attempt extraction using Groq Vision models
 */
async function extractWithGroq(base64Data: string, mimeType: string, apiKey: string): Promise<ExtractionResult | null> {
  const models = [
    "qwen/qwen3.6-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview"
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
          return { trades: parsed.trades, source: `Groq (${model})` };
        }
      }
    } catch (e) {
      // Continue to next model
    }
  }

  return null;
}

/**
 * Attempt extraction using Google Gemini Vision
 */
async function extractWithGemini(base64Data: string, mimeType: string, apiKey: string): Promise<ExtractionResult | null> {
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
          return { trades: parsed.trades, source: `Gemini (${model})` };
        }
      }
    } catch (e) {
      // Continue
    }
  }

  return null;
}

/**
 * Main Screenshot OCR analysis entrypoint
 */
export async function analyzeTradeScreenshot(file: File): Promise<ExtractionResult> {
  // Convert File to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
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

  // 1. Try Groq Vision if Groq key exists
  if (groqKey) {
    const groqRes = await extractWithGroq(base64Data, file.type || 'image/jpeg', groqKey);
    if (groqRes && groqRes.trades.length > 0) {
      return groqRes;
    }
  }

  // 2. Try Gemini Vision if Gemini key exists
  if (geminiKey) {
    const geminiRes = await extractWithGemini(base64Data, file.type || 'image/jpeg', geminiKey);
    if (geminiRes && geminiRes.trades.length > 0) {
      return geminiRes;
    }
  }

  // 3. If no key is set or all APIs returned 0 trades
  if (!groqKey && !geminiKey) {
    return {
      trades: [],
      error: "MISSING_API_KEY"
    };
  }

  return {
    trades: [],
    error: "NO_TRADES_DETECTED"
  };
}
