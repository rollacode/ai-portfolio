import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// POST /api/visitor  — save visitor info (called by agent tool, no auth)
// GET  /api/visitor  — read all visitors (protected by ADMIN_TOKEN)
//
// Appends visitor info to data/visitors.json.
// Each entry is timestamped. Multiple calls for the same visitor are fine —
// new fields are merged into the latest entry if the timestamp is within
// 30 minutes, otherwise a new entry is created.
//
// GET usage:
//   curl -H "Authorization: Bearer YOUR_TOKEN" https://your-site.com/api/visitor
//   curl "https://your-site.com/api/visitor?token=YOUR_TOKEN"
// ---------------------------------------------------------------------------

const VISITORS_PATH = path.join(process.cwd(), 'data', 'visitors.json');
const MERGE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

interface VisitorEntry {
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

  // Check Authorization: Bearer header
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7) === token) return true;

  // Check ?token= query param
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
    const last = visitors[visitors.length - 1];

    // Merge into last entry if within the merge window
    if (last && (now.getTime() - new Date(last.timestamp).getTime()) < MERGE_WINDOW_MS) {
      for (const [key, value] of Object.entries(data)) {
        if (value) {
          (last as unknown as Record<string, unknown>)[key] = value;
        }
      }
      last.timestamp = now.toISOString();
      saveVisitors(visitors);
      return Response.json({ ok: true, merged: true });
    }

    // New entry
    visitors.push({
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
