import React from "react";
import { cn } from "../../lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "default" | "card" | "circle" | "text";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gray-200/70 dark:bg-neutral-800/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/[0.06] before:to-transparent",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4 rounded-md",
        className
      )}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-7 max-w-[1600px] w-full mx-auto animate-fadeIn">
      {/* 3 Top Assets Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="w-24 h-5 rounded-full" />
            <Skeleton className="w-64 h-7 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#16181f] rounded-3xl p-5 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Skeleton variant="circle" className="w-8 h-8" />
                  <Skeleton className="w-20 h-4 rounded-md" />
                </div>
                <Skeleton variant="circle" className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <Skeleton className="w-28 h-6 rounded-lg" />
                <Skeleton className="w-20 h-4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-7">
          {/* Chart Skeleton */}
          <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="w-48 h-5 rounded-md" />
                <Skeleton className="w-64 h-3 rounded-md" />
              </div>
              <Skeleton className="w-36 h-8 rounded-xl" />
            </div>
            <Skeleton className="w-full h-64 rounded-2xl" />
          </div>

          {/* Calendar Heatmap Skeleton */}
          <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 md:p-7 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-5">
            <div className="flex justify-between items-center">
              <Skeleton className="w-48 h-6 rounded-md" />
              <Skeleton className="w-32 h-8 rounded-xl" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="w-full h-48 rounded-2xl" />
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Balance Card Skeleton */}
          <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton variant="circle" className="w-8 h-8" />
                <Skeleton className="w-36 h-5 rounded-md" />
              </div>
              <Skeleton variant="circle" className="w-7 h-7" />
            </div>
            <Skeleton className="w-44 h-9 rounded-xl" />
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
            </div>
          </div>

          {/* Activity Bar Chart Skeleton */}
          <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="w-24 h-5 rounded-md" />
              <Skeleton className="w-20 h-7 rounded-xl" />
            </div>
            <Skeleton className="w-full h-44 rounded-2xl" />
          </div>

          {/* Order Direction Card Skeleton */}
          <div className="bg-white dark:bg-[#16181f] rounded-3xl p-6 border border-gray-200/80 dark:border-neutral-800/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="w-36 h-5 rounded-md" />
              <Skeleton className="w-24 h-6 rounded-full" />
            </div>
            <div className="flex justify-center py-2">
              <Skeleton variant="circle" className="w-32 h-32" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
