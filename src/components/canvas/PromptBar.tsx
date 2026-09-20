'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { AppNode, AppEdge } from '@/types/canvas';
import type { ServiceReasoning } from '@/types/compiler';

interface PromptBarProps {
  onApplyArchitecture: (
    nodes: AppNode[],
    edges: AppEdge[],
    reasoning: ServiceReasoning[],
    application: { name: string; description: string }
  ) => void;
  disabled?: boolean;
}

const PRESET_PROMPTS = [
  {
    label: 'Order Processing API',
    prompt: 'I want an API where users can create and retrieve their previous orders.',
    emoji: '📦',
  },
  {
    label: 'User Profile Service',
    prompt: 'REST API to register new user profiles with secure validation and storage',
    emoji: '👤',
  },
  {
    label: 'Payment Webhook',
    prompt: 'Webhook endpoint to capture Stripe payment events and record transaction status',
    emoji: '💳',
  },
  {
    label: 'Product Catalog',
    prompt: 'Microservice to manage product inventory items with price and SKU count',
    emoji: '🏷️',
  },
  {
    label: 'Task Management',
    prompt: 'REST API to create, assign, and track project tasks and issues',
    emoji: '📋',
  },
  {
    label: 'Notification Dispatch',
    prompt: 'Serverless alert system to dispatch email and push notifications',
    emoji: '🔔',
  },
  {
    label: 'Analytics Events',
    prompt: 'High-throughput endpoint to ingest user analytics and telemetry events',
    emoji: '📊',
  },
  {
    label: 'Booking & Reservation',
    prompt: 'Booking system to manage customer reservations and schedule appointments',
    emoji: '📅',
  },
];

export default function PromptBar({ onApplyArchitecture, disabled }: PromptBarProps) {
  const [prompt, setPrompt] = useState('I want an API where users can create and retrieve their previous orders.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleGenerate = async (textToUse?: string) => {
    const activePrompt = (textToUse || prompt).trim();
    if (!activePrompt || isGenerating) return;

    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/generate-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: activePrompt }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate architecture');
      }

      const data = await res.json();
      if (data.success && data.canvasNodes && data.canvasEdges) {
        onApplyArchitecture(
          data.canvasNodes,
          data.canvasEdges,
          data.reasoning || [],
          data.application || { name: 'Generated Service', description: activePrompt }
        );
        setStatusMessage(`Bedrock synthesized: ${data.application?.name || 'Architecture'}`);
        setTimeout(() => setStatusMessage(null), 4500);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setStatusMessage('Error generating architecture. Please retry.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChipClick = (preset: typeof PRESET_PROMPTS[0]) => {
    setPrompt(preset.prompt);
    handleGenerate(preset.prompt);
  };

  if (isCollapsed) {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111]/90 hover:bg-[#1A1A1A] border border-[#262626] text-xs text-[#A3A3A3] hover:text-[#EDEDED] shadow-xl backdrop-blur-md transition select-none"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Prompt Bar (Natural Language ➔ Canvas)</span>
          <span className="text-[10px] text-[#666666] font-mono">Expand ▾</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-auto select-none">
      <div className="bg-[#0E0E0E]/95 backdrop-blur-xl border border-[#222222] rounded-xl shadow-2xl p-3 transition-all focus-within:border-[#383838]">
        {/* Header matching Hardik's sketch */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-[#EDEDED] uppercase tracking-wide">
              Describe what you want to build
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] text-[#A3A3A3] border border-[#262626]">
              Natural Language ➔ Architecture
            </span>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-[10px] text-[#666666] hover:text-[#D4D4D4] font-mono px-1 py-0.5 rounded hover:bg-[#161616] transition"
              title="Collapse Prompt Bar"
            >
              Hide ▴
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="flex items-center gap-2.5"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={disabled || isGenerating}
            placeholder="I want an API where users can create and retrieve their previous orders."
            className="flex-1 bg-[#050505] border border-[#202020] rounded-xl px-3.5 py-2 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#444444] disabled:opacity-50 transition"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || disabled || isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#0A0A0A] bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 uppercase tracking-wide"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0A0A0A]" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>[ Understand ➔ ]</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Prompt Quick Chips */}
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[#222222] overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-semibold tracking-wider text-[#666666] uppercase shrink-0 pl-1">
            Quick Prompts:
          </span>
          {PRESET_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleChipClick(item)}
              disabled={disabled || isGenerating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#222222] hover:border-[#333333] text-[11px] text-[#A3A3A3] hover:text-[#EDEDED] transition-all shrink-0"
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Status indicator toast */}
        {statusMessage && (
          <div
            className={`mt-2 pt-1.5 flex items-center gap-1.5 text-xs font-medium ${
              statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('fail')
                ? 'text-rose-400'
                : 'text-emerald-400'
            }`}
          >
            {statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('fail') ? (
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
