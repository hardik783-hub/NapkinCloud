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
        <div className="relative mb-2 w-80 rounded-xl bg-[#0E0E0E]/95 backdrop-blur-2xl border border-[#222222] p-3.5 shadow-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-500/30 before:to-transparent">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-[#EDEDED] uppercase tracking-wider">
                Demo Recording Guide
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#888888]">3-Min Pitch</span>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onResetCanvas}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#222222] text-[#EDEDED] text-xs font-medium transition active:scale-95 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Canvas</span>
            </button>

            <button
              onClick={onJumpToLive}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-medium transition active:scale-95 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isLive ? '🟢 Live Active' : 'Jump to Live'}</span>
            </button>
          </div>

          {/* Storyboard Milestones */}
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {storyboard.map((s, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-[#121212] border border-[#202020] text-[11px]">
                <div className="flex items-center justify-between text-amber-400 font-mono font-medium mb-0.5">
                  <span>{s.time}</span>
                  <span className="text-[#888888] font-sans font-normal uppercase text-[10px]">{s.label}</span>
                </div>
                <p className="text-[#A3A3A3] leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111111]/90 hover:bg-[#1A1A1A] backdrop-blur-md border border-[#262626] text-xs font-medium text-[#EDEDED] shadow-md transition active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Demo HUD</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1E1E1E] text-[#888888] border border-[#2D2D2D]">
          D
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#888888]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#888888]" />}
      </button>
    </div>
  );
}
