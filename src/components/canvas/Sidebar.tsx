'use client';

import React from 'react';
import {
  Globe,
  Zap,
  Database,
  HardDrive,
  MessageSquare,
  Bell,
  Workflow,
  Users,
  Activity,
  Cpu,
  Boxes,
  KeyRound,
  Layers,
} from 'lucide-react';

interface ComponentItem {
  type: string;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  enabled: boolean;
  core: boolean;
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
    core: true,
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
    core: true,
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
    core: true,
  },
  {
    type: 's3',
    label: 'S3 Bucket',
    subLabel: 'Object Storage',
    icon: <HardDrive className="w-4 h-4" />,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20 hover:border-emerald-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'sqs',
    label: 'SQS Queue',
    subLabel: 'Message Queue',
    icon: <MessageSquare className="w-4 h-4" />,
    iconColor: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20 hover:border-pink-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'sns',
    label: 'SNS Topic',
    subLabel: 'Pub/Sub Messaging',
    icon: <Bell className="w-4 h-4" />,
    iconColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20 hover:border-rose-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'eventbridge',
    label: 'EventBridge',
    subLabel: 'Event Bus Router',
    icon: <Workflow className="w-4 h-4" />,
    iconColor: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20 hover:border-purple-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'cognito',
    label: 'Cognito User Pool',
    subLabel: 'Auth & Directory',
    icon: <Users className="w-4 h-4" />,
    iconColor: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20 hover:border-violet-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'cloudwatch',
    label: 'CloudWatch',
    subLabel: 'Metrics & Observability',
    icon: <Activity className="w-4 h-4" />,
    iconColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20 hover:border-orange-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'kinesis',
    label: 'Kinesis Stream',
    subLabel: 'Data Stream Ingest',
    icon: <Cpu className="w-4 h-4" />,
    iconColor: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20 hover:border-sky-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'step_functions',
    label: 'Step Functions',
    subLabel: 'State Machine Workflow',
    icon: <Boxes className="w-4 h-4" />,
    iconColor: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/20 hover:border-fuchsia-500/50',
    enabled: true,
    core: false,
  },
  {
    type: 'secrets_manager',
    label: 'Secrets Manager',
    subLabel: 'Encrypted Key Vault',
    icon: <KeyRound className="w-4 h-4" />,
    iconColor: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20 hover:border-teal-500/50',
    enabled: true,
    core: false,
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
      <aside className="fixed left-0 top-14 bottom-0 w-12 bg-[#0A0A0A]/95 backdrop-blur-md border-r border-[#222222] py-4 px-2 z-20 flex flex-col items-center justify-between pointer-events-auto select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#888888] hover:text-[#EDEDED] border border-[#222222] transition active:scale-95"
          title="Expand Component Palette"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-60 bg-[#0A0A0A]/95 backdrop-blur-md border-r border-[#222222] p-3.5 z-20 flex flex-col justify-between pointer-events-auto select-none">
      <div className="flex flex-col gap-2.5 flex-1 min-h-0">
        <div className="flex items-center justify-between pb-2 border-b border-[#222222] shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
              Cloud Palette
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[10px] text-[#666666] hover:text-[#D4D4D4] px-1.5 py-0.5 rounded hover:bg-[#141414] transition font-mono"
            title="Collapse Sidebar"
          >
            Collapse ‹
          </button>
        </div>

        <p className="text-[11px] text-[#888888] leading-snug shrink-0">
          Drag blocks to construct your serverless pipeline.
        </p>

        {/* Scrollable Palette List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-0">
          {/* Core Pipeline */}
          <div className="mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 px-1 block mb-1">Core Pipeline</span>
          </div>
          {components.filter(item => item.core).map((item) => (
            <div
              key={item.type}
              draggable={item.enabled}
              onDragStart={(e) => item.enabled && onDragStart(e, item.type)}
              className="flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing bg-[#121212]/90 border-[#222222] hover:border-[#383838] hover:bg-[#181818] active:scale-[0.98]"
            >
              <div className={`p-1.5 rounded-md ${item.bgColor} ${item.iconColor} shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-[#EDEDED] truncate block">
                  {item.label}
                </span>
                <p className="text-[10px] text-[#888888] truncate">{item.subLabel}</p>
              </div>
            </div>
          ))}

          {/* Divider */}
          <div className="my-2 border-t border-[#222222]" />

          {/* Extended Services */}
          <div className="mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] px-1 block mb-1">Extended Services</span>
          </div>
          {components.filter(item => !item.core).map((item) => (
            <div
              key={item.type}
              draggable={item.enabled}
              onDragStart={(e) => item.enabled && onDragStart(e, item.type)}
              className="flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing bg-[#121212]/90 border-[#222222] hover:border-[#383838] hover:bg-[#181818] active:scale-[0.98]"
            >
              <div className={`p-1.5 rounded-md ${item.bgColor} ${item.iconColor} shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-[#EDEDED] truncate block">
                  {item.label}
                </span>
                <p className="text-[10px] text-[#888888] truncate">{item.subLabel}</p>
              </div>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 uppercase tracking-wider">Live</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2.5 mt-2 border-t border-[#222222] flex items-center justify-between text-[10px] font-mono text-[#666666] shrink-0">
        <span>12 Cloud Blocks</span>
        <span className="text-emerald-400 font-medium">All Deployable</span>
      </div>
    </aside>
  );
}

