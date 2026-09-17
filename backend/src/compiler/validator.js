const SUPPORTED_NODE_TYPES = ["api_gateway", "lambda", "dynamodb", "s3", "sqs"];

function validateGraph(graph) {
  const errors = [];

  if (!graph || typeof graph !== "object") {
    return {
      valid: false,
      errors: ["Graph must be an object"],
    };
  }

  if (!Array.isArray(graph.nodes)) {
    errors.push("nodes must be an array");
  }

  if (!Array.isArray(graph.edges)) {
    errors.push("edges must be an array");
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  const nodeIds = new Set();

  for (const node of graph.nodes) {
    if (!node.id) {
      errors.push("Every node must have an id");
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    }

    nodeIds.add(node.id);

    if (!SUPPORTED_NODE_TYPES.includes(node.type)) {
      errors.push(`Unsupported node type: ${node.type}`);
    }
  }

  for (const edge of graph.edges) {
    if (!edge.source || !edge.target) {
      errors.push("Every edge must have source and target");
      continue;
    }

    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references unknown source node: ${edge.source}`);
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references unknown target node: ${edge.target}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateGraph,
  SUPPORTED_NODE_TYPES,
};
