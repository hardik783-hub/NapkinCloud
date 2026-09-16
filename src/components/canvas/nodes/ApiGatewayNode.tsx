import React, { memo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';
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

  const statusBorder = {
    draft: 'border-slate-700 hover:border-slate-500',
    compiling: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    deploying: 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
    live: 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    failed: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
  }[data.status || 'draft'];

  return (
    <div
      className={`w-64 rounded-xl bg-slate-900/95 backdrop-blur-md p-4 border-2 transition-all duration-300 text-slate-100 ${statusBorder} ${
        selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
              AWS API Gateway
            </span>
            <p className="text-sm font-medium text-slate-200">HTTP API</p>
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
            data.status === 'live'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : data.status === 'compiling' || data.status === 'deploying'
              ? 'bg-amber-500/20 text-amber-400 animate-pulse'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {data.status || 'Draft'}
        </span>
      </div>

      {/* Body / Editable controls */}
      <div className="mt-3 space-y-2.5">
        <div className="flex gap-2">
          <select
            value={data.method}
            onChange={(e) => updateField('method', e.target.value as HttpMethod)}
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs font-mono font-semibold text-cyan-400 focus:outline-none focus:border-cyan-500"
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
            className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {data.liveUrl && (
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-900/50 truncate">
            {data.liveUrl}
          </div>
        )}
      </div>

      {/* Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3.5 h-3.5 bg-cyan-400 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform"
      />
    </div>
  );
}

export default memo(ApiGatewayNodeComponent);
