import React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { 
  TrendingUp, 
  ShieldCheck, 
  BookOpen, 
  Star, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from "lucide-react";

interface TradeQualityMeterProps {
  pnl: number;
  rating: number;
  checklist: { label: string; checked: boolean }[];
  notes: string;
  emotions: string[];
  proof: string | null;
  className?: string;
}

export function TradeQualityMeter({ 
  pnl, 
  rating, 
  checklist, 
  notes, 
  emotions, 
  proof,
  className 
}: TradeQualityMeterProps) {
  // 1. Profitability (30 pts)
  const profitabilityScore = pnl > 0 ? 30 : pnl === 0 ? 15 : 0;

  // 2. Execution (40 pts)
  const checkedCount = (checklist || []).filter(c => c.checked).length;
  const executionScore = Math.round((checkedCount / Math.max((checklist || []).length, 1)) * 40);

  // 3. Journal (20 pts)
  let journalScore = 0;
  if (proof) journalScore += 5;
  if ((notes || "").length > 20) journalScore += 5;
  if ((emotions || []).length > 0) journalScore += 5;
  if ((notes || "").toLowerCase().includes("lesson") || (notes || "").length > 100) journalScore += 5;

  // 4. Rating (10 pts)
  const ratingScore = Math.min(10, Math.max(0, Math.round((rating / 10) * 10)));

  const totalScore = Math.min(100, Math.round(profitabilityScore + executionScore + journalScore + ratingScore));

  const getTier = (score: number) => {
    if (score >= 85) return { label: "A+ EXCELLENT", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40", stroke: "#10b981" };
    if (score >= 70) return { label: "A GOOD", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40", stroke: "#14b8a6" };
    if (score >= 50) return { label: "B AVERAGE", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40", stroke: "#f59e0b" };
    return { label: "C NEEDS WORK", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40", stroke: "#f43f5e" };
  };

  const tier = getTier(totalScore);

  const categories = [
    { 
      label: "Profitability", 
      score: profitabilityScore, 
      max: 30, 
      icon: TrendingUp,
      color: profitabilityScore === 30 ? "text-emerald-500" : profitabilityScore === 15 ? "text-amber-500" : "text-rose-500",
      barColor: profitabilityScore === 30 ? "bg-emerald-500" : profitabilityScore === 15 ? "bg-amber-500" : "bg-rose-500",
      desc: pnl > 0 ? "Win Target (+30)" : pnl === 0 ? "Breakeven (+15)" : "Loss (0)"
    },
    { 
      label: "Plan Execution", 
      score: executionScore, 
      max: 40, 
      icon: ShieldCheck,
      color: executionScore >= 30 ? "text-blue-500" : "text-amber-500",
      barColor: "bg-blue-500",
      desc: `${checkedCount}/${(checklist || []).length} Rules Followed`
    },
    { 
      label: "Journal Quality", 
      score: journalScore, 
      max: 20, 
      icon: BookOpen,
      color: journalScore >= 15 ? "text-indigo-500" : "text-gray-400",
      barColor: "bg-indigo-500",
      desc: `${journalScore}/20 Elements Logged`
    },
    { 
      label: "Self Rating", 
      score: ratingScore, 
      max: 10, 
      icon: Star,
      color: "text-amber-500",
      barColor: "bg-amber-500",
      desc: `${rating}/10 Trader Score`
    },
  ];

  // Circumference for r=46 is 2 * PI * 46 = 289.02
  const circleCircumference = 289.02;
  const strokeOffset = circleCircumference - (circleCircumference * totalScore) / 100;

  return (
    <div className={cn("p-6 rounded-3xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-6", className)}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Trade Execution Score
            </h3>
            <p className="text-[11px] text-gray-400">Objective Process & Discipline Metric</p>
          </div>
        </div>

        <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold border tracking-wide", tier.bg, tier.color)}>
          {tier.label}
        </span>
      </div>

      {/* Main Dial + Category Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Circular Gauge (4 Cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                className="text-gray-200 dark:text-neutral-700/60"
              />
              <motion.circle
                cx="72"
                cy="72"
                r="46"
                fill="none"
                stroke={tier.stroke}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circleCircumference}
                initial={{ strokeDashoffset: circleCircumference }}
                animate={{ strokeDashoffset: strokeOffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={cn("text-3xl font-black tabular-nums tracking-tight", tier.color)}>
                {totalScore}
              </span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                out of 100
              </span>
            </div>
          </div>
        </div>

        {/* Categories (8 Cols) */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const pct = Math.round((cat.score / cat.max) * 100);
            return (
              <div 
                key={idx}
                className="p-3 rounded-2xl bg-white dark:bg-[#16181f] border border-gray-100 dark:border-neutral-800 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("w-3.5 h-3.5", cat.color)} />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                    {cat.score}<span className="text-gray-400 text-[10px]">/{cat.max}</span>
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 * idx }}
                    className={cn("h-full rounded-full", cat.barColor)}
                  />
                </div>

                <p className="text-[10px] text-gray-400 font-medium truncate">
                  {cat.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
