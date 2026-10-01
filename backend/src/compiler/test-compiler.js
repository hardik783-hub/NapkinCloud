const vm = require("vm");
const { compileArchitecture } = require("./compiler");

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

console.log("test-compiler.js — full compile path (NO deploy)\n");

const ordersGraph = {
  nodes: [
    { id: "api-1", type: "api_gateway", data: { method: "POST", path: "/orders" } },
    {
      id: "lambda-1",
      type: "lambda",
      data: {
        functionName: "CreateOrderFunction",
        businessLogic: "Validates order payload, generates UUID and saves order",
      },
    },
    { id: "db-1", type: "dynamodb", data: { tableName: "OrdersTable", primaryKey: "orderId" } },
  ],
  edges: [
    { source: "api-1", target: "lambda-1" },
    { source: "lambda-1", target: "db-1" },
  ],
};

try {
  const result = compileArchitecture(ordersGraph);
  assert(result.success === true, "valid graph compiles successfully");
  assert(typeof result.templateYaml === "string" && result.templateYaml.includes("AWS::Serverless::Function"),
    "compile returns template YAML containing a SAM function");
  assert(typeof result.handlerJs === "string" && result.handlerJs.includes("exports.handler"),
    "compile returns generated Lambda handler");
  assert(Boolean(result.files && result.files.template && result.files.lambda),
    "compile reports written artifact paths");
} catch (error) {
  assert(false, `valid graph compiles successfully — unexpected throw: ${error.message}`);
}

// Invalid graph must throw (compile fails fast, nothing is deployed).
let threw = false;
try {
  compileArchitecture({
    nodes: [{ id: "a", type: "lambda" }, { id: "b", type: "quantum_db" }],
    edges: [{ source: "a", target: "b" }],
  });
} catch (error) {
  threw = true;
}
assert(threw, "invalid graph rejects compilation with an exception");

// ---------------------------------------------------------------------------
// Image pipeline — full compile (offline; the deployer is never invoked)
// Canonical semantics: S3 -> Lambda [triggers] (no API Gateway),
// lambda -> dynamodb [writes], lambda -> sqs [fails-to],
// lambda -> cloudwatch [monitors].
// ---------------------------------------------------------------------------
const imageGraph = {
  nodes: [
    { id: "node-s3-1", type: "s3", data: { resourceName: "image-uploads" } },
    { id: "node-lambda-1", type: "lambda", data: {
      functionName: "ProcessImageFunction",
      businessLogic: "Processes uploaded images and persists metadata",
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

try {
  const img = compileArchitecture(imageGraph);
  assert(img.success === true, "image pipeline compiles successfully");
  for (const marker of [
    "AWS::Serverless::Function",
    "AWS::S3::Bucket",
    "AWS::DynamoDB::Table",
    "AWS::SQS::Queue",
    "AWS::CloudWatch::Alarm",
  ]) {
    assert(img.templateYaml.includes(marker), `image pipeline template contains ${marker}`);
  }
  assert(
    !img.templateYaml.includes("AWS::Serverless::Api"),
    "image pipeline template has NO API Gateway (S3 triggers Lambda directly)"
  );
  assert(
    img.templateYaml.includes("NodeS31Trigger") && img.templateYaml.includes("ObjectCreated"),
    "S3 -> Lambda compiles to an S3 ObjectCreated event trigger"
  );
  assert(
    img.templateYaml.includes("DeadLetterQueue:") &&
      img.templateYaml.includes("Type: SQS") &&
      !img.templateYaml.includes("DeadLetterConfig"),
    "lambda -> sqs [fails-to] compiles to SAM DeadLetterQueue (not raw DeadLetterConfig, not a send path)"
  );
  assert(
    !img.templateYaml.includes("SQSSendMessagePolicy") &&
      !img.templateYaml.includes("QUEUE_URL"),
    "failure-sink edge grants NO SQS send policy / QUEUE_URL"
  );
  assert(
    !img.templateYaml.includes("OrdersApi:") &&
      !img.templateYaml.includes("CreateOrderFunction") &&
      !img.templateYaml.includes("  OrdersTable:"),
    "image pipeline template has no hard-coded Orders identifiers"
  );
  assert(
    img.handlerJs.includes("async function handleEvent") &&
      !img.handlerJs.includes("SendMessageCommand") &&
      !img.handlerJs.includes("S3Client"),
    "image handler consumes S3 events (handleEvent) with no SQS send / S3 write path"
  );
  try {
    new vm.Script(img.handlerJs, { filename: "index.js" });
    assert(true, "image pipeline handler parses successfully");
  } catch (err) {
    assert(false, `image pipeline handler parses successfully — ${err.message}`);
  }
} catch (error) {
  assert(false, `image pipeline compiles successfully — unexpected throw: ${error.message}`);
}

// ---------------------------------------------------------------------------
// S3/SQS architecture with NO DynamoDB — no table, no DynamoDB Lambda code
// ---------------------------------------------------------------------------
const noDynamoGraph = {
  nodes: [
    { id: "node-api-1", type: "api_gateway", data: { method: "POST", path: "/upload" } },
    { id: "node-lambda-1", type: "lambda", data: { functionName: "UploadFileFunction" } },
    { id: "node-s3-1", type: "s3", data: { resourceName: "uploads-bucket" } },
    { id: "node-sqs-1", type: "sqs", data: { resourceName: "upload-jobs" } },
  ],
  edges: [
    { source: "node-api-1", target: "node-lambda-1" },
    { source: "node-lambda-1", target: "node-s3-1" },
    { source: "node-lambda-1", target: "node-sqs-1" },
  ],
};

try {
  const nd = compileArchitecture(noDynamoGraph);
  assert(nd.success === true, "S3/SQS (no-DynamoDB) graph compiles successfully");
  assert(
    !nd.templateYaml.includes("AWS::DynamoDB::Table"),
    "S3/SQS template contains NO DynamoDB resource"
  );
  assert(
    !nd.handlerJs.includes("DynamoDBClient") &&
      !nd.handlerJs.includes("ScanCommand") &&
      !nd.handlerJs.includes("TABLE_NAME"),
    "S3/SQS handler contains NO DynamoDB Lambda code"
  );
  try {
    new vm.Script(nd.handlerJs, { filename: "index.js" });
    assert(true, "S3/SQS handler parses successfully");
  } catch (err) {
    assert(false, `S3/SQS handler parses successfully — ${err.message}`);
  }
} catch (error) {
  assert(false, `S3/SQS (no-DynamoDB) graph compiles successfully — unexpected throw: ${error.message}`);
}

if (failed > 0) {
  console.error(`\n❌ test-compiler: ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test-compiler: all assertions passed");
