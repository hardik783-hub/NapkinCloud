/**
 * Type declarations for the canonical shared graph rules module
 * (shared/graphRules.js). The runtime data lives in serviceRegistry.json.
 */

import type { AppNode, AppEdge } from '../src/types/canvas';

export type ServiceRole =
  | 'entry'
  | 'compute'
  | 'store'
  | 'queue'
  | 'topic'
  | 'bus'
  | 'stream'
  | 'monitor'
  | 'auth'
  | 'secret'
  | 'workflow';

export type EdgeKind =
  | 'invokes'
  | 'triggers'
  | 'writes'
  | 'reads'
  | 'publishes'
  | 'fails-to'
  | 'monitors'
  | 'starts'
  | 'flow';

export interface RegistryServiceDef {
  type: string;
  label: string;
  subLabel?: string;
  role: ServiceRole;
  roleBucket: string;
  nodeComponent: string;
  color: string;
  canTriggerLambda: boolean;
  requiresIncoming: boolean;
  defaults?: Record<string, string>;
  outputKeys: string[];
  samKind: string;
  lambdaEnvVar?: string;
  lambdaPolicy?: {
    template: string;
    argName: string;
    argSource: string; // "Ref" | "GetAtt:<Attribute>"
  };
  lambdaEvent?: {
    Type: string;
    Properties: Record<string, unknown>;
  };
}

export interface ServiceRegistry {
  version: string;
  description?: string;
  edgeKinds: string[];
  defaultEdgeKindByPair: Record<string, string>;
  roleBuckets: string[];
  services: Record<string, RegistryServiceDef>;
}

export interface GraphRoles {
  entries: AppNode[];
  compute: AppNode[];
  stores: AppNode[];
  queues: AppNode[];
  topics: AppNode[];
  buses: AppNode[];
  streams: AppNode[];
  monitors: AppNode[];
  auth: AppNode[];
  secrets: AppNode[];
  workflows: AppNode[];
}

export interface GraphSummary {
  nodeCount: number;
  edgeCount: number;
  services: string[];
}

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  roles: GraphRoles;
  summary: GraphSummary;
}

export declare const SERVICE_REGISTRY: ServiceRegistry;
export declare const SERVICE_TYPES: string[];
export declare const SUPPORTED_NODE_TYPES: string[];
export declare const ROLE_BUCKETS: string[];
export declare const EDGE_KINDS: string[];
export declare const DEFAULT_EDGE_KIND_BY_PAIR: Record<string, string>;

export declare function validateGraph(graph: unknown): GraphValidationResult;
export declare function validateNodesEdges(
  nodes: AppNode[],
  edges: AppEdge[]
): GraphValidationResult;
export declare function buildRoles(nodes: AppNode[]): GraphRoles;
export declare function buildSummary(
  nodes: AppNode[],
  edges: AppEdge[]
): GraphSummary;
export declare function createEmptyRoles(): GraphRoles;
export declare function inferEdgeKind(
  sourceType: string,
  targetType: string,
  explicitKind?: string
): string;
export declare function nodeData(node: unknown): Record<string, any>;
export declare function getRole(type: string): ServiceRole | null;
export declare function getRoleBucket(type: string): string | null;
export declare function isTriggerType(type: string): boolean;
export declare function isKnownType(type: string): boolean;
