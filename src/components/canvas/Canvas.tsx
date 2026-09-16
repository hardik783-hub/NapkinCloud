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
  type Node,
} from '@xyflow/react';
import ApiGatewayNode from './nodes/ApiGatewayNode';
import LambdaNode from './nodes/LambdaNode';
import DynamoDbNode from './nodes/DynamoDbNode';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CompilationModal from './CompilationModal';
import ApiTesterDrawer from './drawers/ApiTesterDrawer';
import DynamoDbDrawer from './drawers/DynamoDbDrawer';
import type { AppNode, AppEdge, NodeStatus, ApiGatewayNodeData, DynamoDbNodeData } from '@/types/canvas';
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
  const [isLive, setIsLive] = useState(false);
  const [compilationResult, setCompilationResult] = useState<CompileResponse | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'api' | 'dynamodb'>('none');
  const [refreshDbTrigger, setRefreshDbTrigger] = useState(0);

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
    (status: NodeStatus, metadata?: { liveUrl?: string; lambdaArn?: string; tableArn?: string }) => {
      setNodes((nds) =>
        nds.map((node) => {
          let extra: Record<string, any> = {};
          if (status === 'live' && metadata) {
            if (node.type === 'api_gateway') extra.liveUrl = metadata.liveUrl;
            if (node.type === 'lambda') extra.arn = metadata.lambdaArn;
            if (node.type === 'dynamodb') extra.arn = metadata.tableArn;
          }
          return {
            ...node,
            data: {
              ...node.data,
              status,
              ...extra,
            },
          } as AppNode;
        })
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
            status: isLive ? 'live' : 'draft',
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
            status: isLive ? 'live' : 'draft',
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
            status: isLive ? 'live' : 'draft',
          },
        };
      } else {
        return;
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [isLive, screenToFlowPosition, setNodes]
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

      setCompilationResult(data);

      // Deployment state transition: deploying -> live
      setAllNodeStatuses('deploying');

      setTimeout(() => {
        const liveUrl = `https://${data.projectId}.execute-api.us-east-1.amazonaws.com/prod/orders`;
        const lambdaArn = `arn:aws:lambda:us-east-1:123456789012:function:${data.projectId}-CreateOrder`;
        const tableArn = `arn:aws:dynamodb:us-east-1:123456789012:table/${data.projectId}-Orders`;

        setAllNodeStatuses('live', { liveUrl, lambdaArn, tableArn });
        setIsLive(true);
      }, 3000);
    } catch (err: any) {
      alert(`⚠️ [Compilation Error]\n${err.message}`);
      setAllNodeStatuses('draft');
    } finally {
      setIsCompiling(false);
    }
  };

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const appNode = node as AppNode;
      if (appNode.data.status === 'live') {
        if (appNode.type === 'api_gateway') {
          setActiveDrawer('api');
        } else if (appNode.type === 'dynamodb') {
          setActiveDrawer('dynamodb');
        }
      } else {
        alert('⚡ Click "Compile to AWS" first to deploy and activate live testing on this node!');
      }
    },
    []
  );

  const handleRequestSuccess = (record: any) => {
    console.log('[NapkinCloud] Real-time write captured:', record);
    setRefreshDbTrigger((prev) => prev + 1);
  };

  const apiNode = nodes.find((n) => n.type === 'api_gateway') as AppNode | undefined;
  const dynamoNode = nodes.find((n) => n.type === 'dynamodb') as AppNode | undefined;

  return (
    <div ref={reactFlowWrapper} className="w-screen h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <TopBar
        nodes={nodes}
        edges={edges}
        isCompiling={isCompiling}
        isLive={isLive}
        onCompile={handleCompile}
        onOpenApiDrawer={() => setActiveDrawer('api')}
        onOpenDbDrawer={() => setActiveDrawer('dynamodb')}
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
        onNodeClick={onNodeClick}
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

      {/* Compilation Result Modal */}
      {compilationResult && (
        <CompilationModal
          data={compilationResult}
          onClose={() => setCompilationResult(null)}
        />
      )}

      {/* Live In-Canvas API Tester Drawer */}
      {activeDrawer === 'api' && apiNode && (
        <ApiTesterDrawer
          apiData={apiNode.data as ApiGatewayNodeData}
          tableName={(dynamoNode?.data as DynamoDbNodeData)?.tableName || 'OrdersTable'}
          primaryKey={(dynamoNode?.data as DynamoDbNodeData)?.primaryKey || 'orderId'}
          onClose={() => setActiveDrawer('none')}
          onRequestSuccess={handleRequestSuccess}
        />
      )}

      {/* Live In-Canvas DynamoDB Inspector Drawer */}
      {activeDrawer === 'dynamodb' && dynamoNode && (
        <DynamoDbDrawer
          dbData={dynamoNode.data as DynamoDbNodeData}
          onClose={() => setActiveDrawer('none')}
          refreshTrigger={refreshDbTrigger}
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
