/**
 * Graph-driven Lambda handler generation.
 *
 * Everything is derived from the canonical graph:
 *   - SDK imports are emitted ONLY for services the Lambda actually
 *     writes to (an S3-only graph gets no DynamoDB client at all).
 *   - The GET branch is graph-aware (DynamoDB scan / S3 list / fallback).
 *   - Trigger edges (S3/SQS/SNS/EventBridge/Kinesis -> Lambda) add an
 *     event-processing path; HTTP CORS behavior is preserved.
 *   - All snippets are joined with REAL newlines — the historical bug of
 *     literal "\n" sequences leaking into generated source is gone.
 *
 * Signature: generateLambdaCode(graph) where graph = { nodes, edges }.
 */
const {
  SERVICE_REGISTRY,
  nodeData,
  inferEdgeKind,
} = require("../../../shared/graphRules");

function sanitize(value, fallback) {
  const clean = String(value || "").replace(/[^a-zA-Z0-9]/g, "");
  return clean || fallback;
}

function singleLine(value, fallback) {
  const clean = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  return clean || fallback;
}

function generateLambdaCode(graph) {
  if (!graph || !Array.isArray(graph.nodes)) {
    throw new Error("generateLambdaCode requires a graph with nodes[]");
  }
  const nodes = graph.nodes;
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const lambda = nodes.find((n) => n.type === "lambda");
  if (!lambda) {
    throw new Error("generateLambdaCode requires a lambda node in the graph");
  }

  const lambdaData = nodeData(lambda);
  const functionName = sanitize(lambdaData.functionName, "NapkinCloudFunction");
  const logic = singleLine(
    lambdaData.businessLogic || lambdaData.logic,
    "Process the incoming request"
  );

  // ---- classify edges (direction decides the wiring) ----
  let hasDynamo = false;
  let writesS3 = false;
  let sendsSqs = false;
  let publishesSns = false;
  let putsEventBridge = false;
  let writesKinesis = false;
  let hasTrigger = false;
  let hasFailureSink = false; // lambda -> sqs/sns [fails-to]: DLQ, not a send path

  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;

    if (String(source.id) === String(lambda.id) && String(target.type) !== "lambda") {
      const kind = inferEdgeKind(
        String(source.type),
        String(target.type),
        edge.data && edge.data.kind
      );
      if (kind === "fails-to" && (target.type === "sqs" || target.type === "sns")) {
        // Failure sink: the queue is wired as the function's dead-letter
        // destination in SAM — never a normal send path in the handler.
        hasFailureSink = true;
        continue;
      }
      switch (target.type) {
        case "dynamodb":
          hasDynamo = true;
          break;
        case "s3":
          writesS3 = true;
          break;
        case "sqs":
          sendsSqs = true;
          break;
        case "sns":
          publishesSns = true;
          break;
        case "eventbridge":
          putsEventBridge = true;
          break;
        case "kinesis":
          writesKinesis = true;
          break;
        default:
          break;
      }
    } else if (String(target.id) === String(lambda.id) && String(source.type) !== "lambda") {
      const def = SERVICE_REGISTRY.services[source.type];
      if (def && def.lambdaEvent) hasTrigger = true;
    }
  }

  const dynamoNode = nodes.find(
    (n) =>
      n.type === "dynamodb" &&
      edges.some((e) => e.source === lambda.id && e.target === n.id)
  );
  const partitionKey =
    String(nodeData(dynamoNode || {}).primaryKey || "id").replace(
      /[^a-zA-Z0-9_]/g,
      ""
    ) || "id";

  // ---- imports (only what this graph actually uses) ----
  const imports = ['const { randomUUID } = require("crypto");'];
  if (hasDynamo) {
    imports.push('const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");');
    imports.push(
      'const {\n  DynamoDBDocumentClient,\n  PutCommand,\n  ScanCommand,\n  DeleteCommand\n} = require("@aws-sdk/lib-dynamodb");'
    );
    imports.push("const client = new DynamoDBClient({});");
    imports.push("const dynamodb = DynamoDBDocumentClient.from(client);");
  }
  if (writesS3) {
    imports.push(
      'const { S3Client, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");'
    );
    imports.push("const s3 = new S3Client({});");
  }
  if (sendsSqs) {
    imports.push('const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");');
    imports.push("const sqs = new SQSClient({});");
  }
  if (publishesSns) {
    imports.push('const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");');
    imports.push("const sns = new SNSClient({});");
  }
  if (putsEventBridge) {
    imports.push(
      'const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge");'
    );
    imports.push("const eventbridge = new EventBridgeClient({});");
  }
  if (writesKinesis) {
    imports.push(
      'const { KinesisClient, PutRecordCommand } = require("@aws-sdk/client-kinesis");'
    );
    imports.push("const kinesis = new KinesisClient({});");
  }

  // ---- GET branch: graph-aware read path ----
  const getBranch = hasDynamo
    ? `    if (httpMethod === "GET") {
      const scanResult = await dynamodb.send(
        new ScanCommand({
          TableName: process.env.TABLE_NAME,
          Limit: 50
        })
      );
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          count: scanResult.Items ? scanResult.Items.length : 0,
          items: scanResult.Items || []
        })
      };
    }`
    : writesS3
      ? `    if (httpMethod === "GET") {
      const listResult = await s3.send(
        new ListObjectsV2Command({
          Bucket: process.env.BUCKET_NAME,
          MaxKeys: 50
        })
      );
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          count: (listResult.Contents || []).length,
          items: listResult.Contents || []
        })
      };
    }`
      : `    if (httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          service: "${functionName}",
          message: "Service is live. No datastore is bound to this function."
        })
      };
    }`;

  const deleteBranch = hasDynamo
    ? `
    if (httpMethod === "DELETE") {
      const queryKey = event.queryStringParameters && event.queryStringParameters["${partitionKey}"];
      let bodyKey = null;
      try {
        const parsed = JSON.parse(event.body || "{}");
        bodyKey = parsed["${partitionKey}"];
      } catch (_) {}

      const targetId = queryKey || bodyKey;
      if (targetId) {
        await dynamodb.send(
          new DeleteCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
              ["${partitionKey}"]: targetId
            }
          })
        );
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            message: "Record deleted",
            deletedId: targetId
          })
        };
      }
    }`
    : "";

  // ---- persistence / fanout actions (only for lambda -> X edges) ----
  const recordKeyLine = hasDynamo
    ? `      ["${partitionKey}"]: body["${partitionKey}"] || randomUUID(),`
    : "";

  const actionBlocks = [];
  if (hasDynamo) {
    actionBlocks.push(`    await dynamodb.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: record
      })
    );`);
  }
  if (writesS3) {
    actionBlocks.push(`    if (process.env.BUCKET_NAME) {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: "uploads/" + (record["${partitionKey}"] || randomUUID()) + ".json",
          Body: JSON.stringify(record),
          ContentType: "application/json"
        })
      );
      record._s3Key = "uploads/" + (record["${partitionKey}"] || randomUUID()) + ".json";
    }`);
  }
  if (sendsSqs) {
    actionBlocks.push(`    if (process.env.QUEUE_URL) {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.QUEUE_URL,
          MessageBody: JSON.stringify(record)
        })
      );
    }`);
  }
  if (publishesSns) {
    actionBlocks.push(`    if (process.env.TOPIC_ARN) {
      await sns.send(
        new PublishCommand({
          TopicArn: process.env.TOPIC_ARN,
          Message: JSON.stringify(record)
        })
      );
    }`);
  }
  if (putsEventBridge) {
    actionBlocks.push(`    if (process.env.EVENT_BUS_NAME) {
      await eventbridge.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: process.env.EVENT_BUS_NAME,
              Source: "${functionName}",
              DetailType: "RecordCreated",
              Detail: JSON.stringify(record)
            }
          ]
        })
      );
    }`);
  }
  if (writesKinesis) {
    actionBlocks.push(`    if (process.env.STREAM_NAME) {
      await kinesis.send(
        new PutRecordCommand({
          StreamName: process.env.STREAM_NAME,
          Data: JSON.stringify(record),
          PartitionKey: String(record["${partitionKey}"] || randomUUID())
        })
      );
    }`);
  }

  // ---- event path (present only when a trigger edge exists) ----
  const failureSinkNote = hasFailureSink
    ? [
        "    // Processing failures are delivered to the SQS dead-letter queue",
        "    // (the function's DeadLetterQueue) - lambda -> sqs [fails-to] is",
        "    // a failure sink, not a normal send path.",
      ].join("\n")
    : "";

  const eventHandling = hasTrigger
    ? `
  if (!httpMethod) {
    return handleEvent(event);
  }`
    : `
  if (!httpMethod) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: "Unsupported event source" })
    };
  }`;

  const handleEventFn = hasTrigger
    ? `
async function handleEvent(event) {
  console.log("[NapkinCloud] Event received:", JSON.stringify(event).slice(0, 2000));
  const records = (event && event.Records) || [];
  const payloadCount = records.length || 1;

  // Generated by NapkinCloud
  // Function: ${functionName}
  // Logic: ${logic}
${failureSinkNote}
  try {
${hasDynamo
      ? `    for (const incoming of records) {
      let payload = incoming;
      if (typeof incoming.body === "string") {
        try {
          payload = JSON.parse(incoming.body);
        } catch (_) {
          payload = { raw: incoming.body };
        }
      } else if (incoming.body && typeof incoming.body === "object") {
        payload = incoming.body;
      }
      const item = {
        ...payload,
        ["${partitionKey}"]: payload["${partitionKey}"] || randomUUID(),
        receivedAt: new Date().toISOString()
      };
      await dynamodb.send(
        new PutCommand({
          TableName: process.env.TABLE_NAME,
          Item: item
        })
      );
    }`
      : ""}
    console.log("[NapkinCloud] Processed " + payloadCount + " event record(s)");
    return { processed: payloadCount };
  } catch (error) {
    console.error("[NapkinCloud] Event processing failed:", error);
${failureSinkNote}
    throw error;
  }
}
`
    : "";

  return `${imports.join("\n")}

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "*"
  };

  const httpMethod = (event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || "").toUpperCase();
${eventHandling}

  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
${getBranch}
${deleteBranch}

    const body =
      JSON.parse(event.body || "{}");

    // Generated by NapkinCloud
    // Function: ${functionName}
    // Logic: ${logic}

    const record = {
      ...body,
${recordKeyLine}
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

${actionBlocks.join("\n\n")}

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(record)
    };

  } catch (error) {
    console.error(
      "Lambda execution failed:",
      error
    );
${failureSinkNote}
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || "Internal server error"
      })
    };
  }
};
${handleEventFn}`;
}

module.exports = {
  generateLambdaCode,
};
