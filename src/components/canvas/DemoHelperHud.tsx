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
    <div className="fixed bottom-6 right-6 z-30 pointer-events-auto flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-80 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Demo Recording Guide
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">3-Min Pitch</span>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onResetCanvas}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Canvas</span>
            </button>

            <button
              onClick={onJumpToLive}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isLive ? '🟢 Live Active' : 'Jump to Live'}</span>
            </button>
          </div>

          {/* Storyboard Milestones */}
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {storyboard.map((s, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px]">
                <div className="flex items-center justify-between text-amber-400 font-mono font-bold mb-0.5">
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
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-xs font-semibold text-slate-200 shadow-xl transition hover:scale-105"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Demo HUD</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
          D
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
      </button>
    </div>
  );
}
