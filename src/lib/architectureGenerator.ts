import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { MarkerType } from '@xyflow/react';
import type { AppNode, AppEdge, HttpMethod } from '@/types/canvas';
import type { ServiceReasoning } from '@/types/compiler';
import {
  SERVICE_REGISTRY,
  isKnownType,
  inferEdgeKind,
  validateGraph,
} from './serviceRegistry.ts';

function extractJsonFromText(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
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
      kind?: string;
    }>;
  };
  reasoning: ServiceReasoning[];
  canvasNodes: AppNode[];
  canvasEdges: AppEdge[];
}

/**
 * Graph specification — the canonical intermediate representation between
 * any source (Bedrock LLM or the offline rule engine) and the canvas.
 * `buildGraphFromSpec` is the ONLY path that creates canvas nodes/edges,
 * so `architecture`, `reasoning`, `canvasNodes`, and `canvasEdges` can
 * never contradict each other.
 */
export interface GraphSpecNode {
  type: string;
  purpose?: string;
  method?: string;
  path?: string;
  functionName?: string;
  businessLogic?: string;
  tableName?: string;
  primaryKey?: string;
  resourceName?: string;
}

export interface GraphSpecConnection {
  from: number;
  to: number;
  kind?: string;
}

export interface GraphSpec {
  application: { name: string; description: string };
  nodes: GraphSpecNode[];
  connections: GraphSpecConnection[];
  source: 'bedrock' | 'offline_rule_engine';
  reasoning?: ServiceReasoning[];
}

interface BuiltGraph {
  canvasNodes: AppNode[];
  canvasEdges: AppEdge[];
  reasoning: ServiceReasoning[];
  architecture: {
    nodes: Array<{ id: string; type: string; purpose: string }>;
    connections: Array<{ from: string; to: string; kind: string }>;
  };
}

// ---------------------------------------------------------------------------
// Service detection (offline rule engine)
// ---------------------------------------------------------------------------

const SERVICE_KEYWORDS: Array<{ type: string; keywords: string[] }> = [
  { type: 'dynamodb', keywords: ['dynamodb', 'dynamo db', 'database', 'table', 'records', 'persist', 'storage'] },
  { type: 's3', keywords: ['s3', 'bucket', 'upload', 'file', 'image', 'photo', 'document', 'media', 'object storage'] },
  { type: 'sqs', keywords: ['sqs', 'queue'] },
  { type: 'sns', keywords: ['sns', 'topic', 'notification', 'notify', 'email', 'sms', 'broadcast'] },
  { type: 'eventbridge', keywords: ['eventbridge', 'event bus'] },
  { type: 'cloudwatch', keywords: ['cloudwatch', 'cloud watch', 'monitor', 'alarm'] },
  { type: 'cognito', keywords: ['cognito', 'user pool', 'sign-in', 'authenticate'] },
  { type: 'kinesis', keywords: ['kinesis', 'streaming'] },
  { type: 'step_functions', keywords: ['step function', 'state machine'] },
  { type: 'secrets_manager', keywords: ['secrets manager', 'secret key'] },
];

