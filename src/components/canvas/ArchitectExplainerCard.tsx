'use client';

import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Sparkles, X, Layers, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="absolute bottom-6 right-6 z-30 max-w-sm w-full pointer-events-auto animate-fadeIn">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">AI Cloud Architect</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Bedrock Agent
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {application?.name || 'Order Processing Service'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isMinimized ? 'Expand explanation' : 'Minimize explanation'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {!isMinimized && (
          <div className="p-3.5 space-y-3 text-xs">
            <div className="flex items-start gap-2 text-slate-300 text-[11px] leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {application?.description || 'Here is the AWS Serverless architecture designed for your use-case:'}
              </span>
            </div>

            <div className="space-y-2">
              {activeReasoning.map((item, idx) => {
                const serviceColor = {
                  api_gateway: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                  lambda: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  dynamodb: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                }[item.service] || 'text-purple-400 bg-purple-500/10 border-purple-500/20';

                const serviceTitle = {
                  api_gateway: 'API Gateway (Trigger)',
                  lambda: 'AWS Lambda (Compute)',
                  dynamodb: 'DynamoDB (Storage)',
                }[item.service] || item.service;

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/70 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${serviceColor}`}>
                        {serviceTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-1">
                      {item.reason}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Deterministic P0 Stack</span>
              </span>
              <span>Ready to Compile</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
