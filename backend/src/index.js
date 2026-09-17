const express = require("express");
const cors = require("cors");
const path = require("path");

const {
  compileArchitecture
} = require("./compiler/compiler");

const {
  deployStack
} = require("./services/deployer");

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


// Compile + Deploy
app.post("/api/compile", async (req, res) => {

  try {

    const graph = req.body;

    if (!graph || !Array.isArray(graph.nodes)) {
      return res.status(400).json({
        success: false,
        error: "Invalid architecture graph"
      });
    }


    console.log("\n⚡ Compile request received");


    // 1. Generate infrastructure
    const compilation =
      compileArchitecture(graph);


    // 2. Unique stack name
    const stackName =
      `napkincloud-${Date.now()}`;


    console.log(
      `🚀 Deploying ${stackName}`
    );


    // 3. Deploy to AWS
    const deployment =
      await deployStack(
        stackName,
        compilation.files.template
      );


    // 4. Return result
    res.json({

      success: true,

      message:
        "Architecture deployed successfully",

      stackName,

      status:
        deployment.status,

      outputs:
        deployment.outputs

    });

  } catch (error) {

    console.error(
      "❌ Compile failed:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error.message

    });
  }
});


const PORT = 3000;

app.listen(PORT, () => {

  console.log(`
🚀 NapkinCloud Backend

http://localhost:${PORT}

Health:
GET /health

Compile:
POST /api/compile
  `);

});