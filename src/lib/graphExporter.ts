import type { AppNode, AppEdge } from '@/types/canvas';
import type { TeammateArchitecture, ServiceReasoning } from '@/types/compiler';

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
  projectId: string = 'proj-demo-orders',
  customReasoning?: ServiceReasoning[]
): ExportedGraph {
  const errors: string[] = [];

  const apiNode = nodes.find((n) => n.type === 'api_gateway');
  const lambdaNode = nodes.find((n) => n.type === 'lambda');
  const dynamoNode = nodes.find((n) => n.type === 'dynamodb');

  if (!apiNode) errors.push('Missing API Gateway trigger node.');
  if (!lambdaNode) errors.push('Missing Lambda serverless compute node.');
  if (!dynamoNode) errors.push('Missing DynamoDB database table node.');

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

  const apiPath = (apiNode?.data?.path as string) || '/orders';
  const apiMethod = (apiNode?.data?.method as string) || 'POST';
  const lambdaFunc = (lambdaNode?.data?.functionName as string) || 'ProcessOrderFunction';
  const lambdaLogic = (lambdaNode?.data?.businessLogic as string) || 'Process order requests';
  const dbTable = (dynamoNode?.data?.tableName as string) || 'OrdersTable';
  const dbKey = (dynamoNode?.data?.primaryKey as string) || 'orderId';

  const defaultReasoning: ServiceReasoning[] = [
    {
      service: 'api_gateway',
      reason: `Exposes HTTPS ${apiMethod} ${apiPath} endpoint with built-in throttling, request validation, and CORS.`,
    },
    {
      service: 'lambda',
      reason: `Executes serverless NodeJS compute (${lambdaFunc}) to run business logic on demand.`,
    },
    {
      service: 'dynamodb',
      reason: `NoSQL key-value store (${dbTable}) partitioned by ${dbKey} for sub-10ms writes and persistent order storage.`,
    },
  ];

  return {
    version: '1.0',
    projectId,
    timestamp: new Date().toISOString(),
    application: {
      name: `${apiPath.replace(/^\//, '').toUpperCase() || 'Orders'} API Service`,
      description: `Serverless API for processing and storing ${apiPath.replace(/^\//, '') || 'orders'}`,
    },
    architecture: {
      nodes: [
        {
          id: apiNode?.id || 'api',
          type: 'api_gateway',
          purpose: `HTTP API endpoint for ${apiMethod} ${apiPath}`,
        },
        {
          id: lambdaNode?.id || 'orders_service',
          type: 'lambda',
          purpose: lambdaLogic,
        },
        {
          id: dynamoNode?.id || 'orders_db',
          type: 'dynamodb',
          purpose: `Store items in ${dbTable} indexed by ${dbKey}`,
        },
      ],
      connections: edges.map((e) => ({
        from: e.source,
        to: e.target,
      })),
    },
    reasoning: customReasoning || defaultReasoning,
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

