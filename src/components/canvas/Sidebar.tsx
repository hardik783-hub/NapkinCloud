'use client';

import React from 'react';
import { Globe, Zap, Database, HardDrive, MessageSquare, Layers } from 'lucide-react';

interface ComponentItem {
  type: string;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  enabled: boolean;
}

const components: ComponentItem[] = [
  {
    type: 'api_gateway',
    label: 'API Gateway',
    subLabel: 'HTTP API Trigger',
    icon: <Globe className="w-4 h-4" />,
    iconColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20 hover:border-cyan-500/50',
    enabled: true,
  },
  {
    type: 'lambda',
    label: 'Lambda Function',
    subLabel: 'Serverless Compute',
    icon: <Zap className="w-4 h-4" />,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20 hover:border-amber-500/50',
    enabled: true,
  },
  {
    type: 'dynamodb',
    label: 'DynamoDB Table',
    subLabel: 'NoSQL Database',
    icon: <Database className="w-4 h-4" />,
    iconColor: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20 hover:border-indigo-500/50',
    enabled: true,
  },
  {
    type: 's3',
    label: 'S3 Bucket',
    subLabel: 'Object Storage (P1)',
    icon: <HardDrive className="w-4 h-4" />,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-slate-800',
    enabled: false,
  },
  {
    type: 'sqs',
    label: 'SQS Queue',
    subLabel: 'Message Queue (P1)',
    icon: <MessageSquare className="w-4 h-4" />,
    iconColor: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-slate-800',
    enabled: false,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-14 bottom-0 w-12 bg-slate-950/95 backdrop-blur-md border-r border-slate-800/80 py-4 px-2 z-20 flex flex-col items-center justify-between pointer-events-auto select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          title="Expand Component Palette"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-60 bg-slate-950/95 backdrop-blur-md border-r border-slate-800/80 p-3.5 z-20 flex flex-col justify-between pointer-events-auto select-none">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Cloud Palette
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded hover:bg-slate-900 transition font-mono"
            title="Collapse Sidebar"
          >
            Collapse ‹
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-snug">
          Drag blocks to construct your serverless pipeline.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          {components.map((item) => (
            <div
              key={item.type}
              draggable={item.enabled}
              onDragStart={(e) => item.enabled && onDragStart(e, item.type)}
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-150 ${
                item.enabled
                  ? `cursor-grab active:cursor-grabbing bg-slate-900/60 ${item.borderColor} hover:bg-slate-900 active:scale-[0.98]`
                  : 'opacity-35 cursor-not-allowed bg-slate-950/40 border-slate-900'
              }`}
            >
              <div className={`p-1.5 rounded-md ${item.bgColor} ${item.iconColor} shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {item.label}
                  </span>
                  {!item.enabled && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-500">
                      P1
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate">{item.subLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>AWS SAM V1.0</span>
        <span className="text-amber-400/80">P0 Target</span>
      </div>
    </aside>
  );
}
