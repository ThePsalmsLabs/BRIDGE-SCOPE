import { NextResponse } from 'next/server';

import { enqueueHeliusPayload, verifyHeliusSignature } from '@/lib/solana-webhook';

export async function POST(req: Request) {
  const rawBuffer = await req.arrayBuffer();
  const rawBody = Buffer.from(rawBuffer).toString('utf8');

  const ok = verifyHeliusSignature(req.headers, rawBody);
  if (!ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = safeJson(rawBody);
  if (!body || !body.transactions) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  await enqueueHeliusPayload(body);
  return NextResponse.json({ status: 'queued' });
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

