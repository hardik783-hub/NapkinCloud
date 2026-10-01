const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const { generateSamTemplate } = require("./samGenerator");

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function resourceTypes(template) {
  return Object.values(template.Resources).map((r) => r.Type);
}

console.log("test-generator.js — graph-driven SAM template generation\n");

// ---------------------------------------------------------------------------
// 1. Orders-shaped graph still compiles — but WITHOUT hard-coded Orders IDs
// ---------------------------------------------------------------------------
const ordersGraph = {
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

const template = generateSamTemplate(ordersGraph);
const ordersResourceIds = Object.keys(template.Resources);

assert(Boolean(template.Resources), "template contains Resources");
assert(
  resourceTypes(template).includes("AWS::Serverless::Api"),
  "emits API Gateway resource for graph WITH api_gateway node"
);
assert(
  resourceTypes(template).includes("AWS::Serverless::Function"),
  "emits Lambda function resource"
);
assert(
  resourceTypes(template).includes("AWS::DynamoDB::Table"),
  "emits DynamoDB table for graph WITH DynamoDB node"
);
assert(Boolean(template.Outputs && template.Outputs.ApiUrl), "exports ApiUrl output");
assert(
  Boolean(template.Outputs.TableName),
  "exports generic TableName output when a table exists"
);
assert(
  template.Outputs.OrdersTableName === undefined,
  "stale OrdersTableName output is no longer emitted"
);

// Hard-coded Orders logical IDs are gone — IDs derive from node ids.
assert(
  !ordersResourceIds.includes("OrdersApi") &&
    !ordersResourceIds.includes("CreateOrderFunction") &&
    !ordersResourceIds.includes("OrdersTable"),
  `logical IDs derive from node ids (${ordersResourceIds.join(", ")}) — no OrdersApi/CreateOrderFunction/OrdersTable literals`
);
assert(
  JSON.stringify(template.Outputs.ApiUrl).includes("/orders"),
  "orders graph ApiUrl reflects the node's own path (/orders)"
);

// Edge-driven wiring: lambda -> dynamodb grants TABLE_NAME + CRUD policy
const lambdaProps = Object.values(template.Resources).find(
  (r) => r.Type === "AWS::Serverless::Function"
).Properties;
assert(
  Boolean(lambdaProps.Environment.Variables.TABLE_NAME),
  "TABLE_NAME env granted (lambda -> dynamodb edge present)"
);
assert(
  JSON.stringify(lambdaProps.Policies).includes("DynamoDBCrudPolicy"),
  "DynamoDBCrudPolicy attached (lambda -> dynamodb edge present)"
);

// ---------------------------------------------------------------------------
// 2. Phantom-table bug is FIXED: no DynamoDB node -> no table resource
// ---------------------------------------------------------------------------
const sqsOnlyGraph = {
  nodes: [
    { id: "api-1", type: "api_gateway", data: { method: "POST", path: "/jobs" } },
    { id: "lambda-1", type: "lambda", data: { functionName: "HandleJobFunction" } },
    { id: "q-1", type: "sqs", data: { resourceName: "app-queue" } },
  ],
  edges: [
    { source: "api-1", target: "lambda-1" },
    { source: "lambda-1", target: "q-1" },
  ],
};

const sqsTemplate = generateSamTemplate(sqsOnlyGraph);
assert(
  !sqsTemplate.Resources.OrdersTable &&
    !resourceTypes(sqsTemplate).includes("AWS::DynamoDB::Table"),
  "FIXED: no phantom DynamoDB table for a graph without a dynamodb node"
);
assert(
  resourceTypes(sqsTemplate).includes("AWS::SQS::Queue"),
  "SQS queue resource emitted for sqs node"
);
assert(
  !JSON.stringify(sqsTemplate.Outputs.ApiUrl).includes("/orders"),
  "API path derives from the node (not the /orders default)"
);

// ---------------------------------------------------------------------------
// 3. S3-only architecture with NO DynamoDB
// ---------------------------------------------------------------------------
const s3Graph = {
  nodes: [
    { id: "api-1", type: "api_gateway", data: { method: "POST", path: "/upload" } },
    { id: "lambda-1", type: "lambda", data: { functionName: "UploadFileFunction" } },
    { id: "bucket-1", type: "s3", data: { resourceName: "uploads-bucket" } },
  ],
  edges: [
    { source: "api-1", target: "lambda-1" },
    { source: "lambda-1", target: "bucket-1" },
  ],
};

const s3Template = generateSamTemplate(s3Graph);
assert(
  !resourceTypes(s3Template).includes("AWS::DynamoDB::Table"),
  "S3-only graph creates NO DynamoDB resource"
);
assert(
  resourceTypes(s3Template).includes("AWS::S3::Bucket"),
  "S3 bucket resource emitted"
);
const s3LambdaProps = Object.values(s3Template.Resources).find(
  (r) => r.Type === "AWS::Serverless::Function"
).Properties;
assert(
  Boolean(s3LambdaProps.Environment.Variables.BUCKET_NAME) &&
    !s3LambdaProps.Environment.Variables.TABLE_NAME,
  "S3-only Lambda gets BUCKET_NAME env and NO TABLE_NAME env"
);

// ---------------------------------------------------------------------------
// 4. Image pipeline golden (Section G #10)
// Canonical semantics: S3 -> Lambda [triggers] (NO API Gateway),
// lambda -> dynamodb [writes], lambda -> sqs [fails-to],
// lambda -> cloudwatch [monitors].
// ---------------------------------------------------------------------------
const imageGraph = {
  nodes: [
    { id: "node-s3-1", type: "s3", data: { resourceName: "image-uploads" } },
    {
      id: "node-lambda-1",
      type: "lambda",
      data: {
        functionName: "ProcessImageFunction",
        businessLogic: "Processes uploaded images and persists metadata",
      },
    },
    {
      id: "node-dynamodb-1",
      type: "dynamodb",
      data: { tableName: "ImageMetadataTable", primaryKey: "imageId" },
    },
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

const imageTemplate = generateSamTemplate(imageGraph);
const imageTypes = resourceTypes(imageTemplate);
for (const required of [
  "AWS::Serverless::Function",
  "AWS::S3::Bucket",
  "AWS::DynamoDB::Table",
  "AWS::SQS::Queue",
  "AWS::CloudWatch::Alarm",
]) {
  assert(imageTypes.includes(required), `image pipeline template contains ${required}`);
}
assert(
  !imageTypes.includes("AWS::Serverless::Api"),
  "image pipeline has NO API Gateway resource (event-triggered graph)"
);
assert(!imageTemplate.Outputs.ApiUrl, "image pipeline exports no ApiUrl (no API node)");

const imageResourceIds = Object.keys(imageTemplate.Resources);
assert(
  ["NodeS31", "NodeLambda1", "NodeDynamodb1", "NodeSqs1", "NodeCloudwatch1"].every(
    (id) => imageResourceIds.includes(id)
  ),
  `image pipeline logical IDs derive from node ids (${imageResourceIds.join(", ")})`
);

// Requirement 6: S3 -> Lambda must emit an S3 Lambda event trigger.
const imageEvents = imageTemplate.Resources.NodeLambda1.Properties.Events;
assert(Boolean(imageEvents.NodeS31Trigger), "S3 -> Lambda emits an S3 trigger event source");
assert(
  imageEvents.NodeS31Trigger &&
    imageEvents.NodeS31Trigger.Type === "S3" &&
    JSON.stringify(imageEvents.NodeS31Trigger.Properties.Bucket) === JSON.stringify({ Ref: "NodeS31" }) &&
    imageEvents.NodeS31Trigger.Properties.Events === "s3:ObjectCreated:*",
  "S3 trigger binds the graph's bucket (Ref NodeS31) with s3:ObjectCreated:*"
);
assert(
  !imageEvents.ApiEvent,
  "image pipeline Lambda has NO ApiEvent (no API Gateway -> Lambda edge)"
);

for (const outputKey of [
  "LambdaFunctionName",
  "BucketName",
  "TableName",
  "QueueUrl",
  "AlarmName",
]) {
  assert(Boolean(imageTemplate.Outputs[outputKey]), `image pipeline exports ${outputKey}`);
}
assert(
  imageTemplate.Outputs.TableName !== undefined &&
    imageTemplate.Outputs.OrdersTableName === undefined,
  "image pipeline exports generic TableName but NOT the stale OrdersTableName"
);

const imageLambdaProps = imageTemplate.Resources.NodeLambda1.Properties;
assert(
  Boolean(imageLambdaProps.Environment.Variables.TABLE_NAME) &&
    !imageLambdaProps.Environment.Variables.BUCKET_NAME &&
    !imageLambdaProps.Environment.Variables.QUEUE_URL &&
    !imageLambdaProps.Environment.Variables.TOPIC_ARN,
  "image pipeline env vars: TABLE_NAME only — no BUCKET_NAME (S3 is the trigger, not a target) and no QUEUE_URL (fails-to is not a send path)"
);
assert(
  JSON.stringify(imageLambdaProps.Policies).includes("DynamoDBCrudPolicy") &&
    !JSON.stringify(imageLambdaProps.Policies).includes("S3CrudPolicy") &&
    !JSON.stringify(imageLambdaProps.Policies).includes("SQSSendMessagePolicy"),
  "image pipeline IAM policies: DynamoDB write only — no S3 write, no SQS send (fails-to edge)"
);
// Requirement 9: the failure-sink edge becomes a dead-letter destination,
// never a normal send path. Regression: raw `DeadLetterConfig` on
// AWS::Serverless::Function is rejected by CloudFormation
// ("property DeadLetterConfig not defined for resource of type
// AWS::Serverless::Function") — SAM requires `DeadLetterQueue` instead.
assert(
  imageLambdaProps.DeadLetterQueue &&
    imageLambdaProps.DeadLetterQueue.Type === "SQS" &&
    JSON.stringify(imageLambdaProps.DeadLetterQueue.TargetArn) ===
      JSON.stringify({ "Fn::GetAtt": ["NodeSqs1", "Arn"] }),
  "lambda -> sqs [fails-to] wires the queue via SAM DeadLetterQueue (Type SQS + TargetArn)"
);
assert(
  !JSON.stringify(imageTemplate.Resources).includes("DeadLetterConfig"),
  "no raw DeadLetterConfig property on AWS::Serverless::Function (SAM validation regression)"
);
assert(
  !JSON.stringify(imageTemplate).includes('"OrdersApi"') &&
    !JSON.stringify(imageTemplate).includes('"CreateOrderFunction"') &&
    !JSON.stringify(imageTemplate).includes('"OrdersTable"'),
  "image pipeline template contains no hard-coded Orders identifiers"
);

// YAML serialization works (golden artifact)
const yamlText = yaml.dump(imageTemplate, { noRefs: true });
assert(yamlText.includes("AWS::CloudWatch::Alarm"), "image pipeline template serializes to YAML");
assert(yamlText.includes("ObjectCreated"), "YAML keeps the S3 ObjectCreated trigger");

// ---------------------------------------------------------------------------
// 5. Event-triggered graph WITHOUT API Gateway (approved policy)
// ---------------------------------------------------------------------------
const eventGraph = {
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

const eventTemplate = generateSamTemplate(eventGraph);
assert(
  !resourceTypes(eventTemplate).includes("AWS::Serverless::Api") &&
    !eventTemplate.Outputs.ApiUrl,
  "SQS -> Lambda graph compiles WITHOUT any API Gateway resource"
);
const eventLambdaProps = Object.values(eventTemplate.Resources).find(
  (r) => r.Type === "AWS::Serverless::Function"
).Properties;
assert(
  JSON.stringify(eventLambdaProps.Events).includes('"SQS"'),
  "SQS event source mapping wired into the Lambda (edge-driven trigger)"
);

// Dump the orders template as a readable artifact.
const templatePath = path.join(
  __dirname,
  "../../../infrastructure/generated-template.yaml"
);
fs.writeFileSync(templatePath, yaml.dump(imageTemplate, { noRefs: true }));
console.log(`\n  📄 wrote image-pipeline template to ${templatePath}`);

if (failed > 0) {
  console.error(`\n❌ test-generator: ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ test-generator: all assertions passed");
