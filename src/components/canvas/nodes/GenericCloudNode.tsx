import React, { memo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import {
  HardDrive,
  MessageSquare,
  Bell,
  Workflow,
  Users,
  Activity,
  Cpu,
  Boxes,
  KeyRound,
  Cloud,
} from 'lucide-react';
import type { GenericCloudNode } from '@/types/canvas';

interface ServiceDefinition {
  label: string;
  subLabel: string;
  fieldLabel: string;
  defaultVal: string;
  propKey: string;
  propVal: string;
  colorClass: string;
  borderClass: string;
  badgeClass: string;
  handleColor: string;
  glowColor: string;
  hairlineClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SERVICE_MAP: Record<string, ServiceDefinition> = {
  s3: {
    label: 'AWS S3',
    subLabel: 'Object Storage Bucket',
    fieldLabel: 'BUCKET NAME',
    defaultVal: 'napkin-assets-bucket',
    propKey: 'ENCRYPTION',
    propVal: 'AES-256 (SSE-S3)',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    handleColor: '#10b981',
    glowColor: 'rgba(16,185,129,0.3)',
    hairlineClass: 'via-emerald-500/40',
    icon: HardDrive,
  },
  sqs: {
    label: 'AWS SQS',
    subLabel: 'Message Queue',
    fieldLabel: 'QUEUE NAME',
    defaultVal: 'OrdersProcessingQueue.fifo',
    propKey: 'VISIBILITY TIMEOUT',
    propVal: '30 seconds',
    colorClass: 'text-pink-400',
    borderClass: 'border-pink-500/30',
    badgeClass: 'bg-pink-500/10 text-pink-300 border-pink-500/25',
    handleColor: '#ec4899',
    glowColor: 'rgba(236,72,153,0.3)',
    hairlineClass: 'via-pink-500/40',
    icon: MessageSquare,
  },
  sns: {
    label: 'AWS SNS',
    subLabel: 'Pub/Sub Topic',
    fieldLabel: 'TOPIC NAME',
    defaultVal: 'OrderAlertsNotificationTopic',
    propKey: 'DELIVERY PROTOCOL',
    propVal: 'HTTPS / SMS / Email',
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-500/30',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    handleColor: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.3)',
    hairlineClass: 'via-rose-500/40',
    icon: Bell,
  },
  eventbridge: {
    label: 'EVENTBRIDGE',
    subLabel: 'Event Bus Router',
    fieldLabel: 'EVENT BUS NAME',
    defaultVal: 'DefaultAppEventBus',
    propKey: 'PATTERN MATCH',
    propVal: 'source: custom.orders',
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
    handleColor: '#a855f7',
    glowColor: 'rgba(168,85,247,0.3)',
    hairlineClass: 'via-purple-500/40',
    icon: Workflow,
  },
  cognito: {
    label: 'AWS COGNITO',
    subLabel: 'User Directory & Auth',
    fieldLabel: 'USER POOL NAME',
    defaultVal: 'NapkinCloudUsersPool',
    propKey: 'AUTHORIZER',
    propVal: 'JWT Bearer / OAuth2',
    colorClass: 'text-violet-400',
    borderClass: 'border-violet-500/30',
    badgeClass: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    handleColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.3)',
    hairlineClass: 'via-violet-500/40',
    icon: Users,
  },
  cloudwatch: {
    label: 'CLOUDWATCH',
    subLabel: 'Metrics & Observability',
    fieldLabel: 'LOG GROUP',
    defaultVal: '/aws/lambda/OrderProcessingService',
    propKey: 'RETENTION',
    propVal: '14 Days (Standard)',
    colorClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    badgeClass: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
    handleColor: '#f97316',
    glowColor: 'rgba(249,115,22,0.3)',
    hairlineClass: 'via-orange-500/40',
    icon: Activity,
  },
  kinesis: {
    label: 'AWS KINESIS',
    subLabel: 'Real-Time Stream',
    fieldLabel: 'STREAM NAME',
    defaultVal: 'LiveTelemetryDataStream',
    propKey: 'CAPACITY MODE',
    propVal: 'On-Demand (Auto-scaling)',
    colorClass: 'text-sky-400',
    borderClass: 'border-sky-500/30',
    badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
    handleColor: '#38bdf8',
    glowColor: 'rgba(56,189,248,0.3)',
    hairlineClass: 'via-sky-500/40',
    icon: Cpu,
  },
  step_functions: {
    label: 'STEP FUNCTIONS',
    subLabel: 'State Machine Workflow',
    fieldLabel: 'WORKFLOW NAME',
    defaultVal: 'OrderFulfillmentStateMachine',
    propKey: 'EXECUTION TYPE',
    propVal: 'Express Serverless',
    colorClass: 'text-fuchsia-400',
    borderClass: 'border-fuchsia-500/30',
    badgeClass: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/25',
    handleColor: '#d946ef',
    glowColor: 'rgba(217,70,239,0.3)',
    hairlineClass: 'via-fuchsia-500/40',
    icon: Boxes,
  },
  secrets_manager: {
    label: 'SECRETS MANAGER',
    subLabel: 'Encrypted Key Vault',
    fieldLabel: 'SECRET NAME',
    defaultVal: 'prod/napkin/payment-keys',
    propKey: 'KMS KEY',
    propVal: 'aws/secretsmanager (KMS)',
    colorClass: 'text-teal-400',
    borderClass: 'border-teal-500/30',
    badgeClass: 'bg-teal-500/10 text-teal-300 border-teal-500/25',
    handleColor: '#14b8a6',
    glowColor: 'rgba(20,184,166,0.3)',
    hairlineClass: 'via-teal-500/40',
    icon: KeyRound,
  },
};

const DEFAULT_CONFIG: ServiceDefinition = {
  label: 'AWS SERVICE',
  subLabel: 'Cloud Resource',
  fieldLabel: 'RESOURCE NAME',
  defaultVal: 'napkin-cloud-resource',
  propKey: 'STATUS',
  propVal: 'Configured',
  colorClass: 'text-cyan-400',
  borderClass: 'border-cyan-500/30',
  badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
  handleColor: '#06b6d4',
  glowColor: 'rgba(6,182,212,0.3)',
  hairlineClass: 'via-cyan-500/40',
  icon: Cloud,
};

function GenericCloudNodeComponent({ id, data, type, selected }: NodeProps<GenericCloudNode>) {
  const { setNodes } = useReactFlow();

  const serviceKey = (data.serviceType || type || 's3').toLowerCase();
  const def = SERVICE_MAP[serviceKey] || DEFAULT_CONFIG;
  const IconComponent = def.icon;

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
      label: 'Static',
    },
    compiling: {
      border: `${def.borderClass} shadow-md`,
      dot: 'bg-amber-400 animate-pulse',
      badge: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
      label: 'Compiling',
    },
    deploying: {
      border: `${def.borderClass} shadow-md`,
      dot: 'bg-cyan-400 animate-pulse',
      badge: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30',
      label: 'Deploying',
    },
    live: {
      border: `${def.borderClass} shadow-md`,
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
      label: 'READY',
    },
    failed: {
      border: 'border-rose-500/60 shadow-md',
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
          ? `ring-1 ring-white/20 shadow-xl`
          : 'shadow-lg shadow-black/40'
      }`}
    >
      {/* Target Input Port (Incoming connection) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3.5 h-3.5 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform"
        style={{ backgroundColor: def.handleColor }}
      />

      {/* Source Output Port (Outgoing connection) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3.5 h-3.5 border-2 border-slate-950 rounded-full hover:scale-125 transition-transform"
        style={{ backgroundColor: def.handleColor }}
      />

      {/* Top Hairline Highlight */}
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${def.hairlineClass} to-transparent rounded-t-xl`} />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-slate-900 ${def.colorClass} border border-slate-800 flex items-center justify-center`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <span className={`text-[10px] font-mono tracking-wider ${def.colorClass} uppercase font-semibold`}>
              {def.label}
            </span>
            <p className="text-xs font-medium text-slate-200">{def.subLabel}</p>
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
            <span>{def.fieldLabel}</span>
            <span className="text-slate-500 font-sans text-[9px]">Resource ID</span>
          </div>
          <input
            type="text"
            value={data.resourceName ?? def.defaultVal}
            onChange={(e) => updateField('resourceName', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder={def.defaultVal}
            className="w-full bg-black/50 border border-slate-800/90 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600 transition"
          />
        </div>

        <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/70 flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400 uppercase">{def.propKey}</span>
          <span className={`${def.colorClass} font-semibold truncate max-w-[130px]`}>
            {def.propVal}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(GenericCloudNodeComponent);