/** Word-boundary keyword match so "file" does not match "profiles". */
function matchesKeyword(lowerPrompt: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}s?\\b`, 'i').test(lowerPrompt);
}

/**
 * Extract EVERY service mentioned in a prompt (no precedence collapse —
 * the old resolveServiceType() single-downstream limitation is gone).
 * Results are ordered by the canonical registry order for determinism.
 */
export function detectServices(prompt: string): string[] {
  const p = prompt.toLowerCase();
  const detected = new Set<string>();
  for (const entry of SERVICE_KEYWORDS) {
    if (entry.keywords.some((k) => matchesKeyword(p, k))) detected.add(entry.type);
  }
  return Object.keys(SERVICE_REGISTRY.services).filter((t) => detected.has(t));
}

// ---------------------------------------------------------------------------
// Canonical graph builder
// ---------------------------------------------------------------------------

function normalizePath(path?: string): string {
  const raw = (path || '/items').trim();
  const clean = raw.replace(/[^a-zA-Z0-9/_-]/g, '');
  if (!clean) return '/items';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function assignPosition(
  type: string,
  downstreamIndex: { count: number },
  monitorIndex: { count: number }
): { x: number; y: number } {
  if (type === 'api_gateway') return { x: 340, y: 220 };
  if (type === 'lambda') return { x: 680, y: 190 };
  const role = SERVICE_REGISTRY.services[type]?.role;
  if (role === 'monitor' || role === 'auth') {
    return { x: 680, y: 420 + monitorIndex.count++ * 170 };
  }
  return { x: 1060, y: 140 + downstreamIndex.count++ * 170 };
}

function nodeDataFor(spec: GraphSpecNode): Record<string, unknown> {
  const def = SERVICE_REGISTRY.services[spec.type];
  switch (spec.type) {
    case 'api_gateway':
      return {
        label: 'API Gateway',
        method: (spec.method || 'POST').toUpperCase() as HttpMethod,
        path: normalizePath(spec.path),
        status: 'draft',
      };
    case 'lambda':
      return {
        label: 'Lambda',
        functionName:
          (spec.functionName || '').replace(/[^a-zA-Z0-9]/g, '') || 'ProcessFunction',
        runtime: 'nodejs20.x',
        businessLogic:
          spec.businessLogic || 'Processes incoming events and persists results',
        status: 'draft',
      };
    case 'dynamodb':
      return {
        label: 'DynamoDB',
        tableName: (spec.tableName || '').replace(/[^a-zA-Z0-9]/g, '') || 'DataTable',
        primaryKey: (spec.primaryKey || '').replace(/[^a-zA-Z0-9_]/g, '') || 'id',
        status: 'draft',
      };
    default:
      return {
        label: def?.label || spec.type,
        serviceType: spec.type,
        subLabel: def?.subLabel || '',
        resourceName:
          (spec.resourceName || def?.defaults?.resourceName || 'app-resource').replace(
            /[^a-zA-Z0-9_-]/g,
            ''
          ) || 'app-resource',
        status: 'draft',
      };
  }
}

function purposeForNode(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'api_gateway':
      return `HTTP ${data.method || 'GET'} ${data.path || '/'} endpoint`;
    case 'lambda':
      return String(data.businessLogic || 'Serverless compute');
    case 'dynamodb':
      return `NoSQL table ${data.tableName} partitioned by ${data.primaryKey}`;
    default:
      return `${data.label || type} (${data.resourceName || 'default'})`;
  }
}

function deriveReason(node: AppNode): string {
  const d = (node.data || {}) as Record<string, any>;
  switch (node.type) {
    case 'api_gateway':
      return `Exposes HTTPS ${d.method || 'POST'} ${d.path || '/'} endpoint with built-in throttling, request validation, and CORS.`;
    case 'lambda':
      return `Executes serverless NodeJS compute (${d.functionName || 'function'}): ${d.businessLogic || 'processes events on demand'}.`;
    case 'dynamodb':
      return `Managed NoSQL table (${d.tableName || 'table'}) partitioned by ${d.primaryKey || 'id'} for single-digit-millisecond reads and writes.`;
    case 's3':
      return `Managed object storage bucket (${d.resourceName || 'bucket'}) for durable uploads and retrieval.`;
    case 'sqs':
      return `Managed message queue (${d.resourceName || 'queue'}) for decoupled, retryable async processing.`;
    case 'sns':
      return `Managed pub/sub topic (${d.resourceName || 'topic'}) for event fanout to subscribers.`;
    case 'eventbridge':
      return `Managed event bus (${d.resourceName || 'bus'}) for routing events between services.`;
    case 'cloudwatch':
      return `CloudWatch alarms on Lambda errors and latency for operational monitoring.`;
    case 'cognito':
      return `Cognito user pool (${d.resourceName || 'pool'}) for user authentication and authorization.`;
    case 'kinesis':
      return `Kinesis data stream (${d.resourceName || 'stream'}) for ordered, real-time event ingestion.`;
    case 'step_functions':
      return `Step Functions state machine (${d.resourceName || 'machine'}) for durable workflow orchestration.`;
    case 'secrets_manager':
      return `Secrets Manager secret (${d.resourceName || 'secret'}) for secure credential storage.`;
    default:
      return `AWS ${node.type} service in the generated architecture.`;
  }
}

/** Default wiring: entry -> compute -> every other service, with semantics. */
export function defaultConnections(nodes: GraphSpecNode[]): GraphSpecConnection[] {
  const apiIdx = nodes.findIndex((n) => n.type === 'api_gateway');
  const lambdaIdx = nodes.findIndex((n) => n.type === 'lambda');
  const connections: GraphSpecConnection[] = [];
  if (apiIdx >= 0 && lambdaIdx >= 0) {
    connections.push({ from: apiIdx, to: lambdaIdx, kind: 'invokes' });
  }
  nodes.forEach((n, i) => {
    if (i === apiIdx || i === lambdaIdx || lambdaIdx < 0) return;
    if (n.type === 'cognito') {
      connections.push({ from: i, to: lambdaIdx, kind: 'triggers' });
    } else if (n.type === 'cloudwatch') {
      connections.push({ from: lambdaIdx, to: i, kind: 'monitors' });
    } else {
      connections.push({ from: lambdaIdx, to: i });
    }
  });
  return connections;
}

/**
 * THE single graph builder. Emits N nodes (all services in the spec),
 * edges carrying semantic `kind`, and derives the teammate `architecture`
 * and `reasoning` from those same nodes — eliminating any possibility of
 * the canvas and the teammate schema disagreeing.
 */
export function buildGraphFromSpec(spec: GraphSpec): BuiltGraph {
  const downstream = { count: 0 };
  const monitor = { count: 0 };
  const perTypeCounter = new Map<string, number>();
  const idPrefix = (type: string) => (type === 'api_gateway' ? 'api' : type);

  const canvasNodes: AppNode[] = spec.nodes.map((specNode) => {
    const n = (perTypeCounter.get(specNode.type) || 0) + 1;
    perTypeCounter.set(specNode.type, n);
    return {
      id: `node-${idPrefix(specNode.type)}-${n}`,
      type: specNode.type,
      position: assignPosition(specNode.type, downstream, monitor),
      data: nodeDataFor(specNode),
    } as AppNode;
  });

  const canvasEdges: AppEdge[] = [];
  spec.connections.forEach((conn, i) => {
    const source = canvasNodes[conn.from];
    const target = canvasNodes[conn.to];
    if (!source || !target) return;
    const kind = inferEdgeKind(
      String(source.type),
      String(target.type),
      conn.kind
    );
    const color = SERVICE_REGISTRY.services[String(source.type)]?.color || '#06b6d4';
    canvasEdges.push({
      id: `edge-${i + 1}`,
      source: source.id,
      target: target.id,
      animated: true,
      data: { kind },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: { stroke: color, strokeWidth: 2 },
    });
  });

  // Reasoning derived from the SAME canvas nodes, overlaid with any
  // source-provided reasons (first match per service wins).
  const provided = new Map<string, string>();
  if (Array.isArray(spec.reasoning)) {
    for (const r of spec.reasoning) {
      if (r && typeof r.service === 'string' && typeof r.reason === 'string' && !provided.has(r.service)) {
        provided.set(r.service, r.reason);
      }
    }
  }
  const reasoning: ServiceReasoning[] = canvasNodes.map((node) => ({
    service: String(node.type || 'unknown'),
    reason: provided.get(String(node.type)) || deriveReason(node),
  }));

  const architecture = {
    nodes: canvasNodes.map((node) => ({
      id: node.id,
      type: String(node.type),
      purpose: purposeForNode(String(node.type), (node.data || {}) as Record<string, unknown>),
    })),
    connections: canvasEdges.map((edge) => ({
      from: edge.source,
      to: edge.target,
      kind: String((edge.data as { kind?: string } | undefined)?.kind || 'flow'),
    })),
  };

  return { canvasNodes, canvasEdges, reasoning, architecture };
}

function makeResponse(
  spec: GraphSpec,
  built: BuiltGraph,
  prompt: string
): GeneratedArchitectureResponse {
  return {
    success: true,
    source: spec.source,
    prompt,
    application: spec.application,
    architecture: built.architecture,
    reasoning: built.reasoning,
    canvasNodes: built.canvasNodes,
    canvasEdges: built.canvasEdges,
  };
}

// ---------------------------------------------------------------------------
// Offline rule engine
// ---------------------------------------------------------------------------

function fallbackGenerate(prompt: string): GeneratedArchitectureResponse {
  const p = prompt.toLowerCase();

  let appName = 'Order Processing Service';
  let appDesc = 'Serverless REST API for processing and recording transactions';
  let method: HttpMethod = 'POST';
  let path = '/orders';
  let functionName = 'CreateOrderFunction';
  let businessLogic =
    'Validates incoming order payload, assigns UUID orderId, and persists to database';
  let tableName = 'OrdersTable';
  let primaryKey = 'orderId';
  let domainService: 'dynamodb' | 's3' = 'dynamodb';

  if (
    (p.includes('image') || p.includes('photo')) &&
    (p.includes('process') || p.includes('pipeline') || p.includes('thumbnail'))
  ) {
    appName = 'Image Processing Pipeline';
    appDesc =
      'Serverless pipeline that processes uploaded images and records processing metadata';
    path = '/images';
    functionName = 'ProcessImageFunction';
    businessLogic =
      'Validates uploaded image metadata, processes the image, and persists results';
    tableName = 'ImageMetadataTable';
    primaryKey = 'imageId';
  } else if (
    p.includes('s3') ||
    p.includes('file') ||
    p.includes('upload') ||
    p.includes('document') ||
    p.includes('media') ||
    p.includes('asset') ||
    p.includes('bucket')
  ) {
    appName = 'Cloud File & Asset Storage Service';
    appDesc = 'Serverless upload API to process and store media assets directly in AWS S3';
    path = '/upload';
    functionName = 'UploadFileFunction';
    businessLogic =
      'Validates file metadata, generates S3 object key, and records asset details';
    tableName = 'AssetsTable';
    primaryKey = 'assetId';
    domainService = 's3';
  } else if (p.includes('user') || p.includes('auth') || p.includes('profile')) {
    appName = 'User Profile Service';
    appDesc = 'Serverless microservice to register and look up user accounts';
    path = '/users';
    functionName = 'CreateUserProfileFunction';
    businessLogic = 'Validates user profile attributes, sanitizes email, and stores record';
    tableName = 'UsersTable';
    primaryKey = 'userId';
  } else if (p.includes('payment') || p.includes('stripe') || p.includes('billing')) {
    appName = 'Payment Webhook Service';
    appDesc = 'Secure serverless endpoint to capture and verify payment events';
    path = '/payments';
    functionName = 'ProcessPaymentFunction';
    businessLogic = 'Verifies webhook signature, logs transaction amount, and records status';
    tableName = 'PaymentsTable';
    primaryKey = 'paymentId';
  } else if (p.includes('product') || p.includes('inventory') || p.includes('catalog')) {
    appName = 'Product Inventory Service';
    appDesc = 'Catalog management service for inventory updates and queries';
    path = '/products';
    functionName = 'ManageInventoryFunction';
    businessLogic = 'Updates SKU count, validates product metadata, and records audit trail';
    tableName = 'ProductsTable';
    primaryKey = 'productId';
  } else if (p.includes('task') || p.includes('todo') || p.includes('ticket') || p.includes('issue')) {
    appName = 'Task Management Service';
    appDesc = 'Serverless microservice to track, assign, and update task statuses';
    path = '/tasks';
    functionName = 'ManageTasksFunction';
    businessLogic = 'Validates task payload, assigns priority and timestamps, and stores task';
    tableName = 'TasksTable';
    primaryKey = 'taskId';
  } else if (p.includes('notification') || p.includes('alert') || p.includes('email') || p.includes('sms')) {
    appName = 'Notification Dispatch Service';
    appDesc = 'Serverless event dispatcher to send and log user notifications';
    path = '/notifications';
    functionName = 'SendNotificationFunction';
    businessLogic =
      'Validates recipient channel, constructs notification payload, and logs dispatch';
    tableName = 'NotificationsTable';
    primaryKey = 'notificationId';
  } else if (p.includes('analytics') || p.includes('event') || p.includes('metric') || p.includes('tracking')) {
    appName = 'Analytics Telemetry Service';
    appDesc = 'High-throughput serverless endpoint to capture and record analytics events';
    path = '/events';
    functionName = 'IngestEventsFunction';
    businessLogic =
      'Enriches event metadata, extracts client IP, and persists event log';
    tableName = 'EventsTable';
    primaryKey = 'eventId';
  } else if (p.includes('feedback') || p.includes('review') || p.includes('rating') || p.includes('survey')) {
    appName = 'Customer Feedback Service';
    appDesc = 'Serverless endpoint to capture customer feedback, ratings, and reviews';
    path = '/feedback';
    functionName = 'SubmitFeedbackFunction';
    businessLogic =
      'Validates rating bounds, sanitizes comment text, and stores feedback record';
    tableName = 'FeedbackTable';
    primaryKey = 'feedbackId';
  } else if (p.includes('post') || p.includes('blog') || p.includes('article') || p.includes('content')) {
    appName = 'Content Publishing Service';
    appDesc = 'Serverless headless CMS API to publish and retrieve article posts';
    path = '/posts';
    functionName = 'PublishContentFunction';
    businessLogic =
      'Generates slug, verifies author credentials, and records post content';
    tableName = 'PostsTable';
    primaryKey = 'postId';
  } else if (p.includes('booking') || p.includes('appointment') || p.includes('reservation') || p.includes('schedule')) {
    appName = 'Booking Reservation Service';
    appDesc = 'Serverless appointment scheduling service for reservation bookings';
    path = '/bookings';
    functionName = 'ManageBookingsFunction';
    businessLogic =
      'Verifies timeslot availability, locks booking reservation, and logs confirmation';
    tableName = 'BookingsTable';
    primaryKey = 'bookingId';
  }

  // ALL detected services are included — no precedence collapse. If the
  // prompt names no service explicitly, fall back to the domain default.
  const detected = detectServices(p);
  const services = detected.length > 0 ? detected : [domainService];

  const nodes: GraphSpecNode[] = [
    { type: 'api_gateway', method, path },
    { type: 'lambda', functionName, businessLogic },
  ];
  for (const type of services) {
    const node: GraphSpecNode = { type };
    if (type === 'dynamodb') {
      node.tableName = tableName;
      node.primaryKey = primaryKey;
    }
    nodes.push(node);
  }

  const connections = defaultConnections(nodes);

  // "failures go to SQS" semantics: mark lambda -> sqs as a failure sink.
  if (/\bfail|failures?|dead[- ]?letter|dlq\b/.test(p)) {
    for (const conn of connections) {
      if (nodes[conn.to]?.type === 'sqs') conn.kind = 'fails-to';
    }
  }

  const spec: GraphSpec = {
    application: { name: appName, description: appDesc },
    nodes,
    connections,
    source: 'offline_rule_engine',
  };

  return makeResponse(spec, buildGraphFromSpec(spec), prompt);
}

// ---------------------------------------------------------------------------
// Bedrock LLM path
// ---------------------------------------------------------------------------

function buildBedrockSystemPrompt(prompt: string): string {
  return `You are a Principal Cloud Architect specializing in AWS Serverless architectures.
