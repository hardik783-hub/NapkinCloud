import type { AppNode, AppEdge } from '@/types/canvas';
import type { ValidationResult } from '@/types/compiler';
import { validateNodesEdges } from '../../shared/graphRules.js';

/**
 * Frontend topology validation.
 *
 * Delegates to the canonical shared rule set (shared/graphRules.js) so the
 * frontend verdict is always identical to the backend compiler verdict and
 * to the export validator. No DynamoDB mandate: event-triggered graphs
 * (S3/SQS/SNS/EventBridge/Kinesis -> Lambda) are valid without an API
 * Gateway entry point; an API Gateway is only wired when one exists.
 */
export function validateGraphTopology(
  nodes: AppNode[],
  edges: AppEdge[]
): ValidationResult {
  const result = validateNodesEdges(nodes, edges);
  return {
    valid: result.valid,
    errors: result.errors,
    roles: result.roles,
    summary: result.summary,
  };
}
