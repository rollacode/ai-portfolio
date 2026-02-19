import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// POST /api/visitor  — save visitor info (called by agent tool, no auth)
// GET  /api/visitor  — read all visitors (protected by ADMIN_TOKEN)
//
// Each visitor is identified by a visitorId (UUID generated on the client).
// Multiple calls with the same visitorId merge fields into a single entry.
// If no visitorId is provided, falls back to timestamp-based merge (30 min).
// ---------------------------------------------------------------------------

const VISITORS_PATH = path.join(process.cwd(), 'data', 'visitors.json');
const MERGE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes fallback

interface VisitorEntry {
  visitorId?: string;
  timestamp: string;
  name?: string;
  company?: string;
  role?: string;
  interest?: string;
  contact?: string;
  notes?: string;
}

function loadVisitors(): VisitorEntry[] {
  try {
    if (fs.existsSync(VISITORS_PATH)) {
      return JSON.parse(fs.readFileSync(VISITORS_PATH, 'utf-8')) as VisitorEntry[];
    }
  } catch {
    // corrupted file — start fresh
  }
  return [];
}

function saveVisitors(visitors: VisitorEntry[]): void {
  fs.writeFileSync(VISITORS_PATH, JSON.stringify(visitors, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function checkToken(request: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7) === token) return true;

  const param = request.nextUrl.searchParams.get('token');
  if (param === token) return true;

  return false;
}

// ---------------------------------------------------------------------------
// GET /api/visitor — read all visitors (protected)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!checkToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const visitors = loadVisitors();
  return Response.json({ count: visitors.length, visitors });
}

// ---------------------------------------------------------------------------
// POST /api/visitor — save visitor info (no auth, called by client)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const visitorId = body.visitorId as string | undefined;

    // Filter out empty/null fields
    const data: Partial<VisitorEntry> = {};
    for (const key of ['name', 'company', 'role', 'interest', 'contact', 'notes'] as const) {
      if (body[key] && typeof body[key] === 'string' && body[key].trim()) {
        data[key] = body[key].trim();
      }
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ ok: true, merged: false });
    }

    const visitors = loadVisitors();
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
      // Merge new fields into existing entry
      for (const [key, value] of Object.entries(data)) {
        if (value) {
          (existing as unknown as Record<string, unknown>)[key] = value;
        }
      }
      if (visitorId && !existing.visitorId) {
        existing.visitorId = visitorId;
      }
      existing.timestamp = now.toISOString();
      saveVisitors(visitors);
      return Response.json({ ok: true, merged: true });
    }

    // New entry
    visitors.push({
      visitorId,
      timestamp: now.toISOString(),
      ...data,
    });
    saveVisitors(visitors);
    return Response.json({ ok: true, merged: false });
  } catch (error) {
    console.error('[visitor API] error:', error);
    return Response.json({ error: 'Failed to save visitor info' }, { status: 500 });
  }
}
