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
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#222222] px-5 z-30 flex items-center justify-between pointer-events-auto select-none">
        {/* Left: Brand / Studio Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold tracking-wider text-neutral-100 uppercase">
                NapkinCloud
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141414] text-neutral-300 border border-[#262626] font-semibold">
                v1.0
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-neutral-400 pl-3 border-l border-[#222222]">
            <span>Draw</span>
            <span className="text-neutral-600">⟶</span>
            <span>Compile</span>
            <span className="text-neutral-600">⟶</span>
            <span>Deploy</span>
            <span className="text-neutral-600">⟶</span>
            <span className="text-emerald-400 font-semibold">Live</span>
          </div>
        </div>

        {/* Center: Status Indicator */}
        {isLive ? (
          <div className="flex items-center gap-2.5 bg-emerald-950/30 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-emerald-400 font-semibold">🟢 Live Control Surface Active</span>
            <div className="hidden lg:flex items-center gap-1.5 pl-2.5 border-l border-emerald-800/40">
              <button
                onClick={onOpenApiDrawer}
                className="px-2 py-0.5 rounded bg-[#161616] hover:bg-[#202020] text-cyan-300 border border-cyan-500/30 text-[11px] transition font-medium"
              >
                Test API
              </button>
              <button
                onClick={onOpenDbDrawer}
                className="px-2 py-0.5 rounded bg-[#161616] hover:bg-[#202020] text-indigo-300 border border-indigo-500/30 text-[11px] transition font-medium"
              >
                Inspect DB
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 bg-[#121212] border border-[#242424] px-3 py-1.5 rounded-lg text-xs font-mono">
            <ShieldCheck
              className={`w-3.5 h-3.5 ${
                validation.isValidP0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span className="text-neutral-400">P0 Topology:</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 hover:text-white bg-[#141414] hover:bg-[#1C1C1C] border border-purple-500/30 active:scale-[0.98] transition-all"
              title="Explain Architecture with AI Agent"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Architect</span>
            </button>
          )}

          <button
            onClick={handleOpenJsonModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] active:scale-[0.98] transition-all"
            title="Export Architecture as JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={onCompile}
            disabled={isCompiling}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold active:scale-[0.98] transition-all shadow-sm ${
              isCompiling
                ? 'bg-amber-500/40 text-neutral-950 cursor-wait animate-pulse'
                : isLive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                : 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
            }`}
          >
            {isCompiling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-950" />
                <span>Compiling...</span>
              </>
            ) : isLive ? (
              <>
                <Activity className="w-3.5 h-3.5 text-neutral-950" />
                <span>🟢 Live Control</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-neutral-950" />
                <span>Compile & Deploy</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Exported JSON Modal */}
      {jsonModalOpen && exportedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl bg-[#0E0E0E] border border-[#242424] p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[#222222]">
              <div className="flex items-center gap-2.5">
                <FileJson className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-neutral-100">Exported Graph JSON</h3>
              </div>
              <button
                onClick={() => setJsonModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1C1C1C] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Callout */}
            <div
              className={`my-3 p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                exportedData.validation.isValidP0
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
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
            <pre className="flex-1 overflow-auto p-4 rounded-lg bg-[#050505] border border-[#1E1E1E] text-xs font-mono text-cyan-300 select-text">
              {JSON.stringify(exportedData, null, 2)}
            </pre>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222] mt-4">
              <button
                onClick={() => setJsonModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-[#1C1C1C] transition"
              >
                Close
              </button>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition shadow-sm"
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
