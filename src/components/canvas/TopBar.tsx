'use client';

import React, { useState } from 'react';
import { Zap, Download, Play, Check, X, FileJson, ShieldCheck, Loader2, Activity, Bot } from 'lucide-react';
import { exportGraphToJson, type ExportedGraph } from '@/lib/graphExporter';
import type { AppNode, AppEdge } from '@/types/canvas';
import type { ServiceReasoning } from '@/types/compiler';

interface TopBarProps {
  nodes: AppNode[];
  edges: AppEdge[];
  isCompiling?: boolean;
  isLive?: boolean;
  reasoning?: ServiceReasoning[];
  onCompile?: () => void;
  onOpenApiDrawer?: () => void;
  onOpenDbDrawer?: () => void;
  onToggleExplainer?: () => void;
}

export default function TopBar({
  nodes,
  edges,
  isCompiling,
  isLive,
  reasoning,
  onCompile,
  onOpenApiDrawer,
  onOpenDbDrawer,
  onToggleExplainer,
}: TopBarProps) {
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportedData, setExportedData] = useState<ExportedGraph | null>(null);

  const handleOpenJsonModal = () => {
    const data = exportGraphToJson(nodes, edges, 'proj-demo-orders', reasoning);
    setExportedData(data);
    setJsonModalOpen(true);
  };

  const handleCopyJson = () => {
    if (!exportedData) return;
    navigator.clipboard.writeText(JSON.stringify(exportedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validation = exportedData?.validation || exportGraphToJson(nodes, edges).validation;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 px-5 z-30 flex items-center justify-between pointer-events-auto select-none">
        {/* Left: Brand / Studio Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-black tracking-wider text-white uppercase">
                NapkinCloud
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-400 border border-slate-700/80 font-semibold">
                v1.0
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 pl-3 border-l border-slate-800">
            <span>Draw</span>
            <span className="text-slate-600">⟶</span>
            <span>Compile</span>
            <span className="text-slate-600">⟶</span>
            <span>Deploy</span>
            <span className="text-slate-600">⟶</span>
            <span className="text-emerald-400 font-semibold">Live</span>
          </div>
        </div>

        {/* Center: Status Indicator */}
        {isLive ? (
          <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-emerald-400 font-bold">🟢 Live Control Surface Active</span>
            <div className="hidden lg:flex items-center gap-1.5 pl-2.5 border-l border-emerald-800/50">
              <button
                onClick={onOpenApiDrawer}
                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] transition font-medium"
              >
                Test API
              </button>
              <button
                onClick={onOpenDbDrawer}
                className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] transition font-medium"
              >
                Inspect DB
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-mono">
            <ShieldCheck
              className={`w-3.5 h-3.5 ${
                validation.isValidP0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span className="text-slate-400">P0 Topology:</span>
            <span
              className={`font-semibold ${
                validation.isValidP0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {validation.isValidP0 ? 'Ready for AWS' : 'Needs Connections'}
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onToggleExplainer && (
            <button
              onClick={onToggleExplainer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 active:scale-[0.98] transition-all"
              title="Explain Architecture with AI Agent"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Architect</span>
            </button>
          )}

          <button
            onClick={handleOpenJsonModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 active:scale-[0.98] transition-all"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={onCompile}
            disabled={isCompiling}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold active:scale-[0.98] transition-all ${
              isCompiling
                ? 'bg-amber-500/50 text-slate-950 cursor-wait animate-pulse'
                : isLive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
            }`}
          >
            {isCompiling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>Compiling...</span>
              </>
            ) : isLive ? (
              <>
                <Activity className="w-3.5 h-3.5 text-slate-950" />
                <span>🟢 Live Control</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Compile & Deploy</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Exported JSON Modal */}
      {jsonModalOpen && exportedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileJson className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Exported Graph JSON</h3>
              </div>
              <button
                onClick={() => setJsonModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Callout */}
            <div
              className={`my-3 p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                exportedData.validation.isValidP0
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
              }`}
            >
              <span>
                Status:{' '}
                {exportedData.validation.isValidP0
                  ? '✓ Valid P0 Pipeline (API -> Lambda -> DynamoDB)'
                  : `⚠️ ${exportedData.validation.errors.join(', ')}`}
              </span>
              <span className="text-[11px] opacity-75">
                {exportedData.validation.nodeCount} nodes • {exportedData.validation.edgeCount} edges
              </span>
            </div>

            {/* JSON Code Viewer */}
            <pre className="flex-1 overflow-auto p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono text-cyan-300 select-text">
              {JSON.stringify(exportedData, null, 2)}
            </pre>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => setJsonModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
