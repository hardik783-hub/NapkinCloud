const {
  validateGraph,
  SUPPORTED_NODE_TYPES,
  SERVICE_REGISTRY,
  inferEdgeKind,
  nodeData,
} = require("../../../shared/graphRules");

/**
 * Backend graph validation — thin delegate over the canonical shared rule
 * set (shared/graphRules.js). The frontend validator, the export validator,
 * and this backend validator all run the exact same rules, so their
 * verdicts cannot drift.
 *
 * Topology is now enforced here too: exactly one Lambda, at most one API
 * Gateway, trigger-capable incoming edge for Lambda, storage nodes need an
 * incoming edge, single connected component. Event-triggered graphs
 * (S3/SQS/SNS/EventBridge/Kinesis -> Lambda) are valid WITHOUT an API
 * Gateway — API Gateway is only required when an api_gateway node exists.
 */
function validateGraphTopology(graph) {
  const result = validateGraph(graph);
  return {
    valid: result.valid,
    errors: result.errors,
    roles: result.roles,
    summary: result.summary,
  };
}

module.exports = {
  validateGraph: validateGraphTopology,
  SUPPORTED_NODE_TYPES,
  SERVICE_REGISTRY,
  inferEdgeKind,
  nodeData,
};
