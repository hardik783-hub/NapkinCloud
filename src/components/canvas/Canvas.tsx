'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import ApiGatewayNode from './nodes/ApiGatewayNode';
import LambdaNode from './nodes/LambdaNode';
import DynamoDbNode from './nodes/DynamoDbNode';
import type { AppNode, AppEdge } from '@/types/canvas';

const initialNodes: AppNode[] = [
  {
    id: 'node-api-1',
    type: 'api_gateway',
    position: { x: 80, y: 220 },
    data: {
      label: 'API Gateway',
      method: 'POST',
      path: '/orders',
      status: 'draft',
    },
  },
  {
    id: 'node-lambda-1',
    type: 'lambda',
    position: { x: 420, y: 200 },
    data: {
      label: 'Lambda',
      functionName: 'CreateOrderFunction',
      runtime: 'nodejs20.x',
      businessLogic: 'Validates order payload, generates orderId UUID, and writes order to database',
      status: 'draft',
    },
  },
  {
    id: 'node-dynamodb-1',
    type: 'dynamodb',
    position: { x: 790, y: 220 },
    data: {
      label: 'DynamoDB',
      tableName: 'OrdersTable',
      primaryKey: 'orderId',
      status: 'draft',
    },
  },
];

const initialEdges: AppEdge[] = [
  {
    id: 'edge-1',
    source: 'node-api-1',
    target: 'node-lambda-1',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
    style: { stroke: '#06b6d4', strokeWidth: 2 },
  },
  {
    id: 'edge-2',
    source: 'node-lambda-1',
    target: 'node-dynamodb-1',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  },
];

export default function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>(initialEdges);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      api_gateway: ApiGatewayNode,
      lambda: LambdaNode,
      dynamodb: DynamoDbNode,
    }),
    []
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // Rule 1: API Gateway -> Lambda only
      if (sourceNode.type === 'api_gateway') {
        return targetNode.type === 'lambda';
      }

      // Rule 2: Lambda -> DynamoDB only
      if (sourceNode.type === 'lambda') {
        return targetNode.type === 'dynamodb';
      }

      // DynamoDB has no source outputs
      return false;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const edgeColor = sourceNode?.type === 'api_gateway' ? '#06b6d4' : '#f59e0b';

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: edgeColor, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
          },
          eds
        )
      );
    },
    [nodes, setEdges]
  );

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        className="bg-slate-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#334155"
        />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
