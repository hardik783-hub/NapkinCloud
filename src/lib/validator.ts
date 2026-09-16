import type { AppNode, AppEdge } from '@/types/canvas';
import type { ValidationResult } from '@/types/compiler';

export function validateGraphTopology(
  nodes: AppNode[],
  edges: AppEdge[]
): ValidationResult {
  const errors: string[] = [];

  const apiNodes = nodes.filter((n) => n.type === 'api_gateway');
  const lambdaNodes = nodes.filter((n) => n.type === 'lambda');
  const dynamoNodes = nodes.filter((n) => n.type === 'dynamodb');

  if (apiNodes.length === 0) {
    errors.push('Graph must contain an API Gateway endpoint node.');
  } else if (apiNodes.length > 1) {
    errors.push(`P0 supports 1 API Gateway (found ${apiNodes.length}).`);
  }

  if (lambdaNodes.length === 0) {
    errors.push('Graph must contain an AWS Lambda function node.');
  } else if (lambdaNodes.length > 1) {
    errors.push(`P0 supports 1 Lambda function (found ${lambdaNodes.length}).`);
  }

  if (dynamoNodes.length === 0) {
    errors.push('Graph must contain an AWS DynamoDB table node.');
  } else if (dynamoNodes.length > 1) {
    errors.push(`P0 supports 1 DynamoDB table (found ${dynamoNodes.length}).`);
  }

  const unsupported = nodes.filter(
    (n) => !['api_gateway', 'lambda', 'dynamodb'].includes(n.type || '')
  );
  if (unsupported.length > 0) {
    errors.push(`Unsupported component types in graph: ${unsupported.map((n) => n.type).join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const api = apiNodes[0];
  const lambda = lambdaNodes[0];
  const dynamo = dynamoNodes[0];

  const apiToLambda = edges.some(
    (e) => e.source === api.id && e.target === lambda.id
  );
  if (!apiToLambda) {
    errors.push(`API Gateway [${api.id}] must connect to Lambda function [${lambda.id}].`);
  }

  const lambdaToDynamo = edges.some(
    (e) => e.source === lambda.id && e.target === dynamo.id
  );
  if (!lambdaToDynamo) {
    errors.push(`Lambda function [${lambda.id}] must connect to DynamoDB table [${dynamo.id}].`);
  }

  // Check for orphan edges
  const validNodeIds = new Set([api.id, lambda.id, dynamo.id]);
  const orphanEdges = edges.filter(
    (e) => !validNodeIds.has(e.source) || !validNodeIds.has(e.target)
  );
  if (orphanEdges.length > 0) {
    errors.push(`Found ${orphanEdges.length} disconnected edge(s).`);
  }

  return {
    valid: errors.length === 0,
    errors,
    nodes: errors.length === 0 ? { api, lambda, dynamodb: dynamo } : undefined,
  };
}
