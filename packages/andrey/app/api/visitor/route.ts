import { NextRequest } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { loadVisitors, saveVisitors, type VisitorEntry } from '@/lib/visitor-store';

// ---------------------------------------------------------------------------
// POST /api/visitor  — save visitor info (called by agent tool, no auth)
// GET  /api/visitor  — read all visitors (protected by ADMIN_TOKEN)
//
// Each visitor is identified by a visitorId (UUID generated on the client).
// Multiple calls with the same visitorId merge fields into a single entry.
// If no visitorId is provided, falls back to timestamp-based merge (30 min).
// ---------------------------------------------------------------------------

const MERGE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes fallback

// Simple async mutex for write serialization
let writeLock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeLock.then(fn);
  writeLock = result.then(() => {}, () => {});
  return result;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function checkToken(request: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7) === token) return true;

  return false;
}

// ---------------------------------------------------------------------------
// GET /api/visitor — read all visitors (protected)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!checkToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const visitors = await loadVisitors();
  return Response.json({ count: visitors.length, visitors });
}

// ---------------------------------------------------------------------------
// POST /api/visitor — save visitor info (no auth, called by client)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(ip, 30)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const visitorId = body.visitorId as string | undefined;

    // Filter out empty/null fields
    const data: Partial<VisitorEntry> = {};
    for (const key of ['name', 'company', 'role', 'interest', 'email', 'telegram', 'phone', 'linkedin', 'notes'] as const) {
      if (body[key] && typeof body[key] === 'string' && body[key].trim()) {
        data[key] = body[key].trim();
      }
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ ok: true, merged: false });
    }

    return await withLock(async () => {
      const visitors = await loadVisitors();
      const now = new Date();

      // Try to find existing entry by visitorId
      let existing: VisitorEntry | undefined;
      if (visitorId) {
        existing = visitors.find((v) => v.visitorId === visitorId);
      }

      // Fallback: merge by timestamp if no visitorId match
      if (!existing) {
        const last = visitors[visitors.length - 1];
        if (last && (now.getTime() - new Date(last.timestamp).getTime()) < MERGE_WINDOW_MS) {
          existing = last;
        }
      }

      if (existing) {
        // Merge new fields into existing entry — append for notes only
        const appendKeys = new Set(['notes']);
        for (const [key, value] of Object.entries(data)) {
          if (value) {
            const rec = existing as unknown as Record<string, unknown>;
            if (appendKeys.has(key) && rec[key] && typeof rec[key] === 'string') {
              const existing_val = rec[key] as string;
              if (!existing_val.includes(value as string)) {
                rec[key] = `${existing_val}; ${value}`;
              }
            } else {
              rec[key] = value;
            }
          }
        }
        if (visitorId && !existing.visitorId) {
          existing.visitorId = visitorId;
        }
        existing.timestamp = now.toISOString();
        await saveVisitors(visitors);
        return Response.json({ ok: true, merged: true });
      }

      // New entry
      visitors.push({
        visitorId,
        timestamp: now.toISOString(),
        ...data,
      });
      await saveVisitors(visitors);
      return Response.json({ ok: true, merged: false });
    });
  } catch (error) {
    console.error('[visitor API] error:', error);
    return Response.json({ error: 'Failed to save visitor info' }, { status: 500 });
  }
}
