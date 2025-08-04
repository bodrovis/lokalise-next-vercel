import { NextRequest, NextResponse } from 'next/server';

const LOKALISE_WEBHOOK_SECRET = process.env.LOKALISE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-secret');

  if (secret !== LOKALISE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (Array.isArray(payload)) {
    if (payload[0] === 'ping') {
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }
    return NextResponse.json({ error: 'Invalid ping payload' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Unsupported payload' }, { status: 400 });
}
