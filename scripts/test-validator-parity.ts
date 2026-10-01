/**
 * Section G #6 — validator parity regression test (RC2).
 *
 * The same fixture graphs are fed through:
 *   1. frontend  validateGraphTopology()   (src/lib/validator.ts)
 *   2. export    exportGraphToJson().validation (src/lib/graphExporter.ts)
 *   3. backend   validateGraph()           (backend/src/compiler/validator.js)
 *
 * All three delegate to the canonical shared rule set, so their verdicts
 * (and error lists) must be byte-identical.
 */
import { createRequire } from 'node:module';
import { validateGraphTopology } from '../src/lib/validator.ts';
import { exportGraphToJson } from '../src/lib/graphExporter.ts';
import type { AppNode, AppEdge } from '../src/types/canvas.ts';

const requireCjs = createRequire(import.meta.url);
const backendValidator = requireCjs('../backend/src/compiler/validator.js');

let failed = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

type Fixture = {
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
};

const ordersGraph: Fixture = {
  name: 'valid orders (api -> lambda -> dynamodb)',
  nodes: [
    { id: 'node-api-1', type: 'api_gateway', position: { x: 0, y: 0 }, data: { label: 'API Gateway', method: 'POST', path: '/orders', status: 'draft' } } as AppNode,
    { id: 'node-lambda-1', type: 'lambda', position: { x: 1, y: 0 }, data: { label: 'Lambda', functionName: 'CreateOrderFunction', runtime: 'nodejs20.x', businessLogic: 'Saves orders', status: 'draft' } } as AppNode,
    { id: 'node-dynamodb-1', type: 'dynamodb', position: { x: 2, y: 0 }, data: { label: 'DynamoDB', tableName: 'OrdersTable', primaryKey: 'orderId', status: 'draft' } } as AppNode,
  ],
  edges: [
    { id: 'e1', source: 'node-api-1', target: 'node-lambda-1' },
    { id: 'e2', source: 'node-lambda-1', target: 'node-dynamodb-1' },
  ] as AppEdge[],
};

const imagePipelineGraph: Fixture = {
  name: 'valid image pipeline (5 services, S3 triggers Lambda, no API Gateway)',
  nodes: [
    { id: 'node-s3-1', type: 's3', position: { x: 0, y: 0 }, data: { label: 'AWS S3 Bucket', serviceType: 's3', resourceName: 'image-uploads', status: 'draft' } } as AppNode,
    { id: 'node-lambda-1', type: 'lambda', position: { x: 1, y: 0 }, data: { label: 'Lambda', functionName: 'ProcessImageFunction', runtime: 'nodejs20.x', businessLogic: 'Processes images', status: 'draft' } } as AppNode,
    { id: 'node-dynamodb-1', type: 'dynamodb', position: { x: 2, y: 0 }, data: { label: 'DynamoDB', tableName: 'ImageMetadataTable', primaryKey: 'imageId', status: 'draft' } } as AppNode,
    { id: 'node-sqs-1', type: 'sqs', position: { x: 3, y: 0 }, data: { label: 'AWS SQS Queue', serviceType: 'sqs', resourceName: 'image-failures', status: 'draft' } } as AppNode,
    { id: 'node-cloudwatch-1', type: 'cloudwatch', position: { x: 4, y: 0 }, data: { label: 'CloudWatch', serviceType: 'cloudwatch', resourceName: 'image-alarm', status: 'draft' } } as AppNode,
  ],
  edges: [
    { id: 'e1', source: 'node-s3-1', target: 'node-lambda-1', data: { kind: 'triggers' } },
    { id: 'e2', source: 'node-lambda-1', target: 'node-dynamodb-1', data: { kind: 'writes' } },
    { id: 'e3', source: 'node-lambda-1', target: 'node-sqs-1', data: { kind: 'fails-to' } },
    { id: 'e4', source: 'node-lambda-1', target: 'node-cloudwatch-1', data: { kind: 'monitors' } },
  ] as AppEdge[],
};

const bareSqsTriggerGraph: Fixture = {
  name: 'valid event-triggered SQS -> Lambda (no API Gateway)',
  nodes: [
    { id: 'q-1', type: 'sqs', position: { x: 0, y: 0 }, data: { label: 'AWS SQS Queue', serviceType: 'sqs', resourceName: 'jobs', status: 'draft' } } as AppNode,
    { id: 'lambda-1', type: 'lambda', position: { x: 1, y: 0 }, data: { label: 'Lambda', functionName: 'ProcessJobFunction', runtime: 'nodejs20.x', businessLogic: 'Processes jobs', status: 'draft' } } as AppNode,
    { id: 'db-1', type: 'dynamodb', position: { x: 2, y: 0 }, data: { label: 'DynamoDB', tableName: 'JobsTable', primaryKey: 'jobId', status: 'draft' } } as AppNode,
  ],
  edges: [
    { id: 'e1', source: 'q-1', target: 'lambda-1' },
    { id: 'e2', source: 'lambda-1', target: 'db-1' },
  ] as AppEdge[],
};

