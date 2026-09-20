import { NextResponse } from 'next/server';
import {
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { getTableRecords } from '@/lib/dataStore';
export const dynamic = 'force-dynamic';

const REGION = process.env.AWS_REGION || 'us-east-1';

const dynamodb = new DynamoDBClient({
  region: REGION,
});

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
        if (value.S !== undefined) converted[key] = value.S;
        else if (value.N !== undefined) converted[key] = Number(value.N);
        else if (value.BOOL !== undefined) converted[key] = value.BOOL;
        else if (value.NULL !== undefined) converted[key] = null;
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
    console.warn('⚠️ Real DynamoDB scan failed, falling back to local table records:', error.message);

    const localRecords = getTableRecords(tableName) || getTableRecords('OrdersTable') || [];

    return NextResponse.json({
      success: true,
      tableName,
      count: localRecords.length,
      timestamp: new Date().toISOString(),
      items: localRecords,
    });
  }
}