import { NextRequest } from 'next/server';
import { askJev } from '@ai-portfolio/core/lib/jev';
import { computeReceipts } from '@ai-portfolio/core/lib/evidence/receipts';
import { canonicalEvidence } from '@/lib/evidence';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
export async function POST(request: NextRequest) {
  if (!rateLimit(`receipts:${getClientIp(request)}`, 10)) return Response.json({ available: false, reason: 'rate_limit', receipts: [] }, { status: 429 });
  if (Number(request.headers.get('content-length')) > 40000) return Response.json({ available: false, reason: 'limits', receipts: [] }, { status: 413 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ available: false, reason: 'invalid', receipts: [] }, { status: 400 }); }
  if (typeof body?.requestId !== 'string' || !/^[\w-]{1,100}$/.test(body.requestId) || typeof body.content !== 'string' || body.content.length > 16000) return Response.json({ available: false, reason: 'invalid', receipts: [] }, { status: 400 });
  const result = await computeReceipts({ requestId: body.requestId, content: body.content, evidence: canonicalEvidence(), ask: askJev, apiKey: process.env.TYPESAFE_API_KEY, signal: request.signal });
  return Response.json({ ...result, requestId: body.requestId, content: body.content }, { headers: { 'Cache-Control': 'no-store' } });
}
