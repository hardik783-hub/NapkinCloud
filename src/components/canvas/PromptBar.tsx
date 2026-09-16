'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2, ChevronRight, CheckCircle2 } from 'lucide-react';
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
    prompt: 'I want an API where users can create orders and store them in DynamoDB',
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
  const [prompt, setPrompt] = useState('');
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
        setStatusMessage(`Generated ${data.application?.name || 'Architecture'} (${data.source === 'bedrock' ? 'Amazon Bedrock' : 'Smart Rule Engine'})`);
        setTimeout(() => setStatusMessage(null), 4000);
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
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl p-2.5 transition-all focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="flex items-center gap-2"
        >
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={disabled || isGenerating}
            placeholder="Describe backend in plain English (e.g. 'REST API to process customer orders')..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || disabled || isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Draw</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Prompt Quick Chips */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase shrink-0 pl-1">
            Presets:
          </span>
          {PRESET_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleChipClick(item)}
              disabled={disabled || isGenerating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-white transition-all shrink-0"
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Status indicator toast */}
        {statusMessage && (
          <div className="mt-2 pt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
