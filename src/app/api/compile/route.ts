import { NextResponse } from 'next/server';
import type { CompileRequest } from '@/types/compiler';

const BACKEND_URL =
  process.env.NAPKIN_BACKEND_URL || 'http://localhost:3001';

export async function POST(req: Request) {
  try {
    const body: CompileRequest = await req.json();

    const response = await fetch(`${BACKEND_URL}/api/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error: any) {
    console.error('[Next /api/compile] Backend connection failed:', error);

    return NextResponse.json(
      {
        success: false,
        projectId: 'error',
        timestamp: new Date().toISOString(),
        validation: {
          valid: false,
          errors: [
            error.message ||
              'Could not connect to NapkinCloud deployment backend.',
          ],
        },
      },
      { status: 500 },
    );
  }
}