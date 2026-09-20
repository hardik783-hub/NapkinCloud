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

  if (dynamoNodes.length > 1) {
    errors.push(`P0 supports 1 DynamoDB table (found ${dynamoNodes.length}).`);
  }

  const validCloudTypes = [
    'api_gateway',
    'lambda',
    'dynamodb',
    's3',
    'sqs',
    'sns',
    'eventbridge',
    'cognito',
    'cloudwatch',
    'kinesis',
    'step_functions',
    'secrets_manager',
  ];

  const unsupported = nodes.filter(
    (n) => !validCloudTypes.includes(n.type || '')
  );
  if (unsupported.length > 0) {
    errors.push(`Unsupported component types in graph: ${unsupported.map((n) => n.type).join(', ')}`);
  }

  const api = apiNodes[0];
  const lambda = lambdaNodes[0];
  const dynamo = dynamoNodes[0];

  if (api && lambda) {
    const apiToLambda = edges.some(
      (e) => e.source === api.id && e.target === lambda.id
    );
    if (!apiToLambda) {
      errors.push(`API Gateway [${api.id}] must connect to Lambda function [${lambda.id}].`);
    }
  }

  if (dynamoNodes.length > 0) {
    if (lambda && dynamo) {
      const lambdaToDynamo = edges.some(
        (e) => e.source === lambda.id && e.target === dynamo.id
      );
      if (!lambdaToDynamo) {
        errors.push(`Lambda function [${lambda.id}] must connect to DynamoDB table [${dynamo.id}].`);
      }
    }
  } else {
    // If dynamoNodes.length === 0
    const cloudServiceTypes = ['s3', 'sqs', 'sns', 'eventbridge', 'cognito', 'cloudwatch', 'kinesis', 'step_functions', 'secrets_manager'];
    const cloudNodes = nodes.filter((n) => cloudServiceTypes.includes(n.type || ''));
    
    let hasConnectedCloudNode = false;
    for (const node of cloudNodes) {
      if (lambda && edges.some((e) => e.source === lambda.id && e.target === node.id)) {
        hasConnectedCloudNode = true;
        break;
      }
    }

    if (!hasConnectedCloudNode) {
      errors.push('Graph must contain at least one cloud service node connected to Lambda (e.g. DynamoDB, S3, SQS).');
    }

    const s3Node = nodes.find((n) => n.type === 's3');
    if (s3Node) {
      const lambdaToS3 = edges.some((e) => e.source === lambda?.id && e.target === s3Node.id);
      const anyToS3 = edges.some((e) => e.target === s3Node.id);
      if (!lambdaToS3 && !anyToS3) {
        // Technically, prompt says "edge from Lambda to S3 (or any valid node to S3)". So if !anyToS3
        errors.push(`S3 node [${s3Node.id}] must have an incoming edge.`);
      }
    }
  }

  // Check for orphan edges (edges pointing to non-existent nodes)
  const allNodeIds = new Set(nodes.map((n) => n.id));
  const orphanEdges = edges.filter(
    (e) => !allNodeIds.has(e.source) || !allNodeIds.has(e.target)
  );
  if (orphanEdges.length > 0) {
    errors.push(`Found ${orphanEdges.length} disconnected edge(s).`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    nodes: dynamoNodes.length > 0
      ? { api, lambda, dynamodb: dynamo }
      : { api, lambda, dynamodb: (nodes.find(n => n.type === 's3') || lambda) as any },
  };
}
