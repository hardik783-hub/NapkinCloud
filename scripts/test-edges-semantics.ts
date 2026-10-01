/**
 * Section G #7 — edge semantics drive SAM wiring.
 *
 * sqs -> lambda (SQS TRIGGERS the Lambda) must compile to an SQS event
 * source mapping, while lambda -> sqs (Lambda WRITES/FAILS-TO the queue)
 * must compile to IAM send policy + QUEUE_URL env — and never an event
 * source. Edge direction, not node presence, decides the wiring.
 *
 * Image pipeline (canonical): S3 -> Lambda [triggers] must compile to an
 * S3 ObjectCreated event trigger with NO API Gateway, and
 * lambda -> sqs [fails-to] must NOT become a normal send path
 * (no SQSSendMessagePolicy / QUEUE_URL) — it wires SAM's native
 * DeadLetterQueue (raw DeadLetterConfig is rejected on
 * AWS::Serverless::Function by CloudFormation).
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

// ---------------------------------------------------------------------------
// Graph C: image pipeline — S3 -> Lambda [triggers], lambda -> dynamodb
// [writes], lambda -> sqs [fails-to], lambda -> cloudwatch [monitors]
// ---------------------------------------------------------------------------
const imageGraph = {
  nodes: [
    { id: 'node-s3-1', type: 's3', data: { resourceName: 'image-uploads' } },
    { id: 'node-lambda-1', type: 'lambda', data: { functionName: 'ProcessImageFunction' } },
    {
      id: 'node-dynamodb-1',
      type: 'dynamodb',
      data: { tableName: 'ImageMetadataTable', primaryKey: 'imageId' },
    },
    { id: 'node-sqs-1', type: 'sqs', data: { resourceName: 'image-failures' } },
    { id: 'node-cloudwatch-1', type: 'cloudwatch', data: { resourceName: 'image-alarm' } },
  ],
  edges: [
    {
      id: 'e1',
      source: 'node-s3-1',
      target: 'node-lambda-1',
      data: { kind: inferEdgeKind('s3', 'lambda', 'triggers') },
    },
    {
      id: 'e2',
      source: 'node-lambda-1',
      target: 'node-dynamodb-1',
      data: { kind: inferEdgeKind('lambda', 'dynamodb') },
    },
    {
      id: 'e3',
      source: 'node-lambda-1',
      target: 'node-sqs-1',
      data: { kind: inferEdgeKind('lambda', 'sqs', 'fails-to') },
    },
    {
      id: 'e4',
      source: 'node-lambda-1',
      target: 'node-cloudwatch-1',
      data: { kind: inferEdgeKind('lambda', 'cloudwatch') },
    },
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
  const imageTemplate = generateSamTemplate(imageGraph);

  const triggerProps = lambdaProps(triggerTemplate);
  const sinkProps = lambdaProps(sinkTemplate);
  const imageProps = lambdaProps(imageTemplate);

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

  // Graph C: canonical image pipeline semantics
  const imageEvents = JSON.stringify(imageProps.Events);
  assert(
    imageEvents.includes('"S3"') && imageEvents.includes('ObjectCreated') &&
      imageEvents.includes('Ref') ,
    'C (s3 -> lambda): S3 ObjectCreated event trigger wired'
  );
  assert(
    !imageEvents.includes('ApiEvent'),
    'C (image pipeline): no ApiEvent — API Gateway stays optional'
  );
  assert(
    !Object.values(imageTemplate.Resources).map((r: any) => r.Type).includes('AWS::Serverless::Api'),
    'C (image pipeline): no API Gateway resource emitted'
  );
  assert(
    JSON.stringify(imageProps.Policies).includes('DynamoDBCrudPolicy'),
    'C (lambda -> dynamodb [writes]): DynamoDBCrudPolicy wired'
  );
  assert(
    !JSON.stringify(imageProps.Policies).includes('SQSSendMessagePolicy') &&
      !imageProps.Environment.Variables.QUEUE_URL &&
      !JSON.stringify(imageProps.Policies).includes('S3CrudPolicy') &&
      !imageProps.Environment.Variables.BUCKET_NAME,
    'C (fails-to / trigger edges): NO SQS send policy, NO QUEUE_URL, NO S3 write path'
  );
  assert(
    imageProps.DeadLetterQueue &&
      imageProps.DeadLetterQueue.Type === 'SQS' &&
      JSON.stringify(imageProps.DeadLetterQueue.TargetArn).includes('NodeSqs1'),
    'C (lambda -> sqs [fails-to]): queue wired as SAM DeadLetterQueue (failure sink)'
  );
  assert(
    !JSON.stringify(imageTemplate.Resources).includes('DeadLetterConfig'),
    'C: no raw DeadLetterConfig on AWS::Serverless::Function (CloudFormation rejects it)'
  );

  if (failed > 0) {
    console.error(`\n❌ test-edges-semantics: ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ test-edges-semantics: all assertions passed');
}

main();
