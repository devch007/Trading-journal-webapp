/**
 * AI Vision Pipeline for Trading Screenshot Analysis (MT4, MT5, TradingView, Brokers)
 * Multi-model fallback: Groq Vision (Qwen/Llama4) -> Google Gemini -> Smart Parser
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

const EXTRACTION_PROMPT = `You are an expert trading journal OCR assistant. Analyze this trade execution screenshot (from MetaTrader 4/5, TradingView, cTrader, Binance, Zerodha, Exness, or Broker statements) and extract all closed or open trade executions.

Return ONLY a JSON object with this exact structure:
{
  "trades": [
    {
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 1.0,
      "entry_price": "1.0850",
      "exit_price": "1.0890",
      "profit": 400.0,
      "commission": 0.0,
      "close_reason": "Take profit",
      "date_time": "2026.04.03 14:30:00",
      "confidence": "High"
    }
  ]
}

If profit is negative, provide a negative number (e.g. -150.50). If symbol is crypto (BTCUSDT), forex (EURUSD, XAUUSD), or stock (RELIANCE, AAPL), normalize standard uppercase symbols.`;

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
                { type: "text", text: EXTRACTION_PROMPT },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64Data}` }
                }
              ]
            }
          ],
          temperature: 0.1,
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
                { text: EXTRACTION_PROMPT },
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
            temperature: 0.1
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
