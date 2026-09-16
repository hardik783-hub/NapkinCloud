import type { AppNode, AppEdge, HttpMethod } from './canvas';

export interface NormalizedArchitecture {
  pattern: 'api_lambda_dynamodb';
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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  nodes?: {
    api: AppNode;
    lambda: AppNode;
    dynamodb: AppNode;
  };
}

export interface CompileRequest {
  projectId?: string;
  nodes: AppNode[];
  edges: AppEdge[];
}

export interface ServiceReasoning {
  service: 'api_gateway' | 'lambda' | 'dynamodb' | string;
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
    }>;
  };
  reasoning: ServiceReasoning[];
}

export interface CompileResponse {
  success: boolean;
  projectId: string;
  timestamp: string;
  templateYaml?: string;
  handlerJs?: string;
  normalizedArchitecture?: NormalizedArchitecture;
  reasoning?: ServiceReasoning[];
  teammateArchitecture?: TeammateArchitecture;
  validation: {
    valid: boolean;
    errors: string[];
  };
  handOffContract?: {
    projectId: string;
    templateYaml: string;
    handlerJs: string;
  };
}

