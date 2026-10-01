const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { generateLambdaCode } = require("./lambdaGenerator");

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function assertParses(code, label) {
  try {
    new vm.Script(code, { filename: "index.js" });
    assert(true, `${label}: generated handler parses successfully`);
  } catch (err) {
    assert(false, `${label}: generated handler parses successfully — ${err.message}`);
  }
}

console.log("test-lambda-generator.js — graph-driven Lambda handler generation\n");

// ---------------------------------------------------------------------------
// 1. Orders-shaped graph (DynamoDB bound)
// ---------------------------------------------------------------------------
const ordersGraph = {
  nodes: [
    { id: "lambda-1", type: "lambda", data: {
      functionName: "CreateOrderFunction",
      businessLogic: "Validates order payload, generates UUID and saves order",
    } },
    { id: "db-1", type: "dynamodb", data: { tableName: "OrdersTable", primaryKey: "orderId" } },
  ],
  edges: [{ source: "lambda-1", target: "db-1" }],
};

const ordersCode = generateLambdaCode(ordersGraph);
assert(typeof ordersCode === "string" && ordersCode.length > 0, "orders handler generated");
assert(ordersCode.includes("exports.handler"), "exports a handler function");
assert(ordersCode.includes("@aws-sdk/lib-dynamodb"), "imports DynamoDB DocumentClient (graph HAS DynamoDB)");
assert(ordersCode.includes("PutCommand"), "uses PutCommand for persisting items");
assert(ordersCode.includes("Access-Control-Allow-Origin"), "sets CORS headers");
assert(ordersCode.includes('"orderId"'), "uses the graph's partition key (orderId)");
assert(
  !ordersCode.includes("\\nconst"),
  "no literal backslash-n sequences leaking into generated source"
);
assertParses(ordersCode, "orders graph");

// ---------------------------------------------------------------------------
// 2. S3-only graph with NO DynamoDB — zero DynamoDB code may be generated
// ---------------------------------------------------------------------------
const s3Graph = {
  nodes: [
    { id: "lambda-1", type: "lambda", data: { functionName: "UploadFileFunction" } },
    { id: "bucket-1", type: "s3", data: { resourceName: "uploads-bucket" } },
  ],
  edges: [{ source: "lambda-1", target: "bucket-1" }],
};

const s3Code = generateLambdaCode(s3Graph);
assert(s3Code.includes("S3Client"), "S3-only handler imports S3Client");
assert(s3Code.includes("BUCKET_NAME"), "S3-only handler writes to BUCKET_NAME");
assert(!s3Code.includes("DynamoDBClient"), "S3-only handler has NO DynamoDBClient import");
assert(!s3Code.includes("lib-dynamodb"), "S3-only handler has NO @aws-sdk/lib-dynamodb import");
assert(!s3Code.includes("ScanCommand"), "S3-only handler has NO ScanCommand");
assert(!s3Code.includes("TABLE_NAME"), "S3-only handler never references TABLE_NAME");
assert(
  s3Code.includes("ListObjectsV2Command"),
  "S3-only GET branch reads from S3 (graph-aware read path)"
);
assertParses(s3Code, "S3-only graph");

// ---------------------------------------------------------------------------
// 3. Image pipeline graph — imports/actions derived from edges
// Canonical: S3 -> Lambda [triggers] (no API), lambda -> dynamodb [writes],
// lambda -> sqs [fails-to], lambda -> cloudwatch [monitors].
// ---------------------------------------------------------------------------
const imageGraph = {
  nodes: [
    { id: "node-s3-1", type: "s3", data: { resourceName: "image-uploads" } },
    { id: "node-lambda-1", type: "lambda", data: {
      functionName: "ProcessImageFunction",
      businessLogic: "Processes uploaded images\nand persists metadata",
    } },
    { id: "node-dynamodb-1", type: "dynamodb", data: { tableName: "ImageMetadataTable", primaryKey: "imageId" } },
    { id: "node-sqs-1", type: "sqs", data: { resourceName: "image-failures" } },
    { id: "node-cloudwatch-1", type: "cloudwatch", data: { resourceName: "image-alarm" } },
  ],
  edges: [
    { source: "node-s3-1", target: "node-lambda-1", data: { kind: "triggers" } },
    { source: "node-lambda-1", target: "node-dynamodb-1", data: { kind: "writes" } },
    { source: "node-lambda-1", target: "node-sqs-1", data: { kind: "fails-to" } },
    { source: "node-lambda-1", target: "node-cloudwatch-1", data: { kind: "monitors" } },
  ],
};

const imageCode = generateLambdaCode(imageGraph);
assert(imageCode.includes("DynamoDBDocumentClient"), "image handler imports DynamoDB (lambda -> dynamodb writes)");
assert(imageCode.includes("async function handleEvent"),
  "S3 -> Lambda trigger adds an event-processing path (handleEvent)");
assert(!imageCode.includes("S3Client"),
  "image handler has NO S3 client — S3 is the trigger source, not a write target");
assert(!imageCode.includes("SQSClient") && !imageCode.includes("SendMessageCommand"),
  "image handler has NO SQS send path — lambda -> sqs [fails-to] is a failure sink");
assert(imageCode.includes("dead-letter queue") && imageCode.includes("DeadLetterQueue"),
  "failure-sink semantics preserved via DeadLetterQueue note in the handler");
assert(!imageCode.includes("SNSClient"), "image handler has NO SNS import (no sns node)");
assert(!imageCode.includes("EventBridgeClient"), "image handler has NO EventBridge import (no eventbridge node)");
assert(imageCode.includes('"imageId"'), "image handler uses the graph's partition key (imageId)");
assert(imageCode.includes("ProcessImageFunction"), "image handler names the graph's function");
assert(
  imageCode.includes("Processes uploaded images and persists metadata"),
  "multi-line business logic is sanitized to a single comment line"
);
assertParses(imageCode, "image pipeline graph");

// ---------------------------------------------------------------------------
// 4. Event-triggered graph (SQS -> Lambda) gets an event-processing path
// ---------------------------------------------------------------------------
const triggerGraph = {
  nodes: [
    { id: "q-1", type: "sqs", data: { resourceName: "jobs" } },
    { id: "lambda-1", type: "lambda", data: { functionName: "ProcessJobFunction" } },
    { id: "db-1", type: "dynamodb", data: { tableName: "JobsTable", primaryKey: "jobId" } },
  ],
  edges: [
    { source: "q-1", target: "lambda-1" },
    { source: "lambda-1", target: "db-1" },
  ],
};

const triggerCode = generateLambdaCode(triggerGraph);
assert(triggerCode.includes("async function handleEvent"), "SQS-triggered handler defines handleEvent()");
assert(triggerCode.includes("event.Records") || triggerCode.includes("(event && event.Records)"),
  "event handler iterates incoming records");
assert(!triggerCode.includes("SQSClient"),
  "trigger-only SQS consumption needs no SQS client (event source mapping delivers)");
assertParses(triggerCode, "SQS -> Lambda trigger graph");

// ---------------------------------------------------------------------------
// Write the image-pipeline handler artifact for inspection
// ---------------------------------------------------------------------------
const outputDir = path.join(__dirname, "../../../infrastructure/functions/generated");
const outputFile = path.join(outputDir, "index.js");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, imageCode);
console.log(`\n  📄 wrote image-pipeline handler to ${outputFile}`);

if (failed > 0) {
  console.error(`\n❌ test-lambda-generator: ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test-lambda-generator: all assertions passed");
