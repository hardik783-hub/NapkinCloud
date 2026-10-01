/**
 * Typed facade over the canonical service registry.
 *
 * The actual single source of truth is:
 *   shared/serviceRegistry.json  (service metadata)
 *   shared/graphRules.js         (topology rules + edge semantics)
 *
 * This file only re-exports typed views so frontend code can import
 * `@/lib/serviceRegistry` without touching the shared internals directly.
 */
import type { AppNode, AppEdge } from '@/types/canvas';
import {
  SERVICE_REGISTRY,
  SERVICE_TYPES,
  SUPPORTED_NODE_TYPES,
  ROLE_BUCKETS,
  EDGE_KINDS,
  DEFAULT_EDGE_KIND_BY_PAIR,
  validateGraph,
  validateNodesEdges,
  buildRoles,
  buildSummary,
  createEmptyRoles,
  inferEdgeKind,
  nodeData,
  getRole,
  getRoleBucket,
  isTriggerType,
  isKnownType,
} from '../../shared/graphRules.js';
import type {
  ServiceRegistry,
  RegistryServiceDef,
  GraphRoles,
  GraphSummary,
  GraphValidationResult,
  ServiceRole,
  EdgeKind,
} from '../../shared/graphRules.js';

/** The 12 supported AWS service types (canonical union). */
export type ServiceType =
  | 'api_gateway'
  | 'lambda'
  | 'dynamodb'
  | 's3'
  | 'sqs'
  | 'sns'
  | 'eventbridge'
  | 'cognito'
  | 'cloudwatch'
  | 'kinesis'
  | 'step_functions'
  | 'secrets_manager';

export {
  SERVICE_REGISTRY,
  SERVICE_TYPES,
  SUPPORTED_NODE_TYPES,
  ROLE_BUCKETS,
  EDGE_KINDS,
  DEFAULT_EDGE_KIND_BY_PAIR,
  validateGraph,
  validateNodesEdges,
  buildRoles,
  buildSummary,
  createEmptyRoles,
  inferEdgeKind,
  nodeData,
  getRole,
  getRoleBucket,
  isTriggerType,
  isKnownType,
};

export type {
  ServiceRegistry,
  RegistryServiceDef,
  GraphRoles,
  GraphSummary,
  GraphValidationResult,
  ServiceRole,
  EdgeKind,
};

/** Resolve the registry definition for a service type (or null if unknown). */
export function getServiceDef(type: string): RegistryServiceDef | null {
  return SERVICE_REGISTRY.services[type] || null;
}

/** Edge color used by the canvas for edges originating at `sourceType`. */
export function edgeColorFor(sourceType: string): string {
  return getServiceDef(sourceType)?.color || '#06b6d4';
}

/** Human label for a service type. */
export function serviceLabel(type: string): string {
  return getServiceDef(type)?.label || type;
}
