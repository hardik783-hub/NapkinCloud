import type { Node, Edge } from '@xyflow/react';

export type NodeStatus = 'draft' | 'compiling' | 'deploying' | 'live' | 'failed';

export type HttpMethod = 'POST' | 'GET' | 'PUT' | 'DELETE';

export interface ApiGatewayNodeData extends Record<string, unknown> {
  label: string;
  method: HttpMethod;
  path: string;
  status: NodeStatus;
  liveUrl?: string;
}

export interface LambdaNodeData extends Record<string, unknown> {
  label: string;
  functionName: string;
  runtime: 'nodejs20.x';
  businessLogic: string;
  status: NodeStatus;
  arn?: string;
}

export interface DynamoDbNodeData extends Record<string, unknown> {
  label: string;
  tableName: string;
  primaryKey: string;
  status: NodeStatus;
  arn?: string;
  liveTableName?: string;
}

export type ApiGatewayNode = Node<ApiGatewayNodeData, 'api_gateway'>;
export type LambdaNode = Node<LambdaNodeData, 'lambda'>;
export type DynamoDbNode = Node<DynamoDbNodeData, 'dynamodb'>;

export type AppNode = ApiGatewayNode | LambdaNode | DynamoDbNode;
export type AppEdge = Edge;
