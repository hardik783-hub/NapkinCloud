import { NextResponse } from 'next/server';
import {
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
export const dynamic = 'force-dynamic';

const REGION = process.env.AWS_REGION || 'us-east-1';

const dynamodb = new DynamoDBClient({
  region: REGION,
});

function unmarshallValue(value: any): any {
  if (value.S !== undefined) return value.S;
  if (value.N !== undefined) return Number(value.N);
  if (value.BOOL !== undefined) return value.BOOL;
  if (value.NULL !== undefined) return null;
  if (value.L !== undefined) return (value.L as any[]).map(unmarshallValue);
  if (value.M !== undefined) {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value.M as Record<string, any>)) {
      obj[k] = unmarshallValue(v);
    }
    return obj;
  }
  if (value.SS !== undefined) return value.SS;
  if (value.NS !== undefined) return (value.NS as string[]).map(Number);
  if (value.BS !== undefined) return value.BS;
  return String(value);
}

export async function GET(req: Request) {
  let tableName: string | undefined;

  try {
    const { searchParams } = new URL(req.url);

    tableName = searchParams.get('tableName')?.trim() || undefined;

    if (!tableName) {
      return NextResponse.json(
        {
          success: false,
          error: 'A physical DynamoDB table name is required for a live AWS scan. Deploy the architecture and try again.',
        },
        { status: 400 }
      );
    }

    console.log(`🗄️ Scanning DynamoDB table: ${tableName}`);

    const result = await dynamodb.send(
      new ScanCommand({
        TableName: tableName,
      })
    );

    const items = (result.Items || []).map((item) => {
      const converted: Record<string, any> = {};
      for (const [key, value] of Object.entries(item)) {
        converted[key] = unmarshallValue(value);
      }
      return converted;
    });

    return NextResponse.json({
      success: true,
      tableName,
      count: items.length,
      timestamp: new Date().toISOString(),
      items,
    });
  } catch (error: any) {
    console.error('❌ DynamoDB scan failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to query DynamoDB',
      },
      { status: 500 }
    );
  }
}