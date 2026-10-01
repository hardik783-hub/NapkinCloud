import type { AppNode, AppEdge } from '@/types/canvas';
import type { ServiceReasoning } from '@/types/compiler';
import {
  validateNodesEdges,
  inferEdgeKind,
  nodeData,
} from '../../shared/graphRules.js';

export interface ExportedGraph {
  version: string;
  projectId: string;
  timestamp: string;
  application: {
    name: string;
    description: string;
  };
  architecture: {
    nodes: Array<{
      id: string;
      type: string;
      purpose: string;
    }>;
    connections: Array<{
      from: string;
      to: string;
      kind: string;
    }>;
  };
  reasoning: ServiceReasoning[];
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    kind: string;
  }>;
  validation: {
    isValidP0: boolean;
    nodeCount: number;
    edgeCount: number;
    errors: string[];
  };
}

/** Human-readable purpose for a node, derived from its own data. */
function purposeFor(node: AppNode): string {
  const d = nodeData(node);
  if (typeof d.purpose === 'string' && d.purpose.trim()) return d.purpose;
  switch (node.type) {
    case 'api_gateway':
      return `HTTP ${d.method || 'GET'} ${d.path || '/'} endpoint`;
    case 'lambda':
      return (
        (typeof d.businessLogic === 'string' && d.businessLogic) ||
        `Serverless function${d.functionName ? ` ${d.functionName}` : ''}`
      );
    case 'dynamodb':
      return `NoSQL table ${d.tableName || '(unnamed)'} partitioned by ${d.primaryKey || 'id'}`;
    default:
      return (
        (typeof d.subLabel === 'string' && d.subLabel) ||
        (typeof d.label === 'string' && d.label) ||
        String(node.type)
      );
  }
}

/** Application metadata derived from the graph — never a hard-coded project. */
function applicationFor(nodes: AppNode[]): { name: string; description: string } {
  const api = nodes.find((n) => n.type === 'api_gateway');
  const lambda = nodes.find((n) => n.type === 'lambda');
  const d = api ? nodeData(api) : {};
  const path = typeof d.path === 'string' ? d.path : '';
  const method = typeof d.method === 'string' ? d.method : 'POST';
  const base = path.replace(/^\//, '').replace(/[-_/]/g, ' ').trim();

  if (api && base) {
    const title = base.replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      name: `${title} API Service`,
      description: `Serverless API (${method} ${path}) backed by AWS Lambda and the services in this graph.`,
    };
  }
  const lambdaData = lambda ? nodeData(lambda) : {};
  const fnName =
    typeof lambdaData.functionName === 'string' ? lambdaData.functionName : 'Generated';
  return {
    name: `${fnName} Service`,
    description: 'Serverless AWS service graph generated on the NapkinCloud canvas.',
  };
}

/** Default reasoning: one entry per node, derived from the node itself. */
function defaultReasoningFor(nodes: AppNode[]): ServiceReasoning[] {
  return nodes.map((node) => ({
    service: node.type || 'unknown',
    reason: purposeFor(node),
  }));
}

/**
 * Export the canvas graph as JSON.
 *
 * Validation now delegates to the canonical shared rule set — there is no
 * longer a DynamoDB mandate. `architecture.nodes`/`connections` and the
 * serialized `nodes`/`edges` arrays reflect the canvas graph exactly.
 */
export function exportGraphToJson(
  nodes: AppNode[],
  edges: AppEdge[],
  projectId: string = 'proj-canvas',
  customReasoning?: ServiceReasoning[]
): ExportedGraph {
  const result = validateNodesEdges(nodes, edges);

  const serializedNodes = nodes.map((node) => ({
    id: node.id,
    type: node.type || 'unknown',
    label: (node.data?.label as string) || node.type || 'Node',
    properties: { ...node.data },
  }));

  const typeById = new Map(nodes.map((n) => [n.id, n.type]));

  const serializedEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: inferEdgeKind(
      String(typeById.get(edge.source) || ''),
      String(typeById.get(edge.target) || ''),
      (edge.data as { kind?: string } | undefined)?.kind
    ),
  }));

  return {
    version: '1.0',
    projectId,
    timestamp: new Date().toISOString(),
    application: applicationFor(nodes),
    architecture: {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type || 'unknown',
        purpose: purposeFor(node),
      })),
      connections: edges.map((edge) => ({
        from: edge.source,
        to: edge.target,
        kind: inferEdgeKind(
          String(typeById.get(edge.source) || ''),
          String(typeById.get(edge.target) || ''),
          (edge.data as { kind?: string } | undefined)?.kind
        ),
      })),
    },
    reasoning: customReasoning && customReasoning.length > 0
      ? customReasoning
      : defaultReasoningFor(nodes),
    nodes: serializedNodes,
    edges: serializedEdges,
    validation: {
      isValidP0: result.valid,
      nodeCount: result.summary.nodeCount,
      edgeCount: result.summary.edgeCount,
      errors: result.errors,
    },
  };
}
