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
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="absolute left-6 top-20 z-10 w-64 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Component Palette
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Drag components onto the canvas to construct your architecture.
      </p>

      <div className="flex flex-col gap-2 pt-1">
        {components.map((item) => (
          <div
            key={item.type}
            draggable={item.enabled}
            onDragStart={(e) => item.enabled && onDragStart(e, item.type)}
            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 ${
              item.enabled
                ? `cursor-grab active:cursor-grabbing bg-slate-950/60 ${item.borderColor} hover:bg-slate-800/50 hover:scale-[1.02]`
                : 'opacity-40 cursor-not-allowed bg-slate-950/30 border-slate-800/40'
            }`}
          >
            <div className={`p-2 rounded-lg ${item.bgColor} ${item.iconColor}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {item.label}
                </span>
                {!item.enabled && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    Soon
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">{item.subLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
