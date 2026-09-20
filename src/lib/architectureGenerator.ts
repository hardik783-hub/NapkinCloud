import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { MarkerType } from '@xyflow/react';
import type { AppNode, AppEdge, HttpMethod } from '@/types/canvas';
import type { TeammateArchitecture, ServiceReasoning } from '@/types/compiler';

export interface GeneratedArchitectureResponse {
  success: boolean;
  source: 'bedrock' | 'offline_rule_engine';
  prompt: string;
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
  canvasNodes: AppNode[];
  canvasEdges: AppEdge[];
}

function buildCanvasElements(
  method: HttpMethod,
  path: string,
  functionName: string,
  businessLogic: string,
  tableName: string,
  primaryKey: string
): { nodes: AppNode[]; edges: AppEdge[] } {
  const nodes: AppNode[] = [
    {
      id: 'node-api-1',
      type: 'api_gateway',
      position: { x: 340, y: 220 },
      data: {
        label: 'API Gateway',
        method,
        path,
        status: 'draft',
      },
    },
    {
      id: 'node-lambda-1',
      type: 'lambda',
      position: { x: 680, y: 190 },
      data: {
        label: 'Lambda',
        functionName,
        runtime: 'nodejs20.x',
        businessLogic,
        status: 'draft',
      },
    },
    {
      id: 'node-dynamodb-1',
      type: 'dynamodb',
      position: { x: 1060, y: 220 },
      data: {
        label: 'DynamoDB',
        tableName,
        primaryKey,
        status: 'draft',
      },
    },
  ];

  const edges: AppEdge[] = [
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

  return { nodes, edges };
}

function fallbackGenerate(prompt: string): GeneratedArchitectureResponse {
  const p = prompt.toLowerCase();

  let appName = 'Order Processing Service';
  let appDesc = 'Serverless REST API for processing and recording transactions';
  let method: HttpMethod = 'POST';
  let path = '/orders';
  let functionName = 'CreateOrderFunction';
  let businessLogic = 'Validates incoming order payload, assigns UUID orderId, and persists to database';
  let tableName = 'OrdersTable';
  let primaryKey = 'orderId';
  let serviceNameDesc = 'order records';

  if (p.includes('user') || p.includes('auth') || p.includes('profile')) {
    appName = 'User Profile Service';
    appDesc = 'Serverless microservice to register and look up user accounts';
    path = '/users';
    functionName = 'CreateUserProfileFunction';
    businessLogic = 'Validates user profile attributes, sanitizes email, and stores record';
    tableName = 'UsersTable';
    primaryKey = 'userId';
    serviceNameDesc = 'user profiles';
  } else if (p.includes('payment') || p.includes('stripe') || p.includes('billing')) {
    appName = 'Payment Webhook Service';
    appDesc = 'Secure serverless endpoint to capture and verify payment events';
    path = '/payments';
    functionName = 'ProcessPaymentFunction';
    businessLogic = 'Verifies webhook signature, logs transaction amount, and records status';
    tableName = 'PaymentsTable';
    primaryKey = 'paymentId';
    serviceNameDesc = 'payment events';
  } else if (p.includes('product') || p.includes('inventory') || p.includes('catalog')) {
    appName = 'Product Inventory Service';
    appDesc = 'Catalog management service for inventory updates and queries';
    path = '/products';
    functionName = 'ManageInventoryFunction';
    businessLogic = 'Updates SKU count, validates product metadata, and records audit trail';
    tableName = 'ProductsTable';
    primaryKey = 'productId';
    serviceNameDesc = 'product listings';
  }

  const reasoning: ServiceReasoning[] = [
    {
      service: 'api_gateway',
      reason: `Exposes HTTPS ${method} ${path} endpoint with built-in throttling, request validation, and CORS.`,
    },
    {
      service: 'lambda',
      reason: `Executes serverless NodeJS compute for ${appName}. Runs on-demand and auto-scales from zero to peak.`,
    },
    {
      service: 'dynamodb',
      reason: `Managed NoSQL database partitioned by ${primaryKey} for single-digit millisecond latency storage of ${serviceNameDesc}.`,
    },
  ];

  const { nodes, edges } = buildCanvasElements(
    method,
    path,
    functionName,
    businessLogic,
    tableName,
    primaryKey
  );

  return {
    success: true,
    source: 'offline_rule_engine',
    prompt,
    application: {
      name: appName,
      description: appDesc,
    },
    architecture: {
      nodes: [
        { id: 'api1', type: 'api_gateway', purpose: `HTTP ${method} endpoint at ${path}` },
        { id: 'lambda1', type: 'lambda', purpose: businessLogic },
        { id: 'db1', type: 'dynamodb', purpose: `NoSQL storage partitioned by ${primaryKey}` },
      ],
      connections: [
        { from: 'api1', to: 'lambda1' },
        { from: 'lambda1', to: 'db1' },
      ],
    },
    reasoning,
    canvasNodes: nodes,
    canvasEdges: edges,
  };
}

export async function generateArchitectureFromPrompt(
  prompt: string
): Promise<GeneratedArchitectureResponse> {
  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const hasAccessKeys = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
  const region = process.env.AWS_REGION || 'us-east-1';

  // 1. Bedrock API Key / Bearer Token (Amazon Nova Pro)
  if (bearerToken) {
    try {
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/amazon.nova-pro-v1:0/invoke`;
      const systemText = `You are a Principal Cloud Architect specializing in AWS Serverless architectures.
The user wants to build a backend system described by this natural language prompt:
"${prompt}"

Produce a standard AWS 3-tier Serverless microservice pattern (API Gateway -> Lambda -> DynamoDB).
Return ONLY a valid JSON object matching this schema:
{
  "application": {
    "name": "Concise Service Name",
    "description": "1-sentence description of the service"
  },
  "api": {
    "method": "POST",
    "path": "/resource"
  },
  "lambda": {
    "functionName": "AlphanumericPascalCaseFunctionName",
    "businessLogic": "Clear 1-sentence description of what logic executes"
  },
  "dynamodb": {
    "tableName": "AlphanumericPascalCaseTable",
    "primaryKey": "camelCaseKeyId"
  },
  "reasoning": [
    { "service": "api_gateway", "reason": "Why API Gateway was chosen for this exact prompt" },
    { "service": "lambda", "reason": "Why Lambda was chosen for this compute task" },
    { "service": "dynamodb", "reason": "Why DynamoDB was chosen for data persistence" }
  ]
}
Return raw JSON only, no markdown, no quotes, no code fences.`;

      const payload = {
        system: [{ text: systemText }],
        messages: [
          {
            role: 'user',
            content: [{ text: `Generate architecture for: "${prompt}"` }],
          },
        ],
        inferenceConfig: {
          temperature: 0.1,
          max_new_tokens: 1000,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Bedrock Bearer API returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const rawText = data.output?.message?.content?.[0]?.text || '';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const method = (parsed.api?.method || 'POST') as HttpMethod;
      const path = parsed.api?.path?.startsWith('/') ? parsed.api.path : `/${parsed.api?.path || 'items'}`;
      const functionName = (parsed.lambda?.functionName || 'ProcessFunction').replace(/[^a-zA-Z0-9]/g, '');
      const businessLogic = parsed.lambda?.businessLogic || 'Processes payload and writes to DynamoDB';
      const tableName = (parsed.dynamodb?.tableName || 'DataTable').replace(/[^a-zA-Z0-9]/g, '');
      const primaryKey = (parsed.dynamodb?.primaryKey || 'id').replace(/[^a-zA-Z0-9]/g, '');

      const { nodes, edges } = buildCanvasElements(
        method,
        path,
        functionName,
        businessLogic,
        tableName,
        primaryKey
      );

      const reasoning: ServiceReasoning[] = Array.isArray(parsed.reasoning) && parsed.reasoning.length === 3
        ? parsed.reasoning
        : [
            { service: 'api_gateway', reason: 'Provides secure HTTPS entry point with managed routing and throttling.' },
            { service: 'lambda', reason: 'Runs NodeJS serverless logic on-demand with automatic scaling.' },
            { service: 'dynamodb', reason: 'Managed NoSQL table ensuring fast, predictable write and read latency.' },
          ];

      return {
        success: true,
        source: 'bedrock',
        prompt,
        application: {
          name: parsed.application?.name || 'Serverless Application',
          description: parsed.application?.description || prompt,
        },
        architecture: {
          nodes: [
            { id: 'api1', type: 'api_gateway', purpose: `HTTP ${method} endpoint at ${path}` },
            { id: 'lambda1', type: 'lambda', purpose: businessLogic },
            { id: 'db1', type: 'dynamodb', purpose: `NoSQL storage partitioned by ${primaryKey}` },
          ],
          connections: [
            { from: 'api1', to: 'lambda1' },
            { from: 'lambda1', to: 'db1' },
          ],
        },
        reasoning,
        canvasNodes: nodes,
        canvasEdges: edges,
      };
    } catch (err) {
      console.warn('[Bedrock Bearer] Generation failed, falling back to rule engine:', err);
      return fallbackGenerate(prompt);
    }
  }

  // 2. AWS IAM Key Pair (Claude 3.5 Sonnet / AWS SDK)
  if (hasAccessKeys) {
    try {
      const client = new BedrockRuntimeClient({ region });
      const bedrockPrompt = `You are a Principal Cloud Architect specializing in AWS Serverless architectures.
The user wants to build a backend system described by this natural language prompt:
"${prompt}"

Produce a standard AWS 3-tier Serverless microservice pattern (API Gateway -> Lambda -> DynamoDB).
Return ONLY a valid JSON object matching this schema:
{
  "application": {
    "name": "Concise Service Name",
    "description": "1-sentence description of the service"
  },
  "api": {
    "method": "POST",
    "path": "/resource"
  },
  "lambda": {
    "functionName": "AlphanumericPascalCaseFunctionName",
    "businessLogic": "Clear 1-sentence description of what logic executes"
  },
  "dynamodb": {
    "tableName": "AlphanumericPascalCaseTable",
    "primaryKey": "camelCaseKeyId"
  },
  "reasoning": [
    { "service": "api_gateway", "reason": "Why API Gateway was chosen for this exact prompt" },
    { "service": "lambda", "reason": "Why Lambda was chosen for this compute task" },
    { "service": "dynamodb", "reason": "Why DynamoDB was chosen for data persistence" }
  ]
}
Return raw JSON only, no markdown, no quotes, no code fences.`;

      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.2,
        messages: [{ role: 'user', content: bedrockPrompt }],
      };

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const decodedBody = new TextDecoder().decode(response.body);
      const parsedBody = JSON.parse(decodedBody);
      const rawText = parsedBody.content?.[0]?.text || '';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const method = (parsed.api?.method || 'POST') as HttpMethod;
      const path = parsed.api?.path?.startsWith('/') ? parsed.api.path : `/${parsed.api?.path || 'items'}`;
      const functionName = (parsed.lambda?.functionName || 'ProcessFunction').replace(/[^a-zA-Z0-9]/g, '');
      const businessLogic = parsed.lambda?.businessLogic || 'Processes payload and writes to DynamoDB';
      const tableName = (parsed.dynamodb?.tableName || 'DataTable').replace(/[^a-zA-Z0-9]/g, '');
      const primaryKey = (parsed.dynamodb?.primaryKey || 'id').replace(/[^a-zA-Z0-9]/g, '');

      const { nodes, edges } = buildCanvasElements(
        method,
        path,
        functionName,
        businessLogic,
        tableName,
        primaryKey
      );

      const reasoning: ServiceReasoning[] = Array.isArray(parsed.reasoning) && parsed.reasoning.length === 3
        ? parsed.reasoning
        : [
            { service: 'api_gateway', reason: 'Provides secure HTTPS entry point with managed routing and throttling.' },
            { service: 'lambda', reason: 'Runs NodeJS serverless logic on-demand with automatic scaling.' },
            { service: 'dynamodb', reason: 'Managed NoSQL table ensuring fast, predictable write and read latency.' },
          ];

      return {
        success: true,
        source: 'bedrock',
        prompt,
        application: {
          name: parsed.application?.name || 'Serverless Application',
          description: parsed.application?.description || prompt,
        },
        architecture: {
          nodes: [
            { id: 'api1', type: 'api_gateway', purpose: `HTTP ${method} endpoint at ${path}` },
            { id: 'lambda1', type: 'lambda', purpose: businessLogic },
            { id: 'db1', type: 'dynamodb', purpose: `NoSQL storage partitioned by ${primaryKey}` },
          ],
          connections: [
            { from: 'api1', to: 'lambda1' },
            { from: 'lambda1', to: 'db1' },
          ],
        },
        reasoning,
        canvasNodes: nodes,
        canvasEdges: edges,
      };
    } catch (err) {
      console.warn('Bedrock generation failed, falling back to rule engine:', err);
      return fallbackGenerate(prompt);
    }
  }

  // 3. Fallback heuristic engine
  return fallbackGenerate(prompt);
}
