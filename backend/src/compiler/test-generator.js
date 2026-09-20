const fs = require("fs");
const yaml = require("js-yaml");

const { generateSamTemplate } = require("./samGenerator");

const graph = {
  nodes: [
    {
      id: "api-1",
      type: "api_gateway",
      config: {
        method: "POST",
        path: "/orders",
      },
    },

    {
      id: "lambda-1",
      type: "lambda",
      config: {
        functionName: "CreateOrderFunction",
      },
    },

    {
      id: "db-1",
      type: "dynamodb",
      config: {
        tableName: "OrdersTable",
        partitionKey: "orderId",
      },
    },
  ],

  edges: [
    {
      source: "api-1",
      target: "lambda-1",
    },

    {
      source: "lambda-1",
      target: "db-1",
    },
  ],
};

const template = generateSamTemplate(graph);

const path = require("path");

const templatePath = path.join(
  __dirname,
  "../../../infrastructure/generated-template.yaml",
);

const yamlTemplate = yaml.dump(template, {
  noRefs: true,
});

fs.writeFileSync(templatePath, yamlTemplate);

console.log("✅ SAM template generated:");
console.log(templatePath);

