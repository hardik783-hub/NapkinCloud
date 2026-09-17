const { validateGraph } = require("./validator");

const graph = {
  nodes: [
    {
      id: "api-1",
      type: "api_gateway",
    },
    {
      id: "lambda-1",
      type: "lambda",
    },
    {
      id: "db-1",
      type: "dynamodb",
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

const result = validateGraph(graph);

console.log(result);
