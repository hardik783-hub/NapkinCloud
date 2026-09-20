'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, RotateCcw, Zap, Video, CheckCircle2 } from 'lucide-react';

interface DemoHelperHudProps {
  onResetCanvas: () => void;
  onJumpToLive: () => void;
  isLive: boolean;
}

const storyboard = [
  { time: '0:00 - 0:15', label: 'Hook', desc: 'Show blank canvas: "Every backend starts on a whiteboard..."' },
  { time: '0:15 - 0:35', label: 'Draw', desc: 'Drag API Gateway -> Lambda -> DynamoDB onto canvas.' },
  { time: '0:35 - 1:15', label: 'Compile', desc: 'Click "⚡ Compile to AWS". Show synthesized SAM YAML.' },
  { time: '1:15 - 1:45', label: 'API Test', desc: 'Click API node. Fire POST /orders -> 200 OK response.' },
  { time: '1:45 - 2:05', label: 'DB Inspect', desc: 'Click DynamoDB node. Show live record in table.' },
  { time: '2:05 - 3:00', label: 'Close', desc: 'Show architecture flex, zero cost at idle, live URL.' },
];

export default function DemoHelperHud({
  onResetCanvas,
  onJumpToLive,
  isLive,
}: DemoHelperHudProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'd' || e.key === 'D') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed bottom-5 left-64 z-20 pointer-events-auto flex flex-col items-start select-none">
      {isOpen && (
        <div className="relative mb-2 w-80 rounded-xl bg-slate-950/95 backdrop-blur-2xl border border-slate-800/90 p-3.5 shadow-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-500/30 before:to-transparent">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
                Demo Recording Guide
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">3-Min Pitch</span>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onResetCanvas}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-slate-200 text-xs font-medium transition active:scale-95 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Canvas</span>
            </button>

            <button
              onClick={onJumpToLive}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition active:scale-95 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isLive ? '🟢 Live Active' : 'Jump to Live'}</span>
            </button>
          </div>

          {/* Storyboard Milestones */}
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {storyboard.map((s, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/70 text-[11px]">
                <div className="flex items-center justify-between text-amber-400 font-mono font-medium mb-0.5">
                  <span>{s.time}</span>
                  <span className="text-slate-400 font-sans font-normal uppercase text-[10px]">{s.label}</span>
                </div>
                <p className="text-slate-300 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 backdrop-blur-md border border-slate-800 text-xs font-medium text-slate-200 shadow-md transition active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Demo HUD</span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
          D
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
      </button>
    </div>
  );
}
