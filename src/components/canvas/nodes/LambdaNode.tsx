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

  const statusBorder = {
    draft: 'border-slate-700 hover:border-slate-500',
    compiling: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    deploying: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    live: 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    failed: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
  }[data.status || 'draft'];

  return (
    <div
      className={`w-72 rounded-xl bg-slate-900/95 backdrop-blur-md p-4 border-2 transition-all duration-300 text-slate-100 ${statusBorder} ${
        selected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950' : ''
      }`}
    >
      {/* Target Port */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3.5 h-3.5 bg-amber-400 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              AWS Lambda
            </span>
            <p className="text-sm font-medium text-slate-200">Serverless Compute</p>
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

      {/* Body / Editable fields */}
      <div className="mt-3 space-y-2.5">
        <div>
          <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Function Name
          </label>
          <input
            type="text"
            value={data.functionName}
            onChange={(e) => updateField('functionName', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="CreateOrderFunction"
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Natural Language Logic (AI Prompt)
          </label>
          <textarea
            value={data.businessLogic}
            onChange={(e) => updateField('businessLogic', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="e.g. validates order, assigns UUID, and writes to database"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      </div>

      {/* Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3.5 h-3.5 bg-amber-400 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform"
      />
    </div>
  );
}

export default memo(LambdaNodeComponent);
