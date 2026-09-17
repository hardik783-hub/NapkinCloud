const fs = require("fs");
const path = require("path");

const { generateLambdaCode } = require("./lambdaGenerator");

const lambdaNode = {
  id: "lambda-1",

  type: "lambda",

  config: {
    functionName: "CreateOrderFunction",

    logic: "Validates order payload, generates UUID and saves order",
  },
};

const databaseNode = {
  id: "db-1",

  type: "dynamodb",

  config: {
    tableName: "OrdersTable",

    partitionKey: "orderId",
  },
};

const code = generateLambdaCode(lambdaNode, databaseNode);

// Always resolve from this file's location
const outputDir = path.join(
  __dirname,
  "../../../infrastructure/functions/generated",
);

const outputFile = path.join(outputDir, "index.js");

fs.mkdirSync(outputDir, {
  recursive: true,
});

fs.writeFileSync(outputFile, code);

console.log("✅ Lambda code generated successfully");
console.log(`📄 ${outputFile}`);
