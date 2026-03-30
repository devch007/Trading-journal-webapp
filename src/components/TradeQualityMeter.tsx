import React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { Info } from "lucide-react";

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
  // Map checklist items to the 4 categories if possible, or just use a ratio
  // Categories: Followed Plan, Proper Risk, Good Entry, Patient Exit
  const executionScore = (checklist.filter(c => c.checked).length / Math.max(checklist.length, 1)) * 40;

  // 3. Journal (20 pts)
  // Categories: Pre-analysis (proof), Post-review (notes length), Emotions (emotions count), Lessons (notes content)
  let journalScore = 0;
  if (proof) journalScore += 5;
  if (notes.length > 50) journalScore += 5;
  if (emotions.length > 0) journalScore += 5;
  if (notes.toLowerCase().includes("lesson") || notes.length > 150) journalScore += 5;

  // 4. Rating (10 pts)
  const ratingScore = (rating / 10) * 10;

  const totalScore = Math.round(profitabilityScore + executionScore + journalScore + ratingScore);

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-amber-400";
    return "text-rose-400";
  };

  const getQualityBg = (score: number) => {
    if (score >= 80) return "bg-emerald-400/20 border-emerald-400/30";
    if (score >= 60) return "bg-blue-400/20 border-blue-400/30";
    if (score >= 40) return "bg-amber-400/20 border-amber-400/30";
    return "bg-rose-400/20 border-rose-400/30";
  };

  const categories = [
    { label: "Profitability", score: profitabilityScore, max: 30, color: "bg-blue-500" },
    { label: "Execution", score: Math.round(executionScore), max: 40, color: "bg-blue-500" },
    { label: "Journal", score: journalScore, max: 20, color: "bg-blue-500" },
    { label: "Rating", score: Math.round(ratingScore), max: 10, color: "bg-blue-500" },
  ];

  return (
    <div className={cn("glass-card p-6 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-xl", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
        <h3 className="font-headline text-lg text-white tracking-tight">Trade Quality</h3>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
        {/* Circular Gauge */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-white/5"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={364.4}
              initial={{ strokeDashoffset: 364.4 }}
              animate={{ strokeDashoffset: 364.4 - (364.4 * totalScore) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={getQualityColor(totalScore)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-4xl font-bold font-data", getQualityColor(totalScore))}>
              {totalScore}
            </span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="flex-1 w-full space-y-4">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-label uppercase tracking-widest">
                <span className="text-on-surface-variant">{cat.label}</span>
                <span className="text-white font-bold">{cat.score}/{cat.max}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(cat.score / cat.max) * 100}%` }}
                  transition={{ duration: 1, delay: 0.2 * idx }}
                  className={cn("h-full rounded-full", cat.color)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Info */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-label uppercase tracking-widest">
          <Info className="w-3 h-3" />
          How is this calculated?
        </div>
        
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] leading-relaxed">
          <div className="flex justify-between">
            <span className="text-white font-bold">Profitability (30 pts)</span>
            <span className="text-gray-500">Win: 30 | BE: 15 | Loss: 0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white font-bold">Execution (40 pts)</span>
            <span className="text-gray-500">10 pts per checklist item</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white font-bold">Journal (20 pts)</span>
            <span className="text-gray-500">5 pts per journal element</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white font-bold">Rating (10 pts)</span>
            <span className="text-gray-500">Your self-rating (1-10)</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { label: "80+ Excellent", score: 80 },
            { label: "60+ Good", score: 60 },
            { label: "40+ Average", score: 40 },
            { label: "<40 Needs Work", score: 0 },
          ].map((level, idx) => (
            <div 
              key={idx} 
              className={cn(
                "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all",
                getQualityBg(level.score)
              )}
            >
              {level.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
