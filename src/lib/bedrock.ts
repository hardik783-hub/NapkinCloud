import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { AppNode } from '@/types/canvas';
import type { NormalizedArchitecture } from '@/types/compiler';

function extractJsonFromText(text: string): any {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('No valid JSON found in LLM response');
}

export async function normalizeIntentWithBedrock(
  validatedNodes: { api: AppNode; lambda: AppNode; dynamodb: AppNode }
): Promise<NormalizedArchitecture> {
  const { api, lambda, dynamodb } = validatedNodes;

  const rawPath = (api.data.path as string) || '/orders';
  const rawMethod = (api.data.method as string) || 'POST';
  const rawFunctionName = (lambda.data.functionName as string) || 'ProcessOrderFunction';
  const rawLogic = (lambda.data.businessLogic as string) || 'Validates incoming payload and writes item to database';
  const rawTableName = (dynamodb.data.tableName as string) || 'OrdersTable';
  const rawPrimaryKey = (dynamodb.data.primaryKey as string) || 'orderId';

  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const hasCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );

  const region = process.env.AWS_REGION || 'us-east-1';

  // 1. Bedrock API Key / Bearer Token (Amazon Nova Pro)
  if (bearerToken) {
    try {
      const url = `https://bedrock-runtime.${region}.amazonaws.com/model/amazon.nova-pro-v1:0/invoke`;
      const systemText = `You are a cloud backend compiler reasoning agent for AWS SAM.
Analyze the following user-drawn backend architecture:
- HTTP Route: ${rawMethod} ${rawPath}
- Function Name: ${rawFunctionName}
- User Natural Language Logic: "${rawLogic}"
- Database: DynamoDB Table "${rawTableName}", Partition Key "${rawPrimaryKey}"

Respond ONLY with a valid JSON object matching this exact schema:
{
  "sanitizedFunctionName": "AlphanumericFunctionName",
  "sanitizedTableName": "AlphanumericTableName",
  "sanitizedPrimaryKey": "primaryKeyName",
  "sanitizedPath": "/clean-path",
  "businessLogicSummary": "Brief 1-sentence summary of validated logic",
  "inferredLogicCode": "clean javascript snippet generating UUID if missing and validating payload"
}
Do not include markdown or backticks. Return raw JSON only.`;

      const payload = {
        system: [{ text: systemText }],
        messages: [{ role: 'user', content: [{ text: 'Normalize this architecture topology' }] }],
        inferenceConfig: { temperature: 0.1, max_new_tokens: 1000 },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.output?.message?.content?.[0]?.text?.trim() || '';
        const parsed = extractJsonFromText(content);

        return {
          pattern: 'api_lambda_dynamodb',
          api: {
            method: rawMethod as any,
            path: parsed.sanitizedPath || rawPath,
          },
          lambda: {
            functionName: parsed.sanitizedFunctionName || rawFunctionName,
            runtime: 'nodejs20.x',
            handlerFile: 'index.js',
            businessLogicSummary: parsed.businessLogicSummary || rawLogic,
            inferredLogicCode: parsed.inferredLogicCode || 'const record = { ...body, createdAt: new Date().toISOString() };',
          },
          dynamodb: {
            tableName: parsed.sanitizedTableName || rawTableName,
            partitionKey: parsed.sanitizedPrimaryKey || rawPrimaryKey,
            partitionKeyType: 'String',
          },
          source: 'bedrock',
        };
      }
    } catch (err) {
      console.warn('[Bedrock Bearer Normalizer] Failed, trying fallback:', err);
    }
  }

  // 2. AWS IAM Key Pair (Claude 3.5 Sonnet / AWS SDK)
  if (hasCredentials) {
    try {
      const client = new BedrockRuntimeClient({ region });
      const prompt = `You are a cloud backend compiler reasoning agent for AWS SAM.
Analyze the following user-drawn backend architecture:
- HTTP Route: ${rawMethod} ${rawPath}
- Function Name: ${rawFunctionName}
- User Natural Language Logic: "${rawLogic}"
- Database: DynamoDB Table "${rawTableName}", Partition Key "${rawPrimaryKey}"

Respond ONLY with a valid JSON object matching this exact schema:
{
  "sanitizedFunctionName": "AlphanumericFunctionName",
  "sanitizedTableName": "AlphanumericTableName",
  "sanitizedPrimaryKey": "primaryKeyName",
  "sanitizedPath": "/clean-path",
  "businessLogicSummary": "Brief 1-sentence summary of validated logic",
  "inferredLogicCode": "clean javascript snippet generating UUID if missing and validating payload"
}
Do not include markdown or backticks. Return raw JSON only.`;

      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      };

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const decoded = new TextDecoder().decode(response.body);
      const jsonResponse = JSON.parse(decoded);
      const content = jsonResponse.content?.[0]?.text?.trim() || '';

      const parsed = extractJsonFromText(content);

      return {
        pattern: 'api_lambda_dynamodb',
        api: {
          method: rawMethod as any,
          path: parsed.sanitizedPath || rawPath,
        },
        lambda: {
          functionName: parsed.sanitizedFunctionName || rawFunctionName,
          runtime: 'nodejs20.x',
          handlerFile: 'index.js',
          businessLogicSummary: parsed.businessLogicSummary || rawLogic,
          inferredLogicCode: parsed.inferredLogicCode || 'const record = { ...body, createdAt: new Date().toISOString() };',
        },
        dynamodb: {
          tableName: parsed.sanitizedTableName || rawTableName,
          partitionKey: parsed.sanitizedPrimaryKey || rawPrimaryKey,
          partitionKeyType: 'String',
        },
        source: 'bedrock',
      };
    } catch (err) {
      console.warn('[Bedrock Normalizer] Bedrock call failed or timed out. Falling back to deterministic normalizer.', err);
    }
  }

  // Deterministic Fallback Engine (Zero-Fail Guarantee)
  const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const cleanFnName = rawFunctionName.replace(/[^a-zA-Z0-9]/g, '') || 'DefaultOrderFunction';
  const cleanTableName = rawTableName.replace(/[^a-zA-Z0-9_.-]/g, '') || 'AppTable';
  const cleanPk = rawPrimaryKey.replace(/[^a-zA-Z0-9_]/g, '') || 'id';

  return {
    pattern: 'api_lambda_dynamodb',
    api: {
      method: rawMethod as any,
      path: cleanPath,
    },
    lambda: {
      functionName: cleanFnName,
      runtime: 'nodejs20.x',
      handlerFile: 'index.js',
      businessLogicSummary: rawLogic || 'Validates input payload and writes item to database',
      inferredLogicCode: `const record = { ...body, createdAt: new Date().toISOString() };`,
    },
    dynamodb: {
      tableName: cleanTableName,
      partitionKey: cleanPk,
      partitionKeyType: 'String',
    },
    source: 'deterministic_fallback',
  };
}
