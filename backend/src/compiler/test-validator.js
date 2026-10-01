const { validateGraph } = require("./validator");

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

console.log("test-validator.js — backend graph validator\n");

// 1. Canonical valid P0 graph: API -> Lambda -> DynamoDB
const validGraph = {
  nodes: [
    { id: "api-1", type: "api_gateway", data: { method: "POST", path: "/orders" } },
    { id: "lambda-1", type: "lambda", data: { functionName: "CreateOrderFunction" } },
    { id: "db-1", type: "dynamodb", data: { tableName: "OrdersTable", primaryKey: "orderId" } },
  ],
  edges: [
    { source: "api-1", target: "lambda-1" },
    { source: "lambda-1", target: "db-1" },
  ],
};

const valid = validateGraph(validGraph);
assert(valid.valid === true, "valid API -> Lambda -> DynamoDB graph accepted");
assert(Array.isArray(valid.errors) && valid.errors.length === 0, "valid graph returns zero errors");

// 2. Structural failures
assert(validateGraph(null).valid === false, "null graph rejected");
assert(validateGraph({ nodes: "nope", edges: [] }).valid === false, "non-array nodes rejected");

const dupId = validateGraph({
  nodes: [
    { id: "x", type: "lambda" },
    { id: "x", type: "dynamodb" },
  ],
  edges: [],
});
assert(dupId.valid === false, "duplicate node ids rejected");

const badType = validateGraph({
  nodes: [
    { id: "a", type: "lambda" },
    { id: "b", type: "quantum_db" },
  ],
  edges: [{ source: "a", target: "b" }],
});
assert(badType.valid === false, "unsupported node type rejected");

const orphan = validateGraph({
  nodes: [
    { id: "a", type: "lambda" },
    { id: "b", type: "dynamodb" },
  ],
  edges: [{ source: "a", target: "ghost" }],
});
assert(orphan.valid === false, "orphan edge referencing unknown node rejected");

const noId = validateGraph({ nodes: [{ type: "lambda" }], edges: [] });
assert(noId.valid === false, "node without id rejected");

// 3. Event-triggered architecture WITHOUT API Gateway is valid (approved policy decision)
const eventTriggered = validateGraph({
  nodes: [
    { id: "q-1", type: "sqs" },
    { id: "lambda-1", type: "lambda" },
  ],
  edges: [{ source: "q-1", target: "lambda-1" }],
});
assert(
  eventTriggered.valid === true,
  "event-triggered SQS -> Lambda graph valid without API Gateway"
);

// 4. Topology rules (now enforced by the canonical shared rule set)
const twoApis = validateGraph({
  nodes: [
    { id: "api-1", type: "api_gateway" },
    { id: "api-2", type: "api_gateway" },
    { id: "lambda-1", type: "lambda" },
    { id: "db-1", type: "dynamodb" },
  ],
  edges: [
    { source: "api-1", target: "lambda-1" },
    { source: "lambda-1", target: "db-1" },
    { source: "api-2", target: "lambda-1" },
  ],
});
assert(twoApis.valid === false, "two API gateways rejected");

const noLambda = validateGraph({
  nodes: [
    { id: "api-1", type: "api_gateway" },
    { id: "db-1", type: "dynamodb" },
  ],
  edges: [{ source: "api-1", target: "db-1" }],
});
assert(noLambda.valid === false, "graph without Lambda rejected");

const apiNotWired = validateGraph({
  nodes: [
    { id: "api-1", type: "api_gateway" },
    { id: "lambda-1", type: "lambda" },
    { id: "db-1", type: "dynamodb" },
  ],
  edges: [
    { source: "lambda-1", target: "db-1" },
    { source: "api-1", target: "db-1" },
  ],
});
assert(apiNotWired.valid === false, "API Gateway present but not wired to Lambda rejected");

const isolated = validateGraph({
  nodes: [
    { id: "api-1", type: "api_gateway" },
    { id: "lambda-1", type: "lambda" },
    { id: "db-1", type: "dynamodb" },
    { id: "q-1", type: "sqs" },
  ],
  edges: [
    { source: "api-1", target: "lambda-1" },
    { source: "lambda-1", target: "db-1" },
  ],
});
assert(isolated.valid === false, "isolated node (orphan component) rejected");

const storeNoIncoming = validateGraph({
  nodes: [
    { id: "api-1", type: "api_gateway" },
    { id: "lambda-1", type: "lambda" },
    { id: "db-1", type: "dynamodb" },
  ],
  edges: [
    { source: "api-1", target: "lambda-1" },
    { source: "db-1", target: "lambda-1" },
  ],
});
assert(storeNoIncoming.valid === false, "storage node with no incoming edge rejected");

const apiOnly = validateGraph({
  nodes: [
    { id: "api-1", type: "api_gateway" },
    { id: "lambda-1", type: "lambda" },
  ],
  edges: [{ source: "api-1", target: "lambda-1" }],
});
assert(apiOnly.valid === false, "API + Lambda with no downstream service rejected");

// 5. Multi-service image pipeline graph is valid (canonical regression graph)
//    Legacy API-shaped variant: API -> Lambda, lambda -> X everywhere.
const imagePipeline = validateGraph({
  nodes: [
    { id: "node-api-1", type: "api_gateway" },
    { id: "node-lambda-1", type: "lambda" },
    { id: "node-s3-1", type: "s3" },
    { id: "node-dynamodb-1", type: "dynamodb" },
    { id: "node-sqs-1", type: "sqs" },
    { id: "node-cloudwatch-1", type: "cloudwatch" },
  ],
  edges: [
    { source: "node-api-1", target: "node-lambda-1" },
    { source: "node-lambda-1", target: "node-s3-1" },
    { source: "node-lambda-1", target: "node-dynamodb-1" },
    { source: "node-lambda-1", target: "node-sqs-1" },
    { source: "node-lambda-1", target: "node-cloudwatch-1" },
  ],
});
assert(imagePipeline.valid === true, "6-service image pipeline graph (API, Lambda, S3, DynamoDB, SQS, CloudWatch) accepted");
assert(
  imagePipeline.roles &&
    imagePipeline.roles.stores.length === 2 &&
    imagePipeline.roles.queues.length === 1 &&
    imagePipeline.roles.monitors.length === 1,
  "role map classifies stores/queues/monitors correctly"
);

// 6. Canonical image pipeline: S3 -> Lambda [triggers] with NO API Gateway
const canonicalImagePipeline = validateGraph({
  nodes: [
    { id: "node-s3-1", type: "s3" },
    { id: "node-lambda-1", type: "lambda" },
    { id: "node-dynamodb-1", type: "dynamodb" },
    { id: "node-sqs-1", type: "sqs" },
    { id: "node-cloudwatch-1", type: "cloudwatch" },
  ],
  edges: [
    { source: "node-s3-1", target: "node-lambda-1", data: { kind: "triggers" } },
    { source: "node-lambda-1", target: "node-dynamodb-1", data: { kind: "writes" } },
    { source: "node-lambda-1", target: "node-sqs-1", data: { kind: "fails-to" } },
    { source: "node-lambda-1", target: "node-cloudwatch-1", data: { kind: "monitors" } },
  ],
});
assert(
  canonicalImagePipeline.valid === true,
  "canonical image pipeline (S3 -> Lambda [triggers], no API Gateway) accepted"
);

if (failed > 0) {
  console.error(`\n❌ test-validator: ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\n✅ test-validator: all assertions passed");
