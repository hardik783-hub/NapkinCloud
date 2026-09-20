import React, { memo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';
import type { DynamoDbNode } from '@/types/canvas';

function DynamoDbNodeComponent({ id, data, selected }: NodeProps<DynamoDbNode>) {
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
      border: 'border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.2)]',
      dot: 'bg-indigo-400 animate-pulse',
      badge: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30',
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
          ? 'ring-1 ring-indigo-400/80 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'shadow-lg shadow-black/40'
      }`}
    >
      {/* Target Input Port (from Lambda) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3.5 h-3.5 bg-indigo-400 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform hover:shadow-[0_0_10px_rgba(99,102,241,0.6)]"
      />

      {/* Top Hairline Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-xl" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase font-semibold">
              AWS DYNAMODB
            </span>
            <p className="text-xs font-medium text-slate-200">NoSQL Datastore</p>
          </div>
        </div>

        {/* LED Status Pip */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase font-semibold ${statusConfig.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Form Fields */}
      <div className="mt-3 space-y-2">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>PHYSICAL TABLE</span>
            <span className="text-slate-500">PAY_PER_REQUEST</span>
          </div>
          <input
            type="text"
            value={data.tableName}
            onChange={(e) => updateField('tableName', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="OrdersTable"
            className="w-full bg-black/50 border border-slate-800/90 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400/50 transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>PARTITION KEY</span>
            <span className="text-indigo-400/80">HASH (String)</span>
          </div>
          <input
            type="text"
            value={data.primaryKey}
            onChange={(e) => updateField('primaryKey', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="orderId"
            className="w-full bg-black/50 border border-slate-800/90 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400/50 transition"
          />
        </div>

        {data.arn && (
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-900/50 truncate">
            {data.arn}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(DynamoDbNodeComponent);
