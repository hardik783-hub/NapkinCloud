import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { MarkerType } from '@xyflow/react';
import type { AppNode, AppEdge, HttpMethod } from '@/types/canvas';
import type { TeammateArchitecture, ServiceReasoning } from '@/types/compiler';

function extractJsonFromText(text: string): any {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('No valid JSON found in LLM response');
}

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
  primaryKey: string,
  serviceType: string = 'dynamodb'
): { nodes: AppNode[]; edges: AppEdge[] } {
  let downstreamNode: AppNode;
  let targetNodeId = 'node-dynamodb-1';
  let edgeColor = '#f59e0b';

  if (serviceType === 's3') {
    targetNodeId = 'node-s3-1';
    edgeColor = '#10b981';
    downstreamNode = {
      id: targetNodeId,
      type: 's3',
      position: { x: 1060, y: 220 },
      data: {
        label: 'AWS S3 Bucket',
        serviceType: 's3',
        subLabel: 'Object Storage Bucket',
        resourceName: tableName || 'uploads-bucket',
        status: 'draft',
      },
    };
  } else if (serviceType === 'sqs') {
    targetNodeId = 'node-sqs-1';
    edgeColor = '#ec4899';
    downstreamNode = {
      id: targetNodeId,
      type: 'sqs',
      position: { x: 1060, y: 220 },
      data: {
        label: 'AWS SQS Queue',
        serviceType: 'sqs',
        subLabel: 'Message Queue',
        resourceName: tableName || 'app-queue',
        status: 'draft',
      },
    };
  } else if (serviceType === 'sns') {
    targetNodeId = 'node-sns-1';
    edgeColor = '#f43f5e';
    downstreamNode = {
      id: targetNodeId,
      type: 'sns',
      position: { x: 1060, y: 220 },
      data: {
        label: 'AWS SNS Topic',
        serviceType: 'sns',
        subLabel: 'Pub/Sub Topic',
        resourceName: tableName || 'app-topic',
        status: 'draft',
      },
    };
  } else {
    downstreamNode = {
      id: targetNodeId,
      type: 'dynamodb',
      position: { x: 1060, y: 220 },
      data: {
        label: 'DynamoDB',
        tableName: tableName || 'DataTable',
        primaryKey: primaryKey || 'id',
        status: 'draft',
      },
    };
  }

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
    downstreamNode,
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
      target: targetNodeId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      style: { stroke: edgeColor, strokeWidth: 2 },
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

  let serviceType: 'dynamodb' | 's3' = 'dynamodb';

  if (p.includes('s3') || p.includes('file') || p.includes('upload') || p.includes('image') || p.includes('photo') || p.includes('document') || p.includes('media') || p.includes('asset') || p.includes('bucket')) {
    appName = 'Cloud File & Asset Storage Service';
    appDesc = 'Serverless upload API to process and store media assets directly in AWS S3';
    path = '/upload';
    functionName = 'UploadFileFunction';
    businessLogic = 'Validates file metadata, generates S3 object key, and records asset details';
    tableName = 'AssetsTable';
    primaryKey = 'assetId';
    serviceNameDesc = 'file assets';
    serviceType = 's3';
  } else if (p.includes('user') || p.includes('auth') || p.includes('profile')) {
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
  } else if (p.includes('task') || p.includes('todo') || p.includes('ticket') || p.includes('issue')) {
    appName = 'Task Management Service';
    appDesc = 'Serverless microservice to track, assign, and update task statuses';
    path = '/tasks';
    functionName = 'ManageTasksFunction';
    businessLogic = 'Validates task payload, assigns priority and timestamps, and stores task';
    tableName = 'TasksTable';
    primaryKey = 'taskId';
    serviceNameDesc = 'task items';
  } else if (p.includes('notification') || p.includes('alert') || p.includes('email') || p.includes('sms')) {
    appName = 'Notification Dispatch Service';
    appDesc = 'Serverless event dispatcher to send and log user notifications';
    path = '/notifications';
    functionName = 'SendNotificationFunction';
    businessLogic = 'Validates recipient channel, constructs notification payload, and logs dispatch';
    tableName = 'NotificationsTable';
    primaryKey = 'notificationId';
    serviceNameDesc = 'notification logs';
  } else if (p.includes('analytics') || p.includes('event') || p.includes('metric') || p.includes('tracking')) {
    appName = 'Analytics Telemetry Service';
    appDesc = 'High-throughput serverless endpoint to capture and record analytics events';
    path = '/events';
    functionName = 'IngestEventsFunction';
    businessLogic = 'Enriches event metadata, extracts client IP, and persists event log';
    tableName = 'EventsTable';
    primaryKey = 'eventId';
    serviceNameDesc = 'telemetry events';
  } else if (p.includes('feedback') || p.includes('review') || p.includes('rating') || p.includes('survey')) {
    appName = 'Customer Feedback Service';
    appDesc = 'Serverless endpoint to capture customer feedback, ratings, and reviews';
    path = '/feedback';
    functionName = 'SubmitFeedbackFunction';
    businessLogic = 'Validates rating bounds, sanitizes comment text, and stores feedback record';
    tableName = 'FeedbackTable';
    primaryKey = 'feedbackId';
    serviceNameDesc = 'customer reviews';
  } else if (p.includes('post') || p.includes('blog') || p.includes('article') || p.includes('content')) {
    appName = 'Content Publishing Service';
    appDesc = 'Serverless headless CMS API to publish and retrieve article posts';
    path = '/posts';
    functionName = 'PublishContentFunction';
    businessLogic = 'Generates slug, verifies author credentials, and records post content';
    tableName = 'PostsTable';
    primaryKey = 'postId';
    serviceNameDesc = 'published posts';
  } else if (p.includes('booking') || p.includes('appointment') || p.includes('reservation') || p.includes('schedule')) {
    appName = 'Booking Reservation Service';
    appDesc = 'Serverless appointment scheduling service for reservation bookings';
    path = '/bookings';
    functionName = 'ManageBookingsFunction';
    businessLogic = 'Verifies timeslot availability, locks booking reservation, and logs confirmation';
    tableName = 'BookingsTable';
    primaryKey = 'bookingId';
    serviceNameDesc = 'booking records';
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
      service: serviceType,
      reason: serviceType === 's3' ? `Managed object storage for storing ${serviceNameDesc}.` : `Managed NoSQL database partitioned by ${primaryKey} for single-digit millisecond latency storage of ${serviceNameDesc}.`,
    },
  ];

  const { nodes, edges } = buildCanvasElements(
    method,
    path,
    functionName,
    businessLogic,
    tableName,
    primaryKey,
    serviceType
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

function resolveServiceType(parsed: any, prompt: string): string {
  const p = prompt.toLowerCase();
  const reasoningServices = Array.isArray(parsed?.reasoning)
    ? parsed.reasoning.map((r: any) => String(r.service || '').toLowerCase())
    : [];

  const isS3 =
    parsed?.serviceType === 's3' ||
    reasoningServices.some((s: string) => s.includes('s3')) ||
    p.includes('s3') ||
    p.includes('upload') ||
    p.includes('photo') ||
    p.includes('image') ||
    p.includes('bucket') ||
    p.includes('file') ||
    p.includes('media');

  if (isS3) return 's3';

  const isSQS =
    parsed?.serviceType === 'sqs' ||
    reasoningServices.some((s: string) => s.includes('sqs')) ||
    p.includes('sqs') ||
    p.includes('queue');

  if (isSQS) return 'sqs';

  const isSNS =
    parsed?.serviceType === 'sns' ||
    reasoningServices.some((s: string) => s.includes('sns')) ||
    p.includes('sns') ||
    p.includes('topic') ||
    p.includes('broadcast');

  if (isSNS) return 'sns';

  return 'dynamodb';
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

Produce a standard AWS Serverless microservice pattern. If the prompt is about files, uploads, images, or documents, choose S3 storage. If it is about data, records, or entities, choose DynamoDB. If both, include both.
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
      const parsed = extractJsonFromText(rawText);

      const method = (parsed.api?.method || 'POST') as HttpMethod;
      const path = parsed.api?.path?.startsWith('/') ? parsed.api.path : `/${parsed.api?.path || 'items'}`;
      const functionName = (parsed.lambda?.functionName || 'ProcessFunction').replace(/[^a-zA-Z0-9]/g, '');
      const businessLogic = parsed.lambda?.businessLogic || 'Processes payload and writes to DynamoDB';
      const tableName = (parsed.dynamodb?.tableName || 'DataTable').replace(/[^a-zA-Z0-9]/g, '');
      const primaryKey = (parsed.dynamodb?.primaryKey || 'id').replace(/[^a-zA-Z0-9]/g, '');
      const serviceType = resolveServiceType(parsed, prompt);

      const { nodes, edges } = buildCanvasElements(
        method,
        path,
        functionName,
        businessLogic,
        tableName,
        primaryKey,
        serviceType
      );

      const defaultReason = serviceType === 's3'
        ? { service: 's3', reason: 'High-durability object storage for storing photos, documents, and media assets.' }
        : { service: 'dynamodb', reason: 'Managed NoSQL table ensuring fast, predictable write and read latency.' };

      const reasoning: ServiceReasoning[] = Array.isArray(parsed.reasoning) && parsed.reasoning.length === 3
        ? parsed.reasoning
        : [
            { service: 'api_gateway', reason: 'Provides secure HTTPS entry point with managed routing and throttling.' },
            { service: 'lambda', reason: 'Runs NodeJS serverless logic on-demand with automatic scaling.' },
            defaultReason,
          ];

      const downstreamId = serviceType === 's3' ? 's3_1' : (serviceType === 'sqs' ? 'sqs_1' : (serviceType === 'sns' ? 'sns_1' : 'db1'));

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
            {
              id: downstreamId,
              type: serviceType,
              purpose: serviceType === 's3'
                ? `Object storage bucket for ${parsed.application?.name || 'assets'}`
                : serviceType === 'sqs'
                ? 'Managed message queue for async processing'
                : serviceType === 'sns'
                ? 'Managed topic for event fanout'
                : `NoSQL storage partitioned by ${primaryKey}`,
            },
          ],
          connections: [
            { from: 'api1', to: 'lambda1' },
            { from: 'lambda1', to: downstreamId },
          ],
        },
        reasoning,
        canvasNodes: nodes,
        canvasEdges: edges,
      };
    } catch (err) {
      console.warn('[Bedrock Bearer] Generation failed, trying IAM credentials:', err);
    }
  }

  // 2. AWS IAM Key Pair (Claude 3.5 Sonnet / AWS SDK)
  if (hasAccessKeys) {
    try {
      const client = new BedrockRuntimeClient({ region });
      const bedrockPrompt = `You are a Principal Cloud Architect specializing in AWS Serverless architectures.
The user wants to build a backend system described by this natural language prompt:
"${prompt}"

Produce a standard AWS Serverless microservice pattern. If the prompt is about files, uploads, images, or documents, choose S3 storage. If it is about data, records, or entities, choose DynamoDB. If both, include both.
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
      const parsed = extractJsonFromText(rawText);

      const method = (parsed.api?.method || 'POST') as HttpMethod;
      const path = parsed.api?.path?.startsWith('/') ? parsed.api.path : `/${parsed.api?.path || 'items'}`;
      const functionName = (parsed.lambda?.functionName || 'ProcessFunction').replace(/[^a-zA-Z0-9]/g, '');
      const businessLogic = parsed.lambda?.businessLogic || 'Processes payload and writes to DynamoDB';
      const tableName = (parsed.dynamodb?.tableName || 'DataTable').replace(/[^a-zA-Z0-9]/g, '');
      const primaryKey = (parsed.dynamodb?.primaryKey || 'id').replace(/[^a-zA-Z0-9]/g, '');

      const serviceType = resolveServiceType(parsed, prompt);

      const { nodes, edges } = buildCanvasElements(
        method,
        path,
        functionName,
        businessLogic,
        tableName,
        primaryKey,
        serviceType
      );

      const defaultReason = serviceType === 's3'
        ? { service: 's3', reason: 'High-durability object storage for storing photos, documents, and media assets.' }
        : { service: 'dynamodb', reason: 'Managed NoSQL table ensuring fast, predictable write and read latency.' };

      const reasoning: ServiceReasoning[] = Array.isArray(parsed.reasoning) && parsed.reasoning.length === 3
        ? parsed.reasoning
        : [
            { service: 'api_gateway', reason: 'Provides secure HTTPS entry point with managed routing and throttling.' },
            { service: 'lambda', reason: 'Runs NodeJS serverless logic on-demand with automatic scaling.' },
            defaultReason,
          ];

      const downstreamId = serviceType === 's3' ? 's3_1' : (serviceType === 'sqs' ? 'sqs_1' : (serviceType === 'sns' ? 'sns_1' : 'db1'));

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
            {
              id: downstreamId,
              type: serviceType,
              purpose: serviceType === 's3'
                ? `Object storage bucket for ${parsed.application?.name || 'assets'}`
                : serviceType === 'sqs'
                ? 'Managed message queue for async processing'
                : serviceType === 'sns'
                ? 'Managed topic for event fanout'
                : `NoSQL storage partitioned by ${primaryKey}`,
            },
          ],
          connections: [
            { from: 'api1', to: 'lambda1' },
            { from: 'lambda1', to: downstreamId },
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
