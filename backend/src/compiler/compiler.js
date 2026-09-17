const fs = require("fs");
const path = require("path");

const { validateGraph } = require("./validator");

const { generateSamTemplate } = require("./samGenerator");

const { generateLambdaCode } = require("./lambdaGenerator");

function compileArchitecture(graph) {
  console.log("🔍 Validating architecture...");

  // STEP 1 — Validate
  const validation = validateGraph(graph);

  if (!validation.valid) {
    throw new Error(
      `Architecture validation failed:\n${validation.errors.join("\n")}`,
    );
  }

  console.log("✅ Architecture valid");

  // STEP 2 — Find nodes
  const lambdaNode = graph.nodes.find((node) => node.type === "lambda");

  const databaseNode = graph.nodes.find((node) => node.type === "dynamodb");

  if (!lambdaNode) {
    throw new Error("Architecture must contain a Lambda node");
  }

  // STEP 3 — Generate SAM
  console.log("⚙️ Generating SAM template...");

  const samTemplate = generateSamTemplate(graph);

  const infrastructureDir = path.join(__dirname, "../../../infrastructure");

  const templatePath = path.join(infrastructureDir, "generated-template.yaml");

  const yaml = require("js-yaml");

  fs.writeFileSync(
    templatePath,
    yaml.dump(samTemplate, {
      noRefs: true,
    }),
  );

  console.log("✅ SAM template generated");

  // STEP 4 — Generate Lambda
  console.log("⚙️ Generating Lambda code...");

  const lambdaCode = generateLambdaCode(lambdaNode, databaseNode);

  const lambdaDir = path.join(infrastructureDir, "functions", "generated");

  const lambdaPath = path.join(lambdaDir, "index.js");

  fs.mkdirSync(lambdaDir, {
    recursive: true,
  });

  fs.writeFileSync(lambdaPath, lambdaCode);

  console.log("✅ Lambda code generated");

  // STEP 5 — Return compilation result
  return {
  success: true,

  files: {
    template: templatePath,
    lambda: lambdaPath,
  },

  templateYaml: fs.readFileSync(templatePath, "utf8"),

  handlerJs: fs.readFileSync(lambdaPath, "utf8"),
};
}

module.exports = {
  compileArchitecture,
};
