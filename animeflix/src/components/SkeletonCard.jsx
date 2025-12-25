import React from 'react';

export function SkeletonCard() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="relative aspect-[2/3] rounded-[2rem] bg-white/5 border border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
      <div className="space-y-2 px-4">
        <div className="h-3 bg-white/10 rounded-full w-3/4 mx-auto"></div>
        <div className="h-2 bg-white/5 rounded-full w-1/2 mx-auto"></div>
      </div>
    </div>
  );
}