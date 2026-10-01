/**
 * Section G #7 — edge semantics drive SAM wiring.
 *
 * sqs -> lambda (SQS TRIGGERS the Lambda) must compile to an SQS event
 * source mapping, while lambda -> sqs (Lambda WRITES/FAILS-TO the queue)
 * must compile to IAM send policy + QUEUE_URL env — and never an event
 * source. Edge direction, not node presence, decides the wiring.
 */
import { createRequire } from 'node:module';
import { inferEdgeKind } from '../src/lib/serviceRegistry.ts';
import type { AppNode, AppEdge } from '../src/types/canvas.ts';

const requireCjs = createRequire(import.meta.url);
const { generateSamTemplate } = requireCjs('../backend/src/compiler/samGenerator.js');

let failed = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Graph A: SQS as the TRIGGER (sqs -> lambda), plus lambda -> dynamodb store
// ---------------------------------------------------------------------------
const triggerGraph = {
  nodes: [
    { id: 'q-1', type: 'sqs', data: { resourceName: 'jobs' } },
    { id: 'lambda-1', type: 'lambda', data: { functionName: 'ProcessJobFunction' } },
    { id: 'db-1', type: 'dynamodb', data: { tableName: 'JobsTable', primaryKey: 'jobId' } },
  ],
  edges: [
    { id: 'e1', source: 'q-1', target: 'lambda-1', data: { kind: inferEdgeKind('sqs', 'lambda') } },
    { id: 'e2', source: 'lambda-1', target: 'db-1', data: { kind: inferEdgeKind('lambda', 'dynamodb') } },
  ],
};

// ---------------------------------------------------------------------------
// Graph B: SQS as the SINK (api -> lambda -> sqs)
// ---------------------------------------------------------------------------
const sinkGraph = {
  nodes: [
    { id: 'api-1', type: 'api_gateway', data: { method: 'POST', path: '/jobs' } },
    { id: 'lambda-1', type: 'lambda', data: { functionName: 'EnqueueJobFunction' } },
    { id: 'q-1', type: 'sqs', data: { resourceName: 'jobs' } },
  ],
  edges: [
    { id: 'e1', source: 'api-1', target: 'lambda-1', data: { kind: inferEdgeKind('api_gateway', 'lambda') } },
    { id: 'e2', source: 'lambda-1', target: 'q-1', data: { kind: inferEdgeKind('lambda', 'sqs') } },
  ],
};

function lambdaProps(template: any) {
  return Object.values(template.Resources).find(
    (r: any) => r.Type === 'AWS::Serverless::Function'
  ).Properties;
}

function main() {
  console.log('test-edges-semantics.ts — edge direction/kind drives SAM wiring\n');

  // Edge kind inference
  assert(inferEdgeKind('sqs', 'lambda') === 'triggers', 'sqs -> lambda infers kind "triggers"');
  assert(inferEdgeKind('lambda', 'sqs') === 'writes', 'lambda -> sqs infers kind "writes"');
  assert(
    inferEdgeKind('lambda', 'sqs', 'fails-to') === 'fails-to',
    'explicit "fails-to" kind survives as a tie-breaker'
  );
  assert(inferEdgeKind('api_gateway', 'lambda') === 'invokes', 'api -> lambda infers kind "invokes"');
  assert(inferEdgeKind('lambda', 'cloudwatch') === 'monitors', 'lambda -> cloudwatch infers kind "monitors"');

  const triggerTemplate = generateSamTemplate(triggerGraph);
  const sinkTemplate = generateSamTemplate(sinkGraph);

  const triggerProps = lambdaProps(triggerTemplate);
  const sinkProps = lambdaProps(sinkTemplate);

  // Graph A: SQS event source mapping, no send policy
  const triggerEventsJson = JSON.stringify(triggerProps.Events);
  assert(triggerEventsJson.includes('"SQS"'), 'A (sqs -> lambda): SQS event source mapping wired');
  assert(
    !JSON.stringify(triggerProps.Policies).includes('SQSSendMessagePolicy') &&
      !triggerProps.Environment.Variables.QUEUE_URL,
    'A (sqs -> lambda): NO send policy / QUEUE_URL (Lambda only consumes)'
  );

  // Graph B: no event source, send policy + env present
  const sinkEventsJson = JSON.stringify(sinkProps.Events);
  assert(
    !sinkEventsJson.includes('"SQS"'),
    'B (lambda -> sqs): NO SQS event source mapping (Lambda only produces)'
  );
  assert(
    JSON.stringify(sinkProps.Policies).includes('SQSSendMessagePolicy') &&
      Boolean(sinkProps.Environment.Variables.QUEUE_URL),
    'B (lambda -> sqs): SQSSendMessagePolicy + QUEUE_URL wired'
  );

  // The two templates genuinely differ on the SQS-related wiring
  assert(
    triggerEventsJson !== sinkEventsJson ||
      JSON.stringify(triggerProps.Policies) !== JSON.stringify(sinkProps.Policies),
    'the two graphs produce different SAM wiring (edges matter, not node presence)'
  );

  // Trigger graph must not emit an API resource; sink graph must
  const triggerTypes = Object.values(triggerTemplate.Resources).map((r: any) => r.Type);
  const sinkTypes = Object.values(sinkTemplate.Resources).map((r: any) => r.Type);
  assert(!triggerTypes.includes('AWS::Serverless::Api'), 'A (sqs -> lambda): no API Gateway resource');
  assert(sinkTypes.includes('AWS::Serverless::Api'), 'B (api -> lambda -> sqs): API Gateway resource present');

  if (failed > 0) {
    console.error(`\n❌ test-edges-semantics: ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ test-edges-semantics: all assertions passed');
}

main();
