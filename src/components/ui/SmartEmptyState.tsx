import React from "react";
import { Plus, Upload, Target, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface SmartEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function SmartEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className
}: SmartEmptyStateProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-[#16181f] rounded-3xl border border-gray-200/80 dark:border-neutral-800/80 p-8 sm:p-10 text-center shadow-2xs flex flex-col items-center justify-center space-y-4 relative overflow-hidden group",
      className
    )}>
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon with glowing ring */}
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-105 transition-transform duration-300">
        {icon || <Target className="w-7 h-7" />}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 z-10">
          {actionLabel && (
            <button
              onClick={onAction}
              className="px-4 py-2 rounded-xl bg-[#111827] dark:bg-white text-white dark:text-gray-900 text-xs font-semibold shadow-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionLabel}</span>
            </button>
          )}

          {secondaryActionLabel && (
            <button
              onClick={onSecondaryAction}
              className="px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200/80 dark:border-neutral-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
