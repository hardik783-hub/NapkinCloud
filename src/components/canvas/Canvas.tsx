'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import ApiGatewayNode from './nodes/ApiGatewayNode';
import LambdaNode from './nodes/LambdaNode';
import DynamoDbNode from './nodes/DynamoDbNode';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CompilationModal from './CompilationModal';
import type { AppNode, AppEdge, NodeStatus } from '@/types/canvas';
import type { CompileResponse } from '@/types/compiler';

const initialNodes: AppNode[] = [
  {
    id: 'node-api-1',
    type: 'api_gateway',
    position: { x: 340, y: 220 },
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
    position: { x: 680, y: 190 },
    data: {
      label: 'Lambda',
      functionName: 'CreateOrderFunction',
      runtime: 'nodejs20.x',
      businessLogic: 'Validates order payload, generates UUID orderId, and saves order record',
      status: 'draft',
    },
  },
  {
    id: 'node-dynamodb-1',
    type: 'dynamodb',
    position: { x: 1060, y: 220 },
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

let idCounter = 2;

function CanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>(initialEdges);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationResult, setCompilationResult] = useState<CompileResponse | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      api_gateway: ApiGatewayNode,
      lambda: LambdaNode,
      dynamodb: DynamoDbNode,
    }),
    []
  );

  const setAllNodeStatuses = useCallback(
    (status: NodeStatus) => {
      setNodes((nds) =>
        nds.map(
          (node) =>
            ({
              ...node,
              data: {
                ...node.data,
                status,
              },
            } as AppNode)
        )
      );
    },
    [setNodes]
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

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const currentCount = idCounter++;
      let newNode: AppNode;

      if (nodeType === 'api_gateway') {
        newNode = {
          id: `node-api-${currentCount}`,
          type: 'api_gateway',
          position,
          data: {
            label: 'API Gateway',
            method: 'POST',
            path: `/service-${currentCount}`,
            status: 'draft',
          },
        };
      } else if (nodeType === 'lambda') {
        newNode = {
          id: `node-lambda-${currentCount}`,
          type: 'lambda',
          position,
          data: {
            label: 'Lambda',
            functionName: `ServiceFunction${currentCount}`,
            runtime: 'nodejs20.x',
            businessLogic: 'Processes request payload and updates database',
            status: 'draft',
          },
        };
      } else if (nodeType === 'dynamodb') {
        newNode = {
          id: `node-dynamodb-${currentCount}`,
          type: 'dynamodb',
          position,
          data: {
            label: 'DynamoDB',
            tableName: `Table_${currentCount}`,
            primaryKey: 'id',
            status: 'draft',
          },
        };
      } else {
        return;
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const handleCompile = async () => {
    setIsCompiling(true);
    setAllNodeStatuses('compiling');

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });

      const data: CompileResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.validation?.errors?.join('\n') || 'Compilation failed.');
      }

      setAllNodeStatuses('deploying');
      setCompilationResult(data);
    } catch (err: any) {
      alert(`⚠️ [Compilation Error]\n${err.message}`);
      setAllNodeStatuses('draft');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div ref={reactFlowWrapper} className="w-screen h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <TopBar
        nodes={nodes}
        edges={edges}
        isCompiling={isCompiling}
        onCompile={handleCompile}
      />
      <Sidebar />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
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

      {compilationResult && (
        <CompilationModal
          data={compilationResult}
          onClose={() => setCompilationResult(null)}
        />
      )}
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
