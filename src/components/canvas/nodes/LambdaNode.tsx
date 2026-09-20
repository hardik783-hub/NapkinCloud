import React, { memo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import type { LambdaNode } from '@/types/canvas';

function LambdaNodeComponent({ id, data, selected }: NodeProps<LambdaNode>) {
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
      border: 'border-[#222222] hover:border-[#383838]',
      dot: 'bg-[#555555]',
      badge: 'bg-[#141414] text-[#888888] border-[#222222]',
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
      className={`relative w-72 rounded-xl bg-[#0E0E0E]/95 backdrop-blur-md p-3.5 border transition-all duration-200 text-[#EDEDED] ${
        statusConfig.border
      } ${
        selected
          ? 'ring-1 ring-amber-400/80 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
          : 'shadow-lg shadow-black/40'
      }`}
    >
      {/* Target Input Port (from API Gateway) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3.5 h-3.5 bg-amber-400 border-2 border-[#0E0E0E] rounded-full hover:scale-125 transition-transform hover:shadow-[0_0_10px_rgba(245,158,11,0.6)]"
      />

      {/* Top Hairline Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-xl" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-amber-400 uppercase font-semibold">
              AWS LAMBDA
            </span>
            <p className="text-xs font-medium text-[#EDEDED]">Serverless Compute</p>
          </div>
        </div>

        {/* LED Status Pip */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase font-semibold ${statusConfig.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Form Fields */}
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-1">
            <span>FUNCTION IDENTIFIER</span>
            <span className="text-[#555555]">{data.runtime || 'nodejs20.x'}</span>
          </div>
          <input
            type="text"
            value={data.functionName}
            onChange={(e) => updateField('functionName', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="CreateOrderFunction"
            className="w-full bg-[#050505] border border-[#202020] rounded-lg px-2.5 py-1 text-xs font-mono text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-amber-400/50 transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-1">
            <span>BUSINESS LOGIC SPEC</span>
            <span className="text-amber-400/80">Bedrock Normalizer</span>
          </div>
          <textarea
            value={data.businessLogic}
            onChange={(e) => updateField('businessLogic', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="e.g. validates order payload, generates UUID, and writes to database"
            rows={2}
            className="w-full bg-[#050505] border border-[#202020] rounded-lg px-2.5 py-1.5 text-xs text-[#D4D4D4] placeholder-[#555555] focus:outline-none focus:border-amber-400/50 resize-none transition"
          />
        </div>

        {data.arn && (
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-900/50 truncate">
            {data.arn}
          </div>
        )}
      </div>

      {/* Output Port (to DynamoDB) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3.5 h-3.5 bg-amber-400 border-2 border-[#0E0E0E] rounded-full hover:scale-125 transition-transform hover:shadow-[0_0_10px_rgba(245,158,11,0.6)]"
      />
    </div>
  );
}

export default memo(LambdaNodeComponent);
