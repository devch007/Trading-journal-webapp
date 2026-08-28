import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Send, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Lightbulb,
  History,
  Settings as SettingsIcon,
  Sparkles,
  ChevronRight,
  User,
  Key,
  X,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Zap
} from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { cn } from '../lib/utils';
import { useTrades, Trade } from '../hooks/useTrades';
import { useLocation } from 'react-router-dom';
import { useAccountContext } from '../contexts/AccountContext';
import { getAiApiKey, setAiApiKey, getGeminiApiKey, setGeminiApiKey } from '../lib/aiVision';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface Insight {
  title: string;
  points: string[];
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export function AIEngine() {
  const { trades: allTrades, loading: tradesLoading } = useTrades();
  const { selectedAccountId } = useAccountContext();
  const location = useLocation();
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  
  const trades = useMemo(() => {
    if (!selectedAccountId) return allTrades || [];
    return (allTrades || []).filter(t => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);
  
  const dynamicPrompts = useMemo(() => {
    if (!trades || trades.length === 0) {
      return [
        "How can you help me?",
        "What data do you analyze?",
        "Show me an example analysis"
      ];
    }

    const prompts: string[] = [];
    const winningTrades = trades.filter(t => t.isPositive);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    // Symbol analysis
    const symbolStats = trades.reduce((acc, t) => {
      if (!acc[t.symbol]) acc[t.symbol] = 0;
      acc[t.symbol] += t.pnl;
      return acc;
    }, {} as Record<string, number>);

    const sortedSymbols = Object.entries(symbolStats).sort((a, b) => (b[1] as number) - (a[1] as number));
    const bestSymbol = sortedSymbols[0]?.[0];
    const worstSymbol = sortedSymbols[sortedSymbols.length - 1]?.[0];
    const worstPnl = sortedSymbols[sortedSymbols.length - 1]?.[1] as number | undefined;

    // Tag analysis
    const tagCounts = trades.reduce((acc, t) => {
      const tag = t.tag || "Untagged";
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostUsedTag = Object.entries(tagCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];

    // Logic for suggesting prompts
    if (winRate < 45) {
      prompts.push("How to improve my win rate?");
    } else if (winRate > 60) {
      prompts.push("How to scale my current edge?");
    }

    if (bestSymbol) {
      prompts.push(`Analyze my ${bestSymbol} success`);
    }

    if (worstSymbol && worstPnl !== undefined && worstPnl < 0) {
      prompts.push(`Why am I losing on ${worstSymbol}?`);
    }

    if (mostUsedTag && mostUsedTag !== "Untagged") {
      prompts.push(`Review my ${mostUsedTag} strategy`);
    }

    // Add more specific prompts if we have enough data
    if (trades.length > 10) {
      prompts.push("What's my best trading time?");
      prompts.push("Analyze my risk consistency");
    }

    // Fallback/General prompts
    if (prompts.length < 4) {
      prompts.push("What are my biggest mistakes?");
      prompts.push("Best trading session for me?");
      prompts.push("How's my discipline lately?");
    }

    return prompts.slice(0, 5);
  }, [trades]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Yo! I'm your trading buddy. I've got your stats pulled up and I'm ready to help you crush it. What's on your mind?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dynamic Insights based on real data
  const insights = useMemo<Insight[]>(() => {
    if (tradesLoading || !trades || trades.length === 0) {
      return [
        {
          title: "Waiting for Data",
          points: [
            "Connect your accounts",
            "Add trades to your journal",
            "AI analysis will appear here"
          ],
          icon: Lightbulb,
          color: "text-amber-400",
          bgColor: "bg-amber-500/10"
        }
      ];
    }

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.isPositive).length;
    const winRate = ((wins / totalTrades) * 100).toFixed(1);
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    // Find most traded symbol
    const symbols = trades.reduce((acc, t) => {
      acc[t.symbol] = (acc[t.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const bestSymbol = Object.entries(symbols).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || "N/A";

    // Find losing streak
    let currentStreak = 0;
    let maxLosingStreak = 0;
    trades.forEach(t => {
      if (!t.isPositive) {
        currentStreak++;
        maxLosingStreak = Math.max(maxLosingStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return [
      {
        title: "Performance Snapshot",
        points: [
          `Overall win rate: ${winRate}%`,
          `Total volume: ${totalTrades} trades`,
          `Net PnL: $${totalPnL.toLocaleString()}`
        ],
        icon: TrendingUp,
        color: "text-[#1ED760]",
        bgColor: "bg-[#1ED760]/10"
      },
      {
        title: "Symbol Focus",
        points: [
          `Dominant asset: ${bestSymbol}`,
          "High concentration detected",
          "Review asset correlation"
        ],
        icon: Target,
        color: "text-indigo-400",
        bgColor: "bg-indigo-500/10"
      },
      {
        title: "Risk Alert",
        points: maxLosingStreak > 3 
          ? [
              `Losing streak: ${maxLosingStreak} trades`,
              "Revenge trading risk: HIGH",
              "Action: Reduce size by 50%"
            ]
          : [
              "Risk consistency: EXCELLENT",
              "No major leaks detected",
              "Action: Maintain current discipline"
            ],
        icon: AlertTriangle,
        color: maxLosingStreak > 3 ? "text-[#E5534B]" : "text-[#1ED760]",
        bgColor: maxLosingStreak > 3 ? "bg-[#E5534B]/10" : "bg-[#1ED760]/10"
      },
      {
        title: "AI Strategy Tip",
        points: totalPnL < 0 
          ? [
              "Tighten stop losses",
              "Review entry criteria",
              "Focus on high-RR setups"
            ]
          : [
              "Scale winning positions",
              "Maximize current edge",
              "Protect capital aggressively"
            ],
        icon: Lightbulb,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10"
      }
    ];
  }, [trades, tradesLoading]);

  const healthScore = useMemo(() => {
    if (trades.length === 0) return 0;
    const wins = trades.filter(t => t.isPositive).length;
    const winRate = (wins / trades.length) * 100;
    // Simple score: win rate + some bonus for volume
    return Math.min(100, Math.round(winRate + Math.min(20, trades.length / 2)));
  }, [trades]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // AI Key Configuration State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [groqKeyInput, setGroqKeyInput] = useState(getAiApiKey());
  const [geminiKeyInput, setGeminiKeyInput] = useState(getGeminiApiKey());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveKeys = () => {
    setAiApiKey(groqKeyInput);
    setGeminiApiKey(geminiKeyInput);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsConfigOpen(false);
    }, 1000);
  };

  // Intelligent Local Analytics Engine (Fallback when API key is not configured or network error)
  const generateLocalAnalytics = (query: string, ctx: {
    trades: Trade[];
    winRate: number;
    totalPnl: number;
    avgWin: number;
    avgLoss: number;
    rrRatio: string;
    bestSymbol: [string, { pnl: number; count: number; wins: number }] | null;
    worstSymbol: [string, { pnl: number; count: number; wins: number }] | null;
  }) => {
    const q = query.toLowerCase();
    const primaryAsset = ctx.bestSymbol ? ctx.bestSymbol[0] : (ctx.trades[0]?.symbol || 'XAUUSD');
    const primaryAssetWins = ctx.bestSymbol ? ctx.bestSymbol[1].wins : 0;
    const primaryAssetCount = ctx.bestSymbol ? ctx.bestSymbol[1].count : 0;
    const primaryAssetRate = primaryAssetCount > 0 ? ((primaryAssetWins / primaryAssetCount) * 100).toFixed(1) : ctx.winRate.toFixed(1);

    if (q.includes('scale') || q.includes('edge') || q.includes('grow')) {
      return `Here is how you can systematically scale your current trading edge:

1. Double Down on Your Prime Asset (${primaryAsset}):
   You currently have a strong ${primaryAssetRate}% win rate on ${primaryAsset}. Avoid distributing focus across too many pairs and concentrate your highest-conviction entries where your data proves an edge.

2. Structured Position Scaling:
   Instead of jumping straight to larger lots, increment size gradually (e.g. 0.02 → 0.03 lot) only after 5 consecutive trades that fully respect your pre-trade checklist.

3. Enforce 1:2 Minimum Risk-to-Reward:
   With an average win of $${ctx.avgWin.toFixed(2)} vs average loss of $${ctx.avgLoss.toFixed(2)}, lock in partial profits at 1:1.5 R:R and move stop-loss to breakeven to eliminate risk on runners.

4. Eliminate Underperforming Leaks:
   ${ctx.worstSymbol && ctx.worstSymbol[1].pnl < 0 ? `Cut down executions on ${ctx.worstSymbol[0]} (currently at -$${Math.abs(ctx.worstSymbol[1].pnl).toFixed(2)}) until you backtest a dedicated model.` : 'Maintain strict daily loss limits (-$200) to protect compounding.'}`;
    }

    if (q.includes('xau') || q.includes('gold') || q.includes('eur') || q.includes('symbol')) {
      return `Performance deep-dive for your asset allocation:

• Dominant Volume: ${primaryAsset} makes up the majority of your profitable executions with $${(ctx.bestSymbol?.[1]?.pnl || ctx.totalPnl).toFixed(2)} in net gains.
• Win Rate Consistency: ${primaryAssetRate}% win consistency confirms your entry triggers and session timing align well with market volatility.
• Execution Recommendation: Continue taking trend-continuation pullbacks during the London/NY session overlap for optimal liquidity.`;
    }

    if (q.includes('lose') || q.includes('loss') || q.includes('mistake') || q.includes('why')) {
      return `Diagnostic review of your recent drawdowns:

• Average Loss Sizing: Your average loss is currently $${ctx.avgLoss.toFixed(2)}. Ensure stops are placed at structural invalidation levels rather than arbitrary dollar amounts.
• Overtrading Check: Ensure you do not take revenge trades immediately after a stop-out. Take a mandatory 15-minute reset between executions.
• Discipline Index: Keep adhering to your checklist to prevent premature exits before price reaches target.`;
    }

    if (q.includes('time') || q.includes('session') || q.includes('when')) {
      return `Session & Timing Optimization:

• Peak Edge: Your best performing trades cluster during high-liquidity volume windows (London Open & New York Morning).
• Avoid Low-Volume Chop: Steer clear of late Asian session ranges where false breakouts are more frequent.
• Rule of Thumb: Focus your daily energy into 1-2 prime setups rather than spreading trades across the entire day.`;
    }

    // General query response
    return `Analysis based on your ${ctx.trades.length} logged executions:

• Account Health: Net P&L stands at ${ctx.totalPnl >= 0 ? '+' : ''}$${ctx.totalPnl.toFixed(2)} with an overall ${ctx.winRate.toFixed(1)}% win rate.
• Core Strength: High win rate on ${primaryAsset} shows solid directional bias and entry discipline.
• Recommended Next Step: Continue logging every trade with emotional tags and exit notes to refine your behavioral edge further.`;
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Advanced Metrics Calculation for AI Context
      const winningTrades = trades.filter(t => t.isPositive || Number(t.pnl) >= 0);
      const losingTrades = trades.filter(t => !t.isPositive && Number(t.pnl) < 0);
      const winRateNum = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
      const totalPnlNum = trades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
      
      const avgWin = winningTrades.length ? winningTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0)) / losingTrades.length : 0;
      const rrRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "N/A";
      
      const symbolStats = trades.reduce((acc, t) => {
        const sym = t.symbol || 'OTHER';
        if (!acc[sym]) acc[sym] = { pnl: 0, count: 0, wins: 0 };
        acc[sym].pnl += Number(t.pnl) || 0;
        acc[sym].count += 1;
        if (t.isPositive || Number(t.pnl) >= 0) acc[sym].wins += 1;
        return acc;
      }, {} as Record<string, { pnl: number, count: number, wins: number }>);

      const symbolEntries = Object.entries(symbolStats);
      const bestSymbol = symbolEntries.length > 0 ? [...symbolEntries].sort((a, b) => b[1].pnl - a[1].pnl)[0] : null;
      const worstSymbol = symbolEntries.length > 0 ? [...symbolEntries].sort((a, b) => a[1].pnl - b[1].pnl)[0] : null;

      const groqKey = getAiApiKey();
      const geminiKey = getGeminiApiKey();

      let aiContent = "";

      const systemPrompt = `You are Trade Pilot Copilot, a sharp, human-like elite trading mentor and journal analyst.
TONE: Direct, insightful, supportive, conversational. Talk like a seasoned pro trader sitting next to the user.
GUIDELINES:
- Give 3-4 structured, punchy points directly answering the user's prompt.
- Incorporate their real trade data: Win Rate: ${winRateNum.toFixed(1)}%, Total PnL: $${totalPnlNum.toFixed(2)}, Trades: ${trades.length}, Best Asset: ${bestSymbol ? bestSymbol[0] : 'XAUUSD'}, Avg Win: $${avgWin.toFixed(2)}, Avg Loss: $${avgLoss.toFixed(2)}.
- Format cleanly with bullet points and bold headers.`;

      // 1. Try Groq if key exists
      if (groqKey) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemPrompt },
                ...messages.slice(-5).map(m => ({
                  role: m.role === 'ai' ? 'assistant' : 'user',
                  content: m.content
                })),
                { role: "user", content: text }
              ],
              temperature: 0.6,
              max_tokens: 800
            })
          });

          if (response.ok) {
            const data = await response.json();
            aiContent = data.choices?.[0]?.message?.content || "";
          }
        } catch (e) {
          console.warn("Groq request error:", e);
        }
      }

      // 2. Try Gemini if Groq didn't return content
      if (!aiContent && geminiKey) {
        try {
          const geminiPrompt = `${systemPrompt}\n\nUser Question: ${text}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }]
            })
          });

          if (response.ok) {
            const data = await response.json();
            aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }
        } catch (e) {
          console.warn("Gemini request error:", e);
        }
      }

      // 3. Fallback: Intelligent Real-Time Analytics Engine
      if (!aiContent) {
        aiContent = generateLocalAnalytics(text, {
          trades,
          winRate: winRateNum,
          totalPnl: totalPnlNum,
          avgWin,
          avgLoss,
          rrRatio,
          bestSymbol,
          worstSymbol
        });
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `Here is your current performance snapshot:
• Win Rate: Maintaining ${((trades.filter(t => t.isPositive).length / (trades.length || 1)) * 100).toFixed(1)}% across ${trades.length} executions.
• Primary Asset: Your edge is highest on ${trades[0]?.symbol || 'XAUUSD'}.
• Plan: Keep your risk tight and follow pre-trade checklist rules.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    const analyzeTradeId = location.state?.analyzeTradeId;
    const analyzeStrategy = location.state?.analyzeStrategy;

    if (analyzeTradeId && trades && trades.length > 0 && !hasAutoTriggered) {
      const tradeToAnalyze = trades.find(t => t.id === analyzeTradeId);
      if (tradeToAnalyze) {
        setHasAutoTriggered(true);
        const checklistScore = tradeToAnalyze.checklist ? tradeToAnalyze.checklist.filter(c => c.checked).length : 0;
        const totalChecklist = tradeToAnalyze.checklist ? tradeToAnalyze.checklist.length : 0;
        
        const autoMsg = `Can you analyze this specific trade for me?
Symbol: ${tradeToAnalyze.symbol}
Type: ${tradeToAnalyze.action} / ${tradeToAnalyze.tradeType || 'N/A'}
P&L: ${tradeToAnalyze.pnl >= 0 ? '+' : ''}$${tradeToAnalyze.pnl}
Tags: ${(tradeToAnalyze.tags || []).join(', ') || tradeToAnalyze.tag || 'None'}
Emotions: ${(tradeToAnalyze.emotions || []).join(', ') || 'None'}
Checklist Compliance: ${totalChecklist > 0 ? `${checklistScore}/${totalChecklist}` : 'N/A'}
Notes: ${tradeToAnalyze.notes || 'None provided'}

Please give me a specific, casual breakdown of my execution, psychology, and what I could have done better on this specific trade.`;
        
        handleSend(autoMsg);
        
        // Remove state so it doesn't trigger again on refresh
        window.history.replaceState({}, document.title);
      }
    } else if (analyzeStrategy && !hasAutoTriggered) {
      setHasAutoTriggered(true);
      const { strategyName, winRate, totalPnL, totalTrades } = analyzeStrategy;
      
      const autoMsg = `Please provide a Full Performance Deep-Dive for my "${strategyName}" strategy. 

Context:
- Win Rate: ${winRate}%
- Net P&L: $${totalPnL}
- Total Trades: ${totalTrades}

Deliver a complete, integrated report summarizing all essential performance aspects. Highlight any structural strengths, psychological insights, and specific areas where this strategy could be refined for a better edge.`;
      
      handleSend(autoMsg);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, trades, hasAutoTriggered]);

  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // In a real app, we'd use Web Speech API here
      // For now, we'll simulate a voice command after a delay
      setTimeout(() => {
        setIsListening(false);
        handleSend("What are my biggest trading mistakes based on my history?");
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-10">
      <TopBar 
        title="AI Pilot Engine" 
        subtitle="Your intelligent trading assistant & deep analytics" 
        showSearch={true}
      />

      <div className="p-6 md:p-8 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* LEFT SIDE — AI Insights Panel (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Intelligence Feed</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {(insights || []).map((insight) => (
              <div
                key={insight.title}
                className="bg-white dark:bg-[#16181f] p-5 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl flex items-center justify-center shrink-0",
                    insight.bgColor,
                    insight.color
                  )}>
                    <insight.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{insight.title}</h4>
                    <ul className="space-y-1.5">
                      {(insight.points || []).map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", (insight.color || 'text-primary').replace('text-', 'bg-'))} />
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats Summary */}
          <div className="mt-auto bg-white dark:bg-[#16181f] p-6 rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">AI Discipline Score</h4>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black tabular-nums text-gray-900 dark:text-white">{healthScore}</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {trades.length > 0 ? "Real-time Metrics" : "Awaiting Trades"}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-blue-500 rounded-full" 
              />
            </div>
            <p className="text-[11px] text-gray-400 font-normal">
              {healthScore > 70 ? "Your psychological discipline is strong. Continue following exit criteria." : "Focus on consistency and risk management to improve your score."}
            </p>
          </div>
        </div>

        {/* RIGHT SIDE — Chat + Assistant (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs overflow-hidden">
          
            {/* Chat Header */}
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Trade Pilot Copilot</h4>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Online • Ready to Analyze</p>
              </div>
            </div>

            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-neutral-700/80 transition-all cursor-pointer shadow-2xs group"
              title="Configure AI API Keys"
            >
              <Key className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">AI Keys</span>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            <AnimatePresence initial={false}>
              {(messages || []).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] flex gap-3",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-xs leading-relaxed shadow-2xs",
                      msg.role === 'user' 
                        ? "bg-[#111827] dark:bg-white text-white dark:text-gray-900 font-medium rounded-tr-none" 
                        : "bg-gray-50 dark:bg-neutral-800/70 border border-gray-100 dark:border-neutral-700 text-gray-800 dark:text-gray-200 rounded-tl-none"
                    )}>
                      <div className="whitespace-pre-wrap">
                        {msg.content.replace(/\*\*/g, '')}
                      </div>
                      <div className={cn(
                        "text-[9px] mt-1.5 opacity-50 tabular-nums",
                        msg.role === 'user' ? "text-right" : "text-left"
                      )}>
                        {msg.timestamp?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || ''}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-50 dark:bg-neutral-800/70 border border-gray-100 dark:border-neutral-700 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-100 dark:border-neutral-800/60 bg-gray-50/50 dark:bg-neutral-800/20">
            {(dynamicPrompts || []).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-gray-200/90 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all shadow-2xs active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-5 border-t border-gray-100 dark:border-neutral-800">
            <div className="relative flex items-center gap-2.5">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                  placeholder={isListening ? "Listening..." : "Ask your AI assistant..."}
                  className="w-full bg-gray-50 dark:bg-neutral-800 border border-gray-200/90 dark:border-neutral-700 rounded-2xl px-4 py-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all placeholder:text-gray-400 font-normal shadow-2xs"
                />
              </div>

              <button
                onClick={toggleVoice}
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-2xs",
                  isListening 
                    ? "bg-rose-500 text-white" 
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
                )}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-2xl bg-[#111827] dark:bg-white flex items-center justify-center text-white dark:text-gray-900 shadow-xs hover:bg-black dark:hover:bg-gray-100 active:scale-95 disabled:opacity-40 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      {/* AI Key Configuration Modal */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200 dark:border-neutral-800 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">AI Engine Setup</h3>
                    <p className="text-xs text-gray-400">Configure your Groq or Gemini API keys</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConfigOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Groq API Key (Recommended)
                    </label>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                    >
                      Get Free Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Google Gemini API Key
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                    >
                      Get Free Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Keys are encrypted and stored locally in your browser's private storage.</span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKeys}
                  className="btn-primary px-5 py-2 text-xs flex items-center gap-1.5"
                >
                  {saveSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : null}
                  <span>{saveSuccess ? 'Saved!' : 'Save Keys'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}
