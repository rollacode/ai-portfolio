import { NextRequest } from 'next/server';
import { resetDailyQuota, getDailyUsage } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// GET  /api/quota?ip=1.2.3.4  — check usage for an IP (admin only)
// DELETE /api/quota?ip=1.2.3.4 — reset quota for an IP (admin only)
// ---------------------------------------------------------------------------

function checkToken(request: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') && auth.slice(7) === token || false;
}

export async function GET(request: NextRequest) {
  if (!checkToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = request.nextUrl.searchParams.get('ip');
  if (!ip) {
    return Response.json({ error: 'Missing ip query parameter' }, { status: 400 });
  }

  const used = await getDailyUsage(ip);
  return Response.json({ ip, used, limit: 40, remaining: Math.max(0, 40 - used) });
}

export async function DELETE(request: NextRequest) {
  if (!checkToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = request.nextUrl.searchParams.get('ip');
  if (!ip) {
    return Response.json({ error: 'Missing ip query parameter' }, { status: 400 });
  }

  const ok = await resetDailyQuota(ip);
  if (!ok) {
    return Response.json({ error: 'Redis unavailable' }, { status: 503 });
  }

  return Response.json({ ok: true, ip, message: 'Quota reset' });
}
