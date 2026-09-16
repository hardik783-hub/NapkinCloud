import { NextRequest, NextResponse } from 'next/server';
import { generateArchitectureFromPrompt } from '@/lib/architectureGenerator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt string is required to generate architecture.',
        },
        { status: 400 }
      );
    }

    const result = await generateArchitectureFromPrompt(prompt);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error generating architecture:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
