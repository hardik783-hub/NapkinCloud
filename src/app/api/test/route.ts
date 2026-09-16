import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { insertTableRecord, type TableRecord } from '@/lib/dataStore';

export async function POST(req: Request) {
  const startTime = performance.now();

  try {
    const body = await req.json();
    const {
      payload = {},
      tableName = 'OrdersTable',
      primaryKey = 'orderId',
    } = body;

    const pkValue = payload[primaryKey] || `ord-${crypto.randomUUID().slice(0, 8)}`;

    const record: TableRecord = {
      ...payload,
      [primaryKey]: pkValue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _status: 'ACTIVE',
    };

    // Persist to server store
    insertTableRecord(tableName, record);

    const latencyMs = Math.round(performance.now() - startTime + 25); // Add realistic cloud hop delay

    return NextResponse.json({
      success: true,
      statusCode: 200,
      latencyMs,
      endpoint: body.path || '/orders',
      message: '200 OK — Order successfully processed by AWS Lambda & committed to DynamoDB',
      item: record,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 500,
        error: error.message || 'Invocation failed',
      },
      { status: 500 }
    );
  }
}
