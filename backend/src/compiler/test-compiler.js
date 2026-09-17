const { compileArchitecture } = require("./compiler");

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

        logic: "Validates order payload, generates UUID and saves order",
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

try {
  const result = compileArchitecture(graph);

  console.log("\n🚀 COMPILATION SUCCESSFUL");

  console.log(result);
} catch (error) {
  console.error("\n❌ COMPILATION FAILED");

  console.error(error.message);
}
