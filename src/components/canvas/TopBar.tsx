'use client';

import React, { useState } from 'react';
import { Zap, Download, Play, Check, X, FileJson, ShieldCheck, Loader2, Activity } from 'lucide-react';
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
      <header className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-auto">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-2xl">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-white uppercase">
                NapkinCloud
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                v1.0 MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Draw ⟶ Compile ⟶ Deploy ⟶ 🟢 Live
            </p>
          </div>
        </div>

        {/* Center: Live Control Surface Status Badge */}
        {isLive ? (
          <div className="flex items-center gap-3 bg-emerald-950/50 backdrop-blur-md border border-emerald-500/40 px-4 py-2 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.25)] text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>🟢 Live Control Surface Active</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-emerald-800/60">
              <button
                onClick={onOpenApiDrawer}
                className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[11px] transition"
              >
                Test API
              </button>
              <button
                onClick={onOpenDbDrawer}
                className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[11px] transition"
              >
                Inspect DB
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono">
            <ShieldCheck
              className={`w-4 h-4 ${
                validation.isValidP0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span className="text-slate-300">P0 Architecture:</span>
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
        <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-1.5 rounded-2xl shadow-2xl">
          <button
            onClick={handleOpenJsonModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            <FileJson className="w-4 h-4 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={onCompile}
            disabled={isCompiling}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isCompiling
                ? 'bg-amber-500/50 text-slate-950 cursor-wait animate-pulse'
                : isLive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
            }`}
          >
            {isCompiling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Compiling...</span>
              </>
            ) : isLive ? (
              <>
                <Activity className="w-4 h-4 text-slate-950" />
                <span>🟢 Re-Deploy</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>⚡ Compile to AWS</span>
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
