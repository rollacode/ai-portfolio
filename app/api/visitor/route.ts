import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// POST /api/visitor
//
// Appends visitor info to data/visitors.json.
// Each entry is timestamped. Multiple calls for the same visitor are fine —
// new fields are merged into the latest entry if the timestamp is within
// 30 minutes, otherwise a new entry is created.
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