The user wants to build a backend system described by this natural language prompt:
"${prompt}"

Produce a complete multi-service AWS serverless architecture:
- Include an "api_gateway" node ONLY when the system is an HTTP/API entry point. Event-triggered pipelines (S3 -> Lambda, SQS -> Lambda, SNS -> Lambda, EventBridge -> Lambda, Kinesis -> Lambda) must NOT include an api_gateway node.
- Include EXACTLY ONE "lambda" node.
- Include EVERY AWS service mentioned in the prompt (S3, DynamoDB, SQS, SNS, CloudWatch, EventBridge, Kinesis, Cognito, Step Functions, Secrets Manager, ...). Never drop a mentioned service.
- Describe each connection with a semantic "kind": "invokes" | "triggers" | "writes" | "reads" | "publishes" | "fails-to" | "monitors" | "starts".

Return ONLY a valid JSON object matching this schema:
{
  "application": { "name": "Concise Service Name", "description": "1-sentence description" },
  "nodes": [
    { "id": "api1", "type": "api_gateway", "purpose": "HTTP entry point", "method": "POST", "path": "/resource" },
    { "id": "lambda1", "type": "lambda", "purpose": "...", "functionName": "AlphanumericPascalCaseFunctionName", "businessLogic": "1-sentence logic description" },
    { "id": "db1", "type": "dynamodb", "purpose": "...", "tableName": "AlphanumericPascalCaseTable", "primaryKey": "camelCaseKeyId" }
  ],
  "connections": [
    { "from": "api1", "to": "lambda1", "kind": "invokes" },
    { "from": "lambda1", "to": "db1", "kind": "writes" }
  ],
  "reasoning": [
    { "service": "lambda", "reason": "Why Lambda was chosen for this exact prompt" }
  ]
}
Supported node types: api_gateway, lambda, dynamodb, s3, sqs, sns, eventbridge, cognito, cloudwatch, kinesis, step_functions, secrets_manager.
Return raw JSON only, no markdown, no quotes, no code fences.`;
}

/** Normalize an LLM response into a GraphSpec. Throws when unusable. */
function specFromLlm(parsed: any, prompt: string): GraphSpec {
  const rawNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : null;
  if (!rawNodes || rawNodes.length === 0) {
    throw new Error('LLM response missing nodes[]');
  }

  const kept = rawNodes.filter(
    (n: any) => n && typeof n.id === 'string' && isKnownType(String(n.type))
  );
  const lambdaCount = kept.filter((n: any) => n.type === 'lambda').length;
  if (lambdaCount !== 1) {
    throw new Error(`LLM response must contain exactly one lambda node (found ${lambdaCount})`);
  }

  const idToIndex = new Map<string, number>(kept.map((n: any, i: number) => [n.id, i]));
  let connections: GraphSpecConnection[] = (Array.isArray(parsed.connections)
    ? parsed.connections
    : []
  )
    .map((c: any) => ({
      from: idToIndex.get(String(c?.from)),
      to: idToIndex.get(String(c?.to)),
      kind: typeof c?.kind === 'string' ? c.kind : undefined,
    }))
    .filter(
      (c: { from?: number; to?: number }) =>
        typeof c.from === 'number' && typeof c.to === 'number'
    );

  const nodes: GraphSpecNode[] = kept.map((n: any) => ({
    type: String(n.type),
    purpose: typeof n.purpose === 'string' ? n.purpose : undefined,
    method: typeof n.method === 'string' ? n.method : undefined,
    path: typeof n.path === 'string' ? n.path : undefined,
    functionName: typeof n.functionName === 'string' ? n.functionName : undefined,
    businessLogic: typeof n.businessLogic === 'string' ? n.businessLogic : undefined,
    tableName: typeof n.tableName === 'string' ? n.tableName : undefined,
    primaryKey: typeof n.primaryKey === 'string' ? n.primaryKey : undefined,
    resourceName: typeof n.resourceName === 'string' ? n.resourceName : undefined,
  }));

  if (connections.length === 0) {
    connections = defaultConnections(nodes);
  }

  const api = nodes.find((n) => n.type === 'api_gateway');
  const appName =
    parsed?.application?.name || api?.path || 'Serverless Application';

  return {
    application: {
      name: String(parsed?.application?.name || appName),
      description: String(parsed?.application?.description || prompt),
    },
    nodes,
    connections,
    source: 'bedrock',
    reasoning: Array.isArray(parsed?.reasoning) ? parsed.reasoning : undefined,
  };
}

/**
 * Invoke Bedrock (bearer-token path first, then IAM key pair path).
 * Returns parsed JSON or null — callers fall back to the rule engine.
 */
async function invokeBedrock(prompt: string): Promise<any | null> {
  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const hasAccessKeys = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
  const region = process.env.AWS_REGION || 'us-east-1';
  const systemText = buildBedrockSystemPrompt(prompt);

  // 1. Bedrock API Key / Bearer Token (Amazon Nova Pro)
  if (bearerToken) {
    try {
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/amazon.nova-pro-v1:0/invoke`;
      const payload = {
        system: [{ text: systemText }],
        messages: [
          {
            role: 'user',
            content: [{ text: `Generate architecture for: "${prompt}"` }],
          },
        ],
        inferenceConfig: { temperature: 0.1, max_new_tokens: 1500 },
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
      return extractJsonFromText(rawText);
    } catch (err) {
      console.warn('[Bedrock Bearer] Generation failed, trying IAM credentials:', err);
    }
  }

  // 2. AWS IAM Key Pair (Claude 3.5 Sonnet / AWS SDK)
  if (hasAccessKeys) {
    try {
      const client = new BedrockRuntimeClient({ region });
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1500,
        temperature: 0.2,
        messages: [{ role: 'user', content: systemText }],
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
      return extractJsonFromText(rawText);
    } catch (err) {
      console.warn(
        'Bedrock generation failed, falling back to rule engine:',
        err
      );
    }
  }

  return null;
}

export async function generateArchitectureFromPrompt(
  prompt: string
): Promise<GeneratedArchitectureResponse> {
  const parsed = await invokeBedrock(prompt);

  if (parsed) {
    try {
      const spec = specFromLlm(parsed, prompt);
      const built = buildGraphFromSpec(spec);
      const verdict = validateGraph({
        nodes: built.canvasNodes,
        edges: built.canvasEdges,
      });
      if (verdict.valid) {
        return makeResponse(spec, built, prompt);
      }
      console.warn(
        '[Generator] Bedrock graph failed canonical validation, using rule engine:',
        verdict.errors
      );
    } catch (err) {
      console.warn('[Generator] Bedrock response unusable, using rule engine:', err);
    }
  }

  // 3. Fallback heuristic engine (deterministic, always succeeds)
  return fallbackGenerate(prompt);
}
