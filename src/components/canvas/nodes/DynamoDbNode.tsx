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

  const statusBorder = {
    draft: 'border-slate-700 hover:border-slate-500',
    compiling: 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]',
    deploying: 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]',
    live: 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    failed: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
  }[data.status || 'draft'];

  return (
    <div
      className={`w-64 rounded-xl bg-slate-900/95 backdrop-blur-md p-4 border-2 transition-all duration-300 text-slate-100 ${statusBorder} ${
        selected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950' : ''
      }`}
    >
      {/* Target Port */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3.5 h-3.5 bg-indigo-400 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
              AWS DynamoDB
            </span>
            <p className="text-sm font-medium text-slate-200">NoSQL Datastore</p>
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
            Table Name
          </label>
          <input
            type="text"
            value={data.tableName}
            onChange={(e) => updateField('tableName', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="OrdersTable"
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Partition Key (String)
          </label>
          <input
            type="text"
            value={data.primaryKey}
            onChange={(e) => updateField('primaryKey', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="orderId"
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(DynamoDbNodeComponent);
