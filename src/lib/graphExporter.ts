import type { AppNode, AppEdge } from '@/types/canvas';

export interface ExportedGraph {
  version: string;
  projectId: string;
  timestamp: string;
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
  }>;
  validation: {
    isValidP0: boolean;
    nodeCount: number;
    edgeCount: number;
    errors: string[];
  };
}

export function exportGraphToJson(
  nodes: AppNode[],
  edges: AppEdge[],
  projectId: string = 'proj-demo-orders'
): ExportedGraph {
  const errors: string[] = [];

  const hasApi = nodes.some((n) => n.type === 'api_gateway');
  const hasLambda = nodes.some((n) => n.type === 'lambda');
  const hasDynamo = nodes.some((n) => n.type === 'dynamodb');

  if (!hasApi) errors.push('Missing API Gateway trigger node.');
  if (!hasLambda) errors.push('Missing Lambda serverless compute node.');
  if (!hasDynamo) errors.push('Missing DynamoDB database table node.');

  const hasApiToLambda = edges.some((e) => {
    const s = nodes.find((n) => n.id === e.source);
    const t = nodes.find((n) => n.id === e.target);
    return s?.type === 'api_gateway' && t?.type === 'lambda';
  });

  const hasLambdaToDynamo = edges.some((e) => {
    const s = nodes.find((n) => n.id === e.source);
    const t = nodes.find((n) => n.id === e.target);
    return s?.type === 'lambda' && t?.type === 'dynamodb';
  });

  if (!hasApiToLambda) errors.push('API Gateway must connect to a Lambda function.');
  if (!hasLambdaToDynamo) errors.push('Lambda must connect to a DynamoDB table.');

  const serializedNodes = nodes.map((node) => ({
    id: node.id,
    type: node.type || 'unknown',
    label: (node.data?.label as string) || node.type || 'Node',
    properties: { ...node.data },
  }));

  const serializedEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));

  return {
    version: '1.0',
    projectId,
    timestamp: new Date().toISOString(),
    nodes: serializedNodes,
    edges: serializedEdges,
    validation: {
      isValidP0: errors.length === 0,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      errors,
    },
  };
}
