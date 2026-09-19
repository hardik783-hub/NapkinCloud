import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const startTime = performance.now();

  try {
    const body = await req.json();

    const {
      liveUrl,
      method = 'POST',
      payload = {},
    } = body;

    if (!liveUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'No deployed API URL available. Compile the architecture first.',
        },
        { status: 400 }
      );
    }

    console.log(`🌐 Invoking live AWS API: ${method} ${liveUrl}`);

    const awsResponse = await fetch(liveUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method === 'GET' ? undefined : JSON.stringify(payload),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    const responseText = await awsResponse.text();

    let responseBody: any;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    return NextResponse.json({
      success: awsResponse.ok,
      statusCode: awsResponse.status,
      latencyMs,
      endpoint: liveUrl,
      message: awsResponse.ok
        ? 'Live AWS API request completed successfully'
        : 'AWS API request failed',
      item: responseBody,
    });

  } catch (error: any) {
    console.error('❌ Live API invocation failed:', error);

    return NextResponse.json(
      {
        success: false,
        statusCode: 500,
        error: error.message || 'Live API invocation failed',
      },
      { status: 500 }
    );
  }
}