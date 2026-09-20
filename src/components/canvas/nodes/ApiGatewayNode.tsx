import React, { memo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Globe, ArrowUpRight } from 'lucide-react';
import type { ApiGatewayNode, HttpMethod } from '@/types/canvas';

function ApiGatewayNodeComponent({ id, data, selected }: NodeProps<ApiGatewayNode>) {
  const { setNodes } = useReactFlow();

  const updateField = (field: string, value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        }
        return node;
      })
    );
  };

  const statusConfig = {
    draft: {
      border: 'border-slate-800 hover:border-slate-700',
      dot: 'bg-slate-500',
      badge: 'bg-slate-900/80 text-slate-400 border-slate-800',
      label: 'Draft',
    },
    compiling: {
      border: 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
      dot: 'bg-amber-400 animate-pulse',
      badge: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
      label: 'Compiling',
    },
    deploying: {
      border: 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
      dot: 'bg-cyan-400 animate-pulse',
      badge: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30',
      label: 'Deploying',
    },
    live: {
      border: 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      dot: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
      badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
      label: 'LIVE',
    },
    failed: {
      border: 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
      dot: 'bg-rose-400',
      badge: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
      label: 'Failed',
    },
  }[data.status || 'draft'];

  return (
    <div
      className={`relative w-64 rounded-xl bg-slate-950/95 backdrop-blur-md p-3.5 border transition-all duration-200 text-slate-100 ${
        statusConfig.border
      } ${
        selected
          ? 'ring-1 ring-cyan-400/80 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
          : 'shadow-lg shadow-black/40'
      }`}
    >
      {/* Top Hairline Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-xl" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase font-semibold">
              API GATEWAY
            </span>
            <p className="text-xs font-medium text-slate-200">HTTP REST Trigger</p>
          </div>
        </div>

        {/* LED Status Pip */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase font-semibold ${statusConfig.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Route Configuration Input Group */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>ENDPOINT ROUTE</span>
          <span className="text-slate-500">HTTPS</span>
        </div>

        <div className="flex gap-1.5 bg-black/50 border border-slate-800/90 rounded-lg p-1 focus-within:border-cyan-500/50 transition">
          <select
            value={data.method}
            onChange={(e) => updateField('method', e.target.value as HttpMethod)}
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold text-cyan-400 focus:outline-none cursor-pointer"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            value={data.path}
            onChange={(e) => updateField('path', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="/orders"
            className="flex-1 bg-transparent px-2 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none"
          />
        </div>

        {data.liveUrl && (
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-900/50 truncate flex items-center justify-between">
            <span className="truncate">{data.liveUrl}</span>
            <ArrowUpRight className="w-3 h-3 shrink-0 text-emerald-400/80 ml-1" />
          </div>
        )}
      </div>

      {/* Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3.5 h-3.5 bg-cyan-400 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform hover:shadow-[0_0_10px_rgba(6,182,212,0.6)]"
      />
    </div>
  );
}

export default memo(ApiGatewayNodeComponent);
