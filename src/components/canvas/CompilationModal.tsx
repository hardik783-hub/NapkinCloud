'use client';

import React, { useState } from 'react';
import { X, Check, Copy, FileCode, Layers, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import type { CompileResponse } from '@/types/compiler';

interface CompilationModalProps {
  data: CompileResponse;
  onClose: () => void;
}

export default function CompilationModal({ data, onClose }: CompilationModalProps) {
  const [activeTab, setActiveTab] = useState<'sam' | 'lambda' | 'handoff' | 'reasoning'>('sam');
  const [copied, setCopied] = useState(false);

  const activeContent = {
    sam: data.templateYaml || '',
    lambda: data.handlerJs || '',
    handoff: JSON.stringify(data.handOffContract || {}, null, 2),
    reasoning: JSON.stringify(data.reasoning || [], null, 2),
  }[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const norm = data.normalizedArchitecture;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl flex flex-col max-h-[90vh] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-emerald-500/30 before:to-transparent">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Compilation Complete — AWS Artifacts Generated
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                  {norm?.source === 'bedrock' ? 'Amazon Bedrock' : 'Deterministic Engine'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Project: <code className="text-cyan-400 font-mono text-[11px]">{data.projectId}</code> • 3 AWS Services Synthesized
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Architecture Specs Callout */}
        {norm && (
          <div className="my-3 grid grid-cols-3 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 text-xs font-mono">
              <span className="text-slate-400 text-[10px] block uppercase font-medium">HTTP Route</span>
              <span className="text-cyan-400 font-bold">{norm.api.method} {norm.api.path}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 text-xs font-mono">
              <span className="text-slate-400 text-[10px] block uppercase font-medium">Lambda Function</span>
              <span className="text-amber-400 font-bold">{norm.lambda.functionName}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 text-xs font-mono">
              <span className="text-slate-400 text-[10px] block uppercase font-medium">DynamoDB Table</span>
              <span className="text-indigo-400 font-bold">{norm.dynamodb.tableName} ({norm.dynamodb.partitionKey})</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pt-1 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
            <button
              onClick={() => setActiveTab('sam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition active:scale-95 ${
                activeTab === 'sam'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>template.yaml</span>
            </button>

            <button
              onClick={() => setActiveTab('lambda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition active:scale-95 ${
                activeTab === 'lambda'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>index.js (Handler)</span>
            </button>

            <button
              onClick={() => setActiveTab('reasoning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition active:scale-95 ${
                activeTab === 'reasoning'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Reasoning</span>
            </button>

            <button
              onClick={() => setActiveTab('handoff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition active:scale-95 ${
                activeTab === 'handoff'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Teammate Contract</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 text-slate-200 transition active:scale-95 shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto mt-3 rounded-lg bg-slate-950/90 border border-slate-800/80 p-4">
          {activeTab === 'reasoning' && data.reasoning ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400 font-mono">
                <span>Bedrock Architectural Decisions (P0 Microservice Topology)</span>
                <span className="text-purple-400 font-bold">Hardik Schema #3</span>
              </div>
              {data.reasoning.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {item.service}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans mt-1">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-xs font-mono text-slate-300 leading-relaxed select-text">
              {activeContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for Step Functions / CloudFormation deployment</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
