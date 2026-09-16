import { NextResponse } from 'next/server';
import { getTableRecords } from '@/lib/dataStore';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get('tableName') || 'OrdersTable';

    const items = getTableRecords(tableName);

    return NextResponse.json({
      success: true,
      tableName,
      count: items.length,
      timestamp: new Date().toISOString(),
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to query table',
      },
      { status: 500 }
    );
  }
}
