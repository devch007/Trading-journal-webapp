import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, CheckCircle2, ShieldAlert, Target, Save, Clock, Trophy } from 'lucide-react';
import { TopBar } from '../lib/TopBar';
import { useRituals, MorningRitual, EveningRitual } from '../hooks/useRituals';
import { cn } from '../lib/utils';

export function DailyRituals() {
  const { getTodayRitual, saveRitual } = useRituals();
  const today = new Date().toISOString().split('T')[0];
  const ritual = getTodayRitual();

  const [mClarity, setMClarity] = useState(ritual?.morning?.clarityScore || 5);
  const [mSleep, setMSleep] = useState(ritual?.morning?.sleepQuality || 'Good');
  const [mNews, setMNews] = useState(ritual?.morning?.newsChecked || false);
  const [mGoal, setMGoal] = useState(ritual?.morning?.topGoal || '');

  const [eScore, setEScore] = useState(ritual?.evening?.dayScore || 5);
  const [eRules, setERules] = useState(ritual?.evening?.rulesFollowed || false);
  const [eLesson, setELesson] = useState(ritual?.evening?.biggestLesson || '');
  const [eEmotion, setEEmotion] = useState(ritual?.evening?.emotionalState || 'Neutral');

  const handleMorningSave = () => {
    saveRitual(today, 'morning', {
      clarityScore: mClarity,
      sleepQuality: mSleep as any,
      newsChecked: mNews,
      topGoal: mGoal,
      completedAt: new Date().toISOString()
    });
  };

  const handleEveningSave = () => {
    saveRitual(today, 'evening', {
      dayScore: eScore,
      rulesFollowed: eRules,
      biggestLesson: eLesson,
      emotionalState: eEmotion,
      completedAt: new Date().toISOString()
    });
  };

  return (
    <div className="flex flex-col min-h-full pb-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-[0.03] bg-gradient-to-br from-blue-500 to-purple-600 pointer-events-none blur-[100px]" />
      
      <TopBar title="Daily Rituals" subtitle="Discipline is built daily" showSearch={false} />

      <div className="px-4 md:px-8 mt-6 max-w-5xl mx-auto w-full flex flex-col gap-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Morning Ritual */}
          <div className="relative group">
            <div className={cn("absolute inset-0 rounded-3xl opacity-50 blur-xl transition-all duration-500", ritual?.morning ? "bg-[#1ED760]/20" : "bg-blue-500/10 group-hover:bg-blue-500/20")} />
            <div className={cn("relative p-8 rounded-3xl shadow-2xl border backdrop-blur-xl h-full flex flex-col", ritual?.morning ? "bg-[#1ED760]/5 border-[#1ED760]/30" : "bg-black/60 border-white/5 group-hover:border-blue-500/30")}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl", ritual?.morning ? "bg-[#1ED760]/20 text-[#1ED760]" : "bg-blue-500/20 text-blue-400")}>
                     <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Morning Prep</h3>
                    <p className="text-xs text-gray-500 font-medium">Before the market opens</p>
                  </div>
                </div>
                {ritual?.morning && (
                  <div className="flex items-center gap-2 bg-[#1ED760]/10 border border-[#1ED760]/30 px-3 py-1.5 rounded-full text-[#1ED760]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Completed</span>
                  </div>
                )}
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest flex justify-between">
                    Mental Clarity Score <span className="text-white font-bold">{mClarity}/10</span>
                  </label>
                  <input type="range" min="1" max="10" value={mClarity} onChange={e => setMClarity(Number(e.target.value))} className="w-full accent-blue-500 cursor-pointer" disabled={!!ritual?.morning} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest">Sleep Quality</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Poor', 'Average', 'Good', 'Excellent'].map(sq => (
                      <button key={sq} onClick={() => setMSleep(sq)} disabled={!!ritual?.morning} className={cn("py-2 text-[10px] font-bold rounded-lg border transition-all", mSleep === sq ? "bg-blue-500 border-blue-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 disabled:opacity-50")}>
                        {sq}
                      </button>
                    ))}
                  </div>
                </div>

                <motion.label whileTap={ritual?.morning ? {} : { scale: 0.98 }} className={cn("p-4 rounded-xl border flex items-center justify-between gap-3 transition-all", mNews ? "bg-blue-500/10 border-blue-500" : "bg-white/5 border-white/10", ritual?.morning ? "cursor-default" : "cursor-pointer")}>
                    <div className="flex items-center gap-3">
                      <ShieldAlert className={cn("w-5 h-5", mNews ? "text-blue-400" : "text-gray-500")} />
                      <span className={cn("text-sm font-bold", mNews ? "text-white" : "text-gray-400")}>Checked High-Impact News?</span>
                    </div>
                    <input type="checkbox" checked={mNews} onChange={e => setMNews(e.target.checked)} disabled={!!ritual?.morning} className="w-5 h-5 rounded border-white/20 text-blue-500 bg-transparent focus:ring-0" />
                </motion.label>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> Top Goal for Today
                  </label>
                  <input type="text" value={mGoal} onChange={e => setMGoal(e.target.value)} disabled={!!ritual?.morning} placeholder="e.g., Only trade London session, wait for structural shift." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors disabled:opacity-50" />
                </div>
              </div>

              {!ritual?.morning && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleMorningSave} disabled={!mGoal} className="mt-8 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save Morning Ritual
                </motion.button>
              )}
            </div>
          </div>

          {/* Evening Ritual */}
          <div className="relative group">
            <div className={cn("absolute inset-0 rounded-3xl opacity-50 blur-xl transition-all duration-500", !ritual?.morning ? "hidden" : ritual?.evening ? "bg-[#1ED760]/20" : "bg-purple-500/10 group-hover:bg-purple-500/20")} />
            <div className={cn("relative p-8 rounded-3xl shadow-2xl border backdrop-blur-xl h-full flex flex-col transition-all", !ritual?.morning ? "opacity-40 grayscale pointer-events-none bg-black/30 border-white/5" : ritual?.evening ? "bg-[#1ED760]/5 border-[#1ED760]/30" : "bg-black/60 border-white/5 group-hover:border-purple-500/30")}>
              
              {!ritual?.morning && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm rounded-3xl">
                  <Clock className="w-10 h-10 text-gray-500 mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Complete Morning First</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl", ritual?.evening ? "bg-[#1ED760]/20 text-[#1ED760]" : "bg-purple-500/20 text-purple-400")}>
                     <Moon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Evening Wrap-up</h3>
                    <p className="text-xs text-gray-500 font-medium">End of trading day review</p>
                  </div>
                </div>
                {ritual?.evening && (
                  <div className="flex items-center gap-2 bg-[#1ED760]/10 border border-[#1ED760]/30 px-3 py-1.5 rounded-full text-[#1ED760]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Completed</span>
                  </div>
                )}
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest flex justify-between">
                    Performance Grade <span className="text-white font-bold">{eScore}/10</span>
                  </label>
                  <input type="range" min="1" max="10" value={eScore} onChange={e => setEScore(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer" disabled={!!ritual?.evening} />
                </div>

                <motion.label whileTap={ritual?.evening ? {} : { scale: 0.98 }} className={cn("p-4 rounded-xl border flex items-center justify-between gap-3 transition-all", eRules ? "bg-[#1ED760]/10 border-[#1ED760]/50" : "bg-white/5 border-white/10", ritual?.evening ? "cursor-default" : "cursor-pointer")}>
                    <div className="flex items-center gap-3">
                      <Trophy className={cn("w-5 h-5", eRules ? "text-[#1ED760]" : "text-gray-500")} />
                      <span className={cn("text-sm font-bold", eRules ? "text-[#1ED760]" : "text-gray-400")}>Followed all trading rules?</span>
                    </div>
                    <input type="checkbox" checked={eRules} onChange={e => setERules(e.target.checked)} disabled={!!ritual?.evening} className="w-5 h-5 rounded border-[#1ED760]/50 text-[#1ED760] bg-transparent focus:ring-0" />
                </motion.label>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest">Ending Emotion</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Satisfied', 'Neutral', 'Frustrated'].map(em => (
                      <button key={em} onClick={() => setEEmotion(em)} disabled={!!ritual?.evening} className={cn("py-2.5 text-xs font-bold rounded-xl border transition-all", eEmotion === em ? (em === 'Satisfied' ? "bg-[#1ED760] border-[#1ED760] text-black" : em === 'Frustrated' ? "bg-[#E5534B] border-[#E5534B] text-white" : "bg-gray-500 border-gray-500 text-white") : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 disabled:opacity-50")}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    Biggest Lesson Learned
                  </label>
                  <textarea value={eLesson} onChange={e => setELesson(e.target.value)} disabled={!!ritual?.evening} placeholder="What did the market teach you today?" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-colors disabled:opacity-50 resize-none h-24" />
                </div>
              </div>

              {!ritual?.evening && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleEveningSave} disabled={!eLesson} className="mt-8 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save Evening Ritual
                </motion.button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
