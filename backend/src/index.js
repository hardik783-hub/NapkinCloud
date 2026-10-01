require("./loadEnv");
const express = require("express");
const cors = require("cors");
const path = require("path");

const { compileArchitecture } = require("./compiler/compiler");
const { validateGraph, nodeData } = require("./compiler/validator");
const { deployStack } = require("./services/deployer");

const app = express();

app.use(cors());
app.use(express.json());


// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "NapkinCloud"
  });
});

/** Human-readable reason per node — derived from the canonical graph. */
function reasonForNode(node) {
  const d = nodeData(node);
  switch (node.type) {
    case "api_gateway":
      return `Exposes HTTPS ${d.method || "POST"} ${d.path || "/"} endpoint with throttling, request validation, and CORS.`;
    case "lambda":
      return `Executes serverless NodeJS compute (${d.functionName || "function"}): ${d.businessLogic || "processes events on demand"}.`;
    case "dynamodb":
      return `Managed NoSQL table (${d.tableName || "table"}) partitioned by ${d.primaryKey || "id"}.`;
    case "s3":
      return `Managed object storage bucket (${d.resourceName || "bucket"}).`;
    case "sqs":
      return `Managed message queue (${d.resourceName || "queue"}) for decoupled processing.`;
    case "sns":
      return `Managed pub/sub topic (${d.resourceName || "topic"}) for fanout.`;
    case "eventbridge":
      return `Managed event bus (${d.resourceName || "bus"}) for event routing.`;
    case "cloudwatch":
      return "CloudWatch alarm on Lambda errors for operational monitoring.";
    case "cognito":
      return `Cognito user pool (${d.resourceName || "pool"}) for authentication.`;
    case "kinesis":
      return `Kinesis data stream (${d.resourceName || "stream"}) for real-time ingestion.`;
    case "step_functions":
      return `Step Functions state machine (${d.resourceName || "machine"}) for workflow orchestration.`;
    case "secrets_manager":
      return `Secrets Manager secret (${d.resourceName || "secret"}) for credential storage.`;
    default:
      return `AWS ${node.type} service in the compiled architecture.`;
  }
}

function buildGraphSummary(graph, verdict) {
  const roles = Object.keys(verdict.roles || {}).filter(
    (key) => (verdict.roles[key] || []).length > 0
  );
  const api = graph.nodes.find((n) => n.type === "api_gateway");
  const lambda = graph.nodes.find((n) => n.type === "lambda");
  const apiData = api ? nodeData(api) : null;
  const lambdaData = lambda ? nodeData(lambda) : null;

  return {
    ...verdict.summary,
    roles,
    api: apiData
      ? { method: String(apiData.method || "POST"), path: String(apiData.path || "/") }
      : undefined,
    lambda: lambdaData
      ? String(lambdaData.functionName || "NapkinCloudFunction")
      : undefined,
  };
}


// Compile (+ optional deploy)
app.post("/api/compile", async (req, res) => {

  try {

    const graph = req.body;

    if (!graph || !Array.isArray(graph.nodes)) {
      return res.status(400).json({
        success: false,
        error: "Invalid architecture graph",
        validation: {
          valid: false,
          errors: ["Invalid architecture graph: nodes[] required"],
        },
      });
    }

    console.log("\n⚡ Compile request received");

    // Canonical topology validation (identical rules to the frontend)
    const verdict = validateGraph(graph);
    if (!verdict.valid) {
      return res.status(400).json({
        success: false,
        error: `Architecture validation failed:\n${verdict.errors.join("\n")}`,
        validation: { valid: false, errors: verdict.errors },
      });
    }

    // 1. Generate infrastructure (pure, offline compile)
    const compilation = compileArchitecture(graph);

    const graphSummary = buildGraphSummary(graph, verdict);
    const reasoning = graph.nodes.map((node) => ({
      service: String(node.type),
      reason: reasonForNode(node),
    }));

    const common = {
      success: true,
      projectId: graph.projectId || "proj-canvas",
      timestamp: new Date().toISOString(),
      source: typeof graph.source === "string" ? graph.source : undefined,
      templateYaml: compilation.templateYaml,
      handlerJs: compilation.handlerJs,
      validation: { valid: true, errors: [] },
      graph: graphSummary,
      reasoning,
      handOffContract: {
        projectId: graph.projectId || "proj-canvas",
        templateYaml: compilation.templateYaml,
        handlerJs: compilation.handlerJs,
      },
    };

    // DRY RUN: compile artifacts only — NEVER touches AWS.
    const dryRun = graph.dryRun === true || process.env.NAPKIN_DRY_RUN === "1";
    if (dryRun) {
      console.log("🧪 Dry run — skipping AWS deployment");
      return res.json({
        ...common,
        message: "Architecture compiled (dry run — no AWS deployment)",
        status: "DRY_RUN",
        outputs: {},
        stackName: null,
      });
    }

    // 2. Unique stack name
    const stackName = `napkincloud-${Date.now()}`;

    console.log(`🚀 Deploying ${stackName}`);

    // 3. Deploy to AWS
    const deployment = await deployStack(stackName, compilation.files.template);

    // 4. Return result
    res.json({
      ...common,
      message: "Architecture deployed successfully",
      stackName,
      status: deployment.status,
      outputs: deployment.outputs,
    });

  } catch (error) {

    console.error(
      "❌ Compile/Deploy failed:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message || "Compilation/Deployment failed",
      validation: {
        valid: false,
        errors: [error.message || "Compilation/Deployment failed"]
      }
    });
  }
});


const PORT = 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
🚀 NapkinCloud Backend

http://localhost:${PORT}

Health:
GET /health

Compile (+ deploy):
POST /api/compile
Compile only (no AWS):
POST /api/compile  with  { "dryRun": true }
  `);
  });
}

module.exports = { app };