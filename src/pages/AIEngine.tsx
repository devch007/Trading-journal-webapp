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
  User
} from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { cn } from '../lib/utils';
import { useTrades, Trade } from '../hooks/useTrades';

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
  const { trades, loading: tradesLoading } = useTrades();
  
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
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10"
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
        color: maxLosingStreak > 3 ? "text-rose-400" : "text-emerald-400",
        bgColor: maxLosingStreak > 3 ? "bg-rose-500/10" : "bg-emerald-500/10"
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
      const winningTrades = trades.filter(t => t.isPositive);
      const losingTrades = trades.filter(t => !t.isPositive);
      
      const avgWin = winningTrades.length ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0)) / losingTrades.length : 0;
      const rrRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "N/A";
      
      const symbolStats = trades.reduce((acc, t) => {
        if (!acc[t.symbol]) acc[t.symbol] = { pnl: 0, count: 0, wins: 0 };
        acc[t.symbol].pnl += t.pnl;
        acc[t.symbol].count += 1;
        if (t.isPositive) acc[t.symbol].wins += 1;
        return acc;
      }, {} as Record<string, { pnl: number, count: number, wins: number }>);

      const symbolEntries = Object.entries(symbolStats);
      const bestSymbol = symbolEntries.length > 0 ? [...symbolEntries].sort((a, b) => (b[1] as any).pnl - (a[1] as any).pnl)[0] : null;
      const worstSymbol = symbolEntries.length > 0 ? [...symbolEntries].sort((a, b) => (a[1] as any).pnl - (b[1] as any).pnl)[0] : null;

      const tagStats = trades.reduce((acc, t) => {
        const tag = t.tag || "Untagged";
        if (!acc[tag]) acc[tag] = { pnl: 0, count: 0 };
        acc[tag].pnl += t.pnl;
        acc[tag].count += 1;
        return acc;
      }, {} as Record<string, { pnl: number, count: number }>);

      // Prepare trade summary for the AI
      const tradeSummary = (trades || []).slice(0, 30).map(t => ({
        symbol: t.symbol,
        action: t.action,
        size: t.size,
        pnl: t.pnl,
        date: t.date,
        entry: t.entry,
        exit: t.exit,
        duration: t.duration,
        tag: t.tag
      }));

      const systemPrompt = `
        You are the user's best trading buddy.
        
        PERSONA:
        - Super friendly, supportive, and knowledgeable. Like a close friend who's got your back in the markets.
        - Chill, casual, and positive. No corporate talk at all.
        - Honest but encouraging. You want your buddy to win.
        
        STRICT RESPONSE RULES (NON-NEGOTIABLE):
        1. Max 30–40 words total per reply.
        2. Format: 1 short main line + 2–3 quick bullet points max.
        3. Each bullet: 1 short sentence/phrase (Max 8 words).
        4. Use "→" for suggestions. Use "-" for observations.
        5. NO FILLER: Never say "overall", "in conclusion", "great question", "certainly", "of course".
        6. NO big paragraphs. NO multi-line sentences.
        7. Casual language only: "yo", "my man", "solid", "we got this", "ngl", "tbh".
        
        FORMAT:
        [1 short main line]
        - observation
        - observation
        → suggestion
        
        CONTEXT:
        - Account: Main
        - State: Analyzing
        - Win Rate: ${((winningTrades.length / trades.length) * 100 || 0).toFixed(1)}%
        
        RECENT TRADES:
        ${tradeSummary.slice(0, 5).map(t => `${t.symbol} ${t.action} $${t.pnl?.toFixed(0) || 0}`).join(' | ')}
        
        If user asks for more detail → expand slightly (still under 80 words, still casual).
        If user is emotional/tilted → be supportive: "yo, take a breather, we'll bounce back."
        No financial advice. No market predictions.
      `;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ... (messages || []).slice(-5).map(m => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content
            })),
            { role: "user", content: text }
          ],
          temperature: 0.5,
          max_tokens: 1000
        })
      });

      if (!response.ok) throw new Error('Groq API error');
      
      const data = await response.json();
      const aiContent = data.choices[0]?.message?.content;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiContent || "I'm sorry, I couldn't analyze that right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I encountered an error while analyzing your data. Please check your connection or try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

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
    <div className="flex flex-col min-h-full pb-10 relative overflow-hidden">
      {/* Immersive Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <TopBar 
        title="AI Engine" 
        subtitle="Your trading intelligence assistant" 
        showSearch={true}
        actionButton={
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
              <History className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="px-8 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 relative z-10">
        
        {/* LEFT SIDE — AI Insights Panel */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider text-sm">Intelligence Feed</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {(insights || []).map((insight, idx) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-default overflow-hidden">
                  <div className="flex items-start gap-5">
                    <div className={cn(
                      "p-4 rounded-xl border border-white/5 shadow-inner transition-transform duration-500 group-hover:scale-110",
                      insight.bgColor,
                      insight.color
                    )}>
                      <insight.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-white mb-3 tracking-tight">{insight.title}</h4>
                      <ul className="space-y-2">
                        {(insight.points || []).map((point, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                            <div className={cn("w-1 h-1 rounded-full mt-2 shrink-0", (insight.color || 'text-primary').replace('text-', 'bg-'))} />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-1">
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                  
                  {/* Subtle background glow */}
                  <div className={cn(
                    "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 rounded-full transition-opacity group-hover:opacity-20",
                    insight.bgColor
                  )} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Stats Summary */}
          <div className="mt-auto glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-primary" />
              <h4 className="font-bold text-white">AI Health Score</h4>
            </div>
            <div className="flex items-end gap-4 mb-2">
              <span className="text-4xl font-bold text-white">{healthScore}</span>
              <span className="text-emerald-400 text-sm font-bold mb-1">
                {trades.length > 0 ? "Analyzing History" : "No Data Yet"}
              </span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-primary" 
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">
              {healthScore > 70 ? "Your psychological discipline is at an all-time high. Focus on refining entry precision." : "Focus on consistency and risk management to improve your score."}
            </p>
          </div>
        </div>

        {/* RIGHT SIDE — Chat + Voice Assistant */}
        <div className="flex flex-col h-[calc(100vh-180px)] glass-card rounded-2xl border border-white/5 overflow-hidden bg-black/20 backdrop-blur-xl">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0d0d16] rounded-full" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Trading Assistant</h4>
                <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Online • Analyzing Data</p>
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/20" />)}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            <AnimatePresence initial={false}>
              {(messages || []).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex w-full",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] flex gap-3",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg",
                      msg.role === 'user' ? "bg-white/10" : "bg-primary"
                    )}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Brain className="w-4 h-4 text-white" />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-xl",
                      msg.role === 'user' 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none"
                    )}>
                      {msg.content}
                      <div className={cn(
                        "text-[10px] mt-2 opacity-50",
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
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-white" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
            {(dynamicPrompts || []).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-primary/20 hover:border-primary/50 transition-all active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-6 pt-2">
            <div className="relative flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                  placeholder={isListening ? "Listening..." : "Ask your AI assistant..."}
                  className={cn(
                    "w-full bg-black/40 border rounded-2xl px-5 py-4 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600",
                    isListening ? "border-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-white/10 focus:border-primary/50"
                  )}
                />
                
                {/* Voice Animation */}
                {isListening && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 items-center h-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <motion.div
                        key={i}
                        animate={{ height: [4, 16, 4] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                        className="w-0.5 bg-primary rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleVoice}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-lg",
                  isListening 
                    ? "bg-rose-500 text-white shadow-rose-500/20" 
                    : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 active:scale-90 disabled:opacity-50 disabled:grayscale transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
