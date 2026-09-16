import { NextResponse } from 'next/server';
import { validateGraphTopology } from '@/lib/validator';
import { normalizeIntentWithBedrock } from '@/lib/bedrock';
import { synthesizeLambdaCode } from '@/lib/lambdaSynthesizer';
import { compileSamTemplate } from '@/lib/compiler';
import type { CompileRequest, CompileResponse } from '@/types/compiler';

export async function POST(req: Request) {
  try {
    const body: CompileRequest = await req.json();
    const { nodes, edges, projectId = `napkin-proj-${Date.now().toString(36)}` } = body;

    if (!nodes || !edges) {
      return NextResponse.json<CompileResponse>(
        {
          success: false,
          projectId,
          timestamp: new Date().toISOString(),
          validation: {
            valid: false,
            errors: ['Invalid request payload. Expected nodes and edges.'],
          },
        },
        { status: 400 }
      );
    }

    // Step 1: Validate Graph Topology
    const validation = validateGraphTopology(nodes, edges);
    if (!validation.valid || !validation.nodes) {
      return NextResponse.json<CompileResponse>(
        {
          success: false,
          projectId,
          timestamp: new Date().toISOString(),
          validation: {
            valid: false,
            errors: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    // Step 2: Normalize Intent via Amazon Bedrock (or deterministic fallback)
    const normalizedArch = await normalizeIntentWithBedrock(validation.nodes);

    // Step 3: Synthesize Lambda Node.js Handler
    const handlerJs = synthesizeLambdaCode(normalizedArch);

    // Step 4: Deterministic SAM Template Compilation
    const templateYaml = compileSamTemplate(normalizedArch, projectId);

    const reasoning = [
      {
        service: 'api_gateway',
        reason: `Exposes HTTPS ${normalizedArch.api.method} ${normalizedArch.api.path} with managed rate-limiting, CORS, and request routing.`,
      },
      {
        service: 'lambda',
        reason: `Serverless NodeJS compute (${normalizedArch.lambda.functionName}) executes business logic on-demand without managing EC2 servers.`,
      },
      {
        service: 'dynamodb',
        reason: `Single-digit millisecond latency NoSQL storage in table '${normalizedArch.dynamodb.tableName}' partitioned by '${normalizedArch.dynamodb.partitionKey}'.`,
      },
    ];

    const teammateArchitecture = {
      application: {
        name: `${normalizedArch.api.path.replace(/^\//, '').toUpperCase() || 'Orders'} Service`,
        description: normalizedArch.lambda.businessLogicSummary,
      },
      architecture: {
        nodes: [
          {
            id: validation.nodes.api.id,
            type: 'api_gateway',
            purpose: `HTTP API endpoint for ${normalizedArch.api.method} ${normalizedArch.api.path}`,
          },
          {
            id: validation.nodes.lambda.id,
            type: 'lambda',
            purpose: normalizedArch.lambda.businessLogicSummary,
          },
          {
            id: validation.nodes.dynamodb.id,
            type: 'dynamodb',
            purpose: `Store items in ${normalizedArch.dynamodb.tableName} indexed by ${normalizedArch.dynamodb.partitionKey}`,
          },
        ],
        connections: edges.map((e) => ({
          from: e.source,
          to: e.target,
        })),
      },
      reasoning,
    };

    return NextResponse.json<CompileResponse>({
      success: true,
      projectId,
      timestamp: new Date().toISOString(),
      templateYaml,
      handlerJs,
      normalizedArchitecture: normalizedArch,
      reasoning,
      teammateArchitecture,
      validation: {
        valid: true,
        errors: [],
      },
      handOffContract: {
        projectId,
        templateYaml,
        handlerJs,
      },
    });
  } catch (error: any) {
    console.error('[API /api/compile] Compilation failed:', error);
    return NextResponse.json<CompileResponse>(
      {
        success: false,
        projectId: 'error',
        timestamp: new Date().toISOString(),
        validation: {
          valid: false,
          errors: [error.message || 'Internal server error during compilation.'],
        },
      },
      { status: 500 }
    );
  }
}
