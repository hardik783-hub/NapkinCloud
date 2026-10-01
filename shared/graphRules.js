/**
 * NapkinCloud canonical graph rules — SINGLE IMPLEMENTATION of topology
 * validation, role mapping, and edge semantics shared by:
 *
 *   - Frontend:  src/lib/validator.ts, src/lib/graphExporter.ts (via import)
 *   - Backend:   backend/src/compiler/validator.js (via require)
 *   - Tests:     scripts/*.ts and backend/src/compiler/test-*.js
 *
 * The service metadata lives in ./serviceRegistry.json (the canonical
 * registry). This module is CommonJS on purpose so it loads under Node
 * (require), Node type-stripping (ESM import of CJS), and webpack/Next.js.
 */

const registry = require("./serviceRegistry.json");

const SERVICE_REGISTRY = registry;
const SERVICE_TYPES = Object.keys(registry.services);
const SUPPORTED_NODE_TYPES = SERVICE_TYPES; // backward-compatible alias
const ROLE_BUCKETS = registry.roleBuckets;
const EDGE_KINDS = registry.edgeKinds;
const DEFAULT_EDGE_KIND_BY_PAIR = registry.defaultEdgeKindByPair;

function createEmptyRoles() {
  const roles = {};
  for (const bucket of ROLE_BUCKETS) roles[bucket] = [];
  return roles;
}

/** Read canonical node payload (canvas `data`, with legacy `config` fallback). */
function nodeData(node) {
  if (!node || typeof node !== "object") return {};
  return node.data || node.config || {};
}

function getRole(type) {
  const svc = registry.services[type];
  return svc ? svc.role : null;
}

function getRoleBucket(type) {
  const svc = registry.services[type];
  return svc ? svc.roleBucket : null;
}

function isTriggerType(type) {
  const svc = registry.services[type];
  return Boolean(svc && svc.canTriggerLambda);
}

function isKnownType(type) {
  return Object.prototype.hasOwnProperty.call(registry.services, type);
}

/** Explicit edge.data.kind wins; otherwise infer from the (source, target) type pair. */
function inferEdgeKind(sourceType, targetType, explicitKind) {
  if (explicitKind && EDGE_KINDS.includes(explicitKind)) return explicitKind;
  return DEFAULT_EDGE_KIND_BY_PAIR[`${sourceType}>${targetType}`] || "flow";
}

function buildRoles(nodes) {
  const roles = createEmptyRoles();
  for (const node of nodes || []) {
    if (!node || !node.type) continue;
    const bucket = getRoleBucket(node.type);
    if (bucket && roles[bucket]) roles[bucket].push(node);
  }
  return roles;
}

function buildSummary(nodes, edges) {
  const services = [];
  for (const node of nodes || []) {
    if (node && node.type && !services.includes(node.type)) services.push(node.type);
  }
  return {
    nodeCount: (nodes || []).length,
    edgeCount: (edges || []).length,
    services,
  };
}

/**
 * Canonical topology rules (identical on frontend and backend):
 *
 *  R1 structural: nodes/edges must be arrays.
 *  R2 every node has a unique id and a type from the 12-service registry.
 *  R3 every edge references existing nodes and is not a self-loop.
 *  R4 no isolated nodes (every node participates in >=1 edge).
 *  R5 exactly one Lambda (compute).
 *  R6 at most one API Gateway.
 *  R7 if an API Gateway exists it must connect to the Lambda.
 *  R8 the Lambda must have >=1 incoming edge from a trigger-capable service
 *     (API Gateway, S3, SQS, SNS, EventBridge, Kinesis, Step Functions, Cognito).
 *     -> Event-triggered graphs without an API Gateway are VALID (approved policy).
 *  R9 every storage node (DynamoDB) must have >=1 incoming edge.
 *  R10 the graph must contain at least one service node beyond API Gateway + Lambda.
 *  R11 the graph must be a single connected component (undirected).
 *
 * Returns { valid, errors, roles, summary }.
 */
