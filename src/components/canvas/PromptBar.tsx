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
];

export default function PromptBar({ onApplyArchitecture, disabled }: PromptBarProps) {
  const [prompt, setPrompt] = useState('I want an API where users can create and retrieve their previous orders.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-3.5 transition-all focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/40">
        {/* Header matching Hardik's sketch */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Describe what you want to build
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
            Natural Language ➔ Architecture
          </span>
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
            className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 transition"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || disabled || isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 uppercase tracking-wide"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
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
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase shrink-0 pl-1">
            Quick Prompts:
          </span>
          {PRESET_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleChipClick(item)}
              disabled={disabled || isGenerating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 hover:border-amber-400/40 text-[11px] text-slate-300 hover:text-white transition-all shrink-0"
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Status indicator toast */}
        {statusMessage && (
          <div className="mt-2 pt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
