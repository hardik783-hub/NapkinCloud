'use client';

import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Sparkles, X, ShieldCheck, Copy, Check } from 'lucide-react';
import type { ServiceReasoning } from '@/types/compiler';

interface ArchitectExplainerCardProps {
  application?: {
    name: string;
    description: string;
  };
  reasoning?: ServiceReasoning[];
  onClose?: () => void;
}

export default function ArchitectExplainerCard({
  application,
  reasoning,
  onClose,
}: ArchitectExplainerCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaultReasoning: ServiceReasoning[] = [
    {
      service: 'api_gateway',
      reason: 'Exposes a secure HTTPS REST endpoint (/orders) with built-in request throttling, CORS, and routing.',
    },
    {
      service: 'lambda',
      reason: 'Serverless compute executes your order logic on-demand. Auto-scales from zero with zero idle server costs.',
    },
    {
      service: 'dynamodb',
      reason: 'Managed NoSQL key-value store partitioned by orderId for predictable sub-10ms read/write latency.',
    },
  ];

  const activeReasoning = reasoning && reasoning.length > 0 ? reasoning : defaultReasoning;

  const handleCopyReasoning = () => {
    const text = activeReasoning
      .map((r) => `• ${r.service.toUpperCase()}: ${r.reason}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="absolute bottom-5 right-6 z-30 max-w-sm w-full pointer-events-auto select-none animate-fadeIn">
      <div className="relative bg-[#0E0E0E]/95 backdrop-blur-xl border border-[#222222] rounded-xl shadow-2xl overflow-hidden transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-purple-500/30 before:to-transparent">
        {/* Header */}
        <div className="px-3.5 py-3 bg-[#121212] border-b border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#EDEDED] tracking-tight font-sans">AI Architect</span>
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Bedrock Agent
                </span>
              </div>
              <p className="text-[10px] text-[#888888] font-sans truncate max-w-[170px]">
                {application?.name || 'Order Processing Service'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyReasoning}
              className="p-1.5 rounded-lg text-[#888888] hover:text-[#EDEDED] hover:bg-[#1C1C1C] transition active:scale-95"
              title={copied ? 'Copied to clipboard' : 'Copy architecture reasoning'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-[#888888] hover:text-[#EDEDED] hover:bg-[#1C1C1C] transition active:scale-95"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#888888] hover:text-[#EDEDED] hover:bg-[#1C1C1C] transition active:scale-95"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {!isMinimized && (
          <div className="p-3.5 space-y-2.5 text-xs select-text">
            <div className="flex items-start gap-2 text-[#D4D4D4] text-[11px] leading-relaxed bg-[#121212] p-2.5 rounded-lg border border-[#202020]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="font-sans">
                {application?.description || 'AWS Serverless topology synthesized for sub-10ms transactional execution:'}
              </span>
            </div>

            <div className="space-y-2">
              {activeReasoning.map((item, idx) => {
                const serviceBadge = {
                  api_gateway: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
                  lambda: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
                  dynamodb: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
                }[item.service] || 'text-purple-400 bg-purple-500/10 border-purple-500/25';

                const serviceTitle = {
                  api_gateway: 'API Gateway · Ingress',
                  lambda: 'AWS Lambda · Compute',
                  dynamodb: 'DynamoDB · Storage',
                }[item.service] || item.service;

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#121212] border border-[#202020] hover:border-[#333333] transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${serviceBadge}`}>
                        {serviceTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A3A3A3] leading-relaxed font-sans">
                      {item.reason}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#222222] flex items-center justify-between text-[10px] text-[#888888] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Deterministic P0 Stack</span>
              </span>
              <span className="text-[#555555]">SAM Ready</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
