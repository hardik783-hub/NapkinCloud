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
import GenericCloudNode from './nodes/GenericCloudNode';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PromptBar from './PromptBar';
import ArchitectExplainerCard from './ArchitectExplainerCard';
import CompilationModal from './CompilationModal';
import DemoHelperHud from './DemoHelperHud';
import ApiTesterDrawer from './drawers/ApiTesterDrawer';
import DynamoDbDrawer from './drawers/DynamoDbDrawer';
import Toast from './Toast';
import type { AppNode, AppEdge, NodeStatus, ApiGatewayNodeData, DynamoDbNodeData } from '@/types/canvas';
import type { CompileResponse, ServiceReasoning } from '@/types/compiler';

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
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [compilationResult, setCompilationResult] = useState<CompileResponse | null>(null);
  // Deployment output must outlive the result modal. Closing that modal must not
  // make live AWS operations fall back to architecture/logical resource names.
  const [deployedTableName, setDeployedTableName] = useState<string | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'api' | 'dynamodb'>('none');
  const [refreshDbTrigger, setRefreshDbTrigger] = useState(0);
  const [reasoning, setReasoning] = useState<ServiceReasoning[] | undefined>(undefined);
  const [application, setApplication] = useState<{ name: string; description: string } | undefined>(undefined);
  const [showExplainer, setShowExplainer] = useState(false);

  const { screenToFlowPosition, fitView } = useReactFlow();

  const handleApplyGeneratedArchitecture = useCallback(
    (
      newNodes: AppNode[],
      newEdges: AppEdge[],
      newReasoning: ServiceReasoning[],
      appData: { name: string; description: string }
    ) => {
      idCounter = 2;
      setNodes(newNodes);
      setEdges(newEdges);
      setReasoning(newReasoning);
      setApplication(appData);
      setShowExplainer(true);
      setIsLive(false);
      setCompilationResult(null);
      setDeployedTableName(null);
      setActiveDrawer('none');
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 100);
    },
    [setNodes, setEdges, fitView]
  );

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      api_gateway: ApiGatewayNode,
      lambda: LambdaNode,
      dynamodb: DynamoDbNode,
      s3: GenericCloudNode,
      sqs: GenericCloudNode,
      sns: GenericCloudNode,
      eventbridge: GenericCloudNode,
      cognito: GenericCloudNode,
      cloudwatch: GenericCloudNode,
      kinesis: GenericCloudNode,
      step_functions: GenericCloudNode,
      secrets_manager: GenericCloudNode,
    }),
    []
  );

  const setAllNodeStatuses = useCallback(
  (
    status: NodeStatus,
    metadata?: {
      liveUrl?: string;
      lambdaArn?: string;
      tableArn?: string;
      liveTableName?: string;
    }
  ) => {
      setNodes((nds) =>
        nds.map((node) => {
          let extra: Record<string, any> = {};
          if (status === 'live' && metadata) {
            if (node.type === 'api_gateway') extra.liveUrl = metadata.liveUrl;
            if (node.type === 'lambda') extra.arn = metadata.lambdaArn;
            if (node.type === 'dynamodb') {
  extra.liveTableName = metadata.liveTableName;
}
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

  const handleResetCanvas = useCallback(() => {
    idCounter = 2;
    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsLive(false);
    setActiveDrawer('none');
    setCompilationResult(null);
    setDeployedTableName(null);
  }, [setEdges, setNodes]);
   
const handleJumpToLive = useCallback(() => {
  setAllNodeStatuses('live', {
    liveUrl: 'https://demo.execute-api.us-east-1.amazonaws.com/prod/orders',
  });
  setIsLive(true);
  setToast({ message: '🟢 Demo mode: All nodes set to LIVE', type: 'success' });
}, [setAllNodeStatuses]);

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      return true;
    },
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const edgeColors: Record<string, string> = {
        api_gateway: '#06b6d4',
        lambda: '#f59e0b',
        dynamodb: '#6366f1',
        s3: '#10b981',
        sqs: '#ec4899',
        sns: '#f43f5e',
        eventbridge: '#a855f7',
        cognito: '#8b5cf6',
        cloudwatch: '#f97316',
        kinesis: '#38bdf8',
        step_functions: '#d946ef',
        secrets_manager: '#14b8a6',
      };
      const edgeColor = edgeColors[sourceNode?.type || ''] || '#06b6d4';

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
        const labels: Record<string, string> = {
          s3: 'AWS S3 Bucket',
          sqs: 'AWS SQS Queue',
          sns: 'AWS SNS Topic',
          eventbridge: 'EventBridge Bus',
          cognito: 'Cognito User Pool',
          cloudwatch: 'CloudWatch Alarms',
          kinesis: 'Kinesis Stream',
          step_functions: 'Step Functions',
          secrets_manager: 'Secrets Manager',
        };

        newNode = {
          id: `node-${nodeType}-${currentCount}`,
          type: nodeType,
          position,
          data: {
            label: labels[nodeType] || nodeType.toUpperCase(),
            serviceType: nodeType,
            status: isLive ? 'live' : 'draft',
          },
        };
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [isLive, screenToFlowPosition, setNodes]
  );

  const handleCompile = async () => {
  setIsCompiling(true);
  setDeployedTableName(null);
  setAllNodeStatuses('compiling');

  try {
    const res = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    });

    const data: CompileResponse = await res.json();

    if (!res.ok || !data.success) {
      const errorMsg =
        data.validation?.errors?.filter(Boolean).join('\n') ||
        (data as any).error ||
        'Compilation failed.';
      throw new Error(errorMsg);
    }

    setCompilationResult(data);
    console.log('[DEBUG COMPILE OUTPUTS]', data.outputs);
    setAllNodeStatuses('deploying');

    // Use REAL AWS deployment outputs
    const liveUrl = data.outputs?.ApiUrl;
    const lambdaName = data.outputs?.LambdaFunctionName;
    const tableName = data.outputs?.OrdersTableName?.trim() || null;
    setDeployedTableName(tableName);
    console.log('[DEBUG DEPLOYED TABLE]', data.outputs?.OrdersTableName);

    setAllNodeStatuses('live', {
      liveUrl,
      lambdaArn: lambdaName,
      liveTableName: tableName || undefined,
    });

    setIsLive(true);

  } catch (err: any) {
    console.error('❌ Compile failed:', err);

    setToast({ message: `AWS Deployment Failed: ${err.message}`, type: 'error' });

    setAllNodeStatuses('failed');
    setIsLive(false);

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
        setToast({ message: 'Deploy the architecture first to activate live testing on this node', type: 'info' });
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
  const drawerDbData = dynamoNode
    ? {
        ...(dynamoNode.data as DynamoDbNodeData),
        liveTableName: deployedTableName ?? undefined,
      }
    : null;

  if (activeDrawer === 'dynamodb' && drawerDbData) {
    console.log('[DEBUG DRAWER TABLE]', deployedTableName);
  }

  return (
    
    <div ref={reactFlowWrapper} className="w-screen h-screen bg-[#080808] text-neutral-100 relative overflow-hidden">
      <TopBar
        nodes={nodes}
        edges={edges}
        isCompiling={isCompiling}
        isLive={isLive}
        reasoning={reasoning}
        onCompile={handleCompile}
        onOpenApiDrawer={() => setActiveDrawer('api')}
        onOpenDbDrawer={() => setActiveDrawer('dynamodb')}
        onToggleExplainer={() => setShowExplainer((prev) => !prev)}
      />
      <PromptBar
        onApplyArchitecture={handleApplyGeneratedArchitecture}
        disabled={isCompiling}
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
        className="bg-[#080808]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.25}
          color="#222222"
        />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>

      {/* Floating Demo Recording HUD */}
      <DemoHelperHud
        onResetCanvas={handleResetCanvas}
        onJumpToLive={handleJumpToLive}
        isLive={isLive}
      />

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
      {activeDrawer === 'dynamodb' && drawerDbData && (
        <DynamoDbDrawer
          dbData={drawerDbData}
          onClose={() => setActiveDrawer('none')}
          refreshTrigger={refreshDbTrigger}
        />
      )}

      {/* AI Cloud Architect Explainer Agent Card */}
      {showExplainer && (
        <ArchitectExplainerCard
          application={application}
          reasoning={reasoning}
          onClose={() => setShowExplainer(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
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
