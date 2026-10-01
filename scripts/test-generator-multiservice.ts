/**
 * Section G #5 + #9 — multi-service generator regression tests.
 *
 * Runs fully offline (Bedrock credentials are stripped from the environment
 * so the deterministic rule engine is exercised — no network calls).
 *
 *   1. Image-processing prompt must yield API Gateway, Lambda, S3,
 *      DynamoDB, SQS, CloudWatch with correct edges/semantics.
 *   2. architecture.nodes must always derive from canvasNodes (the
 *      canvas-vs-teammate contradiction regression).
 *   3. The 8 preset prompts + image prompt fall within loose node bounds.
 */
import {
  generateArchitectureFromPrompt,
  detectServices,
} from '../src/lib/architectureGenerator.ts';
import { validateGraphTopology } from '../src/lib/validator.ts';
import { exportGraphToJson } from '../src/lib/graphExporter.ts';

// Force the offline rule engine — this suite must never touch the network.
delete process.env.AWS_BEARER_TOKEN_BEDROCK;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

let failed = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

const IMAGE_PROMPT =
  'Build an image-processing pipeline. Users upload images to S3, Lambda processes them, metadata is stored in DynamoDB, failures go to SQS, and CloudWatch monitors it.';

const PRESET_PROMPTS = [
  'I want an API where users can create and retrieve their previous orders.',
  'REST API to register new user profiles with secure validation and storage',
  'Webhook endpoint to capture Stripe payment events and record transaction status',
  'Microservice to manage product inventory items with price and SKU count',
  'REST API to create, assign, and track project tasks and issues',
  'Serverless alert system to dispatch email and push notifications',
  'High-throughput endpoint to ingest user analytics and telemetry events',
  'Booking system to manage customer reservations and schedule appointments',
];

