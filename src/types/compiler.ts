import type { AppNode, AppEdge, HttpMethod } from './canvas';
import type { GraphRoles, GraphSummary } from '../../shared/graphRules.js';

export interface NormalizedArchitecture {
  /** Free-form pattern label — historical values include 'api_lambda_dynamodb'. */
  pattern: string;
  api: {
    method: HttpMethod;
    path: string;
  };
  lambda: {
    functionName: string;
    runtime: 'nodejs20.x';
    handlerFile: string;
    businessLogicSummary: string;
    inferredLogicCode: string;
  };
  dynamodb: {
    tableName: string;
    partitionKey: string;
    partitionKeyType: 'String' | 'Number';
  };
  source: 'bedrock' | 'deterministic_fallback';
}

/**
 * Topology validation verdict. Node extraction is expressed as a role map
 * (entries/compute/stores/queues/…) derived from the canonical service
 * registry — there is no hard-coded `nodes.dynamodb` slot anymore.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  roles?: GraphRoles;
  summary?: GraphSummary;
}

export interface CompileRequest {
  projectId?: string;
  nodes: AppNode[];
  edges: AppEdge[];
  /** When true the backend compiles artifacts but performs NO AWS deployment. */
  dryRun?: boolean;
}

export interface ServiceReasoning {
  service: string;
  reason: string;
}

export interface TeammateArchitecture {
  application: {
    name: string;
    description: string;
  };
  architecture: {
    nodes: Array<{
      id: string;
      type: string;
      purpose: string;
    }>;
    connections: Array<{
      from: string;
      to: string;
      kind?: string;
    }>;
  };
  reasoning: ServiceReasoning[];
}

/** Generic deployment outputs — keyed by resource role, not by project name. */
export interface CompileOutputs {
  ApiUrl?: string;
  LambdaFunctionName?: string;
  /** DynamoDB table (generic key — the only DynamoDB output emitted). */
  TableName?: string;
  BucketName?: string;
  QueueUrl?: string;
  TopicArn?: string;
  EventBusName?: string;
  UserPoolId?: string;
  AlarmName?: string;
  StreamName?: string;
  StateMachineArn?: string;
  SecretArn?: string;
  /**
   * @deprecated Stale Orders-era alias — no longer emitted by the registry
   * output definition. Kept only so responses from older deployments can
   * still be read.
   */
  OrdersTableName?: string;
  [key: string]: string | undefined;
}

export interface CompileResponse {
  success: boolean;
  projectId: string;
  timestamp: string;

  templateYaml?: string;
  handlerJs?: string;

  /** How the architecture was authored (passed through when known). */
  source?: 'bedrock' | 'offline_rule_engine' | 'user_canvas';

  normalizedArchitecture?: NormalizedArchitecture;
  reasoning?: ServiceReasoning[];
  teammateArchitecture?: TeammateArchitecture;

  /** Canonical graph summary the artifacts were generated from. */
  graph?: GraphSummary & {
    roles?: string[];
    api?: { method: string; path: string };
    lambda?: string;
  };

  validation: {
    valid: boolean;
    errors: string[];
  };

  outputs?: CompileOutputs;

  stackName?: string;
  status?: string;
  message?: string;

  /**
   * Set by the /api/compile proxy when the deployment backend could not be
   * reached. The compile/deploy outcome is UNKNOWN (not a failure) — the
   * canvas must fall back to a neutral status rather than rendering FAILED.
   */
  unverified?: boolean;

  handOffContract?: {
    projectId: string;
    templateYaml: string;
    handlerJs: string;
  };
}