function validateGraph(graph) {
  if (!graph || typeof graph !== "object") {
    return {
      valid: false,
      errors: ["Graph must be an object"],
      roles: createEmptyRoles(),
      summary: { nodeCount: 0, edgeCount: 0, services: [] },
    };
  }

  const structuralErrors = [];
  if (!Array.isArray(graph.nodes)) structuralErrors.push("nodes must be an array");
  if (!Array.isArray(graph.edges)) structuralErrors.push("edges must be an array");
  if (structuralErrors.length > 0) {
    return {
      valid: false,
      errors: structuralErrors,
      roles: createEmptyRoles(),
      summary: { nodeCount: 0, edgeCount: 0, services: [] },
    };
  }

  const nodes = graph.nodes;
  const edges = graph.edges;
  const errors = [];

  // R2 — ids and types
  const ids = new Set();
  for (const node of nodes) {
    if (!node || !node.id) {
      errors.push("Every node must have an id");
      continue;
    }
    if (ids.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    }
    ids.add(node.id);
    if (!node.type || !isKnownType(node.type)) {
      errors.push(`Unsupported node type: ${node.type}`);
    }
  }

  // R3 — edge references
  let referencesIntact = true;
  for (const edge of edges) {
    if (!edge || !edge.source || !edge.target) {
      errors.push("Every edge must have source and target");
      referencesIntact = false;
      continue;
    }
    if (!ids.has(edge.source)) {
      errors.push(`Edge references unknown source node: ${edge.source}`);
      referencesIntact = false;
    }
    if (!ids.has(edge.target)) {
      errors.push(`Edge references unknown target node: ${edge.target}`);
      referencesIntact = false;
    }
    if (edge.source === edge.target) {
      errors.push(`Edge cannot connect a node to itself: ${edge.source}`);
      referencesIntact = false;
    }
  }

  // If structure is broken, topology checks would produce misleading noise.
  if (errors.length > 0 && !referencesIntact) {
    return {
      valid: false,
      errors,
      roles: buildRoles(nodes.filter((n) => n && n.id && isKnownType(n.type))),
      summary: buildSummary(nodes, edges),
    };
  }

  const knownNodes = nodes.filter((n) => n && n.id && isKnownType(n.type));
  const byId = new Map(knownNodes.map((n) => [n.id, n]));

  // Edge indexes (only over edges with intact references)
  const incident = new Map(); // nodeId -> edges where source or target matches
  const incoming = new Map(); // nodeId -> edges targeting it
  for (const edge of edges) {
    if (!edge || !byId.has(edge.source) || !byId.has(edge.target)) continue;
    if (!incident.has(edge.source)) incident.set(edge.source, []);
    incident.get(edge.source).push(edge);
    if (!incident.has(edge.target)) incident.set(edge.target, []);
    incident.get(edge.target).push(edge);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    incoming.get(edge.target).push(edge);
  }

  const lambdas = knownNodes.filter((n) => n.type === "lambda");
  const apis = knownNodes.filter((n) => n.type === "api_gateway");

  // R5 — exactly one Lambda
  if (lambdas.length === 0) {
    errors.push("Graph must contain an AWS Lambda function node.");
  } else if (lambdas.length > 1) {
    errors.push(`Only 1 Lambda function is supported (found ${lambdas.length}).`);
  }

  // R6 — at most one API Gateway
  if (apis.length > 1) {
    errors.push(`Only 1 API Gateway is supported (found ${apis.length}).`);
  }

  const lambda = lambdas[0];
  const api = apis[0];

  // R4 — no isolated nodes
  let hasIsolated = false;
  if (knownNodes.length > 1) {
    for (const node of knownNodes) {
      if (!incident.has(node.id)) {
        errors.push(`Node [${node.id}] is not connected to any other node.`);
        hasIsolated = true;
      }
    }
  }

  // R7 — API Gateway (when present) must invoke the Lambda
  if (api && lambda) {
    const wired = edges.some((e) => e.source === api.id && e.target === lambda.id);
    if (!wired) {
      errors.push(`API Gateway [${api.id}] must connect to Lambda [${lambda.id}].`);
    }
  }

  // R8 — Lambda must have a trigger-capable incoming edge
  if (lambda) {
    const incomingToLambda = (incoming.get(lambda.id) || []).filter((e) =>
      byId.has(e.source)
    );
    const triggerEdges = incomingToLambda.filter((e) =>
      isTriggerType(byId.get(e.source).type)
    );
    if (incomingToLambda.length === 0) {
      errors.push(`Lambda [${lambda.id}] must have an incoming trigger edge.`);
    } else if (triggerEdges.length === 0) {
      errors.push(
        `Lambda [${lambda.id}] must be triggered by an event source (API Gateway, S3, SQS, SNS, EventBridge, Kinesis, Step Functions, or Cognito).`
      );
    }
  }

  // R9 — registry services flagged requiresIncoming (e.g. DynamoDB) must be
  // written to by something. Event sources like S3/SQS are producers by
  // design ("S3 -> Lambda", "SQS -> Lambda" are valid bare architectures),
  // so they are not flagged. Lambda is excluded here — R8 gives the
  // precise trigger error message.
  for (const node of knownNodes) {
    const svc = registry.services[node.type];
    if (
      svc &&
      svc.requiresIncoming &&
      node.type !== "lambda" &&
      !(incoming.get(node.id) || []).length
    ) {
      errors.push(`Storage node [${node.id}] must have an incoming edge.`);
    }
  }

  // R10 — at least one service beyond API Gateway + Lambda
  const serviceNodes = knownNodes.filter((n) => {
    const role = getRole(n.type);
    return role !== "entry" && role !== "compute";
  });
  if (knownNodes.length > 0 && serviceNodes.length === 0) {
    errors.push(
      "Graph must contain at least one AWS service beyond API Gateway and Lambda (e.g. DynamoDB, S3, SQS)."
    );
  }

  // R11 — single connected component (undirected), only when nothing else failed
  if (knownNodes.length > 1 && !hasIsolated && errors.length === 0) {
    const visited = new Set();
    const queue = [knownNodes[0].id];
    visited.add(knownNodes[0].id);
    while (queue.length) {
      const current = queue.shift();
      for (const edge of incident.get(current) || []) {
        const other = edge.source === current ? edge.target : edge.source;
        if (!visited.has(other)) {
          visited.add(other);
          queue.push(other);
        }
      }
    }
    if (visited.size !== knownNodes.length) {
      const unreachable = knownNodes.length - visited.size;
      errors.push(
        `Graph must be a single connected component (${unreachable} unreachable node(s) found).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    roles: buildRoles(knownNodes),
    summary: buildSummary(nodes, edges),
  };
}

/** Convenience wrapper taking (nodes, edges) — the frontend call shape. */
function validateNodesEdges(nodes, edges) {
  return validateGraph({ nodes, edges });
}

module.exports = {
  SERVICE_REGISTRY,
  SERVICE_TYPES,
  SUPPORTED_NODE_TYPES,
  ROLE_BUCKETS,
  EDGE_KINDS,
  DEFAULT_EDGE_KIND_BY_PAIR,
  validateGraph,
  validateNodesEdges,
  buildRoles,
  buildSummary,
  createEmptyRoles,
  inferEdgeKind,
  nodeData,
  getRole,
  getRoleBucket,
  isTriggerType,
  isKnownType,
};