async function main() {
  console.log('test-generator-multiservice.ts — offline generation\n');

  // ------------------------------------------------------------------
  // 1. Image pipeline — the primary regression graph
  // ------------------------------------------------------------------
  console.log('[1] Image-processing prompt');
  const img = await generateArchitectureFromPrompt(IMAGE_PROMPT);
  assert(img.success === true, 'generation succeeds');
  assert(
    img.source === 'offline_rule_engine',
    `offline rule engine used (got: ${img.source})`
  );

  const types = img.canvasNodes.map((n) => String(n.type));
  for (const required of [
    'api_gateway',
    'lambda',
    's3',
    'dynamodb',
    'sqs',
    'cloudwatch',
  ]) {
    assert(types.includes(required), `image graph contains ${required}`);
  }
  assert(types.length === 6, `image graph has exactly 6 nodes (got ${types.length})`);

  // Edges well-formed
  const nodeIds = new Set(img.canvasNodes.map((n) => n.id));
  const edgesWellFormed = img.canvasEdges.every(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target
  );
  assert(edgesWellFormed, 'all edges reference existing, distinct nodes');

  // Required edges with semantics (per spec: api->lambda; lambda->s3/ddb/sqs/cw)
  const edgeKind = (from: string, to: string): string | undefined => {
    const edge = img.canvasEdges.find((e) => {
      const s = img.canvasNodes.find((n) => n.id === e.source);
      const t = img.canvasNodes.find((n) => n.id === e.target);
      return String(s?.type) === from && String(t?.type) === to;
    });
    return edge ? ((edge.data as { kind?: string } | undefined)?.kind ?? 'flow') : undefined;
  };
  assert(edgeKind('api_gateway', 'lambda') === 'invokes', 'api_gateway -> lambda kind = invokes');
  assert(edgeKind('lambda', 's3') === 'writes', 'lambda -> s3 kind = writes');
  assert(edgeKind('lambda', 'dynamodb') === 'writes', 'lambda -> dynamodb kind = writes');
  assert(edgeKind('lambda', 'sqs') === 'fails-to', 'lambda -> sqs kind = fails-to (failure sink)');
  assert(edgeKind('lambda', 'cloudwatch') === 'monitors', 'lambda -> cloudwatch kind = monitors');
  assert(img.canvasEdges.length === 5, `image graph has 5 edges (got ${img.canvasEdges.length})`);

  // Teammate schema derives from canvas (regression: they used to contradict)
  assert(
    img.architecture.nodes.length === img.canvasNodes.length &&
      img.architecture.nodes.every((n, i) => n.id === img.canvasNodes[i].id && n.type === String(img.canvasNodes[i].type)),
    'architecture.nodes derives exactly from canvasNodes (ids + types match)'
  );
  assert(
    img.architecture.connections.length === img.canvasEdges.length,
    'architecture.connections derives exactly from canvasEdges'
  );
  assert(
    img.reasoning.length === img.canvasNodes.length,
    'reasoning has one entry per node'
  );

  // Frontend validator accepts it
  const verdict = validateGraphTopology(img.canvasNodes, img.canvasEdges);
  assert(verdict.valid === true, `image graph passes topology validation (${verdict.errors.join('; ') || 'clean'})`);

  // Export reflects the canvas exactly
  const exported = exportGraphToJson(img.canvasNodes, img.canvasEdges, 'proj-test', img.reasoning);
  assert(exported.validation.isValidP0 === true, 'exported image graph is valid');
  assert(
    exported.nodes.length === img.canvasNodes.length &&
      exported.edges.length === img.canvasEdges.length,
    'exported JSON node/edge counts exactly match the canvas graph'
  );
  assert(
    exported.validation.nodeCount === 6 && exported.validation.edgeCount === 5,
    'export validation reports 6 nodes / 5 edges'
  );

  // ------------------------------------------------------------------
  // 2. Orders prompt still yields the classic 3-node API pattern
  // ------------------------------------------------------------------
  console.log('\n[2] Orders prompt (3-node API pattern preserved)');
  const orders = await generateArchitectureFromPrompt(
    'I want an API where users can create orders and save to DB'
  );
  const orderTypes = orders.canvasNodes.map((n) => String(n.type));
  assert(
    orderTypes.length === 3 &&
      orderTypes.includes('api_gateway') &&
      orderTypes.includes('lambda') &&
      orderTypes.includes('dynamodb'),
    `orders prompt yields api_gateway + lambda + dynamodb (got: ${orderTypes.join(', ')})`
  );
  assert(orders.canvasEdges.length === 2, 'orders prompt yields 2 edges');
  assert(orders.reasoning.length === 3, 'orders prompt yields 3 reasoning entries');
  assert(orders.architecture.nodes.length === 3, 'orders teammate schema has 3 nodes');
  const ordersExport = exportGraphToJson(
    orders.canvasNodes,
    orders.canvasEdges,
    'proj-test',
    orders.reasoning
  );
  assert(ordersExport.validation.isValidP0 === true, 'orders graph passes export validation');

  // detectServices no longer collapses to a single downstream type
  console.log('\n[3] Service detection');
  const detected = detectServices(IMAGE_PROMPT);
  assert(
    detected.includes('s3') && detected.includes('dynamodb') && detected.includes('sqs') && detected.includes('cloudwatch'),
    `detectServices finds every service (got: ${detected.join(', ')})`
  );

  // ------------------------------------------------------------------
  // 4. Golden prompt fixtures — loose bounds (Section G #9)
  // ------------------------------------------------------------------
  console.log('\n[4] Preset prompt fixtures (loose bounds)');
  for (const preset of PRESET_PROMPTS) {
    const result = await generateArchitectureFromPrompt(preset);
    const t = result.canvasNodes.map((n) => String(n.type));
    const v = validateGraphTopology(result.canvasNodes, result.canvasEdges);
    const label = preset.slice(0, 42) + '…';
    assert(
      t.length >= 3 && t.length <= 6,
      `${label} → ${t.length} nodes [${t.join(', ')}] within [3,6]`
    );
    assert(t.includes('api_gateway') && t.includes('lambda'), `${label} includes api + lambda`);
    assert(v.valid === true, `${label} valid (${v.errors.join('; ') || 'clean'})`);
  }

  // Image prompt also within bounds
  assert(
    img.canvasNodes.length >= 5 && img.canvasNodes.length <= 7,
    'image prompt node count within [5,7]'
  );

  if (failed > 0) {
    console.error(`\n❌ test-generator-multiservice: ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ test-generator-multiservice: all assertions passed');
}

main().catch((err) => {
  console.error('test-generator-multiservice crashed:', err);
  process.exit(1);
});