const orphanEdgeGraph: Fixture = {
  name: 'invalid: orphan edge + isolated node',
  nodes: ordersGraph.nodes,
  edges: [
    { id: 'e1', source: 'node-api-1', target: 'node-lambda-1' },
    { id: 'e2', source: 'node-lambda-1', target: 'node-dynamodb-1' },
    { id: 'e3', source: 'node-api-1', target: 'ghost-node' },
    { id: 'e4', source: 'node-dynamodb-1', target: 'node-api-1' },
  ] as AppEdge[],
};

const twoApisGraph: Fixture = {
  name: 'invalid: two API gateways',
  nodes: [
    ...ordersGraph.nodes,
    { id: 'node-api-2', type: 'api_gateway', position: { x: 0, y: 1 }, data: { label: 'API Gateway', method: 'GET', path: '/other', status: 'draft' } } as AppNode,
  ],
  edges: [
    { id: 'e1', source: 'node-api-1', target: 'node-lambda-1' },
    { id: 'e2', source: 'node-lambda-1', target: 'node-dynamodb-1' },
    { id: 'e3', source: 'node-api-2', target: 'node-lambda-1' },
  ] as AppEdge[],
};

const unsupportedTypeGraph: Fixture = {
  name: 'invalid: unsupported node type',
  nodes: [
    { id: 'a', type: 'quantum_db', position: { x: 0, y: 0 }, data: { label: 'Nope', status: 'draft' } } as unknown as AppNode,
    { id: 'b', type: 'lambda', position: { x: 1, y: 0 }, data: { label: 'Lambda', functionName: 'F', runtime: 'nodejs20.x', businessLogic: 'x', status: 'draft' } } as AppNode,
  ],
  edges: [{ id: 'e1', source: 'a', target: 'b' }] as AppEdge[],
};

const apiWithoutLambdaWiring: Fixture = {
  name: 'invalid: API present but not wired to Lambda',
  nodes: ordersGraph.nodes,
  edges: [
    { id: 'e1', source: 'node-api-1', target: 'node-dynamodb-1' },
    { id: 'e2', source: 'node-lambda-1', target: 'node-dynamodb-1' },
  ] as AppEdge[],
};

const fixtures: Fixture[] = [
  ordersGraph,
  imagePipelineGraph,
  bareSqsTriggerGraph,
  orphanEdgeGraph,
  twoApisGraph,
  unsupportedTypeGraph,
  apiWithoutLambdaWiring,
];

function main() {
  console.log('test-validator-parity.ts — frontend vs export vs backend verdicts\n');

  for (const fixture of fixtures) {
    const fe = validateGraphTopology(fixture.nodes, fixture.edges);
    const be = backendValidator.validateGraph({ nodes: fixture.nodes, edges: fixture.edges });
    const exported = exportGraphToJson(fixture.nodes, fixture.edges, 'proj-parity');

    const feErrors = JSON.stringify(fe.errors);
    const beErrors = JSON.stringify(be.errors);
    const exportErrors = JSON.stringify(exported.validation.errors);

    assert(
      fe.valid === be.valid && fe.valid === exported.validation.isValidP0,
      `${fixture.name}: verdicts agree (valid=${fe.valid})`
    );
    assert(
      feErrors === beErrors && feErrors === exportErrors,
      `${fixture.name}: error lists are identical`
    );
    assert(
      exported.validation.nodeCount === fixture.nodes.length &&
        exported.validation.edgeCount === fixture.edges.length,
      `${fixture.name}: export counts match canvas (${fixture.nodes.length}/${fixture.edges.length})`
    );
  }

  // The role map exists on the frontend verdict for valid graphs (type-lie fix)
  const roles = validateGraphTopology(ordersGraph.nodes, ordersGraph.edges).roles;
  assert(
    Boolean(roles && roles.entries.length === 1 && roles.compute.length === 1 && roles.stores.length === 1),
    'role map replaces the old nodes.dynamodb type lie'
  );

  if (failed > 0) {
    console.error(`\n❌ test-validator-parity: ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ test-validator-parity: all assertions passed');
}

main();
